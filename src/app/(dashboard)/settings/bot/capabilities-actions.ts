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

  const allowed = await checkPermission(supabase, user.id, "settings", "manage_bot");
  if (!allowed) {
    return { supabase: null, profile: null, error: "Sin permisos para editar el bot" };
  }

  return { supabase, profile };
}

export async function saveCapability(prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const id = (formData.get("id") as string | null) || undefined;
  const slug = (formData.get("slug") as string | null)?.trim().toLowerCase();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null) || null;
  const instructions = (formData.get("instructions") as string | null) || null;
  const response_template = (formData.get("response_template") as string | null) || null;
  const type = (formData.get("type") as string | null) || "custom";
  const priority = Number(formData.get("priority") || 0);
  const enabled = (formData.get("enabled") as string | null) === "on";
  const allow_complaints = (formData.get("allow_complaints") as string | null) === "on";

  if (!slug || !title) {
    return { error: "Slug y título son requeridos" };
  }

  const { error } = await ctx.supabase
    .from("bot_capabilities")
    .upsert(
      {
        id,
        organization_id: ctx.profile.organization_id,
        slug,
        title,
        description,
        instructions,
        response_template,
        type,
        priority,
        enabled,
        metadata: { allow_complaints },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,slug" }
    );

  if (error) {
    console.error("saveCapability error", error);
    return { error: "No se pudo guardar la capacidad" };
  }

  revalidatePath("/settings/bot");
  return { success: "Capacidad guardada" };
}

export async function deleteCapability(formData: FormData): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const id = formData.get("id") as string | null;
  if (!id) {
    return { error: "Falta la capacidad a eliminar" };
  }

  const { error } = await ctx.supabase
    .from("bot_capabilities")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.profile.organization_id);

  if (error) {
    console.error("deleteCapability error", error);
    return { error: "No se pudo eliminar la capacidad" };
  }

  revalidatePath("/settings/bot");
  return { success: "Capacidad eliminada" };
}

export async function saveCapabilityContact(
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const capability_id = formData.get("capability_id") as string | null;
  if (!capability_id) return { error: "Falta la capacidad para el contacto" };

  const { data: capability } = await ctx.supabase
    .from("bot_capabilities")
    .select("id, organization_id")
    .eq("id", capability_id)
    .eq("organization_id", ctx.profile.organization_id)
    .single();

  if (!capability) return { error: "Capacidad no encontrada" };

  const id = (formData.get("id") as string | null) || undefined;
  const name = (formData.get("name") as string | null)?.trim();
  const role = (formData.get("role") as string | null) || null;
  const email = (formData.get("email") as string | null) || null;
  const phone = (formData.get("phone") as string | null) || null;
  const notes = (formData.get("notes") as string | null) || null;
  const priority = Number(formData.get("priority") || 0);
  const is_active = (formData.get("is_active") as string | null) === "on";

  if (!name) return { error: "El nombre es requerido" };

  const { error } = await ctx.supabase.from("bot_capability_contacts").upsert({
    id,
    capability_id,
    organization_id: ctx.profile.organization_id,
    name,
    role,
    email,
    phone,
    notes,
    priority,
    is_active,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveCapabilityContact error", error);
    return { error: "No se pudo guardar el contacto" };
  }

  revalidatePath("/settings/bot");
  return { success: "Contacto guardado" };
}

export async function deleteCapabilityContact(formData: FormData): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const id = formData.get("id") as string | null;
  if (!id) return { error: "Falta el contacto a eliminar" };

  const { error } = await ctx.supabase
    .from("bot_capability_contacts")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.profile.organization_id);

  if (error) {
    console.error("deleteCapabilityContact error", error);
    return { error: "No se pudo eliminar el contacto" };
  }

  revalidatePath("/settings/bot");
  return { success: "Contacto eliminado" };
}

export async function saveCapabilityFinance(
  prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const capability_id = formData.get("capability_id") as string | null;
  if (!capability_id) return { error: "Falta la capacidad para la info financiera" };

  const { data: capability } = await ctx.supabase
    .from("bot_capabilities")
    .select("id, organization_id")
    .eq("id", capability_id)
    .eq("organization_id", ctx.profile.organization_id)
    .single();

  if (!capability) return { error: "Capacidad no encontrada" };

  const id = (formData.get("id") as string | null) || undefined;
  const item = (formData.get("item") as string | null)?.trim();
  const value = (formData.get("value") as string | null)?.trim();
  const notes = (formData.get("notes") as string | null) || null;
  const valid_from = (formData.get("valid_from") as string | null) || null;
  const valid_to = (formData.get("valid_to") as string | null) || null;
  const priority = Number(formData.get("priority") || 0);
  const is_active = (formData.get("is_active") as string | null) === "on";

  if (!item || !value) return { error: "Item y valor son requeridos" };

  const { error } = await ctx.supabase.from("bot_capability_finance").upsert({
    id,
    capability_id,
    organization_id: ctx.profile.organization_id,
    item,
    value,
    notes,
    valid_from,
    valid_to,
    priority,
    is_active,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("saveCapabilityFinance error", error);
    return { error: "No se pudo guardar la información financiera" };
  }

  revalidatePath("/settings/bot");
  return { success: "Información guardada" };
}

export async function deleteCapabilityFinance(formData: FormData): Promise<ActionState> {
  const ctx = await getProfileAndOrg();
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const id = formData.get("id") as string | null;
  if (!id) return { error: "Falta el registro a eliminar" };

  const { error } = await ctx.supabase
    .from("bot_capability_finance")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.profile.organization_id);

  if (error) {
    console.error("deleteCapabilityFinance error", error);
    return { error: "No se pudo eliminar el registro" };
  }

  revalidatePath("/settings/bot");
  return { success: "Registro eliminado" };
}
