"use server";

/**
 * Calendar Event Actions
 * Server actions for managing calendar events (appointments)
 */

import { format } from "date-fns";
import { revalidatePath } from "next/cache";
import { getUserContext } from "../lib/user-context";
import type { CreateEventResult, DeleteEventResult } from "../types";

type AppointmentRpcRow = {
    success: boolean;
    message: string;
    appointment_id: string | null;
    starts_at?: string | null;
    ends_at?: string | null;
};

function firstRpcRow(data: AppointmentRpcRow[] | AppointmentRpcRow | null) {
    return Array.isArray(data) ? data[0] : data;
}

async function loadCalendarEvent(
    ctx: NonNullable<Awaited<ReturnType<typeof getUserContext>>>,
    appointmentId: string,
): Promise<CreateEventResult> {
    const { data: appointment, error } = await ctx.supabase!
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
        .eq("id", appointmentId)
        .eq("organization_id", ctx.profile!.organization_id)
        .single();

    if (error || !appointment) {
        console.error("Error loading appointment:", error);
        return { error: "La cita se guardó, pero no se pudo cargar para mostrarla." };
    }

    const start = new Date(appointment.starts_at);
    const end = appointment.ends_at ? new Date(appointment.ends_at) : start;
    const appointmentLead = Array.isArray(appointment.lead)
        ? appointment.lead[0]
        : appointment.lead;
    const appointmentCreatedBy = Array.isArray(appointment.created_by)
        ? appointment.created_by[0]
        : appointment.created_by;
    const leadName = appointmentLead?.student_name || "Unknown Lead";
    const organizerName = appointmentCreatedBy?.full_name || "Staff";

    return {
        success: "Cita guardada exitosamente.",
        event: {
            id: appointment.id,
            title: `${appointment.type || "Meeting"} - ${leadName}`,
            date: format(start, "yyyy-MM-dd"),
            startTime: format(start, "HH:mm"),
            endTime: format(end, "HH:mm"),
            participants: [leadName, organizerName].filter(Boolean),
            status: appointment.status,
            type: appointment.type,
            campus: appointment.campus,
            leadId: appointment.lead_id,
            slotId: appointment.slot_id,
            notes: appointment.notes,
            leadName,
            leadContactName: appointmentLead?.contact_full_name,
            leadEmail: appointmentLead?.contact_email,
            leadPhone: appointmentLead?.contact_phone,
            organizerName,
            organizerEmail: appointmentCreatedBy?.email || undefined,
        },
    };
}

/**
 * Create a new calendar event (appointment)
 */
export async function createCalendarEvent(eventData: {
    leadId: string;
    slotId: string;
    type?: string;
    notes?: string;
}): Promise<CreateEventResult> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) {
        return { error: ctx.error };
    }

    if (!eventData.leadId || !eventData.slotId) {
        return { error: "Faltan datos obligatorios." };
    }

    const { data, error } = await ctx.supabase.rpc(
        "book_admission_appointment",
        {
            p_org_id: ctx.profile.organization_id,
            p_lead_id: eventData.leadId,
            p_slot_id: eventData.slotId,
            p_notes: eventData.notes || null,
            p_type: eventData.type || "Meeting",
            p_created_by_profile_id: ctx.profile.id,
        },
    );
    const result = firstRpcRow(data as AppointmentRpcRow[] | null);

    if (error || !result) {
        console.error("Error creating appointment:", error);
        return { error: "No se pudo crear la cita." };
    }

    if (!result.success || !result.appointment_id) {
        return { error: result.message || "El slot seleccionado ya no está disponible." };
    }

    revalidatePath("/crm/calendar");
    revalidatePath("/crm/appointments");

    const loaded = await loadCalendarEvent(ctx, result.appointment_id);
    return loaded.event
        ? { ...loaded, success: "Cita creada exitosamente." }
        : loaded;
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(eventData: {
    id: string;
    slotId: string;
    type?: string;
    notes?: string;
}): Promise<CreateEventResult> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) {
        return { error: ctx.error };
    }

    if (!eventData.id || !eventData.slotId) {
        return { error: "Faltan datos obligatorios." };
    }

    const { data, error } = await ctx.supabase.rpc(
        "reschedule_admission_appointment",
        {
            p_org_id: ctx.profile.organization_id,
            p_appointment_id: eventData.id,
            p_new_slot_id: eventData.slotId,
            p_notes: eventData.notes || null,
            p_type: eventData.type || null,
        },
    );
    const result = firstRpcRow(data as AppointmentRpcRow[] | null);

    if (error || !result) {
        console.error("Error updating appointment:", error);
        return { error: "No se pudo actualizar la cita." };
    }

    if (!result.success || !result.appointment_id) {
        return { error: result.message || "El slot seleccionado ya no está disponible." };
    }

    revalidatePath("/crm/calendar");
    revalidatePath("/crm/appointments");

    const loaded = await loadCalendarEvent(ctx, result.appointment_id);
    return loaded.event
        ? { ...loaded, success: "Cita actualizada exitosamente." }
        : loaded;
}

/**
 * Delete (cancel) a calendar event
 */
export async function deleteCalendarEvent(
    eventId: string,
): Promise<DeleteEventResult> {
    const ctx = await getUserContext();
    if (!ctx.supabase || !ctx.profile) {
        return { success: false, error: ctx.error };
    }

    if (!eventId) return { success: false, error: "ID inválido." };

    const { data, error } = await ctx.supabase.rpc(
        "cancel_admission_appointment",
        {
            p_org_id: ctx.profile.organization_id,
            p_appointment_id: eventId,
            p_reason: "Cancelado desde CRM",
        },
    );
    const result = firstRpcRow(data as AppointmentRpcRow[] | null);

    if (error || !result) {
        console.error("Error cancelling appointment:", error);
        return { success: false, error: "No se pudo cancelar la cita." };
    }

    if (!result.success) {
        return { success: false, error: result.message || "No se pudo cancelar la cita." };
    }

    revalidatePath("/crm/calendar");
    revalidatePath("/crm/appointments");
    return { success: true };
}
