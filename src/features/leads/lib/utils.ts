/**
 * Lead Module Utilities
 * Funciones de utilidad para el módulo de leads
 */

import type { ChatSession, LeadRecord } from "../types";

/**
 * Convierte un status a etiqueta legible (capitalizada)
 */
export function statusLabel(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formatea una fecha relativa (hace X tiempo)
 */
export function formatRelativeDate(value: string | null | undefined): string {
    if (!value) return "Sin actividad";
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();

    if (Number.isNaN(diffMs)) return "Sin actividad";

    const minutes = Math.round(diffMs / 60000);
    if (minutes < 1) return "hace un momento";
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.round(minutes / 60);
    if (hours < 48) return `hace ${hours} h`;

    const days = Math.round(hours / 24);
    return `hace ${days} d`;
}

/**
 * Obtiene las sesiones de chat ordenadas por última actividad
 */
export function getSessions(lead: LeadRecord): ChatSession[] {
    return [...(lead.chat?.chat_sessions ?? [])].sort((a, b) => {
        const left = new Date(
            a.last_response_at || a.updated_at || a.created_at || 0,
        ).getTime();
        const right = new Date(
            b.last_response_at || b.updated_at || b.created_at || 0,
        ).getTime();
        return right - left;
    });
}

/**
 * Obtiene el resumen consolidado de un lead
 */
export function getLeadSummary(lead: LeadRecord): string {
    const sessions = getSessions(lead);
    const latest = sessions[0];
    if (latest?.summary) return latest.summary;
    if (lead.ai_summary) return lead.ai_summary;
    return "Aún no hay resumen del chat.";
}

/**
 * Construye el mensaje de follow-up por defecto
 */
export function buildDefaultFollowUp(lead: LeadRecord): string {
    const summary = getLeadSummary(lead);
    const grade = lead.grade_interest ? ` para ${lead.grade_interest}` : "";
    return `Hola ${
        lead.contact_first_name || "familia"
    },\n\nGracias por tu interés${
        grade || " en nuestras admisiones"
    }. Te comparto un breve resumen de lo que hemos visto hasta ahora:\n\n${summary}\n\nQuedo pendiente para agendar una llamada o visita si lo prefieres.\n\nSaludos,\nEquipo de admisiones`;
}

/**
 * Obtiene la última actividad de un lead
 */
export function getLatestActivity(lead: LeadRecord): string | null {
    const sessions = getSessions(lead);
    return (
        sessions[0]?.last_response_at ||
        sessions[0]?.updated_at ||
        lead.updated_at
    );
}

/**
 * Genera las iniciales para el avatar de un lead
 */
export function getLeadInitials(lead: LeadRecord): string {
    const name = lead.student_name || lead.contact_full_name || "NA";
    return name.substring(0, 2).toUpperCase();
}

/**
 * Obtiene el nombre a mostrar del lead
 */
export function getLeadDisplayName(lead: LeadRecord): string {
    return lead.student_name || lead.contact_full_name || "Lead sin nombre";
}
