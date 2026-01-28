"use server";

/**
 * Add Note Server Action
 * Agrega una nota a un lead
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

    if (!leadId || !content?.trim()) {
        return { error: "El contenido de la nota es requerido" };
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
        return { error: "No tienes permiso para agregar notas a este lead" };
    }

    // Insertar nota
    const { error } = await supabase.from("lead_notes").insert({
        lead_id: leadId,
        content: content.trim(),
        created_by: user.id,
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
