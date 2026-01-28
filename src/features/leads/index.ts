/**
 * Leads Module - Main Entry Point
 * Re-exporta todos los componentes, acciones, servicios y tipos del módulo
 */

// Components
export * from "./components";

// Actions
export * from "./actions";

// Services - leads list
export {
    getCurrentUserOrganizationId,
    getLeadById,
    getLeads,
    getLeadsPaginated,
    getLeadsStats,
} from "./services/leads-service";

// Services - lead detail
export {
    getAdmissionCycles,
    getLeadAppointments,
    getLeadDetail,
    getLeadStatusHistory,
} from "./services/lead-detail-service";

// Types
export * from "./types";

// Lib
export * from "./lib/constants";
export * from "./lib/utils";
