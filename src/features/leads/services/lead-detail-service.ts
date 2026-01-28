/**
 * Lead Detail Service
 * Servicio para obtener datos completos de un lead individual
 */

import { createClient } from "@/src/lib/supabase/server";
import type {
    AdmissionCycle,
    LeadAppointment,
    LeadDetail,
    LeadNote,
    StatusHistoryEntry,
} from "../types";

/**
 * Obtiene un lead con todos sus datos relacionados para la página de detalle
 */
export async function getLeadDetail(
    leadId: string,
    organizationId: string,
): Promise<LeadDetail | null> {
    const supabase = await createClient();

    const { data: lead, error } = await supabase
        .from("leads")
        .select(`
      id,
      organization_id,
      status,
      source,
      grade_interest,
      school_year,
      current_school,
      student_first_name,
      student_middle_name,
      student_last_name_paternal,
      student_last_name_maternal,
      wa_chat_id,
      wa_id,
      ai_summary,
      ai_metadata,
      metadata,
      cycle_id,
      contact_email,
      contact_phone,
      contact_middle_name,
      contact_last_name_maternal,
      contact_first_name,
      contact_last_name_paternal,
      contact_full_name,
      student_name,
      division,
      address_street,
      address_number,
      address_neighborhood,
      address_postal_code,
      address_city,
      address_state,
      address_country,
      nationality,
      native_language,
      secondary_language,
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
          closed_at,
          messages:messages!messages_chat_session_id_fkey (
            id,
            role,
            direction,
            body,
            media_url,
            created_at,
            sender_name
          )
        )
      ),
      notes:lead_activities!lead_activities_lead_id_fkey (
        id,
        subject,
        notes,
        created_at,
        created_by,
        type
      )
    `)
        .eq("id", leadId)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching lead detail:", error);
        return null;
    }

    if (!lead) return null;

    // Normalizar chat
    const chat = Array.isArray(lead.chat) ? lead.chat[0] : lead.chat;

    // Separar notas y emails
    const allActivities = (lead.notes as LeadNote[]) || [];
    const notes = allActivities.filter((a) => a.type === "note");
    const emails = allActivities.filter((a) => a.type === "email");

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
        notes,
        emails,
    } as LeadDetail;
}

/**
 * Obtiene el historial de cambios de estado de un lead
 */
export async function getLeadStatusHistory(
    leadId: string,
): Promise<StatusHistoryEntry[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("lead_status_history")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching status history:", error);
        return [];
    }

    return data || [];
}

/**
 * Obtiene las citas de un lead
 */
export async function getLeadAppointments(
    leadId: string,
    organizationId: string,
): Promise<LeadAppointment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("appointments")
        .select("id, starts_at, ends_at, campus, type, status, notes")
        .eq("organization_id", organizationId)
        .eq("lead_id", leadId)
        .order("starts_at", { ascending: true });

    if (error) {
        console.error("Error fetching appointments:", error);
        return [];
    }

    return data || [];
}

/**
 * Obtiene los ciclos de admisión de una organización
 */
export async function getAdmissionCycles(
    organizationId: string,
): Promise<AdmissionCycle[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("admission_cycles")
        .select("id, name")
        .eq("organization_id", organizationId)
        .order("start_date", { ascending: false });

    if (error) {
        console.error("Error fetching admission cycles:", error);
        return [];
    }

    return data || [];
}
