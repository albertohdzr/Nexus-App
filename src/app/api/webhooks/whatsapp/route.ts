import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { generateBotReply } from '@/src/lib/ai/chatbot';
import { sendWhatsAppText } from '@/src/lib/whatsapp';
import { uploadToStorage } from '@/src/lib/storage';

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  [key: string]: unknown;
};

type WhatsAppMessage = {
  id: string;
  timestamp: string;
  type: string;
  from?: string;
  text?: { body?: string };
  image?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; mime_type?: string; filename?: string; sha256?: string };
  [key: string]: unknown;
};

type WhatsAppValue = {
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  metadata: { display_phone_number: string; phone_number_id: string };
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_secure_token';

async function handleBotResponse({
  chatId,
  organizationName,
  waId,
  phoneNumberId,
  latestUserMessage,
}: {
  chatId: string;
  organizationName?: string | null;
  waId: string;
  phoneNumberId: string;
  latestUserMessage: string;
}) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("WHATSAPP_ACCESS_TOKEN missing; bot reply skipped.");
    return;
  }

  // Stop bot replies once a handover flag exists in the thread
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("body, status, payload, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(20);

  const lastHandover = (recentMessages || [])
    .slice()
    .reverse()
    .find((msg) => (msg.payload as { handover?: boolean } | null)?.handover === true);

  if (lastHandover) {
    return;
  }

  const history =
    (recentMessages || [])
      .slice(0, -1)
      .map((msg) => ({
        role: msg.status === "received" ? ("user" as const) : ("assistant" as const),
        content: msg.body || "",
      })) || [];

  const botDecision = await generateBotReply({
    organizationName,
    latestUserMessage,
    history,
  });

  if (!botDecision?.reply) {
    return;
  }

  const { messageId, error } = await sendWhatsAppText({
    phoneNumberId,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    to: waId,
    body: botDecision.reply,
  });

  if (error) {
    console.error("WhatsApp bot send error:", error);
    return;
  }

  const payload = {
    from: "bot",
    handover: botDecision.handover,
    reason: botDecision.reason,
    model: botDecision.model,
  };

  const { error: insertError } = await supabase.from("messages").insert({
    chat_id: chatId,
    wa_message_id: messageId,
    body: botDecision.reply,
    type: "text",
    status: "sent",
    sent_at: new Date().toISOString(),
    sender_name: "Bot",
    payload,
    created_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Error saving bot reply:", insertError);
  }
}

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
    console.log('Webhook received:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
          if (
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0] &&
            body.entry[0].changes[0].value
          ) {
            const value = body.entry[0].changes[0].value as WhatsAppValue;
        const message = value.messages?.[0];
        if (message) {
          const contact = value.contacts ? value.contacts[0] : null;

          const waId = contact?.wa_id ?? message.from ?? "";
          const name = contact?.profile?.name ?? waId;
          const phoneNumber = value.metadata.display_phone_number;
          const phoneNumberId = value.metadata.phone_number_id;

          if (!waId) {
            console.error("Missing waId in incoming message");
            return new NextResponse('EVENT_RECEIVED', { status: 200 });
          }

          // 1. Find Organization
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('phone_number_id', phoneNumberId)
            .single();

          if (orgError || !orgData) {
            console.error('Organization not found for phone_number_id:', phoneNumberId);
            // Acknowledge but log
            return new NextResponse('EVENT_RECEIVED', { status: 200 });
          }

          // 2. Upsert Chat linked to Organization
          const { data: chatData, error: chatError } = await supabase
            .from('chats')
            .upsert(
              {
                wa_id: waId,
                name: name,
                phone_number: phoneNumber,
                organization_id: orgData.id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'wa_id' }
            )
            .select()
            .single();

          if (chatError) {
            console.error('Error upserting chat:', chatError);
            return new NextResponse('Internal Server Error', { status: 500 });
          }

          let mediaUrl: string | undefined;
          let mediaPath: string | undefined;
          const isImage = message.type === "image" && message.image?.id;
          const isDocument = message.type === "document" && message.document?.id;
          const mediaId = isImage ? message.image?.id : isDocument ? message.document?.id : undefined;
          const mediaMime = isImage
            ? message.image?.mime_type
            : isDocument
            ? message.document?.mime_type
            : undefined;
          const mediaFileName = isDocument ? message.document?.filename : undefined;
          const mediaCaption = isImage ? message.image?.caption : undefined;

          // If it's media (image or document), try to download and store in Supabase
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
                    const storagePath = `chats/${chatData.id}/${mediaId}-${mediaFileName || "file"}`;
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
            "[Media/Other]";

          // 3. Insert Message
          const { error: messageError } = await supabase.from('messages').insert({
            chat_id: chatData.id,
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
            },
            wa_timestamp: message.timestamp
              ? new Date(parseInt(message.timestamp) * 1000).toISOString()
              : new Date().toISOString(),
            sender_name: name,
            media_id: mediaId,
            media_path: mediaPath,
            media_url: mediaUrl,
            created_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
          });

          if (messageError) {
            console.error('Error inserting message:', messageError);
          }

          if (message.type === 'text' && message.text?.body) {
            await handleBotResponse({
              chatId: chatData.id,
              organizationName: orgData.name,
              waId,
              phoneNumberId,
              latestUserMessage: message.text.body,
            });
          }
        }

        // Handle status updates for outgoing messages
        await handleStatusUpdates(value);
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not a WhatsApp API event', { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
