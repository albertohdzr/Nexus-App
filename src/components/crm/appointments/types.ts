export interface Appointment {
    id: string;
    starts_at: string;
    ends_at: string | null;
    campus: string | null;
    type: string | null;
    status: string;
    notes: string | null;
}
