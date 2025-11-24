"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
  sendWhatsAppDocument,
  sendWhatsAppImage,
  sendWhatsAppText,
  uploadWhatsAppMedia,
} from "@/src/lib/whatsapp";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
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

  if (!chatId || (!messageBody && !media)) {
    return { error: "Chat ID and at least a message or image are required" };
  }

  // 1. Fetch Chat Details to get recipient and organization
  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("wa_id, organization_id")
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    console.error("Error fetching chat:", chatError);
    return { error: "Chat not found" };
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
    .select("first_name, last_name")
    .eq("id", user.id)
    .single();

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { error: "System WhatsApp Access Token not configured" };
  }

  const createdAt = new Date().toISOString();
  let waMessageId: string | undefined;
  let payload: Record<string, any> | undefined;
  let type: "text" | "image" | "document" = "text";
  let bodyToStore = messageBody;
  let mediaId: string | undefined;
  let mediaUrl: string | undefined;
  let mediaPath: string | undefined;
  let fileName: string | undefined;

  // 3. Upload media if present, then send
  try {
    if (media) {
      const mimeType = media.type || "application/octet-stream";
      fileName = media.name || undefined;
      const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isDoc = ALLOWED_DOC_TYPES.includes(mimeType);

      if (!isImage && !isDoc) {
        return { error: "Tipo de archivo no permitido. Usa PDF, DOC(X), XLS(X), PPT(X), TXT o imagen JPEG/PNG." };
      }

      if (isImage && media.size > MAX_IMAGE_BYTES) {
        return { error: "La imagen debe pesar máximo 5 MB" };
      }
      if (isDoc && media.size > MAX_DOC_BYTES) {
        return { error: "El archivo debe pesar máximo 100 MB" };
      }

      const { mediaId: uploadedMediaId, error: uploadError } = await uploadWhatsAppMedia({
        phoneNumberId: org.phone_number_id,
        accessToken,
        file: media,
        mimeType,
        fileName: media.name || `image-${Date.now()}.jpg`,
      });

      if (uploadError || !uploadedMediaId) {
        console.error("WhatsApp media upload error:", uploadError);
        return { error: `Error subiendo imagen: ${uploadError || "sin detalle"}` };
      }

      let sendResult:
        | { messageId?: string; error?: string }
        | undefined;

      if (isImage) {
        sendResult = await sendWhatsAppImage({
          phoneNumberId: org.phone_number_id,
          accessToken,
          to: chat.wa_id,
          mediaId: uploadedMediaId,
          caption: caption || messageBody || undefined,
        });
      } else {
        sendResult = await sendWhatsAppDocument({
          phoneNumberId: org.phone_number_id,
          accessToken,
          to: chat.wa_id,
          mediaId: uploadedMediaId,
          fileName,
          caption: caption || messageBody || undefined,
        });
      }

      if (sendResult?.error) {
        console.error("WhatsApp API Error (media):", sendResult.error);
        return { error: `WhatsApp API Error: ${sendResult.error}` };
      }

      waMessageId = sendResult?.messageId;
      type = isImage ? "image" : "document";
      bodyToStore = caption || messageBody || fileName || "";
      mediaId = uploadedMediaId;
      // Store a copy in Supabase Storage
      try {
        const buffer = Buffer.from(await media.arrayBuffer());
        const storagePath = `chats/${chatId}/${uploadedMediaId}-${media.name}`;
        const { path: storedPath, error: storageError } = await (await import("@/src/lib/storage")).uploadToStorage({
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
      const { messageId, error } = await sendWhatsAppText({
        phoneNumberId: org.phone_number_id,
        accessToken,
        to: chat.wa_id,
        body: messageBody,
      });

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
      type,
      status: "sent", // Optimistic status
      sent_at: createdAt,
      sender_profile_id: user.id,
      sender_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
      payload,
      media_id: mediaId,
      media_url: mediaPath ? `/api/storage/media?path=${encodeURIComponent(mediaPath)}` : mediaUrl,
      media_path: mediaPath,
      created_at: createdAt,
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
