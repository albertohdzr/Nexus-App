"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { checkPermission, getProfileWithRole } from "@/src/lib/permissions-server";

type RolePermissionsPayload = Record<string, Record<string, boolean>>;

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function getRolesContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado", supabase: null, profile: null };
  }

  const { profile, error } = await getProfileWithRole(supabase, user.id);
  if (error || !profile?.organization_id) {
    return { error: "No se encontró tu organización", supabase: null, profile: null };
  }

  const allowed = await checkPermission(supabase, user.id, "settings", "manage_roles");
  if (!allowed) {
    return { error: "Sin permisos para gestionar roles", supabase: null, profile: null };
  }

  return { supabase, profile };
}

export async function createRole(formData: FormData) {
  const ctx = await getRolesContext();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const name = (formData.get("name") as string | null)?.trim() || "";
  const slugInput = (formData.get("slug") as string | null)?.trim() || "";
  const description = (formData.get("description") as string | null) || null;
  const slug = normalizeSlug(slugInput || name);

  if (!name || !slug) {
    return { error: "Nombre y slug son obligatorios" };
  }

  const { error } = await ctx.supabase.from("roles").insert({
    organization_id: ctx.profile.organization_id,
    name,
    slug,
    description,
    is_system: false,
  });

  if (error) {
    console.error("Create role error", error);
    return { error: "No se pudo crear el rol" };
  }

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function updateRolePermissions(formData: FormData) {
  const ctx = await getRolesContext();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const roleId = (formData.get("role_id") as string | null) || "";
  const permissionsRaw = (formData.get("permissions") as string | null) || "";

  if (!roleId || !permissionsRaw) {
    return { error: "Faltan datos de permisos" };
  }

  let permissions: RolePermissionsPayload;
  try {
    permissions = JSON.parse(permissionsRaw) as RolePermissionsPayload;
  } catch {
    return { error: "Formato de permisos invalido" };
  }

  const { data: role } = await ctx.supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .eq("organization_id", ctx.profile.organization_id)
    .single();

  if (!role) {
    return { error: "Rol invalido" };
  }

  const updates = Object.entries(permissions).map(([module, perms]) => ({
    role_id: roleId,
    module,
    permissions: perms,
    updated_at: new Date().toISOString(),
  }));

  if (!updates.length) {
    return { error: "No hay permisos para guardar" };
  }

  const { error } = await ctx.supabase
    .from("role_permissions")
    .upsert(updates, { onConflict: "role_id,module" });

  if (error) {
    console.error("Update permissions error", error);
    return { error: "No se pudieron guardar los permisos" };
  }

  revalidatePath("/settings/roles");
  return { success: true };
}
