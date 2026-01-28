/**
 * Leads Actions - Compatibility Re-exports
 *
 * DEPRECATED: Este archivo existe por compatibilidad con código legacy.
 * Los nuevos imports deben usar @features/leads directamente.
 *
 * Este archivo re-exporta las acciones desde el módulo modular
 * para no romper imports existentes.
 */

// Re-export async actions from modular module
// Note: These need "use server" in their source files
export {
  addNote as addLeadNote,
  createLead as createLeadManual,
  createLeadFromChat,
  sendFollowUp as sendLeadFollowUp,
  updateLead as updateLeadBasic,
  updateLeadStatus,
  updateLeadTask,
} from "@features/leads/actions";

// Re-export types (non "use server" exports work in regular module)
export type {
  CreateLeadActionState,
  FollowUpActionState,
  LeadActionState,
  NoteActionState,
  UpdateLeadActionState,
} from "@features/leads/types";

// Legacy type aliases for backwards compatibility
import type {
  addNote,
  createLead,
  createLeadFromChat as createLeadFromChatType,
  sendFollowUp,
  updateLead,
  updateLeadStatus as updateLeadStatusType,
  updateLeadTask as updateLeadTaskType,
} from "@features/leads/actions";

export type SendLeadFollowUpAction = typeof sendFollowUp;
export type AddLeadNoteAction = typeof addNote;
export type UpdateLeadAction = typeof updateLead;
export type UpdateLeadStatusAction = typeof updateLeadStatusType;
export type UpdateLeadTaskAction = typeof updateLeadTaskType;
export type CreateLeadAction = typeof createLead;
export type CreateLeadFromChatAction = typeof createLeadFromChatType;
