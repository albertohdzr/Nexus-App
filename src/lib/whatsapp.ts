type SendWhatsAppTextParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
};

type UploadWhatsAppMediaParams = {
  phoneNumberId: string;
  accessToken: string;
  file: File | Blob;
  mimeType: string;
  fileName?: string;
};

type SendWhatsAppImageParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
  caption?: string;
};

type SendWhatsAppDocumentParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
  fileName?: string;
  caption?: string;
};

type SendWhatsAppAudioParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
  voice?: boolean;
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

export async function uploadWhatsAppMedia({
  phoneNumberId,
  accessToken,
  file,
  mimeType,
  fileName,
}: UploadWhatsAppMediaParams): Promise<{ mediaId?: string; error?: string }> {
  const fileToUpload =
    file instanceof File
      ? file
      : new File([file], fileName || `media-${Date.now()}`, { type: mimeType });

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("file", fileToUpload, fileName || fileToUpload.name);

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data?.error?.message || "Unknown WhatsApp API error";
    return { error: errorMessage };
  }

  return { mediaId: data.id as string };
}

export async function sendWhatsAppImage({
  phoneNumberId,
  accessToken,
  to,
  mediaId,
  caption,
}: SendWhatsAppImageParams): Promise<{ messageId?: string; error?: string }> {
  let recipientNumber = to;
  if (recipientNumber.startsWith("521")) {
    recipientNumber = "52" + recipientNumber.slice(3);
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "image",
    image: {
      id: mediaId,
      caption,
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
    const errorMessage = data?.error?.message || "Unknown WhatsApp API error";
    return { error: errorMessage };
  }

  const messageId = data.messages?.[0]?.id as string | undefined;
  return { messageId };
}

export async function sendWhatsAppAudio({
  phoneNumberId,
  accessToken,
  to,
  mediaId,
  voice,
}: SendWhatsAppAudioParams): Promise<{ messageId?: string; error?: string }> {
  let recipientNumber = to;
  if (recipientNumber.startsWith("521")) {
    recipientNumber = "52" + recipientNumber.slice(3);
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "audio",
    audio: {
      id: mediaId,
      voice: voice ?? false,
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
    const errorMessage = data?.error?.message || "Unknown WhatsApp API error";
    return { error: errorMessage };
  }

  const messageId = data.messages?.[0]?.id as string | undefined;
  return { messageId };
}

export async function sendWhatsAppDocument({
  phoneNumberId,
  accessToken,
  to,
  mediaId,
  fileName,
  caption,
}: SendWhatsAppDocumentParams): Promise<{ messageId?: string; error?: string }> {
  let recipientNumber = to;
  if (recipientNumber.startsWith("521")) {
    recipientNumber = "52" + recipientNumber.slice(3);
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "document",
    document: {
      id: mediaId,
      caption,
      filename: fileName,
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
    const errorMessage = data?.error?.message || "Unknown WhatsApp API error";
    return { error: errorMessage };
  }

  const messageId = data.messages?.[0]?.id as string | undefined;
  return { messageId };
}
