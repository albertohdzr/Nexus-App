export type Organization = {
  id: string;
  name: string;
  slug: string;
  display_phone_number?: string;
  phone_number_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Chat = {
  id: string;
  wa_id: string;
  name: string;
  phone_number: string;
  organization_id: string;
  updated_at: string;
  last_message?: string;
};

export type Message = {
  id: string;
  chat_id: string;
  body: string;
  type: string;
  status: string;
  created_at: string;
  wa_message_id: string;
  payload?: any;
};

export type UserProfile = {
  id: string;
  organization_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
};
