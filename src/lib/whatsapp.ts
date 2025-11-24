type SendWhatsAppTextParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
};

export async function sendWhatsAppText({
  phoneNumberId,
  accessToken,
  to,
  body,
}: SendWhatsAppTextParams): Promise<{ messageId?: string; error?: string }> {
  let recipientNumber = to;
  if (recipientNumber.startsWith("521")) {
    recipientNumber = "52" + recipientNumber.slice(3);
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  };

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMessage =
      data?.error?.message || "Unknown WhatsApp API error";
    return { error: errorMessage };
  }

  const messageId = data.messages?.[0]?.id as string | undefined;
  return { messageId };
}
