"use server";

import { createClient } from "@/src/lib/supabase/server";
import { sendWhatsAppText } from "@/src/lib/whatsapp";
import { revalidatePath } from "next/cache";

export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const chatId = formData.get("chatId") as string;
  const messageBody = formData.get("message") as string;

  if (!chatId || !messageBody) {
    return { error: "Chat ID and message are required" };
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

  // 3. Call WhatsApp Graph API
  try {
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

    // 4. Store Message in DB
    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chatId,
      wa_message_id: messageId,
      body: messageBody,
      type: "text",
      status: "sent", // Optimistic status
      sent_at: new Date().toISOString(),
      sender_profile_id: user.id,
      sender_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
      created_at: new Date().toISOString(),
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
