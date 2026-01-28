"use server";

/**
 * Calendar Services
 * Server-side data fetching for calendar-related data
 */

import { format } from "date-fns";
import { createClient } from "@/src/lib/supabase/server";
import { getUserContext } from "../lib/user-context";
import type {
    CalendarEvent,
    CalendarLeadOption,
    CalendarSlotOption,
} from "@/src/types/calendar";

/**
 * Get calendar events (appointments) for a date range
 */
export async function getCalendarEvents(
    startStr: string,
    endStr: string,
): Promise<CalendarEvent[]> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) return [];

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
            `
      id,
      starts_at,
      ends_at,
      type,
      status,
      notes,
      campus,
      lead_id,
      slot_id,
      created_by_profile_id,
      lead:leads(student_name, contact_full_name, contact_email, contact_phone),
      created_by:user_profiles!appointments_created_by_profile_id_fkey(full_name, email)
    `,
        )
        .eq("organization_id", profile.organization_id)
        .neq("status", "cancelled")
        .gte("starts_at", startStr)
        .lte("ends_at", endStr);

    if (error) {
        console.error("Error fetching appointments:", error);
        return [];
    }

    // Define the shape of the appointment with joined data
    interface AppointmentWithRelations {
        id: string;
        starts_at: string;
        ends_at: string | null;
        status: string;
        type: string | null;
        campus: string | null;
        lead_id: string | null;
        slot_id: string | null;
        notes: string | null;
        lead:
            | {
                student_name: string | null;
                contact_full_name: string | null;
                contact_email: string | null;
                contact_phone: string | null;
            }
            | {
                student_name: string | null;
                contact_full_name: string | null;
                contact_email: string | null;
                contact_phone: string | null;
            }[]
            | null;
        created_by:
            | { full_name: string | null; email: string | null }
            | {
                full_name: string | null;
                email: string | null;
            }[]
            | null;
    }

    // Map to CalendarEvent
    return (appointments as AppointmentWithRelations[]).map((apt) => {
        const lead = Array.isArray(apt.lead) ? apt.lead[0] : apt.lead;
        const createdBy = Array.isArray(apt.created_by)
            ? apt.created_by[0]
            : apt.created_by;
        const start = new Date(apt.starts_at);
        const end = apt.ends_at ? new Date(apt.ends_at) : start;

        // Format for UI
        const dateStr = format(start, "yyyy-MM-dd");
        const startTimeStr = format(start, "HH:mm");
        const endTimeStr = format(end, "HH:mm");

        const leadName = lead?.student_name || "Unknown Lead";
        const title = `${apt.type || "Meeting"} - ${leadName}`;
        const organizerName = createdBy?.full_name || "Staff";
        const organizerEmail = createdBy?.email || undefined;

        return {
            id: apt.id,
            title: title,
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            participants: [leadName, organizerName].filter(Boolean),
            status: apt.status,
            type: apt.type ?? undefined,
            campus: apt.campus ?? undefined,
            leadId: apt.lead_id ?? undefined,
            slotId: apt.slot_id ?? undefined,
            notes: apt.notes ?? undefined,
            leadName,
            leadContactName: lead?.contact_full_name ?? undefined,
            leadEmail: lead?.contact_email ?? undefined,
            leadPhone: lead?.contact_phone ?? undefined,
            organizerName,
            organizerEmail,
        };
    });
}

/**
 * Get available slots for a date range
 */
export async function getCalendarSlots(
    startStr: string,
    endStr: string,
): Promise<CalendarSlotOption[]> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) return [];

    const startDate = new Date(`${startStr}T00:00:00`);
    const endDate = new Date(`${endStr}T00:00:00`);
    const endExclusive = new Date(endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const { data, error } = await ctx.supabase
        .from("availability_slots")
        .select(
            "id, starts_at, ends_at, campus, max_appointments, appointments_count, is_active, is_blocked",
        )
        .eq("organization_id", ctx.profile.organization_id)
        .gte("starts_at", startDate.toISOString())
        .lt("starts_at", endExclusive.toISOString())
        .order("starts_at", { ascending: true });

    if (error) {
        console.error("Error fetching slots:", error);
        return [];
    }

    return (data ?? []).map((slot) => ({
        id: slot.id,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        campus: slot.campus,
        maxAppointments: slot.max_appointments ?? 1,
        appointmentsCount: slot.appointments_count ?? 0,
        isActive: slot.is_active,
        isBlocked: slot.is_blocked,
    }));
}

/**
 * Get leads for calendar dropdown
 */
export async function getCalendarLeads(): Promise<CalendarLeadOption[]> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) return [];

    const { data, error } = await ctx.supabase
        .from("leads")
        .select(
            "id, student_name, contact_full_name, contact_email, contact_phone",
        )
        .eq("organization_id", ctx.profile.organization_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching leads:", error);
        return [];
    }

    return (data ?? []).map((lead) => ({
        id: lead.id,
        studentName: lead.student_name || "Sin nombre",
        contactName: lead.contact_full_name,
        contactEmail: lead.contact_email,
        contactPhone: lead.contact_phone,
    }));
}
