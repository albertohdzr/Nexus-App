"use server";

/**
 * Update Lead Server Action
 * Actualiza información básica de un lead
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import type { UpdateLeadActionState } from "../types";

export async function updateLead(
    _prevState: UpdateLeadActionState,
    formData: FormData,
): Promise<UpdateLeadActionState> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autorizado" };
    }

    const leadId = formData.get("lead_id") as string;
    if (!leadId) {
        return { error: "ID de lead requerido" };
    }

    // Verificar que el lead pertenece a la organización del usuario
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    const { data: lead } = await supabase
        .from("leads")
        .select("organization_id")
        .eq("id", leadId)
        .single();

    if (
        !profile?.organization_id ||
        lead?.organization_id !== profile.organization_id
    ) {
        return { error: "No tienes permiso para editar este lead" };
    }

    // Extraer datos del formulario
    const studentFirstName = formData.get("student_first_name") as string;
    const studentMiddleName = formData.get("student_middle_name") as string;
    const studentLastNamePaternal = formData.get(
        "student_last_name_paternal",
    ) as string;
    const studentLastNameMaternal = formData.get(
        "student_last_name_maternal",
    ) as string;
    const contactFirstName = formData.get("contact_first_name") as string;
    const contactMiddleName = formData.get("contact_middle_name") as string;
    const contactLastNamePaternal = formData.get(
        "contact_last_name_paternal",
    ) as string;
    const contactLastNameMaternal = formData.get(
        "contact_last_name_maternal",
    ) as string;
    const contactEmail = formData.get("contact_email") as string;
    const contactPhone = formData.get("contact_phone") as string;
    const gradeInterest = formData.get("grade_interest") as string;
    const currentSchool = formData.get("current_school") as string;
    const schoolYear = formData.get("school_year") as string;

    // Construir nombres completos
    const studentName = [
        studentFirstName,
        studentMiddleName,
        studentLastNamePaternal,
        studentLastNameMaternal,
    ]
        .filter(Boolean)
        .join(" ");

    const contactFullName = [
        contactFirstName,
        contactMiddleName,
        contactLastNamePaternal,
        contactLastNameMaternal,
    ]
        .filter(Boolean)
        .join(" ");

    // Actualizar lead
    const { error } = await supabase
        .from("leads")
        .update({
            student_first_name: studentFirstName || null,
            student_middle_name: studentMiddleName || null,
            student_last_name_paternal: studentLastNamePaternal || null,
            student_last_name_maternal: studentLastNameMaternal || null,
            student_name: studentName || null,
            contact_first_name: contactFirstName || null,
            contact_middle_name: contactMiddleName || null,
            contact_last_name_paternal: contactLastNamePaternal || null,
            contact_last_name_maternal: contactLastNameMaternal || null,
            contact_full_name: contactFullName || null,
            contact_email: contactEmail || null,
            contact_phone: contactPhone || null,
            grade_interest: gradeInterest || null,
            current_school: currentSchool || null,
            school_year: schoolYear || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

    if (error) {
        console.error("Error updating lead:", error);
        return { error: "Error al actualizar el lead" };
    }

    revalidatePath("/crm/leads");
    revalidatePath(`/crm/leads/${leadId}`);
    return { success: "Lead actualizado exitosamente" };
}

/**
 * Actualiza solo el status de un lead
 */
export async function updateLeadStatus(
    _prevState: UpdateLeadActionState,
    formData: FormData,
): Promise<UpdateLeadActionState> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autorizado" };
    }

    const leadId = formData.get("lead_id") as string;
    const status = formData.get("status") as string;

    if (!leadId || !status) {
        return { error: "ID de lead y status son requeridos" };
    }

    // Verificar permisos
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    const { data: lead } = await supabase
        .from("leads")
        .select("organization_id")
        .eq("id", leadId)
        .single();

    if (
        !profile?.organization_id ||
        lead?.organization_id !== profile.organization_id
    ) {
        return { error: "No tienes permiso para editar este lead" };
    }

    // Actualizar status
    const { error } = await supabase
        .from("leads")
        .update({
            status,
            updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

    if (error) {
        console.error("Error updating lead status:", error);
        return { error: "Error al actualizar el status" };
    }

    revalidatePath("/crm/leads");
    revalidatePath(`/crm/leads/${leadId}`);
    return { success: "Status actualizado" };
}
