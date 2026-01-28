/**
 * Lead Module Types
 * Tipos específicos del módulo de leads
 */

/**
 * Lead row base - campos de la tabla leads
 */
export interface LeadRow {
    id: string;
    organization_id: string;
    status: string;
    source: string;
    grade_interest: string | null;
    school_year: string | null;
    current_school: string | null;
    cycle_id: string | null;
    student_first_name: string | null;
    student_middle_name: string | null;
    student_last_name_paternal: string | null;
    student_last_name_maternal: string | null;
    wa_chat_id: string | null;
    wa_id: string | null;
    ai_summary: string | null;
    ai_metadata: Record<string, unknown> | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_first_name: string | null;
    contact_middle_name: string | null;
    contact_last_name_paternal: string | null;
    contact_last_name_maternal: string | null;
    contact_full_name: string | null;
    student_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChatSession {
    id: string;
    status: string | null;
    summary: string | null;
    last_response_at: string | null;
    updated_at: string | null;
    created_at: string | null;
    ai_enabled: boolean | null;
    closed_at: string | null;
}

export interface LeadChat {
    id: string;
    wa_id: string | null;
    active_session_id: string | null;
    requested_handoff: boolean | null;
    chat_sessions: ChatSession[] | null;
}

/**
 * LeadRecord con relaciones expandidas
 */
export interface LeadRecord extends LeadRow {
    chat: LeadChat | null;
}

/**
 * Parámetros de filtrado para leads
 */
export interface LeadFilters {
    status?: string;
    source?: string;
    search?: string;
    gradeInterest?: string;
    schoolYear?: string;
}

/**
 * Parámetros de ordenamiento
 */
export type LeadSortField = "name" | "email" | "date" | "status";
export type SortOrder = "asc" | "desc";

export interface LeadSortParams {
    field: LeadSortField;
    order: SortOrder;
}

/**
 * Parámetros de paginación
 */
export interface LeadPaginationParams {
    page: number;
    pageSize: number;
}

/**
 * Respuesta paginada de leads
 */
export interface PaginatedLeadsResponse {
    leads: LeadRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

/**
 * Action State Types
 */
export interface LeadActionState {
    success?: string;
    error?: string;
}

export interface CreateLeadActionState extends LeadActionState {
    leadId?: string;
}

export interface FollowUpActionState extends LeadActionState {}
export interface NoteActionState extends LeadActionState {}
export interface UpdateLeadActionState extends LeadActionState {}
