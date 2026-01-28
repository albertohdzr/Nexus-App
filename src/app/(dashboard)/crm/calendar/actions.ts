"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
    CalendarEvent,
    CalendarLeadOption,
    CalendarSlotOption,
} from "@/src/types/calendar";
import { format } from "date-fns";
import { revalidatePath } from "next/cache";

export async function getCalendarEvents(
    startStr: string,
    endStr: string,
): Promise<CalendarEvent[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) return [];

    const { data: appointments, error } = await supabase
        .from("appointments")
        .select(`
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
        `)
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
        lead: {
            student_name: string | null;
            contact_full_name: string | null;
            contact_email: string | null;
            contact_phone: string | null;
        } | {
            student_name: string | null;
            contact_full_name: string | null;
            contact_email: string | null;
            contact_phone: string | null;
        }[] | null;
        created_by: { full_name: string | null; email: string | null } | {
            full_name: string | null;
            email: string | null;
        }[] | null;
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

async function getUserContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autenticado", supabase: null, profile: null };
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) {
        return {
            error: "No se encontró tu organización",
            supabase: null,
            profile: null,
        };
    }

    return { supabase, profile };
}

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

export async function createCalendarEvent(eventData: {
    leadId: string;
    slotId: string;
    type?: string;
    notes?: string;
}): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) {
        return { success: false, error: ctx.error };
    }

    if (!eventData.leadId || !eventData.slotId) {
        return { success: false, error: "Faltan datos obligatorios." };
    }

    const { data: slot, error: slotError } = await ctx.supabase
        .from("availability_slots")
        .select(
            "id, starts_at, ends_at, campus, max_appointments, appointments_count, is_active, is_blocked",
        )
        .eq("organization_id", ctx.profile.organization_id)
        .eq("id", eventData.slotId)
        .single();

    if (slotError || !slot) {
        console.error("Error fetching slot:", slotError);
        return { success: false, error: "Slot no disponible." };
    }

    const slotUnavailable = !slot.is_active ||
        slot.is_blocked ||
        typeof slot.appointments_count !== "number" ||
        typeof slot.max_appointments !== "number" ||
        slot.appointments_count >= slot.max_appointments;

    if (slotUnavailable) {
        return {
            success: false,
            error: "El slot seleccionado ya no está disponible.",
        };
    }

    const { data: inserted, error } = await ctx.supabase
        .from("appointments")
        .insert({
            organization_id: ctx.profile.organization_id,
            lead_id: eventData.leadId,
            slot_id: slot.id,
            starts_at: slot.starts_at,
            ends_at: slot.ends_at,
            type: eventData.type || "Meeting",
            status: "scheduled",
            campus: slot.campus || null,
            notes: eventData.notes || null,
            created_by_profile_id: ctx.profile.id,
        })
        .select(`
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
        `)
        .single();

    if (error || !inserted) {
        console.error("Error creating appointment:", error);
        return { success: false, error: "No se pudo crear la cita." };
    }

    const start = new Date(inserted.starts_at);
    const end = new Date(inserted.ends_at);
    const dateStr = format(start, "yyyy-MM-dd");
    const startTimeStr = format(start, "HH:mm");
    const endTimeStr = format(end, "HH:mm");
    const insertedLead = Array.isArray(inserted.lead)
        ? inserted.lead[0]
        : inserted.lead;
    const insertedCreatedBy = Array.isArray(inserted.created_by)
        ? inserted.created_by[0]
        : inserted.created_by;
    const leadName = insertedLead?.student_name || "Unknown Lead";
    const organizerName = insertedCreatedBy?.full_name || "Staff";
    const organizerEmail = insertedCreatedBy?.email || undefined;

    const { error: slotUpdateError } = await ctx.supabase
        .from("availability_slots")
        .update({
            appointments_count: (slot.appointments_count || 0) + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("id", slot.id)
        .eq("organization_id", ctx.profile.organization_id);

    if (slotUpdateError) {
        console.error("Error updating slot capacity:", slotUpdateError);
    }

    revalidatePath("/crm/calendar");
    revalidatePath("/crm/appointments");

    return {
        success: true,
        event: {
            id: inserted.id,
            title: `${inserted.type || "Meeting"} - ${leadName}`,
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            participants: [leadName, organizerName].filter(Boolean),
            status: inserted.status,
            type: inserted.type,
            campus: inserted.campus,
            leadId: inserted.lead_id,
            slotId: inserted.slot_id,
            notes: inserted.notes,
            leadName,
            leadContactName: insertedLead?.contact_full_name,
            leadEmail: insertedLead?.contact_email,
            leadPhone: insertedLead?.contact_phone,
            organizerName,
            organizerEmail,
        },
    };
}

export async function updateCalendarEvent(eventData: {
    id: string;
    slotId: string;
    type?: string;
    notes?: string;
}): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) {
        return { success: false, error: ctx.error };
    }

    if (!eventData.id || !eventData.slotId) {
        return { success: false, error: "Faltan datos obligatorios." };
    }

    const { data: existing, error: existingError } = await ctx.supabase
        .from("appointments")
        .select("id, slot_id")
        .eq("id", eventData.id)
        .eq("organization_id", ctx.profile.organization_id)
        .single();

    if (existingError || !existing) {
        console.error("Error fetching appointment:", existingError);
        return { success: false, error: "No se encontró la cita." };
    }

    const { data: slot, error: slotError } = await ctx.supabase
        .from("availability_slots")
        .select(
            "id, starts_at, ends_at, campus, max_appointments, appointments_count, is_active, is_blocked",
        )
        .eq("organization_id", ctx.profile.organization_id)
        .eq("id", eventData.slotId)
        .single();

    if (slotError || !slot) {
        console.error("Error fetching slot:", slotError);
        return { success: false, error: "Slot no disponible." };
    }

    const changingSlot = existing.slot_id !== slot.id;
    const slotUnavailable = !slot.is_active ||
        slot.is_blocked ||
        typeof slot.appointments_count !== "number" ||
        typeof slot.max_appointments !== "number" ||
        (changingSlot && slot.appointments_count >= slot.max_appointments);

    if (slotUnavailable) {
        return {
            success: false,
            error: "El slot seleccionado ya no está disponible.",
        };
    }

    const { data: updated, error } = await ctx.supabase
        .from("appointments")
        .update({
            slot_id: slot.id,
            starts_at: slot.starts_at,
            ends_at: slot.ends_at,
            type: eventData.type || null,
            campus: slot.campus || null,
            notes: eventData.notes || null,
        })
        .eq("id", eventData.id)
        .select(`
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
        `)
        .single();

    if (error || !updated) {
        console.error("Error updating appointment:", error);
        return { success: false, error: "No se pudo actualizar la cita." };
    }

    const start = new Date(updated.starts_at);
    const end = new Date(updated.ends_at);
    const dateStr = format(start, "yyyy-MM-dd");
    const startTimeStr = format(start, "HH:mm");
    const endTimeStr = format(end, "HH:mm");
    const updatedLead = Array.isArray(updated.lead)
        ? updated.lead[0]
        : updated.lead;
    const updatedCreatedBy = Array.isArray(updated.created_by)
        ? updated.created_by[0]
        : updated.created_by;
    const leadName = updatedLead?.student_name || "Unknown Lead";
    const organizerName = updatedCreatedBy?.full_name || "Staff";
    const organizerEmail = updatedCreatedBy?.email || undefined;

    if (changingSlot && existing.slot_id) {
        const { data: oldSlot } = await ctx.supabase
            .from("availability_slots")
            .select("id, appointments_count")
            .eq("organization_id", ctx.profile.organization_id)
            .eq("id", existing.slot_id)
            .maybeSingle();

        if (oldSlot) {
            const nextCount = Math.max(
                (oldSlot.appointments_count || 0) - 1,
                0,
            );
            const { error: oldSlotError } = await ctx.supabase
                .from("availability_slots")
                .update({
                    appointments_count: nextCount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", oldSlot.id)
                .eq("organization_id", ctx.profile.organization_id);

            if (oldSlotError) {
                console.error("Error updating old slot:", oldSlotError);
            }
        }
    }

    if (changingSlot) {
        const { error: newSlotError } = await ctx.supabase
            .from("availability_slots")
            .update({
                appointments_count: (slot.appointments_count || 0) + 1,
                updated_at: new Date().toISOString(),
            })
            .eq("id", slot.id)
            .eq("organization_id", ctx.profile.organization_id);

        if (newSlotError) {
            console.error("Error updating new slot:", newSlotError);
        }
    }

    revalidatePath("/crm/calendar");
    revalidatePath("/crm/appointments");

    return {
        success: true,
        event: {
            id: updated.id,
            title: `${updated.type || "Meeting"} - ${leadName}`,
            date: dateStr,
            startTime: startTimeStr,
            endTime: endTimeStr,
            participants: [leadName, organizerName].filter(Boolean),
            status: updated.status,
            type: updated.type,
            campus: updated.campus,
            leadId: updated.lead_id,
            slotId: updated.slot_id,
            notes: updated.notes,
            leadName,
            leadContactName: updatedLead?.contact_full_name,
            leadEmail: updatedLead?.contact_email,
            leadPhone: updatedLead?.contact_phone,
            organizerName,
            organizerEmail,
        },
    };
}

export async function deleteCalendarEvent(
    eventId: string,
): Promise<{ success: boolean; error?: string }> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) {
        return { success: false, error: ctx.error };
    }

    if (!eventId) return { success: false, error: "ID inválido." };

    const { data: appointment, error: appointmentError } = await ctx.supabase
        .from("appointments")
        .select("id, slot_id")
        .eq("id", eventId)
        .eq("organization_id", ctx.profile.organization_id)
        .single();

    if (appointmentError || !appointment) {
        console.error("Error fetching appointment:", appointmentError);
        return { success: false, error: "No se encontró la cita." };
    }

    const { error } = await ctx.supabase
        .from("appointments")
        .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
        })
        .eq("id", eventId)
        .eq("organization_id", ctx.profile.organization_id);

    if (error) {
        console.error("Error cancelling appointment:", error);
        return { success: false, error: "No se pudo cancelar la cita." };
    }

    if (appointment.slot_id) {
        const { data: slot } = await ctx.supabase
            .from("availability_slots")
            .select("id, appointments_count")
            .eq("organization_id", ctx.profile.organization_id)
            .eq("id", appointment.slot_id)
            .maybeSingle();

        if (slot) {
            const nextCount = Math.max((slot.appointments_count || 0) - 1, 0);
            const { error: slotError } = await ctx.supabase
                .from("availability_slots")
                .update({
                    appointments_count: nextCount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", slot.id)
                .eq("organization_id", ctx.profile.organization_id);

            if (slotError) {
                console.error("Error updating slot capacity:", slotError);
            }
        }
    }

    revalidatePath("/crm/calendar");
    revalidatePath("/crm/appointments");
    return { success: true };
}
