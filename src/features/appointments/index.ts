/**
 * Appointments Module - Main Entry Point
 *
 * This module provides server actions for calendar and visit management.
 *
 * For client components: import actions (createCalendarEvent, etc.)
 * For server components: can also import services (getCalendarEvents, etc.)
 */

// Actions (server actions - safe to import in client components)
export {
    createCalendarEvent,
    deleteCalendarEvent,
    finishVisit,
    finishVisitAction,
    startVisit,
    startVisitAction,
    updateCalendarEvent,
} from "./actions";

// Types (safe to import anywhere)
export * from "./types";
