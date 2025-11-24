"use server";

import { createClient } from "@/src/lib/supabase/server";
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

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { error: "System WhatsApp Access Token not configured" };
  }

  // 3. Call WhatsApp Graph API
  try {
    // Fix Mexican phone numbers: remove extra "1" if number starts with 521
    let recipientNumber = chat.wa_id;
    if (recipientNumber.startsWith("521")) {
      recipientNumber = "52" + recipientNumber.slice(3);
    }
    
    const body = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientNumber,
      type: "text",
      text: {
        preview_url: false,
        body: messageBody,
      },
    };
    console.log("Body:", body);
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${org.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API Error:", data);
      return { error: `WhatsApp API Error: ${data.error?.message || "Unknown error"}` };
    }

    const waMessageId = data.messages?.[0]?.id;

    // 4. Store Message in DB
    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chatId,
      wa_message_id: waMessageId,
      body: messageBody,
      type: "text",
      status: "sent", // Optimistic status
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
