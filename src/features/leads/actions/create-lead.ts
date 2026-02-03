"use server";

/**
 * Create Lead Server Action
 * Crea un nuevo lead manualmente, incluyendo la creación del contacto CRM
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import type { CreateLeadActionState } from "../types";

export async function createLead(
    _prevState: CreateLeadActionState,
    formData: FormData,
): Promise<CreateLeadActionState> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autorizado" };
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) {
        return { error: "No hay organización asociada" };
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
    const source = (formData.get("source") as string) || "direct";

    // 1. Crear contacto CRM primero (requerido por la FK)
    const { data: contact, error: contactError } = await supabase
        .from("crm_contacts")
        .insert({
            organization_id: profile.organization_id,
            first_name: contactFirstName || null,
            middle_name: contactMiddleName || null,
            last_name_paternal: contactLastNamePaternal || null,
            last_name_maternal: contactLastNameMaternal || null,
            phone: contactPhone || null,
            email: contactEmail || null,
            source: source === "direct" ? "manual" : source,
            updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (contactError || !contact) {
        console.error("Error creating contact:", contactError);
        return { error: "Error al crear el contacto" };
    }

    // 2. Insertar lead (student_name y contact_full_name son columnas generadas)
    const contactName = [contactFirstName, contactLastNamePaternal]
        .filter(Boolean)
        .join(" ");

    const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
            organization_id: profile.organization_id,
            status: "new",
            source,
            student_first_name: studentFirstName || null,
            student_middle_name: studentMiddleName || null,
            student_last_name_paternal: studentLastNamePaternal || null,
            student_last_name_maternal: studentLastNameMaternal || null,
            contact_first_name: contactFirstName || null,
            contact_middle_name: contactMiddleName || null,
            contact_last_name_paternal: contactLastNamePaternal || null,
            contact_last_name_maternal: contactLastNameMaternal || null,
            contact_email: contactEmail || null,
            contact_phone: contactPhone || null,
            contact_id: contact.id,
            contact_name: contactName || null,
            grade_interest: gradeInterest || null,
            current_school: currentSchool || null,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error creating lead:", error);
        // Intentar eliminar el contacto creado si falla el lead
        await supabase.from("crm_contacts").delete().eq("id", contact.id);
        return { error: "Error al crear el lead" };
    }

    revalidatePath("/crm/leads");
    return { success: "Lead creado exitosamente", leadId: newLead.id };
}
