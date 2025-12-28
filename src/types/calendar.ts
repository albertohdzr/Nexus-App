export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    participants: string[]; // List of names/ids
    meetingLink?: string;
    timezone?: string;

    // Extra fields from DB
    status?: string;
    type?: string;
    campus?: string;
    leadId?: string;
    slotId?: string | null;
    notes?: string;
    leadName?: string;
    leadContactName?: string;
    leadEmail?: string;
    leadPhone?: string;
    organizerName?: string;
    organizerEmail?: string;
}

export interface CalendarLeadOption {
    id: string;
    studentName: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
}

export interface CalendarSlotOption {
    id: string;
    startsAt: string;
    endsAt: string;
    campus?: string | null;
    maxAppointments: number;
    appointmentsCount: number;
    isActive: boolean;
    isBlocked: boolean;
}
