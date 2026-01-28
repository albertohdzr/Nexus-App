import { redirect } from "next/navigation"
import { LeadsTable } from "@/src/components/crm/leads-table"
import { createClient } from "@/src/lib/supabase/server"
import { sendLeadFollowUp } from "./actions"
import type { LeadRecord } from "@/src/types/lead"

export default async function LeadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    redirect("/dashboard")
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      organization_id,
      status,
      source,
      grade_interest,
      school_year,
      current_school,
      cycle_id,
      student_first_name,
      student_middle_name,
      student_last_name_paternal,
      student_last_name_maternal,
      wa_chat_id,
      wa_id,
      ai_summary,
      ai_metadata,
      contact_email,
      contact_phone,
      contact_middle_name,
      contact_last_name_maternal,
      contact_first_name,
      contact_last_name_paternal,
      contact_full_name,
      student_name,
      created_at,
      updated_at,
      chat:chats!leads_wa_chat_id_fkey (
        id,
        wa_id,
        active_session_id,
        requested_handoff,
        chat_sessions:chat_sessions!chat_sessions_chat_id_fkey (
          id,
          status,
          summary,
          last_response_at,
          updated_at,
          created_at,
          ai_enabled,
          closed_at
        )
      )
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads", error)
  }

  const leadRows: LeadRecord[] = (leads ?? []).map((lead) => {
    const chat = Array.isArray(lead.chat) ? lead.chat[0] : lead.chat
    return {
      ...lead,
      chat: chat
        ? {
            id: chat.id,
            wa_id: chat.wa_id,
            active_session_id: chat.active_session_id,
            requested_handoff: chat.requested_handoff,
            chat_sessions: chat.chat_sessions ?? null,
          }
        : null,
    } satisfies LeadRecord
  })

  return (
    <div className="space-y-6">
      <LeadsTable leads={leadRows} sendFollowUpAction={sendLeadFollowUp} />
    </div>
  )
}
