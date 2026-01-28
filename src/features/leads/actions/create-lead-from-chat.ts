"use server";

/**
 * Create Lead From Chat Server Action
 * Crea un nuevo lead asociado a un chat de WhatsApp
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import type { CreateLeadActionState } from "../types";

export async function createLeadFromChat(
    _prevState: CreateLeadActionState,
    formData: FormData,
): Promise<CreateLeadActionState> {
    try {
        const chatId = formData.get("chatId") as string | null;
        const studentFirst =
            (formData.get("student_first_name") as string | null) ?? "";
        const studentMiddle =
            (formData.get("student_middle_name") as string | null) ?? null;
        const studentLastPaternal =
            (formData.get("student_last_name_paternal") as string | null) ?? "";
        const studentLastMaternal =
            (formData.get("student_last_name_maternal") as string | null) ??
                null;
        const grade = (formData.get("grade_interest") as string | null) ?? "";
        const schoolYear = (formData.get("school_year") as string | null) ??
            null;
        const currentSchool =
            (formData.get("current_school") as string | null) ?? null;

        const contactFirst =
            (formData.get("contact_first_name") as string | null) ?? "";
        const contactMiddle =
            (formData.get("contact_middle_name") as string | null) ?? null;
        const contactLastPaternal =
            (formData.get("contact_last_name_paternal") as string | null) ?? "";
        const contactLastMaternal =
            (formData.get("contact_last_name_maternal") as string | null) ??
                null;
        const contactEmail = (formData.get("contact_email") as string | null) ??
            null;
        const contactPhone = (formData.get("contact_phone") as string | null) ??
            "";

        if (!chatId) {
            return { error: "No se encontró el chat para crear el lead." };
        }
        if (!studentFirst.trim() || !studentLastPaternal.trim()) {
            return {
                error: "Nombre y apellido del estudiante son obligatorios.",
            };
        }
        if (!contactFirst.trim() || !contactLastPaternal.trim()) {
            return {
                error: "Nombre y apellido del contacto son obligatorios.",
            };
        }
        if (!grade.trim()) {
            return { error: "El grado de interés es obligatorio." };
        }
        if (!contactPhone.trim()) {
            return { error: "El teléfono de contacto es obligatorio." };
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Inicia sesión para crear leads." };
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

        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("id, wa_id, phone_number, organization_id")
            .eq("id", chatId)
            .maybeSingle();

        if (chatError || !chat) {
            console.error("Error loading chat for lead creation", chatError);
            return { error: "No se encontró el chat para crear el lead." };
        }

        if (chat.organization_id !== profile.organization_id) {
            return {
                error: "No tienes permiso para crear el lead de este chat.",
            };
        }

        const { data: existingLead } = await supabase
            .from("leads")
            .select("id")
            .eq("organization_id", profile.organization_id)
            .eq("wa_chat_id", chat.id)
            .maybeSingle();

        if (existingLead?.id) {
            return { error: "Este chat ya tiene un lead asociado." };
        }

        const { data: contact, error: contactError } = await supabase
            .from("crm_contacts")
            .insert({
                organization_id: profile.organization_id,
                first_name: contactFirst,
                middle_name: contactMiddle,
                last_name_paternal: contactLastPaternal,
                last_name_maternal: contactLastMaternal,
                phone: contactPhone,
                email: contactEmail,
                whatsapp_wa_id: chat.wa_id,
                source: "chat",
                updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (contactError || !contact) {
            console.error("Error creating contact from chat", contactError);
            return { error: "No se pudo crear el contacto del lead." };
        }

        const { data: lead, error: insertError } = await supabase
            .from("leads")
            .insert({
                organization_id: profile.organization_id,
                status: "new",
                source: "chat",
                grade_interest: grade,
                school_year: schoolYear || null,
                current_school: currentSchool || null,
                student_first_name: studentFirst,
                student_middle_name: studentMiddle,
                student_last_name_paternal: studentLastPaternal,
                student_last_name_maternal: studentLastMaternal,
                contact_first_name: contactFirst,
                contact_middle_name: contactMiddle,
                contact_last_name_paternal: contactLastPaternal,
                contact_last_name_maternal: contactLastMaternal,
                contact_email: contactEmail || null,
                contact_phone: contactPhone || chat.phone_number || null,
                contact_id: contact.id,
                contact_name: [contactFirst, contactLastPaternal].filter(
                    Boolean,
                ).join(" "),
                wa_chat_id: chat.id,
                wa_id: chat.wa_id,
            })
            .select("id")
            .single();

        if (insertError || !lead) {
            console.error("Error creating lead from chat", insertError);
            return { error: "No se pudo crear el lead." };
        }

        revalidatePath("/chat");
        revalidatePath("/crm/leads");
        revalidatePath(`/crm/leads/${lead.id}`);

        return {
            success: "Lead creado desde el chat.",
            leadId: lead.id,
        };
    } catch (error) {
        console.error("createLeadFromChat error", error);
        return { error: "No se pudo crear el lead." };
    }
}
