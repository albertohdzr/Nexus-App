"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/src/lib/supabase/server"
import { buildEmailHtml, formatPlainTextAsHtml, sendResendEmail, toPlainText } from "@/src/lib/email"
import { LEAD_STATUSES } from "@/src/lib/lead"

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

export type UpdateLeadStatusAction = (
  prevState: UpdateLeadActionState,
  formData: FormData
) => Promise<UpdateLeadActionState>

export type CreateLeadActionState = {
  success?: string
  error?: string
  leadId?: string
}

export type CreateLeadAction = (
  prevState: CreateLeadActionState,
  formData: FormData
) => Promise<CreateLeadActionState>

export type CreateLeadFromChatAction = (
  prevState: CreateLeadActionState,
  formData: FormData
) => Promise<CreateLeadActionState>


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

    const { data: baseData } = await supabase
      .from("email_template_bases")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .maybeSingle()

    const bodyHtml = `
      <p style="margin: 0 0 12px;">Hola ${contactName},</p>
      ${formatPlainTextAsHtml(messageInput)}
      ${
        chatSummary
          ? `<p style="margin: 12px 0; color: #4b5563;"><strong>Resumen de chat:</strong> ${chatSummary}</p>`
          : ""
      }
      <p style="margin: 16px 0 0;">Gracias,<br/>${
        profile.full_name || "Equipo de admisiones"
      }</p>
    `

    const html = buildEmailHtml({
      bodyHtml,
      base: baseData ?? null,
      previewText: subject,
    })

    try {
      await sendResendEmail({
        to: lead.contact_email,
        subject,
        html,
        text: toPlainText(html),
      })
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : "Unknown error"
      console.error("Failed to send follow-up email", sendError)
      if (errorMessage === "RESEND_API_KEY missing") {
        return {
          error:
            "No se pudo enviar el correo: falta la configuración de Resend en el servidor.",
        }
      }
      return { error: "No se pudo enviar el correo de seguimiento." }
    }

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
    const contactEmailRaw = (formData.get("contact_email") as string | null) ?? ""
    const contactEmail = contactEmailRaw.trim() || null
    const contactPhone = (formData.get("contact_phone") as string | null) ?? null
    const division = (formData.get("division") as string | null) || null
    const addressStreet = (formData.get("address_street") as string | null) ?? null
    const addressNumber = (formData.get("address_number") as string | null) ?? null
    const addressNeighborhood = (formData.get("address_neighborhood") as string | null) ?? null
    const addressPostalCode = (formData.get("address_postal_code") as string | null) ?? null
    const addressCity = (formData.get("address_city") as string | null) ?? null
    const addressState = (formData.get("address_state") as string | null) ?? null
    const addressCountry = (formData.get("address_country") as string | null) ?? null
    const nationality = (formData.get("nationality") as string | null) ?? null
    const nativeLanguage = (formData.get("native_language") as string | null) ?? null
    const secondaryLanguage = (formData.get("secondary_language") as string | null) ?? null

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
        division: division || null,
        address_street: addressStreet,
        address_number: addressNumber,
        address_neighborhood: addressNeighborhood,
        address_postal_code: addressPostalCode,
        address_city: addressCity,
        address_state: addressState,
        address_country: addressCountry,
        nationality,
        native_language: nativeLanguage,
        secondary_language: secondaryLanguage,
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

export const updateLeadStatus: UpdateLeadStatusAction = async (
  _prevState,
  formData
) => {
  try {
    const leadId = formData.get("leadId") as string | null
    const status = (formData.get("status") as string | null) ?? ""

    if (!leadId) {
      return { error: "No se encontro el lead a actualizar." }
    }

    if (!LEAD_STATUSES.includes(status)) {
      return { error: "Selecciona un estado valido." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesion para editar leads." }
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
      console.error("Error loading lead for status update", leadError)
      return { error: "No se encontro el lead." }
    }

    if (lead.organization_id !== profile.organization_id) {
      return { error: "No tienes permiso para editar este lead." }
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", leadId)

    if (updateError) {
      console.error("Error updating lead status", updateError)
      return { error: "No se pudo actualizar el estado." }
    }

    revalidatePath("/crm/leads")
    revalidatePath(`/crm/leads/${leadId}`)
    return { success: "Estado actualizado." }
  } catch (error) {
    console.error("updateLeadStatus error", error)
    return { error: "No se pudo actualizar el estado." }
  }
}

export const createLeadManual: CreateLeadAction = async (
  _prevState,
  formData
) => {
  try {
    const studentFirst = (formData.get("student_first_name") as string | null) ?? ""
    const studentMiddle = (formData.get("student_middle_name") as string | null) ?? null
    const studentLastPaternal = (formData.get("student_last_name_paternal") as string | null) ?? ""
    const studentLastMaternal = (formData.get("student_last_name_maternal") as string | null) ?? null
    const grade = (formData.get("grade_interest") as string | null) ?? ""
    const schoolYear = (formData.get("school_year") as string | null) ?? null
    const currentSchool = (formData.get("current_school") as string | null) ?? null

    const contactFirst = (formData.get("contact_first_name") as string | null) ?? ""
    const contactMiddle = (formData.get("contact_middle_name") as string | null) ?? null
    const contactLastPaternal = (formData.get("contact_last_name_paternal") as string | null) ?? ""
    const contactLastMaternal = (formData.get("contact_last_name_maternal") as string | null) ?? null
    const contactEmail = (formData.get("contact_email") as string | null) ?? null
    const contactPhone = (formData.get("contact_phone") as string | null) ?? ""

    if (!studentFirst.trim() || !studentLastPaternal.trim()) {
      return { error: "Nombre y apellido del estudiante son obligatorios." }
    }
    if (!contactFirst.trim() || !contactLastPaternal.trim()) {
      return { error: "Nombre y apellido del contacto son obligatorios." }
    }
    if (!grade.trim()) {
      return { error: "El grado de interés es obligatorio." }
    }
    if (!contactPhone.trim()) {
      return { error: "El teléfono de contacto es obligatorio." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesión para crear leads." }
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

    const { data: contact, error: contactError } = await supabase
      .from("crm_contacts")
      .insert({
        organization_id: profile.organization_id,
        first_name: contactFirst,
        middle_name: contactMiddle,
        last_name_paternal: contactLastPaternal,
        last_name_maternal: contactLastMaternal,
        phone: contactPhone,
        email: contactEmail,
        source: "manual",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (contactError || !contact) {
      console.error("Error creating contact", contactError)
      return { error: "No se pudo crear el contacto del lead." }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: profile.organization_id,
        status: "new",
        source: "manual",
        student_first_name: studentFirst,
        student_middle_name: studentMiddle,
        student_last_name_paternal: studentLastPaternal,
        student_last_name_maternal: studentLastMaternal,
        grade_interest: grade,
        school_year: schoolYear,
        current_school: currentSchool,
        contact_first_name: contactFirst,
        contact_middle_name: contactMiddle,
        contact_last_name_paternal: contactLastPaternal,
        contact_last_name_maternal: contactLastMaternal,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        contact_id: contact.id,
        contact_name: [contactFirst, contactLastPaternal]
          .filter(Boolean)
          .join(" "),
      })
      .select("id")
      .single()

    if (leadError || !lead) {
      console.error("Error creating lead", leadError)
      return { error: "No se pudo crear el lead." }
    }

    revalidatePath("/crm/leads")
    return { success: "Lead creado.", leadId: lead.id }
  } catch (error) {
    console.error("createLeadManual error", error)
    return { error: "No se pudo crear el lead." }
  }
}

export const createLeadFromChat: CreateLeadFromChatAction = async (
  _prevState,
  formData
) => {
  try {
    const chatId = formData.get("chatId") as string | null
    const studentFirst = (formData.get("student_first_name") as string | null) ?? ""
    const studentMiddle = (formData.get("student_middle_name") as string | null) ?? null
    const studentLastPaternal =
      (formData.get("student_last_name_paternal") as string | null) ?? ""
    const studentLastMaternal =
      (formData.get("student_last_name_maternal") as string | null) ?? null
    const grade = (formData.get("grade_interest") as string | null) ?? ""
    const schoolYear = (formData.get("school_year") as string | null) ?? null
    const currentSchool = (formData.get("current_school") as string | null) ?? null

    const contactFirst = (formData.get("contact_first_name") as string | null) ?? ""
    const contactMiddle = (formData.get("contact_middle_name") as string | null) ?? null
    const contactLastPaternal =
      (formData.get("contact_last_name_paternal") as string | null) ?? ""
    const contactLastMaternal =
      (formData.get("contact_last_name_maternal") as string | null) ?? null
    const contactEmail = (formData.get("contact_email") as string | null) ?? null
    const contactPhone = (formData.get("contact_phone") as string | null) ?? ""

    if (!chatId) {
      return { error: "No se encontro el chat para crear el lead." }
    }
    if (!studentFirst.trim() || !studentLastPaternal.trim()) {
      return { error: "Nombre y apellido del estudiante son obligatorios." }
    }
    if (!contactFirst.trim() || !contactLastPaternal.trim()) {
      return { error: "Nombre y apellido del contacto son obligatorios." }
    }
    if (!grade.trim()) {
      return { error: "El grado de interes es obligatorio." }
    }
    if (!contactPhone.trim()) {
      return { error: "El telefono de contacto es obligatorio." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesion para crear leads." }
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

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id, wa_id, phone_number, organization_id")
      .eq("id", chatId)
      .maybeSingle()

    if (chatError || !chat) {
      console.error("Error loading chat for lead creation", chatError)
      return { error: "No se encontro el chat para crear el lead." }
    }

    if (chat.organization_id !== profile.organization_id) {
      return { error: "No tienes permiso para crear el lead de este chat." }
    }

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", profile.organization_id)
      .eq("wa_chat_id", chat.id)
      .maybeSingle()

    if (existingLead?.id) {
      return { error: "Este chat ya tiene un lead asociado." }
    }

    const { data: contact, error: contactError } = await supabase
      .from("crm_contacts")
      .insert({
        organization_id: profile.organization_id,
        first_name: contactFirst,
        middle_name: contactMiddle,
        last_name_paternal: contactLastPaternal,
        last_name_maternal: contactLastMaternal,
        phone: contactPhone,
        email: contactEmail,
        whatsapp_wa_id: chat.wa_id,
        source: "chat",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (contactError || !contact) {
      console.error("Error creating contact from chat", contactError)
      return { error: "No se pudo crear el contacto del lead." }
    }

    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        organization_id: profile.organization_id,
        status: "new",
        source: "chat",
        grade_interest: grade,
        school_year: schoolYear || null,
        current_school: currentSchool || null,
        student_first_name: studentFirst,
        student_middle_name: studentMiddle,
        student_last_name_paternal: studentLastPaternal,
        student_last_name_maternal: studentLastMaternal,
        contact_first_name: contactFirst,
        contact_middle_name: contactMiddle,
        contact_last_name_paternal: contactLastPaternal,
        contact_last_name_maternal: contactLastMaternal,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || chat.phone_number || null,
        contact_id: contact.id,
        contact_name: [contactFirst, contactLastPaternal].filter(Boolean).join(" "),
        wa_chat_id: chat.id,
        wa_id: chat.wa_id,
      })
      .select("id")
      .single()

    if (insertError || !lead) {
      console.error("Error creating lead from chat", insertError)
      return { error: "No se pudo crear el lead." }
    }

    revalidatePath("/chat")
    revalidatePath("/crm/leads")
    revalidatePath(`/crm/leads/${lead.id}`)

    return {
      success: "Lead creado desde el chat.",
      leadId: lead.id,
    }
  } catch (error) {
    console.error("createLeadFromChat error", error)
    return { error: "No se pudo crear el lead." }
  }
}
