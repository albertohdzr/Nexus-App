export type Organization = {
  id: string;
  name: string;
  slug: string;
  display_phone_number?: string;
  phone_number_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan?: string | null;
};

export type OrganizationTableRow = Pick<
  Organization,
  "id" | "name" | "slug" | "plan" | "created_at"
>;
