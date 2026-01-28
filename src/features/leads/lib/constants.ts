/**
 * Lead Module Constants
 * Constantes y configuración del módulo de leads
 */

/**
 * Estilos de status para badges
 */
export const STATUS_STYLES: Record<string, string> = {
    new: "bg-sky-100 text-sky-800 border-transparent",
    contacted: "bg-amber-100 text-amber-800 border-transparent",
    qualified: "bg-emerald-100 text-emerald-800 border-transparent",
    visit_scheduled: "bg-indigo-100 text-indigo-800 border-transparent",
    visited: "bg-indigo-100 text-indigo-800 border-transparent",
    application_started: "bg-blue-100 text-blue-800 border-transparent",
    application_submitted: "bg-blue-100 text-blue-800 border-transparent",
    admitted: "bg-emerald-100 text-emerald-800 border-transparent",
    enrolled: "bg-emerald-100 text-emerald-900 border-transparent",
    lost: "bg-rose-100 text-rose-800 border-transparent",
    disqualified: "bg-rose-100 text-rose-800 border-transparent",
};

/**
 * Lista ordenada de estados posibles de un lead
 */
export const LEAD_STATUSES = [
    "new",
    "contacted",
    "qualified",
    "visit_scheduled",
    "visited",
    "application_started",
    "application_submitted",
    "admitted",
    "enrolled",
    "lost",
    "disqualified",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Etiquetas legibles de status
 */
export const STATUS_LABELS: Record<string, string> = {
    new: "Nuevo",
    contacted: "Contactado",
    qualified: "Calificado",
    visit_scheduled: "Visita Programada",
    visited: "Visitado",
    application_started: "Solicitud Iniciada",
    application_submitted: "Solicitud Enviada",
    admitted: "Admitido",
    enrolled: "Inscrito",
    lost: "Perdido",
    disqualified: "Descalificado",
};

/**
 * Fuentes de leads
 */
export const LEAD_SOURCES = [
    "whatsapp",
    "website",
    "referral",
    "google",
    "facebook",
    "instagram",
    "linkedin",
    "direct",
    "event",
    "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

/**
 * Configuración de paginación por defecto
 */
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
