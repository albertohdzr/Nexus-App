/**
 * Leads Actions - Barrel Export
 * Re-exporta todas las acciones del módulo de leads
 */

export { createLead } from "./create-lead";
export { updateLead, updateLeadStatus } from "./update-lead";
export { sendFollowUp, type SendFollowUpAction } from "./send-follow-up";
export { addNote, type AddNoteAction } from "./add-note";
