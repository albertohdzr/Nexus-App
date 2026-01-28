"use server";

/**
 * Visit Actions
 * Server actions for managing visit status
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import type { AppointmentActionState } from "../types";

/**
 * Internal implementation for starting a visit
 */
async function startVisitInternal(
    formData: FormData,
): Promise<AppointmentActionState> {
    try {
        const appointmentId = formData.get("appointmentId") as string | null;

        if (!appointmentId) {
            return { error: "ID de cita requerido." };
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { error: "No autorizado." };
        }

        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.organization_id) {
            console.error("Error loading user profile", profileError);
            return { error: "No se pudo validar tu perfil." };
        }

        const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .select("id, organization_id, status")
            .eq("id", appointmentId)
            .maybeSingle();

        if (appointmentError || !appointment) {
            console.error("Error loading appointment", appointmentError);
            return { error: "No se encontró la cita." };
        }

        if (appointment.organization_id !== profile.organization_id) {
            return { error: "No tienes permiso para esta cita." };
        }

        if (appointment.status === "in_progress") {
            return { success: "La visita ya está en progreso." };
        }

        const { error: updateError } = await supabase
            .from("appointments")
            .update({ status: "in_progress" })
            .eq("id", appointmentId);

        if (updateError) {
            console.error("Error updating appointment status", updateError);
            return { error: "No se pudo actualizar el estado." };
        }

        revalidatePath("/crm/visits");
        revalidatePath(`/crm/visits/${appointmentId}`);
        return { success: "Visita iniciada." };
    } catch (error) {
        console.error("startVisit error", error);
        return { error: "Error al iniciar la visita." };
    }
}

/**
 * Internal implementation for finishing a visit
 */
async function finishVisitInternal(
    formData: FormData,
): Promise<AppointmentActionState> {
    try {
        const appointmentId = formData.get("appointmentId") as string | null;
        const leadId = formData.get("leadId") as string | null;

        if (!appointmentId || !leadId) {
            return { error: "Datos incompletos." };
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { error: "No autorizado." };
        }

        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.organization_id) {
            console.error("Error loading user profile", profileError);
            return { error: "No se pudo validar tu perfil." };
        }

        const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .select("id, organization_id, status")
            .eq("id", appointmentId)
            .maybeSingle();

        if (appointmentError || !appointment) {
            console.error("Error loading appointment", appointmentError);
            return { error: "No se encontró la cita." };
        }

        if (appointment.organization_id !== profile.organization_id) {
            return { error: "No tienes permiso para esta cita." };
        }

        const { error: updateAppointmentError } = await supabase
            .from("appointments")
            .update({ status: "completed" })
            .eq("id", appointmentId);

        if (updateAppointmentError) {
            console.error(
                "Error completing appointment",
                updateAppointmentError,
            );
            return { error: "No se pudo completar la cita." };
        }

        const { error: updateLeadError } = await supabase
            .from("leads")
            .update({ status: "visited" })
            .eq("id", leadId);

        if (updateLeadError) {
            console.error(
                "Error updating lead status after visit",
                updateLeadError,
            );
            return {
                error: "Cita completada, pero no se pudo actualizar el lead.",
            };
        }

        revalidatePath("/crm/visits");
        revalidatePath(`/crm/visits/${appointmentId}`);
        revalidatePath(`/crm/leads/${leadId}`);
        return { success: "Visita completada." };
    } catch (error) {
        console.error("finishVisit error", error);
        return { error: "Error al completar la visita." };
    }
}

/**
 * Start a visit - change appointment status to "in_progress"
 * Use with form action={startVisit}
 */
export async function startVisit(formData: FormData): Promise<void> {
    await startVisitInternal(formData);
}

/**
 * Finish a visit - complete appointment and update lead status
 * Use with form action={finishVisit}
 */
export async function finishVisit(formData: FormData): Promise<void> {
    await finishVisitInternal(formData);
}

/**
 * Start visit action for useActionState
 */
export async function startVisitAction(
    _prevState: AppointmentActionState,
    formData: FormData,
): Promise<AppointmentActionState> {
    return startVisitInternal(formData);
}

/**
 * Finish visit action for useActionState
 */
export async function finishVisitAction(
    _prevState: AppointmentActionState,
    formData: FormData,
): Promise<AppointmentActionState> {
    return finishVisitInternal(formData);
}
