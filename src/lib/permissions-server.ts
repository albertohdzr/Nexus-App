import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRole = {
  id: string;
  organization_id: string | null;
  role_id: string | null;
  role?: {
    id: string;
    slug: string;
    name: string;
  } | null;
};

export async function getProfileWithRole(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: ProfileRole | null; error?: string }> {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, organization_id, role_id, role:roles(id, slug, name)")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { profile: null, error: "No se pudo cargar el perfil del usuario." };
  }

  const role = Array.isArray((profile as any).role) ? (profile as any).role[0] : (profile as any).role;
  return {
    profile: {
      id: profile.id,
      organization_id: profile.organization_id,
      role_id: profile.role_id,
      role: role ? { id: role.id, slug: role.slug, name: role.name } : null,
    },
  };
}

export async function checkPermission(
  supabase: SupabaseClient,
  userId: string,
  module: string,
  action = "access"
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_permission", {
    user_id: userId,
    req_module: module,
    req_action: action,
  });

  if (error) {
    return false;
  }

  return Boolean(data);
}
