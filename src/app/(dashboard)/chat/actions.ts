"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
  sendWhatsAppImage,
  sendWhatsAppText,
  uploadWhatsAppMedia,
} from "@/src/lib/whatsapp";
import { revalidatePath } from "next/cache";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];

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
  let type: "text" | "image" = "text";
  let bodyToStore = messageBody;

  // 3. Upload media if present, then send
  try {
    if (media) {
      const mimeType = media.type || "image/jpeg";
      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        return { error: "Solo se permiten imágenes JPEG o PNG" };
      }
      if (media.size > MAX_IMAGE_BYTES) {
        return { error: "La imagen debe pesar máximo 5 MB" };
      }

      const { mediaId, error: uploadError } = await uploadWhatsAppMedia({
        phoneNumberId: org.phone_number_id,
        accessToken,
        file: media,
        mimeType,
        fileName: media.name || `image-${Date.now()}.jpg`,
      });

      if (uploadError || !mediaId) {
        console.error("WhatsApp media upload error:", uploadError);
        return { error: `Error subiendo imagen: ${uploadError || "sin detalle"}` };
      }

      const { messageId, error } = await sendWhatsAppImage({
        phoneNumberId: org.phone_number_id,
        accessToken,
        to: chat.wa_id,
        mediaId,
        caption: caption || messageBody || undefined,
      });

      if (error) {
        console.error("WhatsApp API Error (image):", error);
        return { error: `WhatsApp API Error: ${error}` };
      }

      waMessageId = messageId;
      type = "image";
      bodyToStore = caption || messageBody || "";
      payload = {
        media_id: mediaId,
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
