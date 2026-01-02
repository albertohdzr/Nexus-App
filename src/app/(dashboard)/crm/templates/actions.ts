"use server"

import { createClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { EmailTemplateTriggerRule } from "@/src/types"
import { checkPermission } from "@/src/lib/permissions-server"

type TriggerPayload = {
  id?: string
  event_type: string
  source: string
  rules: EmailTemplateTriggerRule[]
  is_active: boolean
}

type TemplatePayload = {
  id?: string
  name: string
  subject: string
  category?: string | null
  channel: string
  status: string
  body_html: string
  base_id?: string | null
  triggers: TriggerPayload[]
}

export async function upsertEmailTemplate(payload: TemplatePayload) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return { error: "Organization not found" }
  }

  const allowed = await checkPermission(supabase, user.id, "crm", "manage_templates")
  if (!allowed) {
    return { error: "Insufficient permissions" }
  }

  const templateData = {
    organization_id: profile.organization_id,
    name: payload.name,
    subject: payload.subject,
    category: payload.category || null,
    channel: payload.channel,
    status: payload.status,
    body_html: payload.body_html,
    base_id: payload.base_id || null,
    updated_at: new Date().toISOString(),
  }

  let templateId = payload.id

  if (payload.id) {
    const { error } = await supabase
      .from("email_templates")
      .update(templateData)
      .eq("id", payload.id)
      .eq("organization_id", profile.organization_id)

    if (error) {
      console.error("Error updating template", error)
      return { error: "Failed to update template" }
    }
  } else {
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        ...templateData,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("Error creating template", error)
      return { error: "Failed to create template" }
    }

    templateId = data?.id
  }

  if (!templateId) {
    return { error: "Template ID not resolved" }
  }

  const { error: deleteError } = await supabase
    .from("email_template_triggers")
    .delete()
    .eq("template_id", templateId)
    .eq("organization_id", profile.organization_id)

  if (deleteError) {
    console.error("Error clearing triggers", deleteError)
    return { error: "Failed to update triggers" }
  }

  if (payload.triggers.length) {
    const { error: triggerError } = await supabase
      .from("email_template_triggers")
      .insert(
        payload.triggers.map((trigger) => ({
          organization_id: profile.organization_id,
          template_id: templateId,
          event_type: trigger.event_type,
          source: trigger.source,
          rules: trigger.rules,
          is_active: trigger.is_active,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
      )

    if (triggerError) {
      console.error("Error saving triggers", triggerError)
      return { error: "Failed to save triggers" }
    }
  }

  revalidatePath("/crm/templates")
  return { success: true, id: templateId }
}

export async function deleteEmailTemplate(templateId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return { error: "Organization not found" }
  }

  const allowed = await checkPermission(supabase, user.id, "crm", "manage_templates")
  if (!allowed) {
    return { error: "Insufficient permissions" }
  }

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", profile.organization_id)

  if (error) {
    console.error("Error deleting template", error)
    return { error: "Failed to delete template" }
  }

  revalidatePath("/crm/templates")
  return { success: true }
}
