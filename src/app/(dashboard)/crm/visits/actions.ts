/**
 * Visits Actions - Compatibility Re-exports
 *
 * DEPRECATED: Este archivo existe por compatibilidad.
 * Los nuevos imports deben usar @features/appointments directamente.
 */

// Re-export visit actions from modular module
export { finishVisit, startVisit } from "@features/appointments";

// Legacy type - now using AppointmentActionState internally
export type UpdateVisitAction = (formData: FormData) => Promise<void>;
