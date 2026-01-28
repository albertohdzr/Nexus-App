"use server";

/**
 * Update Lead Task Server Action
 * Actualiza campos específicos de un lead desde formularios de tareas
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import type { UpdateLeadActionState } from "../types";

const UPDATABLE_FIELDS = [
    "contact_first_name",
    "contact_middle_name",
    "contact_last_name_paternal",
    "contact_last_name_maternal",
    "contact_email",
    "contact_phone",
    "cycle_id",
    "division",
    "address_street",
    "address_number",
    "address_neighborhood",
    "address_postal_code",
    "address_city",
    "address_state",
    "address_country",
    "nationality",
    "native_language",
    "secondary_language",
    "decision_maker_name",
    "decision_maker_role",
    "decision_date",
    "budget_range",
    "visit_notes",
    "next_steps",
] as const;

export async function updateLeadTask(
    _prevState: UpdateLeadActionState,
    formData: FormData,
): Promise<UpdateLeadActionState> {
    try {
        const leadId = formData.get("leadId") as string | null;

        if (!leadId) {
            return { error: "No se encontró el lead a actualizar." };
        }

        const updateData: Record<string, string | null> = {};

        UPDATABLE_FIELDS.forEach((field) => {
            const raw = formData.get(field);
            if (raw === null) return;
            const value = typeof raw === "string" ? raw.trim() : "";
            updateData[field] = value || null;
        });

        if (Object.keys(updateData).length === 0) {
            return { error: "No hay cambios para guardar." };
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Inicia sesión para editar leads." };
        }

        const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("organization_id")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.organization_id) {
            console.error("Error loading user profile", profileError);
            return { error: "No se pudo validar tu perfil de usuario." };
        }

        const { data: lead, error: leadError } = await supabase
            .from("leads")
            .select("id, organization_id")
            .eq("id", leadId)
            .maybeSingle();

        if (leadError || !lead) {
            console.error("Error loading lead for task update", leadError);
            return { error: "No se encontró el lead." };
        }

        if (lead.organization_id !== profile.organization_id) {
            return { error: "No tienes permiso para editar este lead." };
        }

        const { error: updateError } = await supabase
            .from("leads")
            .update(updateData)
            .eq("id", leadId);

        if (updateError) {
            console.error("Error updating lead task fields", updateError);
            return { error: "No se pudo actualizar el lead." };
        }

        revalidatePath("/crm/leads");
        revalidatePath(`/crm/leads/${leadId}`);
        revalidatePath("/crm/visits");
        return { success: "Lead actualizado." };
    } catch (error) {
        console.error("updateLeadTask error", error);
        return { error: "No se pudo actualizar el lead." };
    }
}
