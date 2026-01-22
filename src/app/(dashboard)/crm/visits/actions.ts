"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/src/lib/supabase/server"

export type UpdateVisitAction = (formData: FormData) => Promise<void>

export const startVisit: UpdateVisitAction = async (formData) => {
  try {
    const appointmentId = formData.get("appointmentId") as string | null

    if (!appointmentId) {
      return
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("Error loading user profile", profileError)
      return
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, organization_id, status")
      .eq("id", appointmentId)
      .maybeSingle()

    if (appointmentError || !appointment) {
      console.error("Error loading appointment", appointmentError)
      return
    }

    if (appointment.organization_id !== profile.organization_id) {
      return
    }

    if (appointment.status === "in_progress") {
      return
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "in_progress" })
      .eq("id", appointmentId)

    if (updateError) {
      console.error("Error updating appointment status", updateError)
      return
    }

    revalidatePath("/crm/visits")
    revalidatePath(`/crm/visits/${appointmentId}`)
  } catch (error) {
    console.error("startVisit error", error)
  }
}

export const finishVisit: UpdateVisitAction = async (formData) => {
  try {
    const appointmentId = formData.get("appointmentId") as string | null
    const leadId = formData.get("leadId") as string | null

    if (!appointmentId || !leadId) {
      return
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("Error loading user profile", profileError)
      return
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, organization_id, status")
      .eq("id", appointmentId)
      .maybeSingle()

    if (appointmentError || !appointment) {
      console.error("Error loading appointment", appointmentError)
      return
    }

    if (appointment.organization_id !== profile.organization_id) {
      return
    }

    const { error: updateAppointmentError } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointmentId)

    if (updateAppointmentError) {
      console.error("Error completing appointment", updateAppointmentError)
      return
    }

    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({ status: "visited" })
      .eq("id", leadId)

    if (updateLeadError) {
      console.error("Error updating lead status after visit", updateLeadError)
      return
    }

    revalidatePath("/crm/visits")
    revalidatePath(`/crm/visits/${appointmentId}`)
    revalidatePath(`/crm/leads/${leadId}`)
  } catch (error) {
    console.error("finishVisit error", error)
  }
}
