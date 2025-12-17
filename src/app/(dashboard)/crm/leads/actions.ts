"use server"

import { Resend } from "resend"
import { revalidatePath } from "next/cache"
import { createClient } from "@/src/lib/supabase/server"

export type FollowUpActionState = {
  success?: string
  error?: string
}

export type NoteActionState = {
  success?: string
  error?: string
}

export type SendLeadFollowUpAction = (
  prevState: FollowUpActionState,
  formData: FormData
) => Promise<FollowUpActionState>

export type AddLeadNoteAction = (
  prevState: NoteActionState,
  formData: FormData
) => Promise<NoteActionState>

export type UpdateLeadActionState = {
  success?: string
  error?: string
}

export type UpdateLeadAction = (
  prevState: UpdateLeadActionState,
  formData: FormData
) => Promise<UpdateLeadActionState>

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail =
  process.env.RESEND_FROM_EMAIL || "Nexus CRM <onboarding@team5526.com>"

const toPlainText = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n")

const toHtml = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin: 0 0 12px;">${line}</p>`)
    .join("")

export const sendLeadFollowUp: SendLeadFollowUpAction = async (
  _prevState,
  formData
) => {
  try {
    const leadId = formData.get("leadId") as string | null
    const subjectInput = (formData.get("subject") as string | null) ?? ""
    const messageInput = (formData.get("message") as string | null) ?? ""

    if (!leadId) {
      return { error: "No se encontró el lead para enviar el correo." }
    }

    if (!messageInput.trim()) {
      return { error: "Agrega un mensaje antes de enviar el correo." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesión para enviar correos de seguimiento." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("Error loading user profile", profileError)
      return { error: "No se pudo validar tu perfil de usuario." }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        `
        id,
        organization_id,
        contact_email,
        contact_phone,
        contact_first_name,
        contact_last_name_paternal,
        contact_full_name,
        student_name,
        grade_interest,
        ai_summary,
        wa_chat_id
      `
      )
      .eq("id", leadId)
      .single()

    if (leadError || !lead) {
      console.error("Error loading lead for follow up", leadError)
      return { error: "No se pudo cargar el lead para el seguimiento." }
    }

    if (lead.organization_id !== profile.organization_id) {
      return { error: "No tienes permiso para contactar este lead." }
    }

    if (!lead.contact_email) {
      return { error: "El lead no tiene correo registrado." }
    }

    let chatSummary = lead.ai_summary || null

    if (!chatSummary && lead.wa_chat_id) {
      const { data: sessions, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("summary, updated_at, last_response_at, created_at")
        .eq("chat_id", lead.wa_chat_id)
        .order("updated_at", { ascending: false })
        .limit(1)

      if (sessionError) {
        console.error("Error loading chat session summary", sessionError)
      }

      chatSummary = sessions?.[0]?.summary || null
    }

    const contactName =
      lead.contact_full_name ||
      [lead.contact_first_name, lead.contact_last_name_paternal]
        .filter(Boolean)
        .join(" ") ||
      "familia"

    const subject =
      subjectInput.trim() ||
      `Seguimiento de admisiones - ${lead.student_name || "Nuevo lead"}`

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing")
      return {
        error:
          "No se pudo enviar el correo: falta la configuración de Resend en el servidor.",
      }
    }

    const bodyHtml = toHtml(messageInput)
    const html = `
      <p style="margin: 0 0 12px;">Hola ${contactName},</p>
      ${bodyHtml}
      ${
        chatSummary
          ? `<p style="margin: 12px 0; color: #4b5563;"><strong>Resumen de chat:</strong> ${chatSummary}</p>`
          : ""
      }
      <p style="margin: 16px 0 0;">Gracias,<br/>${
        profile.full_name || "Equipo de admisiones"
      }</p>
    `

    await resend.emails.send({
      from: fromEmail,
      to: lead.contact_email,
      subject,
      html,
      text: toPlainText(
        `Hola ${contactName},\n\n${messageInput}${
          chatSummary ? `\n\nResumen de chat: ${chatSummary}` : ""
        }\n\nGracias,\n${profile.full_name || "Equipo de admisiones"}`
      ),
    })

    const notes = `${messageInput.trim()}${
      chatSummary ? `\n\nResumen de chat: ${chatSummary}` : ""
    }`

    const { error: activityError } = await supabase
      .from("lead_activities")
      .insert({
        organization_id: profile.organization_id,
        lead_id: lead.id,
        type: "email",
        subject,
        notes,
        created_by: user.id,
        completed_at: new Date().toISOString(),
      })

    if (activityError) {
      console.error("Failed to log lead activity", activityError)
    }

    return { success: "Correo de seguimiento enviado." }
  } catch (error) {
    console.error("sendLeadFollowUp error", error)
    return { error: "No se pudo enviar el correo de seguimiento." }
  }
}

export const addLeadNote: AddLeadNoteAction = async (_prevState, formData) => {
  try {
    const leadId = formData.get("leadId") as string | null
    const note = (formData.get("note") as string | null) ?? ""
    const subject = (formData.get("subject") as string | null) ?? ""

    if (!leadId) {
      return { error: "No se encontró el lead para guardar la nota." }
    }

    if (!note.trim()) {
      return { error: "La nota no puede estar vacía." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesión para guardar notas." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("Error loading user profile", profileError)
      return { error: "No se pudo validar tu perfil de usuario." }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, organization_id, metadata")
      .eq("id", leadId)
      .maybeSingle()

    if (leadError || !lead) {
      console.error("Error loading lead for note", leadError)
      return { error: "No se encontró el lead." }
    }

    if (lead.organization_id !== profile.organization_id) {
      return { error: "No tienes permiso para modificar este lead." }
    }

    const { error: insertError } = await supabase
      .from("lead_activities")
      .insert({
        organization_id: profile.organization_id,
        lead_id: lead.id,
        type: "note",
        subject: subject || null,
        notes: note,
        created_by: user.id,
      })

    if (insertError) {
      console.error("Error saving note", insertError)
      return { error: "No se pudo guardar la nota." }
    }

    revalidatePath(`/crm/leads/${leadId}`)

    return { success: "Nota guardada." }
  } catch (error) {
    console.error("addLeadNote error", error)
    return { error: "No se pudo guardar la nota." }
  }
}

export const updateLeadBasic: UpdateLeadAction = async (
  _prevState,
  formData
) => {
  try {
    const leadId = formData.get("leadId") as string | null
    const status = (formData.get("status") as string | null) ?? ""
    const grade = (formData.get("grade_interest") as string | null) ?? ""
    const currentSchool = (formData.get("current_school") as string | null) ?? null
    const schoolYear = (formData.get("school_year") as string | null) ?? null
    const studentFirst = (formData.get("student_first_name") as string | null) ?? ""
    const studentMiddle = (formData.get("student_middle_name") as string | null) ?? null
    const studentLast = (formData.get("student_last_name_paternal") as string | null) ?? ""
    const studentLastMaternal = (formData.get("student_last_name_maternal") as string | null) ?? null
    const contactFirst = (formData.get("contact_first_name") as string | null) ?? ""
    const contactMiddle = (formData.get("contact_middle_name") as string | null) ?? null
    const contactLast = (formData.get("contact_last_name_paternal") as string | null) ?? ""
    const contactLastMaternal = (formData.get("contact_last_name_maternal") as string | null) ?? null
    const contactEmail = (formData.get("contact_email") as string | null) ?? null
    const contactPhone = (formData.get("contact_phone") as string | null) ?? null

    if (!leadId) {
      return { error: "No se encontró el lead a actualizar." }
    }
    if (!studentFirst.trim() || !studentLast.trim()) {
      return { error: "Nombre y apellido del estudiante son obligatorios." }
    }
    if (!contactFirst.trim() || !contactLast.trim()) {
      return { error: "Nombre y apellido del contacto son obligatorios." }
    }
    if (!grade.trim()) {
      return { error: "El grado de interés es obligatorio." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesión para editar leads." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("Error loading user profile", profileError)
      return { error: "No se pudo validar tu perfil de usuario." }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, organization_id")
      .eq("id", leadId)
      .maybeSingle()

    if (leadError || !lead) {
      console.error("Error loading lead for update", leadError)
      return { error: "No se encontró el lead." }
    }

    if (lead.organization_id !== profile.organization_id) {
      return { error: "No tienes permiso para editar este lead." }
    }

    const cycleId = (formData.get("cycle_id") as string | null) || null

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: status || "new",
        grade_interest: grade,
        current_school: currentSchool || null,
        school_year: schoolYear || null,
        student_first_name: studentFirst,
        student_middle_name: studentMiddle,
        student_last_name_paternal: studentLast,
        student_last_name_maternal: studentLastMaternal,
        contact_first_name: contactFirst,
        contact_middle_name: contactMiddle,
        contact_last_name_paternal: contactLast,
        contact_last_name_maternal: contactLastMaternal,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        cycle_id: cycleId,
      })
      .eq("id", leadId)

    if (updateError) {
      console.error("Error updating lead", updateError)
      return { error: "No se pudo actualizar el lead." }
    }

    revalidatePath("/crm/leads")
    revalidatePath(`/crm/leads/${leadId}`)
    return { success: "Lead actualizado." }
  } catch (error) {
    console.error("updateLeadBasic error", error)
    return { error: "No se pudo actualizar el lead." }
  }
}
