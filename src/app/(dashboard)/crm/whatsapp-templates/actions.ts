"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/src/lib/permissions-server";

export type WhatsAppTemplatePayload = {
  id?: string;
  name: string;
  language: string;
  category: string;
  status: string;
  parameter_format: string;
  external_id?: string | null;
  components: Array<Record<string, unknown>>;
};

export async function upsertWhatsAppTemplate(payload: WhatsAppTemplatePayload) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "Organization not found" };
  }

  const allowed = await checkPermission(supabase, user.id, "crm", "manage_whatsapp_templates");
  if (!allowed) {
    return { error: "Insufficient permissions" };
  }

  const templateData = {
    organization_id: profile.organization_id,
    name: payload.name,
    language: payload.language,
    category: payload.category,
    status: payload.status,
    parameter_format: payload.parameter_format,
    external_id: payload.external_id || null,
    components: payload.components,
    updated_at: new Date().toISOString(),
  };

  let templateId = payload.id;

  if (payload.id) {
    const { error } = await supabase
      .from("whatsapp_templates")
      .update(templateData)
      .eq("id", payload.id)
      .eq("organization_id", profile.organization_id);

    if (error) {
      console.error("Error updating WhatsApp template", error);
      return { error: "Failed to update WhatsApp template" };
    }
  } else {
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .insert({
        ...templateData,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating WhatsApp template", error);
      return { error: "Failed to create WhatsApp template" };
    }

    templateId = data?.id;
  }

  if (!templateId) {
    return { error: "Template ID not resolved" };
  }

  revalidatePath("/crm/whatsapp-templates");
  return { success: true, id: templateId };
}

export async function deleteWhatsAppTemplate(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "Organization not found" };
  }

  const allowed = await checkPermission(supabase, user.id, "crm", "manage_whatsapp_templates");
  if (!allowed) {
    return { error: "Insufficient permissions" };
  }

  const { error } = await supabase
    .from("whatsapp_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    console.error("Error deleting WhatsApp template", error);
    return { error: "Failed to delete WhatsApp template" };
  }

  revalidatePath("/crm/whatsapp-templates");
  return { success: true };
}

export async function syncWhatsAppTemplateToMeta(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "Organization not found" };
  }

  const allowed = await checkPermission(supabase, user.id, "crm", "manage_whatsapp_templates");
  if (!allowed) {
    return { error: "Insufficient permissions" };
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("whatsapp_business_account_id")
    .eq("id", profile.organization_id)
    .single();

  if (!organization?.whatsapp_business_account_id) {
    return { error: "WhatsApp Business Account ID missing in settings" };
  }

  const { data: template } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("id", templateId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (!template) {
    return { error: "Template not found" };
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    return { error: "WHATSAPP_ACCESS_TOKEN missing" };
  }

  const category = String(template.category || "").toUpperCase();
  const payload: Record<string, unknown> = {
    name: template.name,
    language: template.language,
    category,
    components: Array.isArray(template.components) ? template.components : [],
  };

  if (template.parameter_format === "named") {
    payload.parameter_format = "named";
  }

  const isUpdate = Boolean(template.external_id);
  const endpoint = isUpdate
    ? `https://graph.facebook.com/v24.0/${template.external_id}`
    : `https://graph.facebook.com/v24.0/${organization.whatsapp_business_account_id}/message_templates`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp API error:", data?.error || data);
    const errorMessage =
      data?.error?.message ||
      data?.error?.error_user_title ||
      "WhatsApp API error";
    const errorDetails = data?.error?.error_user_msg
      ? ` - ${data.error.error_user_msg}`
      : "";
    const errorCode = data?.error?.code ? ` (code ${data.error.code})` : "";
    const errorSubcode = data?.error?.error_subcode
      ? ` (subcode ${data.error.error_subcode})`
      : "";
    return { error: `${errorMessage}${errorDetails}${errorCode}${errorSubcode}` };
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (!isUpdate && data?.id) {
    updateData.external_id = data.id;
  }

  if (data?.status) {
    updateData.status = String(data.status).toLowerCase();
  }

  if (data?.category) {
    updateData.category = String(data.category).toUpperCase();
  }

  const { error } = await supabase
    .from("whatsapp_templates")
    .update(updateData)
    .eq("id", templateId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    console.error("Error updating WhatsApp template status", error);
    return { error: "Failed to update template status" };
  }

  revalidatePath("/crm/whatsapp-templates");
  return { success: true, data };
}
