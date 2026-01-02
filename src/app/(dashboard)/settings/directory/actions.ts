"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { checkPermission } from "@/src/lib/permissions-server";

type ActionState = { error?: string; success?: string };

async function getProfileAndOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase: null, profile: null, error: "No autenticado" };
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, organization_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.organization_id) {
    return { supabase: null, profile: null, error: "No se encontró tu organización" };
  }

  const allowed = await checkPermission(supabase, user.id, "settings", "manage_directory");
  if (!allowed) {
    return { supabase: null, profile: null, error: "Sin permisos para editar el directorio" };
  }

  return { supabase, profile };
}

export async function saveDirectoryContact(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const id = (formData.get("id") as string | null) || undefined;
  const role_slug = (formData.get("role_slug") as string | null)?.trim().toLowerCase();
  const display_role = (formData.get("display_role") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const email = (formData.get("email") as string | null) || null;
  const phone = (formData.get("phone") as string | null) || null;
  const extension = (formData.get("extension") as string | null) || null;
  const mobile = (formData.get("mobile") as string | null) || null;
  const notes = (formData.get("notes") as string | null) || null;
  const allow_bot_share = (formData.get("allow_bot_share") as string | null) === "on";
  const share_email = (formData.get("share_email") as string | null) === "on";
  const share_phone = (formData.get("share_phone") as string | null) === "on";
  const share_extension = (formData.get("share_extension") as string | null) === "on";
  const share_mobile = (formData.get("share_mobile") as string | null) === "on";
  const is_active = (formData.get("is_active") as string | null) !== "off";

  if (!role_slug || !display_role || !name) {
    return { error: "Slug, puesto y nombre son requeridos" };
  }

  const { error } = await ctx.supabase.from("directory_contacts").upsert({
    id,
    organization_id: ctx.profile.organization_id,
    role_slug,
    display_role,
    name,
    email,
    phone,
    extension,
    mobile,
    notes,
    allow_bot_share,
    share_email,
    share_phone,
    share_extension,
    share_mobile,
    is_active,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveDirectoryContact error", error);
    return { error: "No se pudo guardar el contacto" };
  }

  revalidatePath("/settings/directory");
  return { success: "Contacto guardado" };
}

export async function deleteDirectoryContact(formData: FormData): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const id = formData.get("id") as string | null;
  if (!id) return { error: "Falta el contacto a eliminar" };

  const { error } = await ctx.supabase
    .from("directory_contacts")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.profile.organization_id);

  if (error) {
    console.error("deleteDirectoryContact error", error);
    return { error: "No se pudo eliminar el contacto" };
  }

  revalidatePath("/settings/directory");
  return { success: "Contacto eliminado" };
}
