/**
 * Leads Service
 * Capa de abstracción para operaciones de leads con Supabase
 * Todas las funciones son para uso en Server Components/Actions
 */

import { createClient } from "@/src/lib/supabase/server";
import type { LeadFilters, LeadRecord, PaginatedLeadsResponse } from "../types";

/**
 * Obtiene todos los leads de una organización con filtros opcionales
 */
export async function getLeads(
    organizationId: string,
    filters?: LeadFilters,
): Promise<LeadRecord[]> {
    const supabase = await createClient();

    let query = supabase
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
      metadata,
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
          closed_at
        )
      )
    `)
        .eq("organization_id", organizationId);

    // Aplicar filtros
    if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    if (filters?.source && filters.source !== "all") {
        query = query.eq("source", filters.source);
    }

    if (filters?.gradeInterest) {
        query = query.eq("grade_interest", filters.gradeInterest);
    }

    if (filters?.schoolYear) {
        query = query.eq("school_year", filters.schoolYear);
    }

    if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
            `student_name.ilike.${searchTerm},contact_full_name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`,
        );
    }

    const { data: leads, error } = await query.order("created_at", {
        ascending: false,
    });

    if (error) {
        console.error("Error fetching leads:", error);
        return [];
    }

    // Transformar a LeadRecord
    return (leads ?? []).map((lead) => {
        const chat = Array.isArray(lead.chat) ? lead.chat[0] : lead.chat;
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
        } satisfies LeadRecord;
    });
}

/**
 * Obtiene leads paginados con filtros
 */
export async function getLeadsPaginated(
    organizationId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: LeadFilters,
): Promise<PaginatedLeadsResponse> {
    const supabase = await createClient();

    // Primero obtenemos el conteo total
    let countQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);

    if (filters?.status && filters.status !== "all") {
        countQuery = countQuery.eq("status", filters.status);
    }

    if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        countQuery = countQuery.or(
            `student_name.ilike.${searchTerm},contact_full_name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`,
        );
    }

    const { count } = await countQuery;

    // Luego obtenemos los leads paginados
    const offset = (page - 1) * pageSize;
    let query = supabase
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
      metadata,
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
          closed_at
        )
      )
    `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

    if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(
            `student_name.ilike.${searchTerm},contact_full_name.ilike.${searchTerm},contact_email.ilike.${searchTerm}`,
        );
    }

    const { data: leads, error } = await query;

    if (error) {
        console.error("Error fetching paginated leads:", error);
        return {
            leads: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
        };
    }

    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return {
        leads: (leads ?? []).map((lead) => {
            const chat = Array.isArray(lead.chat) ? lead.chat[0] : lead.chat;
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
            } satisfies LeadRecord;
        }),
        total,
        page,
        pageSize,
        totalPages,
    };
}

/**
 * Obtiene un lead por ID
 */
export async function getLeadById(leadId: string): Promise<LeadRecord | null> {
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
      cycle_id,
      student_first_name,
      student_middle_name,
      student_last_name_paternal,
      student_last_name_maternal,
      wa_chat_id,
      wa_id,
      ai_summary,
      ai_metadata,
      metadata,
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
          closed_at
        )
      )
    `)
        .eq("id", leadId)
        .single();

    if (error) {
        console.error("Error fetching lead by ID:", error);
        return null;
    }

    const chat = Array.isArray(lead.chat) ? lead.chat[0] : lead.chat;
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
    } satisfies LeadRecord;
}

/**
 * Obtiene el organization_id del usuario actual
 */
export async function getCurrentUserOrganizationId(): Promise<string | null> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    return profile?.organization_id ?? null;
}

/**
 * Obtiene estadísticas de leads para el dashboard
 */
export async function getLeadsStats(organizationId: string) {
    const supabase = await createClient();

    const { data: leads, error } = await supabase
        .from("leads")
        .select("id, status, created_at")
        .eq("organization_id", organizationId);

    if (error) {
        console.error("Error fetching leads stats:", error);
        return {
            total: 0,
            new: 0,
            contacted: 0,
            qualified: 0,
            enrolled: 0,
            thisMonth: 0,
            lastMonth: 0,
            growthPercent: 0,
        };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const total = leads?.length ?? 0;
    const newLeads = leads?.filter((l) => l.status === "new").length ?? 0;
    const contacted = leads?.filter((l) => l.status === "contacted").length ??
        0;
    const qualified = leads?.filter((l) => l.status === "qualified").length ??
        0;
    const enrolled = leads?.filter((l) => l.status === "enrolled").length ?? 0;

    const thisMonth =
        leads?.filter((l) => new Date(l.created_at) >= startOfMonth).length ??
            0;
    const lastMonth = leads?.filter(
        (l) =>
            new Date(l.created_at) >= startOfLastMonth &&
            new Date(l.created_at) < startOfMonth,
    ).length ?? 0;

    const growthPercent = lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
        : 0;

    return {
        total,
        new: newLeads,
        contacted,
        qualified,
        enrolled,
        thisMonth,
        lastMonth,
        growthPercent,
    };
}
