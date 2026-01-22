export type LeadChatSession = {
  id: string
  status: string | null
  summary: string | null
  last_response_at: string | null
  updated_at: string | null
  created_at: string | null
  ai_enabled?: boolean | null
  closed_at?: string | null
  messages?: LeadMessage[] | null
}

export type LeadNote = {
  id: string
  subject: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  type: string | null
}

export type LeadMessage = {
  id: string
  role: string | null
  direction: string | null
  body: string | null
  media_url?: string | null
  sender_name?: string | null
  created_at: string
}

export type LeadRecord = {
  id: string
  organization_id: string
  status: string
  source: string
  grade_interest: string
  school_year: string | null
  current_school: string | null
  cycle_id?: string | null
  division?: string | null
  student_first_name?: string | null
  student_middle_name?: string | null
  student_last_name_paternal?: string | null
  student_last_name_maternal?: string | null
  wa_chat_id: string | null
  wa_id: string | null
  ai_summary: string | null
  ai_metadata?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  contact_email: string | null
  contact_phone: string | null
  contact_first_name?: string | null
  contact_middle_name?: string | null
  contact_last_name_paternal?: string | null
  contact_last_name_maternal?: string | null
  contact_full_name: string | null
  student_name: string | null
  address_street?: string | null
  address_number?: string | null
  address_neighborhood?: string | null
  address_postal_code?: string | null
  address_city?: string | null
  address_state?: string | null
  address_country?: string | null
  nationality?: string | null
  native_language?: string | null
  secondary_language?: string | null
  decision_maker_name?: string | null
  decision_maker_role?: string | null
  decision_date?: string | null
  budget_range?: string | null
  visit_notes?: string | null
  next_steps?: string | null
  created_at: string
  updated_at: string
  chat?: {
    id: string
    wa_id: string | null
    active_session_id: string | null
    requested_handoff: boolean | null
    chat_sessions: LeadChatSession[] | null
    messages?: LeadMessage[] | null
  } | null
  notes?: LeadNote[] | null
  emails?: LeadNote[] | null
}
