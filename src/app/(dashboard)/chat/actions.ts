"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_AUDIO_TYPES = [
  "audio/aac",
  "audio/amr",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/ogg; codecs=opus",
  "audio/opus",
];
const MAX_AUDIO_BYTES = 16 * 1024 * 1024; // 16 MB
const ALLOWED_DOC_TYPES = [
  "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/pdf",
];
const MAX_DOC_BYTES = 100 * 1024 * 1024; // 100 MB

type FastApiWhatsAppResponse = {
  message_id?: string;
  media_id?: string;
  error?: string;
};

function getChatApiConfig() {
  const apiBase = process.env.CHAT_API_URL || "http://127.0.0.1:8000";
  const apiSecret = process.env.API_SECRET;
  if (!apiSecret) {
    return { error: "System Chat API secret not configured" };
  }
  return { apiBase, apiSecret };
}

async function callChatApi(
  path: string,
  payload: Record<string, unknown>,
): Promise<FastApiWhatsAppResponse> {
  const config = getChatApiConfig();
  if ("error" in config) {
    return { error: config.error };
  }

  const response = await fetch(`${config.apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": config.apiSecret,
    },
    body: JSON.stringify(payload),
  });

  let data: FastApiWhatsAppResponse = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    return {
      error:
        data.error ||
        (typeof data === "object" && "detail" in data
          ? String(data.detail)
          : `Chat API error ${response.status}`),
    };
  }

  return data;
}

async function uploadMediaViaChatApi({
  phoneNumberId,
  file,
  mimeType,
  fileName,
}: {
  phoneNumberId: string;
  file: File;
  mimeType: string;
  fileName?: string;
}) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await callChatApi("/whatsapp/send/media", {
    phone_number_id: phoneNumberId,
    media_base64: buffer.toString("base64"),
    mime_type: mimeType,
    file_name: fileName,
  });
  return { mediaId: result.media_id, error: result.error };
}

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const chatId = formData.get("chatId") as string;
  const messageBody = (formData.get("message") as string) || "";
  const caption = (formData.get("caption") as string) || "";
  const media = formData.get("media") as File | null;
  const isVoice = (formData.get("isVoice") as string) === "true";

  if (!chatId || (!messageBody && !media)) {
    return { error: "Chat ID and at least a message or image are required" };
  }

  // 1. Fetch Chat Details to get recipient and organization
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("wa_id, organization_id, active_session_id")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    console.error("Error fetching chat:", chatError);
    return { error: "Chat not found" };
  }

  // 1.5 Handle Active Session
  let activeSessionId = chat.active_session_id;

  // We only auto-create session if we are the user (agent) initiating or replying
  // For now, sendMessage is always triggered by the agent/user app side.
  if (!activeSessionId) {
    const { data: newSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: chat.organization_id,
        chat_id: chatId,
        status: "active",
        ai_enabled: false, // Default to false when agent initiates
        summary: "Sesión iniciada por agente",
      })
      .select("id")
      .single();

    if (sessionError || !newSession) {
      console.error("Error creating new session:", sessionError);
      return { error: "Failed to create chat session" };
    }

    activeSessionId = newSession.id;

    // Update chat with new session
    const { error: updateChatError } = await supabase
      .from("chats")
      .update({
        active_session_id: activeSessionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);

    if (updateChatError) {
      console.error("Error updating chat with session:", updateChatError);
    }
  }

  // 2. Fetch Organization Details to get phone_number_id
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("phone_number_id")
    .eq("id", chat.organization_id)
    .single();

  if (orgError || !org) {
    console.error("Error fetching organization:", orgError);
    return { error: "Organization not found" };
  }

  if (!org.phone_number_id) {
    return { error: "Organization WhatsApp not configured" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, first_name, last_name_paternal, last_name_maternal")
    .eq("id", user.id)
    .single();

  const createdAt = new Date().toISOString();
  let waMessageId: string | undefined;
  let payload: Record<string, unknown> | undefined;
  let type: "text" | "image" | "document" | "audio" = "text";
  let bodyToStore = messageBody;
  let mediaId: string | undefined;
  let mediaUrl: string | undefined;
  let mediaPath: string | undefined;
  let fileName: string | undefined;
  let mediaMimeType: string | undefined;

  // 3. Upload media if present, then send
  try {
    if (media) {
      const mimeType = media.type || "application/octet-stream";
      fileName = media.name || undefined;
      const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isDoc = ALLOWED_DOC_TYPES.includes(mimeType);
      const isAudio = ALLOWED_AUDIO_TYPES.includes(mimeType);

      if (!isImage && !isDoc && !isAudio) {
        return {
          error:
            "Tipo de archivo no permitido. Usa PDF, DOC(X), XLS(X), PPT(X), TXT, audio (AAC/AMR/MP3/MP4/OGG) o imagen JPEG/PNG.",
        };
      }

      if (isImage && media.size > MAX_IMAGE_BYTES) {
        return { error: "La imagen debe pesar máximo 5 MB" };
      }
      if (isDoc && media.size > MAX_DOC_BYTES) {
        return { error: "El archivo debe pesar máximo 100 MB" };
      }
      if (isAudio && media.size > MAX_AUDIO_BYTES) {
        return { error: "El audio debe pesar máximo 16 MB" };
      }

      const { mediaId: uploadedMediaId, error: uploadError } =
        await uploadMediaViaChatApi({
          phoneNumberId: org.phone_number_id,
          file: media,
          mimeType,
          fileName: media.name || `media-${Date.now()}`,
        });

      if (uploadError || !uploadedMediaId) {
        console.error("WhatsApp media upload error:", uploadError);
        return {
          error: `Error subiendo imagen: ${uploadError || "sin detalle"}`,
        };
      }

      let sendResult:
        | { messageId?: string; error?: string }
        | undefined;

      if (isImage) {
        const result = await callChatApi("/whatsapp/send/image", {
          phone_number_id: org.phone_number_id,
          to: chat.wa_id,
          media_id: uploadedMediaId,
          caption: caption || messageBody || null,
        });
        sendResult = { messageId: result.message_id, error: result.error };
      } else if (isDoc) {
        const result = await callChatApi("/whatsapp/send/document", {
          phone_number_id: org.phone_number_id,
          to: chat.wa_id,
          media_id: uploadedMediaId,
          file_name: fileName || null,
          caption: caption || messageBody || null,
        });
        sendResult = { messageId: result.message_id, error: result.error };
      } else {
        const result = await callChatApi("/whatsapp/send/audio", {
          phone_number_id: org.phone_number_id,
          to: chat.wa_id,
          media_id: uploadedMediaId,
          voice: isVoice,
        });
        sendResult = { messageId: result.message_id, error: result.error };
      }

      if (sendResult?.error) {
        console.error("WhatsApp API Error (media):", sendResult.error);
        return { error: `WhatsApp API Error: ${sendResult.error}` };
      }

      waMessageId = sendResult?.messageId;
      type = isImage ? "image" : isDoc ? "document" : "audio";
      bodyToStore = caption || messageBody || fileName ||
        (isVoice ? "Mensaje de voz" : "");
      mediaId = uploadedMediaId;
      mediaMimeType = mimeType;
      // Store a copy in Supabase Storage
      try {
        const buffer = Buffer.from(await media.arrayBuffer());
        const storagePath = `chats/${chatId}/${uploadedMediaId}-${media.name}`;
        const { path: storedPath, error: storageError } =
          await (await import("@/src/lib/storage")).uploadToStorage({
            file: buffer,
            path: storagePath,
            contentType: mimeType,
          });
        if (storageError) {
          console.error("Storage upload error:", storageError);
        } else {
          mediaPath = storedPath;
        }
      } catch (storageErr) {
        console.error("Storage upload unexpected error:", storageErr);
      }
      payload = {
        media_id: uploadedMediaId,
        media_mime_type: mimeType,
        media_file_name: media.name,
        caption: caption || null,
      };
    } else {
      const result = await callChatApi("/whatsapp/send/text", {
        phone_number_id: org.phone_number_id,
        to: chat.wa_id,
        body: messageBody,
      });
      const messageId = result.message_id;
      const error = result.error;

      if (error) {
        console.error("WhatsApp API Error:", error);
        return { error: `WhatsApp API Error: ${error}` };
      }

      waMessageId = messageId;
    }

    // 4. Store Message in DB
    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chatId,
      wa_message_id: waMessageId,
      body: bodyToStore,
      direction: "outbound",
      role: "agent",
      type,
      status: "sent", // Optimistic status
      sent_at: createdAt,
      sender_profile_id: user.id,
      sender_name: profile
        ? profile.full_name ||
          `${profile.first_name} ${profile.last_name_paternal || ""}`.trim()
        : null,
      payload,
      media_id: mediaId,
      media_url: mediaPath
        ? `/api/storage/media?path=${encodeURIComponent(mediaPath)}`
        : mediaUrl,
      media_path: mediaPath,
      media_mime_type: mediaMimeType,
      created_at: createdAt,
      chat_session_id: activeSessionId,
    });

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return { error: "Message sent but failed to save to database" };
    }

    revalidatePath("/chat");
    return { success: true };
  } catch (error) {
    console.error("Error sending message:", error);
    return { error: "Failed to send message" };
  }
}

export async function exportConversation(
  chatId: string
): Promise<{ html?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado" };
  }

  // Fetch chat info
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id, name, wa_id, phone_number, created_at")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    return { error: "Chat no encontrado" };
  }

  // Fetch all messages
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return { error: "Error obteniendo mensajes" };
  }

  if (!messages || messages.length === 0) {
    return { error: "No hay mensajes para exportar" };
  }

  // Group messages by date
  const grouped: Record<string, typeof messages> = {};
  for (const msg of messages) {
    const ts = msg.wa_timestamp || msg.created_at;
    const dateKey = format(new Date(ts), "yyyy-MM-dd");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(msg);
  }

  const contactName = chat.name || chat.phone_number || chat.wa_id;
  const exportDate = format(new Date(), "d 'de' MMMM 'de' yyyy, HH:mm", {
    locale: es,
  });

  // Build messages HTML
  let messagesHtml = "";
  for (const [dateKey, dayMessages] of Object.entries(grouped)) {
    const dateLabel = format(new Date(dateKey), "EEEE d 'de' MMMM 'de' yyyy", {
      locale: es,
    });
    // Capitalize first letter
    const capitalizedDate =
      dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

    messagesHtml += `
      <div style="text-align:center;margin:24px 0 16px;">
        <span style="background:#e2ddd5;color:#54656f;font-size:12px;padding:6px 14px;border-radius:8px;font-weight:500;display:inline-block;box-shadow:0 1px 1px rgba(0,0,0,0.08);">
          ${capitalizedDate}
        </span>
      </div>
    `;

    for (const msg of dayMessages) {
      const isInbound = msg.direction === "inbound";
      const ts = msg.wa_timestamp || msg.created_at;
      const time = format(new Date(ts), "HH:mm");
      const senderName = msg.sender_name || (isInbound ? contactName : "Tú");
      const messageType: string = msg.type || "text";

      // Status indicator
      let statusIcon = "";
      if (!isInbound) {
        if (msg.status === "read") {
          statusIcon = `<span style="color:#53bdeb;font-size:13px;margin-left:3px;">✓✓</span>`;
        } else if (msg.status === "delivered") {
          statusIcon = `<span style="color:#667781;font-size:13px;margin-left:3px;">✓✓</span>`;
        } else {
          statusIcon = `<span style="color:#667781;font-size:13px;margin-left:3px;">✓</span>`;
        }
      }

      // Message body content
      let bodyContent = "";
      const bodyText = (msg.body || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

      if (messageType === "image") {
        bodyContent = `
          <div style="background:#f0f2f5;border-radius:6px;padding:12px;margin-bottom:4px;text-align:center;">
            <span style="color:#667781;font-size:13px;">📷 Imagen</span>
          </div>
          ${bodyText ? `<div style="margin-top:4px;">${bodyText}</div>` : ""}
        `;
      } else if (messageType === "audio") {
        bodyContent = `
          <div style="background:#f0f2f5;border-radius:6px;padding:12px;display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:16px;">🎙️</span>
            <span style="color:#667781;font-size:13px;">Mensaje de voz</span>
          </div>
        `;
      } else if (messageType === "document") {
        const fileName =
          msg.payload?.media_file_name || msg.body || "Documento";
        bodyContent = `
          <div style="background:#f0f2f5;border-radius:6px;padding:12px;display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:16px;">📄</span>
            <span style="color:#111b21;font-size:13px;font-weight:500;">${String(fileName).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
          </div>
        `;
      } else {
        bodyContent = bodyText || "<em style='color:#8696a0;'>Mensaje vacío</em>";
      }

      // Bubble styles
      const bubbleBg = isInbound ? "#ffffff" : "#d9fdd3";
      const bubbleAlign = isInbound ? "flex-start" : "flex-end";
      const senderColor = isInbound ? "#06cf9c" : "#667781";

      messagesHtml += `
        <div style="display:flex;justify-content:${bubbleAlign};margin-bottom:3px;padding:0 62px;">
          <div style="background:${bubbleBg};max-width:65%;padding:6px 7px 4px 9px;border-radius:8px;${isInbound ? "border-top-left-radius:0;" : "border-top-right-radius:0;"}box-shadow:0 1px 0.5px rgba(11,20,26,0.13);position:relative;">
            <div style="font-size:12.5px;font-weight:600;color:${senderColor};margin-bottom:2px;">
              ${senderName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
            </div>
            <div style="font-size:14.2px;line-height:19px;color:#111b21;word-wrap:break-word;">
              ${bodyContent}
            </div>
            <div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:2px;">
              <span style="font-size:11px;color:#667781;">${time}</span>
              ${statusIcon}
            </div>
          </div>
        </div>
      `;
    }
  }

  // Full HTML document
  const totalMessages = messages.length;
  const inboundCount = messages.filter(
    (m) => m.direction === "inbound"
  ).length;
  const outboundCount = totalMessages - inboundCount;
  const firstDate = format(
    new Date(messages[0].wa_timestamp || messages[0].created_at),
    "d MMM yyyy",
    { locale: es }
  );
  const lastDate = format(
    new Date(
      messages[messages.length - 1].wa_timestamp ||
        messages[messages.length - 1].created_at
    ),
    "d MMM yyyy",
    { locale: es }
  );

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conversación con ${contactName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #dbd3c9; min-height: 100vh; }

    .export-header { background: linear-gradient(135deg, #075e54, #128c7e, #25d366); padding: 32px 24px; color: white; text-align: center; }
    .export-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.15); }
    .export-header p { font-size: 14px; opacity: 0.9; margin-bottom: 4px; }
    .export-header .phone { font-size: 13px; opacity: 0.75; }

    .stats-bar { display: flex; justify-content: center; gap: 24px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #e9e5df; flex-wrap: wrap; }
    .stat-item { text-align: center; }
    .stat-value { font-size: 18px; font-weight: 700; color: #075e54; }
    .stat-label { font-size: 11px; color: #667781; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; margin-top: 2px; }

    .messages-container { background: #efeae2; padding: 8px 0 24px; position: relative; min-height: 200px; }
    .messages-container::before {
      content: '';
      position: absolute;
      inset: 0;
      opacity: 0.06;
      pointer-events: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%23000'%3E%3Cpath d='M20 20h4v4h-4zM40 30h4v4h-4zM70 15h4v4h-4zM100 45h4v4h-4zM130 20h4v4h-4zM160 50h4v4h-4zM25 70h4v4h-4zM55 80h4v4h-4zM85 65h4v4h-4zM115 90h4v4h-4zM145 75h4v4h-4zM175 85h4v4h-4zM10 120h4v4h-4zM45 140h4v4h-4zM75 110h4v4h-4zM110 135h4v4h-4zM140 115h4v4h-4zM170 145h4v4h-4zM30 170h4v4h-4zM60 160h4v4h-4zM90 180h4v4h-4zM120 165h4v4h-4zM150 185h4v4h-4zM180 170h4v4h-4z'/%3E%3C/svg%3E");
    }

    .export-footer { background: #fff; padding: 20px 24px; text-align: center; border-top: 1px solid #e9e5df; }
    .export-footer p { font-size: 12px; color: #8696a0; }
    .export-footer .brand { font-weight: 600; color: #075e54; }

    @media print {
      body { background: white; }
      .messages-container { background: #f5f5f5; }
      .export-header { break-after: avoid; }
    }

    @media (max-width: 600px) {
      .messages-container div[style*="padding:0 62px"] { padding: 0 12px !important; }
      .export-header h1 { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="export-header">
    <h1>💬 ${contactName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
    <p>${chat.phone_number || chat.wa_id}</p>
    <p class="phone">Exportado el ${exportDate}</p>
  </div>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-value">${totalMessages}</div>
      <div class="stat-label">Mensajes totales</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${inboundCount}</div>
      <div class="stat-label">Recibidos</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${outboundCount}</div>
      <div class="stat-label">Enviados</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${firstDate}</div>
      <div class="stat-label">Primer mensaje</div>
    </div>
    <div class="stat-item">
      <div class="stat-value">${lastDate}</div>
      <div class="stat-label">Último mensaje</div>
    </div>
  </div>

  <div class="messages-container">
    ${messagesHtml}
  </div>

  <div class="export-footer">
    <p>Exportado desde <span class="brand">Nexus App</span> &mdash; ${totalMessages} mensajes del ${firstDate} al ${lastDate}</p>
  </div>
</body>
</html>`;

  return { html };
}
