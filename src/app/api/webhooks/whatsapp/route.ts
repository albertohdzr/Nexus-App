import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { uploadToStorage } from "@/src/lib/storage";
import { WhatsAppValue } from "@/src/types/whatsapp";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "my_secure_token";

type ChatRecord = {
  id: string;
  name: string | null;
  organization_id: string | null;
  phone_number?: string | null;
};

type TemplateChange = {
  field?: string;
  value?: Record<string, unknown>;
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
      console.error("Error updating message status:", error, {
        messageId,
        nextStatus,
      });
    } else {
      console.log("Updated message status", {
        messageId,
        nextStatus,
        statusTimestamp,
      });
    }
  }
}

const normalizeLanguage = (value: string | null | undefined) => {
  if (!value) return "";
  const cleaned = value.replace("-", "_");
  const parts = cleaned.split("_");
  if (parts.length === 2) {
    return `${parts[0].toLowerCase()}_${parts[1].toUpperCase()}`;
  }
  return cleaned;
};

const isTemplateChangeField = (field?: string) =>
  field === "message_template_status_update" ||
  field === "message_template_quality_update" ||
  field === "message_template_components_update";

const buildComponentsFromTemplateUpdate = (value: Record<string, unknown>) => {
  const components: Array<Record<string, unknown>> = [];
  const headerText = value["message_template_title"];
  const bodyText = value["message_template_element"];
  const footerText = value["message_template_footer"];

  if (typeof headerText === "string" && headerText.trim()) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: headerText,
    });
  }

  if (typeof bodyText === "string" && bodyText.trim()) {
    components.push({
      type: "BODY",
      text: bodyText,
    });
  }

  if (typeof footerText === "string" && footerText.trim()) {
    components.push({
      type: "FOOTER",
      text: footerText,
    });
  }

  const buttonsValue = value["message_template_buttons"];
  if (Array.isArray(buttonsValue) && buttonsValue.length) {
    const buttons = buttonsValue.map((button) => {
      const buttonType = String(
        (button as Record<string, unknown>)["message_template_button_type"] ||
          "",
      ).toUpperCase();
      const buttonText = String(
        (button as Record<string, unknown>)["message_template_button_text"] ||
          "",
      );
      if (buttonType === "URL") {
        return {
          type: "URL",
          text: buttonText,
          url: (button as Record<string, unknown>)["message_template_button_url"],
        };
      }
      if (buttonType === "PHONE_NUMBER") {
        return {
          type: "PHONE_NUMBER",
          text: buttonText,
          phone_number:
            (button as Record<string, unknown>)
              ["message_template_button_phone_number"],
        };
      }
      return {
        type: "QUICK_REPLY",
        text: buttonText,
      };
    });
    components.push({
      type: "BUTTONS",
      buttons,
    });
  }

  return components;
};

async function handleTemplateUpdates(
  entryId: string | null,
  entryTime: number | null,
  change: TemplateChange,
) {
  if (!isTemplateChangeField(change.field) || !change.value) return;

  const wabaId = entryId ? String(entryId) : "";
  if (!wabaId) {
    console.error("Missing WABA id for template update");
    return;
  }

  const { data: orgData, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("whatsapp_business_account_id", wabaId)
    .single();

  if (orgError || !orgData) {
    console.error("Organization not found for WABA id:", wabaId);
    return;
  }

  const value = change.value;
  const externalId =
    value["message_template_id"] !== undefined
      ? String(value["message_template_id"])
      : null;
  const templateName =
    typeof value["message_template_name"] === "string"
      ? (value["message_template_name"] as string)
      : null;
  const templateLanguage = normalizeLanguage(
    typeof value["message_template_language"] === "string"
      ? (value["message_template_language"] as string)
      : null,
  );

  let templateId: string | null = null;

  if (externalId) {
    const { data: templateByExternal } = await supabase
      .from("whatsapp_templates")
      .select("id")
      .eq("organization_id", orgData.id)
      .eq("external_id", externalId)
      .maybeSingle();

    templateId = templateByExternal?.id ?? null;
  }

  if (!templateId && templateName) {
    const { data: templateMatches } = await supabase
      .from("whatsapp_templates")
      .select("id, language")
      .eq("organization_id", orgData.id)
      .eq("name", templateName);

    const matched = (templateMatches || []).find((row) => {
      const rowLanguage = normalizeLanguage(row.language as string | null);
      if (!templateLanguage) return false;
      return rowLanguage === templateLanguage;
    });

    templateId = matched?.id ?? null;
  }

  if (!templateId) {
    console.error("Template not found for webhook update", {
      externalId,
      templateName,
      templateLanguage,
    });
    return;
  }

  const eventTimestamp = entryTime
    ? new Date(entryTime * 1000).toISOString()
    : new Date().toISOString();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_meta_event: change as Record<string, unknown>,
    meta_updated_at: eventTimestamp,
  };

  if (externalId) {
    updateData.external_id = externalId;
  }

  if (templateName) {
    updateData.name = templateName;
  }

  if (templateLanguage) {
    updateData.language = templateLanguage;
  }

  if (change.field === "message_template_status_update") {
    const statusValue = value["event"] ? String(value["event"]) : "PENDING";
    updateData.status = statusValue.toLowerCase();
    if (value["message_template_category"]) {
      updateData.category = String(value["message_template_category"]).toUpperCase();
    }
  }

  if (change.field === "message_template_quality_update") {
    if (value["new_quality_score"]) {
      updateData.quality_score = String(value["new_quality_score"]).toUpperCase();
    }
  }

  if (change.field === "message_template_components_update") {
    const components = buildComponentsFromTemplateUpdate(value);
    if (components.length) {
      updateData.components = components;
    }
  }

  const { error } = await supabase
    .from("whatsapp_templates")
    .update(updateData)
    .eq("id", templateId)
    .eq("organization_id", orgData.id);

  if (error) {
    console.error("Error updating template from webhook:", error);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Bad Request", { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Webhook received:", JSON.stringify(body, null, 2));

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not a WhatsApp API event", { status: 404 });
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    let value: WhatsAppValue | undefined;

    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        if (isTemplateChangeField(change.field)) {
          await handleTemplateUpdates(
            entry.id ? String(entry.id) : null,
            typeof entry.time === "number" ? entry.time : null,
            change,
          );
          continue;
        }

        if (!value && change?.value?.metadata?.phone_number_id) {
          value = change.value as WhatsAppValue;
        }
      }
    }

    if (value) {
      const messages = Array.isArray(value.messages) ? [...value.messages] : [];

      if (messages.length) {
        const contact = value.contacts ? value.contacts[0] : null;
        const phoneNumber = value.metadata.display_phone_number;
        const phoneNumberId = value.metadata.phone_number_id;
        const orderedMessages = messages.sort((a, b) => {
          const aTime = a.timestamp ? parseInt(a.timestamp, 10) : 0;
          const bTime = b.timestamp ? parseInt(b.timestamp, 10) : 0;
          return aTime - bTime;
        });

        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name")
          .eq("phone_number_id", phoneNumberId)
          .single();

        if (orgError || !orgData) {
          console.error(
            "Organization not found for phone_number_id:",
            phoneNumberId,
          );
          return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        const chatsToProcess = new Set<string>();

        for (const message of orderedMessages) {
          const waId = contact?.wa_id ?? message.from ?? "";
          const name = contact?.profile?.name ?? waId;

          if (!waId) {
            console.error("Missing waId in incoming message");
            continue;
          }

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
            continue;
          }

          const chatRecord: ChatRecord = {
            id: chatData.id,
            name: chatData.name ?? null,
            organization_id: chatData.organization_id ?? orgData.id,
            phone_number: chatData.phone_number ?? null,
          };

          let mediaUrl: string | undefined;
          let mediaPath: string | undefined;
          const isImage = message.type === "image" && message.image?.id;
          const isDocument = message.type === "document" &&
            message.document?.id;
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
          const mediaFileName = isDocument
            ? message.document?.filename
            : undefined;
          const mediaCaption = isImage ? message.image?.caption : undefined;

          if (mediaId) {
            try {
              const metaResponse = await fetch(
                `https://graph.facebook.com/v21.0/${mediaId}`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                  },
                },
              );
              if (metaResponse.ok) {
                const meta = await metaResponse.json();
                const url = meta.url as string | undefined;
                const mimeType = meta.mime_type as string | undefined;

                if (url) {
                  const mediaResponse = await fetch(url, {
                    headers: {
                      Authorization:
                        `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    },
                  });
                  if (mediaResponse.ok) {
                    const arrayBuffer = await mediaResponse.arrayBuffer();
                    const storagePath = `chats/${chatRecord.id}/${mediaId}-${
                      mediaFileName || "file"
                    }`;
                    const { path: storedPath, error: storageError } =
                      await uploadToStorage({
                        file: Buffer.from(arrayBuffer),
                        path: storagePath,
                        contentType: mimeType,
                      });
                    if (storageError) {
                      console.error(
                        "Storage upload error (inbound media):",
                        storageError,
                      );
                    } else {
                      mediaPath = storedPath ?? storagePath;
                      mediaUrl = `/api/storage/media?path=${
                        encodeURIComponent(mediaPath)
                      }`;
                    }
                  }
                }
              }
            } catch (storageErr) {
              console.error(
                "Error downloading/uploading inbound media:",
                storageErr,
              );
            }
          }

          const messageBody = message.text?.body ||
            message.image?.caption ||
            message.document?.filename ||
            (message.audio ? "Mensaje de voz" : undefined) ||
            "[Media/Other]";

          if (message.id) {
            const { data: existingMessage, error: existingMessageError } =
              await supabase
                .from("messages")
                .select("id")
                .eq("wa_message_id", message.id)
                .maybeSingle();

            if (existingMessageError) {
              console.error("Error checking duplicate message:", {
                messageId: message.id,
                error: existingMessageError,
              });
            }

            if (existingMessage) {
              console.log("Skipping duplicate message", {
                messageId: message.id,
              });
              continue;
            }
          }

          const messageTimestampMs = message.timestamp
            ? parseInt(message.timestamp, 10) * 1000
            : Date.now();
          const messageTimestampIso = new Date(messageTimestampMs)
            .toISOString();

          const { error: messageError } = await supabase.from("messages")
            .insert({
              chat_id: chatRecord.id,
              chat_session_id: null, // No session linking
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
                conversation_id: null,
              },
              wa_timestamp: messageTimestampIso,
              sender_name: name,
              media_id: mediaId,
              media_path: mediaPath,
              media_url: mediaUrl,
              media_mime_type: mediaMime,
              created_at: messageTimestampIso,
            });

          if (messageError) {
            console.error("Error inserting message:", messageError);
            continue;
          }

          const { error: queueError } = await supabase.rpc(
            "accumulate_whatsapp_message",
            {
              p_chat_id: chatRecord.id,
              p_new_text: messageBody ?? "",
            },
          );

          if (queueError) {
            console.error("Error accumulating message queue:", queueError);
          } else {
            chatsToProcess.add(chatRecord.id);
          }
        }

        for (const chatId of chatsToProcess) {
          const { error: functionError } = await supabase.functions.invoke(
            "process-whatsapp-queue",
            {
              body: { chat_id: chatId },
            },
          );

          if (functionError) {
            console.error(
              "Error invoking process-whatsapp-queue:",
              functionError,
            );
          }
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
