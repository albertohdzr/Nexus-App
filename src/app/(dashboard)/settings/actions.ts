"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  checkPermission,
  getProfileWithRole,
} from "@/src/lib/permissions-server";

async function getSettingsContext(action: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", supabase: null, profile: null };
  }

  const { profile, error } = await getProfileWithRole(supabase, user.id);
  if (error || !profile?.organization_id) {
    return {
      error: "No se encontró tu organización",
      supabase: null,
      profile: null,
    };
  }

  const allowed = await checkPermission(supabase, user.id, "settings", action);
  if (!allowed) {
    return { error: "Insufficient permissions", supabase: null, profile: null };
  }

  return { supabase, profile, user };
}

export async function updateOrganization(formData: FormData) {
  const ctx = await getSettingsContext("manage_org");
  if (!ctx.supabase || !ctx.profile || !ctx.user) {
    return { error: ctx.error };
  }

  const id = formData.get("id") as string;

  if (!id) {
    return { error: "Organization ID is required" };
  }

  if (ctx.profile.organization_id !== id) {
    return { error: "You do not have permission to edit this organization" };
  }

  // Build update object dynamically to allow partial updates
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.has("name")) updateData.name = formData.get("name") as string;
  if (formData.has("display_phone_number")) {
    updateData.display_phone_number = formData.get(
      "display_phone_number",
    ) as string;
  }
  if (formData.has("phone_number_id")) {
    updateData.phone_number_id = formData.get("phone_number_id") as string;
  }
  if (formData.has("whatsapp_business_account_id")) {
    updateData.whatsapp_business_account_id = formData.get(
      "whatsapp_business_account_id",
    ) as string;
  }
  if (formData.has("bot_name")) {
    updateData.bot_name = (formData.get("bot_name") as string) || null;
  }
  if (formData.has("bot_instructions")) {
    updateData.bot_instructions =
      (formData.get("bot_instructions") as string) || null;
  }
  if (formData.has("bot_tone")) {
    updateData.bot_tone = (formData.get("bot_tone") as string) || null;
  }
  if (formData.has("bot_language")) {
    updateData.bot_language = (formData.get("bot_language") as string) || null;
  }
  if (formData.has("bot_model")) {
    updateData.bot_model = (formData.get("bot_model") as string) || null;
  }
  if (formData.has("bot_directory_enabled")) {
    updateData.bot_directory_enabled =
      (formData.get("bot_directory_enabled") as string | null) === "on";
  }

  const { data, error } = await ctx.supabase
    .from("organizations")
    .update(updateData)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("Error updating organization:", error);
    return { error: "Failed to update organization" };
  }

  if (!data || data.length === 0) {
    console.error("No rows updated. Check RLS policies or permissions.");
    return { error: "No changes saved. You might not have permission." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function createOrganizationKnowledge(formData: FormData) {
  const ctx = await getSettingsContext("manage_org");
  if (!ctx.supabase || !ctx.profile || !ctx.user) {
    return { error: ctx.error };
  }

  const organization_id = formData.get("organization_id") as string;
  const title = (formData.get("title") as string) || "";
  const category = (formData.get("category") as string) || null;
  const content = (formData.get("content") as string) || "";

  if (!organization_id) {
    return { error: "Organization ID is required" };
  }

  if (ctx.profile.organization_id !== organization_id) {
    return { error: "You do not have permission to edit this organization" };
  }
  const { error } = await ctx.supabase.from("organization_knowledge").insert({
    organization_id,
    title,
    category,
    content,
    created_by: ctx.user.id,
    updated_by: ctx.user.id,
  });

  if (error) {
    console.error("Error creating knowledge record:", error);
    return { error: "Failed to save knowledge item" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteOrganizationKnowledge(formData: FormData) {
  const ctx = await getSettingsContext("manage_org");
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const knowledgeId = formData.get("id") as string;

  if (!knowledgeId) {
    return { error: "Knowledge ID is required" };
  }

  const { error } = await ctx.supabase
    .from("organization_knowledge")
    .delete()
    .eq("id", knowledgeId)
    .eq("organization_id", ctx.profile.organization_id);

  if (error) {
    console.error("Error deleting knowledge record:", error);
    return { error: "Failed to delete knowledge item" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function upsertEmailTemplateBase(formData: FormData) {
  const ctx = await getSettingsContext("manage_org");
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error };
  }

  const organization_id = formData.get("organization_id") as string;
  const logo_url = (formData.get("logo_url") as string) || null;
  const header_html = (formData.get("header_html") as string) || null;
  const footer_html = (formData.get("footer_html") as string) || null;

  if (!organization_id) {
    return { error: "Organization ID is required" };
  }

  if (ctx.profile.organization_id !== organization_id) {
    return { error: "You do not have permission to edit this organization" };
  }
  const { error } = await ctx.supabase.from("email_template_bases").upsert({
    organization_id,
    logo_url,
    header_html,
    footer_html,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id" });

  if (error) {
    console.error("Error saving email template base:", error);
    return { error: "Failed to save email template base" };
  }

  revalidatePath("/settings");
  return { success: true };
}
