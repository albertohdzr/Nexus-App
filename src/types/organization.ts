export type Organization = {
  id: string;
  name: string;
  slug: string;
  display_phone_number?: string;
  phone_number_id?: string;
  whatsapp_business_account_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan?: string | null;
  bot_name?: string | null;
  bot_instructions?: string | null;
  bot_tone?: string | null;
  bot_language?: string | null;
  bot_model?: string | null;
  bot_directory_enabled?: boolean;
};

export type OrganizationTableRow = Pick<
  Organization,
  "id" | "name" | "slug" | "plan" | "created_at"
>;
