export type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type WhatsAppMessage = {
  id: string;
  timestamp: string;
  type: string;
  from?: string;
  text?: { body?: string };
  image?: { id: string; mime_type?: string; caption?: string };
  document?: { id: string; mime_type?: string; filename?: string; sha256?: string };
  audio?: { id: string; mime_type?: string; voice?: boolean };
  [key: string]: unknown;
};

export type WhatsAppValue = {
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  metadata: { display_phone_number: string; phone_number_id: string };
};

export type SendWhatsAppTextParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
};

export type UploadWhatsAppMediaParams = {
  phoneNumberId: string;
  accessToken: string;
  file: File | Blob;
  mimeType: string;
  fileName?: string;
};

export type SendWhatsAppImageParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
  caption?: string;
};

export type SendWhatsAppDocumentParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
  fileName?: string;
  caption?: string;
};

export type SendWhatsAppAudioParams = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaId: string;
  voice?: boolean;
};
