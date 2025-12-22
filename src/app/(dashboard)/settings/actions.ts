"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateOrganization(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const display_phone_number = formData.get("display_phone_number") as string;
  const phone_number_id = formData.get("phone_number_id") as string;
  const bot_name = (formData.get("bot_name") as string) || null;
  const bot_instructions = (formData.get("bot_instructions") as string) || null;
  const bot_tone = (formData.get("bot_tone") as string) || null;
  const bot_language = (formData.get("bot_language") as string) || null;
  const bot_model = (formData.get("bot_model") as string) || null;

  if (!id) {
    return { error: "Organization ID is required" };
  }

  // Verify user belongs to this organization and has permission
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.organization_id !== id) {
    return { error: "You do not have permission to edit this organization" };
  }

  // Check role (Superadmin or Org Admin)
  if (profile.role !== 'superadmin' && profile.role !== 'org_admin') {
    return { error: "Insufficient permissions" };
  }

  // Build update object dynamically to allow partial updates
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (formData.has("name")) updateData.name = formData.get("name") as string;
  if (formData.has("display_phone_number")) updateData.display_phone_number = formData.get("display_phone_number") as string;
  if (formData.has("phone_number_id")) updateData.phone_number_id = formData.get("phone_number_id") as string;
  if (formData.has("bot_name")) updateData.bot_name = (formData.get("bot_name") as string) || null;
  if (formData.has("bot_instructions")) updateData.bot_instructions = (formData.get("bot_instructions") as string) || null;
  if (formData.has("bot_tone")) updateData.bot_tone = (formData.get("bot_tone") as string) || null;
  if (formData.has("bot_language")) updateData.bot_language = (formData.get("bot_language") as string) || null;
  if (formData.has("bot_model")) updateData.bot_model = (formData.get("bot_model") as string) || null;
  if (formData.has("bot_directory_enabled")) {
    updateData.bot_directory_enabled = (formData.get("bot_directory_enabled") as string | null) === "on";
  }

  const { data, error } = await supabase
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const organization_id = formData.get("organization_id") as string;
  const title = (formData.get("title") as string) || "";
  const category = (formData.get("category") as string) || null;
  const content = (formData.get("content") as string) || "";

  if (!organization_id) {
    return { error: "Organization ID is required" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.organization_id !== organization_id) {
    return { error: "You do not have permission to edit this organization" };
  }

  if (profile.role !== "superadmin" && profile.role !== "org_admin") {
    return { error: "Insufficient permissions" };
  }

  const { error } = await supabase.from("organization_knowledge").insert({
    organization_id,
    title,
    category,
    content,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    console.error("Error creating knowledge record:", error);
    return { error: "Failed to save knowledge item" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteOrganizationKnowledge(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const knowledgeId = formData.get("id") as string;

  if (!knowledgeId) {
    return { error: "Knowledge ID is required" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "You do not have permission to edit this organization" };
  }

  if (profile.role !== "superadmin" && profile.role !== "org_admin") {
    return { error: "Insufficient permissions" };
  }

  const { error } = await supabase
    .from("organization_knowledge")
    .delete()
    .eq("id", knowledgeId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    console.error("Error deleting knowledge record:", error);
    return { error: "Failed to delete knowledge item" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function upsertEmailTemplateBase(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const organization_id = formData.get("organization_id") as string;
  const logo_url = (formData.get("logo_url") as string) || null;
  const header_html = (formData.get("header_html") as string) || null;
  const footer_html = (formData.get("footer_html") as string) || null;

  if (!organization_id) {
    return { error: "Organization ID is required" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.organization_id !== organization_id) {
    return { error: "You do not have permission to edit this organization" };
  }

  if (profile.role !== "superadmin" && profile.role !== "org_admin") {
    return { error: "Insufficient permissions" };
  }

  const { error } = await supabase.from("email_template_bases").upsert({
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
