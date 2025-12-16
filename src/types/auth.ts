export type UserProfile = {
  id: string;
  organization_id: string;
  role: string;
  first_name: string;
  middle_name?: string | null;
  last_name_paternal: string;
  last_name_maternal?: string | null;
  full_name: string;
  email: string;
  is_active: boolean;
};
