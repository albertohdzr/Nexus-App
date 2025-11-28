export type MessagePayload = {
  from?: string;
  handover?: boolean;
  reason?: string;
  model?: string;
  media_id?: string;
  media_mime_type?: string;
  media_file_name?: string;
  media_caption?: string;
  voice?: boolean;
  status_detail?: unknown;
};

export type Message = {
  id: string;
  chat_id: string;
  body: string;
  type: string;
  status: string;
  created_at: string;
  wa_message_id: string;
  wa_timestamp?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  sender_name?: string | null;
  media_id?: string | null;
  media_url?: string | null;
  media_path?: string | null;
  payload?: MessagePayload | Record<string, unknown> | null;
};

export type Chat = {
  id: string;
  wa_id: string;
  name: string;
  phone_number: string;
  organization_id?: string;
  updated_at?: string;
  last_message?: string;
  requested_handoff?: boolean;
  active_session_id?: string | null;
};
