"use server";

/**
 * Add Note Server Action
 * Agrega una nota a un lead usando la tabla lead_activities
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import type { NoteActionState } from "../types";

export type AddNoteAction = (
    prevState: NoteActionState,
    formData: FormData,
) => Promise<NoteActionState>;

export async function addNote(
    _prevState: NoteActionState,
    formData: FormData,
): Promise<NoteActionState> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autorizado" };
    }

    const leadId = formData.get("lead_id") as string;
    const content = formData.get("content") as string;
    const subject = formData.get("subject") as string;

    if (!leadId || !content?.trim()) {
        return { error: "El contenido de la nota es requerido" };
    }

    // Obtener perfil y nombre del usuario
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id, full_name")
        .eq("id", user.id)
        .single();

    // Verificar que el lead pertenece a la organización
    const { data: lead } = await supabase
        .from("leads")
        .select("organization_id")
        .eq("id", leadId)
        .single();

    if (
        !profile?.organization_id ||
        lead?.organization_id !== profile.organization_id
    ) {
        return { error: "No tienes permiso para agregar notas a este lead" };
    }

    // Insertar nota en lead_activities
    const { error } = await supabase.from("lead_activities").insert({
        lead_id: leadId,
        type: "note",
        subject: subject?.trim() || null,
        notes: content.trim(),
        created_by: profile.full_name || user.email || user.id,
    });

    if (error) {
        console.error("Error adding note:", error);
        return { error: "Error al agregar la nota" };
    }

    // Actualizar timestamp del lead
    await supabase
        .from("leads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", leadId);

    revalidatePath(`/crm/leads/${leadId}`);
    return { success: "Nota agregada" };
}
