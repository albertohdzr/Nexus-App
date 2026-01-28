/**
 * Appointments Module Types
 * Tipos específicos del módulo de citas
 */

// Re-export from shared types for now
export type {
    CalendarEvent,
    CalendarLeadOption,
    CalendarSlotOption,
} from "@/src/types/calendar";

/**
 * Action State Types
 */
export interface AppointmentActionState {
    success?: string;
    error?: string;
}

export interface CreateEventResult extends AppointmentActionState {
    event?: import("@/src/types/calendar").CalendarEvent;
}

export interface DeleteEventResult {
    success: boolean;
    error?: string;
}

/**
 * Visit Appointment with Lead
 */
export interface VisitWithLead {
    id: string;
    starts_at: string;
    ends_at: string | null;
    campus: string | null;
    type: string | null;
    status: string;
    notes: string | null;
    lead_id: string | null;
    lead: import("@features/leads").LeadRecord | null;
    tasks: import("@/src/lib/lead-tasks").LeadTask[];
    cycleName: string | null;
}

/**
 * Slot availability
 */
export interface AvailabilitySlot {
    id: string;
    starts_at: string;
    ends_at: string;
    campus: string | null;
    max_appointments: number;
    appointments_count: number;
    is_active: boolean;
    is_blocked: boolean;
    block_reason?: string | null;
}

/**
 * Appointment Settings
 */
export interface AppointmentSettings {
    slot_duration_minutes: number;
    start_time: string;
    end_time: string;
    buffer_minutes: number;
    allow_overbooking: boolean;
    timezone: string;
    days_of_week: number[];
}

/**
 * Blackout period
 */
export interface AppointmentBlackout {
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string | null;
}
