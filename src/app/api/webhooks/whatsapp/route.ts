import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { openAIService } from "@/src/lib/ai/open";
import { generateChatbotReply, HANDOFF_RESPONSE_TEXT } from "@/src/lib/ai/chatbot";
import { sendWhatsAppText } from "@/src/lib/whatsapp";
import { uploadToStorage } from "@/src/lib/storage";
import { WhatsAppValue } from "@/src/types/whatsapp";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "my_secure_token";
const SESSION_TIMEOUT_MS = 60_000;

type ChatRecord = {
  id: string;
  name: string | null;
  organization_id: string | null;
  active_session_id?: string | null;
  requested_handoff?: boolean | null;
};

type ChatSessionRecord = {
  id: string;
  status: string | null;
  conversation_id: string | null;
  last_response_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  ai_enabled?: boolean | null;
};

const getLastSessionActivity = (session: ChatSessionRecord) => {
  const lastTimestamp =
    session.last_response_at || session.updated_at || session.created_at;
  return lastTimestamp ? new Date(lastTimestamp).getTime() : null;
};

const isSessionExpired = (session: ChatSessionRecord) => {
  if (session.ai_enabled === false || session.status === "handoff") {
    return false;
  }
  const lastActivity = getLastSessionActivity(session);
  return lastActivity
    ? Date.now() - lastActivity > SESSION_TIMEOUT_MS
    : false;
};

const closeChatSession = async ({
  chatId,
  sessionId,
}: {
  chatId: string;
  sessionId: string;
}) => {
  const closedAt = new Date().toISOString();

  const { error: sessionError } = await supabase
    .from("chat_sessions")
    .update({
      status: "closed",
      closed_at: closedAt,
      updated_at: closedAt,
    })
    .eq("id", sessionId);

  if (sessionError) {
    console.error("Error closing chat session", sessionError);
  }

  const { error: chatError } = await supabase
    .from("chats")
    .update({
      active_session_id: null,
      last_session_closed_at: closedAt,
      updated_at: closedAt,
    })
    .eq("id", chatId);

  if (chatError) {
    console.error("Error unlinking chat session from chat", chatError);
  }
};

const resolveChatSession = async ({
  chat,
  organizationName,
}: {
  chat: ChatRecord;
  organizationName?: string | null;
}): Promise<ChatSessionRecord | null> => {
  let activeSession: ChatSessionRecord | null = null;

  if (chat.active_session_id) {
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("id, status, conversation_id, last_response_at, updated_at, created_at, ai_enabled")
      .eq("id", chat.active_session_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching active chat session", error);
    }

    if (session?.status === "handoff") {
      return session;
    }

    if (session?.status === "active" && !isSessionExpired(session)) {
      activeSession = session;
    } else if (session?.id) {
      await closeChatSession({ chatId: chat.id, sessionId: session.id });
    }
  }

  if (activeSession) {
    return activeSession;
  }

  if (chat.requested_handoff) {
    const nowIso = new Date().toISOString();
    const { data: handoffSession, error: handoffError } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: chat.organization_id,
        chat_id: chat.id,
        status: "handoff",
        ai_enabled: false,
        last_response_at: nowIso,
        updated_at: nowIso,
      })
      .select("id, status, conversation_id, last_response_at, updated_at, created_at, ai_enabled")
      .single();

    if (handoffError) {
      console.error("Error creating handoff session", handoffError);
      return null;
    }

    const { error: chatLinkError } = await supabase
      .from("chats")
      .update({
        active_session_id: handoffSession.id,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (chatLinkError) {
      console.error("Error linking handoff session to chat", chatLinkError);
    }

    return handoffSession;
  }

  try {
    const conversation = await openAIService.createConversation({
      organizationName: organizationName ?? "",
      chatId: chat.id,
    });

    if (!conversation?.id) {
      console.error("OpenAI conversation did not return an id");
      return null;
    }

    const nowIso = new Date().toISOString();

    const { data: newSession, error: sessionCreateError } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: chat.organization_id,
        chat_id: chat.id,
        status: "active",
        conversation_id: conversation.id,
        last_response_at: nowIso,
        updated_at: nowIso,
        ai_enabled: true,
      })
      .select("id, status, conversation_id, last_response_at, updated_at, created_at, ai_enabled")
      .single();

    if (sessionCreateError) {
      console.error("Error creating chat session", sessionCreateError);
      return null;
    }

    if (newSession?.id) {
      const { error: chatLinkError } = await supabase
        .from("chats")
        .update({
          active_session_id: newSession.id,
          updated_at: nowIso,
        })
        .eq("id", chat.id);

      if (chatLinkError) {
        console.error("Error linking chat session to chat", chatLinkError);
      }
    }

    return newSession;
  } catch (err) {
    console.error("Error creating OpenAI conversation", err);
    return null;
  }
};

const handleAIResponse = async ({
  chat,
  organizationName,
  session,
  waId,
  phoneNumberId,
  latestUserMessage,
}: {
  chat: ChatRecord;
  organizationName?: string | null;
  session: ChatSessionRecord | null;
  waId: string;
  phoneNumberId: string;
  latestUserMessage: string;
}) => {
  const handleHandoff = async (aiResponseId?: string) => {
    const nowIso = new Date().toISOString();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
      console.warn("WHATSAPP_ACCESS_TOKEN missing; handoff response skipped.");
      return;
    }

    const { error: sessionUpdateError } = session?.id
      ? await supabase
          .from("chat_sessions")
          .update({
            ai_enabled: false,
            status: "handoff",
            updated_at: nowIso,
          })
          .eq("id", session.id)
      : { error: null };

    if (sessionUpdateError) {
      console.error("Error updating chat session to handoff", sessionUpdateError);
    }

    const { error: chatUpdateError } = await supabase
      .from("chats")
      .update({
        requested_handoff: true,
        active_session_id: session?.id ?? chat.active_session_id ?? null,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (chatUpdateError) {
      console.error("Error marking chat handoff", chatUpdateError);
    }

    const { messageId, error } = await sendWhatsAppText({
      phoneNumberId,
      accessToken,
      to: waId,
      body: HANDOFF_RESPONSE_TEXT,
    });

    if (error) {
      console.error("WhatsApp send error during handoff:", error);
      return;
    }

    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chat.id,
      chat_session_id: session?.id ?? null,
      response_id: aiResponseId ?? null,
      wa_message_id: messageId,
      body: HANDOFF_RESPONSE_TEXT,
      type: "text",
      status: "sent",
      sent_at: nowIso,
      sender_name: "Bot",
      payload: {
        handover: true,
        reason: "user_requested_handoff",
        conversation_id: session?.conversation_id,
      },
      created_at: nowIso,
    });

    if (insertError) {
      console.error("Error saving handoff reply:", insertError);
    }
  };

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("WHATSAPP_ACCESS_TOKEN missing; bot reply skipped.");
    return;
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!session?.conversation_id) {
    console.warn("No active chat session found; skipping AI response.");
    return;
  }

  if (session.ai_enabled === false) {
    console.warn("Chat session has AI disabled (handoff requested); skipping AI response.");
    return;
  }

  try {
    const chatbotReply = await generateChatbotReply({
      input: latestUserMessage,
      conversationId: session.conversation_id,
    });

    if (chatbotReply.handoffRequested) {
      await handleHandoff((chatbotReply.aiResponse as { id?: string })?.id);
      return;
    }

    if (!chatbotReply.replyText) {
      console.warn("AI response did not return text output.");
      return;
    }

    const { messageId, error } = await sendWhatsAppText({
      phoneNumberId,
      accessToken,
      to: waId,
      body: chatbotReply.replyText,
    });

    if (error) {
      console.error("WhatsApp bot send error:", error);
      return;
    }

    const nowIso = new Date().toISOString();

    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chat.id,
      chat_session_id: session.id,
      response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
      wa_message_id: messageId,
      body: chatbotReply.replyText,
      type: "text",
      status: "sent",
      sent_at: nowIso,
      sender_name: "Bot",
      payload: {
        model: chatbotReply.model,
        conversation_id: session.conversation_id,
        organization: organizationName,
        response_message_id: chatbotReply.responseMessageId,
      },
      created_at: nowIso,
    });

    if (insertError) {
      console.error("Error saving bot reply:", insertError);
    }

    const { error: sessionUpdateError } = await supabase
      .from("chat_sessions")
      .update({
        last_response_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (sessionUpdateError) {
      console.error("Error updating chat session timestamps", sessionUpdateError);
    }

    const { error: chatUpdateError } = await supabase
      .from("chats")
      .update({
        active_session_id: session.id,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (chatUpdateError) {
      console.error("Error keeping chat linked to active session", chatUpdateError);
    }
  } catch (err) {
    console.error("Error handling AI response", err);
  }
};

async function handleStatusUpdates(value: WhatsAppValue) {
  const statuses = value.statuses;
  if (!statuses?.length) return;

  for (const status of statuses) {
    const messageId = status.id as string | undefined;
    if (!messageId) continue;

    const nextStatus = status.status as string | undefined;
    const statusTimestamp = status.timestamp
      ? new Date(parseInt(status.timestamp, 10) * 1000).toISOString()
      : new Date().toISOString();

    const updates: Record<string, unknown> = {
      status: nextStatus,
      payload: {
        status_detail: status,
      },
    };

    if (nextStatus === "sent") {
      updates.sent_at = statusTimestamp;
    }
    if (nextStatus === "delivered") {
      updates.delivered_at = statusTimestamp;
    }
    if (nextStatus === "read") {
      updates.read_at = statusTimestamp;
    }

    const { error } = await supabase
      .from("messages")
      .update(updates)
      .eq("wa_message_id", messageId);

    if (error) {
      console.error("Error updating message status:", error, { messageId, nextStatus });
    } else {
      console.log("Updated message status", { messageId, nextStatus, statusTimestamp });
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Webhook received:", JSON.stringify(body, null, 2));

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not a WhatsApp API event", { status: 404 });
    }

    const value = body.entry?.[0]?.changes?.[0]?.value as WhatsAppValue | undefined;

    if (value) {
      const message = value.messages?.[0];

      if (message) {
        const contact = value.contacts ? value.contacts[0] : null;

        const waId = contact?.wa_id ?? message.from ?? "";
        const name = contact?.profile?.name ?? waId;
        const phoneNumber = value.metadata.display_phone_number;
        const phoneNumberId = value.metadata.phone_number_id;

        if (!waId) {
          console.error("Missing waId in incoming message");
          return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        // 1. Find Organization
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("phone_number_id", phoneNumberId)
          .single();

        if (orgError || !orgData) {
          console.error("Organization not found for phone_number_id:", phoneNumberId);
          // Acknowledge but log
          return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        // 2. Upsert Chat linked to Organization
        const { data: chatData, error: chatError } = await supabase
          .from("chats")
          .upsert(
            {
              wa_id: waId,
              name: name,
              phone_number: phoneNumber,
              organization_id: orgData.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "wa_id,organization_id" },
          )
          .select()
          .single();

        if (chatError || !chatData) {
          console.error("Error upserting chat:", chatError);
          return new NextResponse("Internal Server Error", { status: 500 });
        }

        const chatRecord: ChatRecord = {
          id: chatData.id,
          name: chatData.name ?? null,
          organization_id: chatData.organization_id ?? orgData.id,
          active_session_id: (chatData as { active_session_id?: string | null })?.active_session_id ?? null,
          requested_handoff: (chatData as { requested_handoff?: boolean | null })?.requested_handoff ?? false,
        };

        const session = await resolveChatSession({
          chat: chatRecord,
          organizationName: orgData.name,
        });

        let mediaUrl: string | undefined;
        let mediaPath: string | undefined;
        const isImage = message.type === "image" && message.image?.id;
        const isDocument = message.type === "document" && message.document?.id;
        const isAudio = message.type === "audio" && message.audio?.id;
        const mediaId = isImage
          ? message.image?.id
          : isDocument
          ? message.document?.id
          : isAudio
          ? message.audio?.id
          : undefined;
        const mediaMime = isImage
          ? message.image?.mime_type
          : isDocument
          ? message.document?.mime_type
          : isAudio
          ? message.audio?.mime_type
          : undefined;
        const mediaFileName = isDocument ? message.document?.filename : undefined;
        const mediaCaption = isImage ? message.image?.caption : undefined;

        // If it's media (image, document, audio), try to download and store in Supabase
        if (mediaId) {
          try {
            const metaResponse = await fetch(
              `https://graph.facebook.com/v21.0/${mediaId}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                },
              }
            );
            if (metaResponse.ok) {
              const meta = await metaResponse.json();
              const url = meta.url as string | undefined;
              const mimeType = meta.mime_type as string | undefined;

              if (url) {
                const mediaResponse = await fetch(url, {
                  headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                  },
                });
                if (mediaResponse.ok) {
                  const arrayBuffer = await mediaResponse.arrayBuffer();
                  const storagePath = `chats/${chatRecord.id}/${mediaId}-${mediaFileName || "file"}`;
                  const { path: storedPath, error: storageError } = await uploadToStorage({
                    file: Buffer.from(arrayBuffer),
                    path: storagePath,
                    contentType: mimeType,
                  });
                  if (storageError) {
                    console.error("Storage upload error (inbound media):", storageError);
                  } else {
                    mediaPath = storedPath ?? storagePath;
                    mediaUrl = `/api/storage/media?path=${encodeURIComponent(mediaPath)}`;
                  }
                }
              }
            }
          } catch (storageErr) {
            console.error("Error downloading/uploading inbound media:", storageErr);
          }
        }

        const messageBody =
          message.text?.body ||
          message.image?.caption ||
          message.document?.filename ||
          (message.audio ? "Mensaje de voz" : undefined) ||
          "[Media/Other]";

        const messageTimestampMs = message.timestamp
          ? parseInt(message.timestamp, 10) * 1000
          : Date.now();

        // 3. Insert Message
        const { error: messageError } = await supabase.from("messages").insert({
          chat_id: chatRecord.id,
          chat_session_id: session?.id,
          wa_message_id: message.id,
          body: messageBody,
          type: message.type,
          status: "received",
          payload: {
            ...message,
            media_id: mediaId,
            media_mime_type: mediaMime,
            media_file_name: mediaFileName,
            media_caption: mediaCaption,
            voice: message.audio?.voice,
            conversation_id: session?.conversation_id,
          },
          wa_timestamp: new Date(messageTimestampMs).toISOString(),
          sender_name: name,
          media_id: mediaId,
          media_path: mediaPath,
          media_url: mediaUrl,
          media_mime_type: mediaMime,
          created_at: new Date(messageTimestampMs).toISOString(),
        });

        if (messageError) {
          console.error("Error inserting message:", messageError);
        }

        if (message.type === "text" && message.text?.body) {
          await handleAIResponse({
            chat: chatRecord,
            organizationName: orgData.name,
            session,
            waId,
            phoneNumberId,
            latestUserMessage: message.text.body,
          });
        }
      }

      // Handle status updates for outgoing messages
      await handleStatusUpdates(value);
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
