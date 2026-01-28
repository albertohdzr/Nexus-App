"use server";

/**
 * Send Follow-up Server Action
 * Envía un email de seguimiento a un lead
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { buildEmailHtml, sendResendEmail, toPlainText } from "@/src/lib/email";
import type { FollowUpActionState } from "../types";

export type SendFollowUpAction = (
    prevState: FollowUpActionState,
    formData: FormData,
) => Promise<FollowUpActionState>;

export async function sendFollowUp(
    _prevState: FollowUpActionState,
    formData: FormData,
): Promise<FollowUpActionState> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autorizado" };
    }

    const leadId = formData.get("lead_id") as string;
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;
    const recipientEmail = formData.get("recipient_email") as string;

    if (!leadId || !subject || !message || !recipientEmail) {
        return { error: "Todos los campos son requeridos" };
    }

    // Verificar permisos
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    const { data: lead } = await supabase
        .from("leads")
        .select("organization_id, student_name, contact_full_name")
        .eq("id", leadId)
        .single();

    if (
        !profile?.organization_id ||
        lead?.organization_id !== profile.organization_id
    ) {
        return { error: "No tienes permiso para contactar este lead" };
    }

    // Obtener configuración de la organización para el "from"
    const { data: org } = await supabase
        .from("organizations")
        .select("name, contact_email")
        .eq("id", profile.organization_id)
        .single();

    const fromEmail = org?.contact_email || "admissions@nexus.app";
    const fromName = org?.name || "Equipo de Admisiones";

    // Construir HTML del email
    const htmlContent = buildEmailHtml({
        bodyHtml: message.split("\n").map((line) => `<p>${line}</p>`).join(""),
        previewText: `Seguimiento - ${lead?.student_name || "Admisiones"}`,
    });

    // Enviar email
    const result = await sendResendEmail({
        from: `${fromName} <${fromEmail}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: toPlainText(message),
    });

    if (result.error) {
        console.error("Error sending follow-up email:", result.error);
        return { error: "Error al enviar el email" };
    }

    // Registrar la comunicación
    await supabase.from("lead_communications").insert({
        lead_id: leadId,
        type: "email",
        subject,
        content: message,
        sent_by: user.id,
        sent_at: new Date().toISOString(),
    });

    // Actualizar status del lead si es "new"
    const { data: currentLead } = await supabase
        .from("leads")
        .select("status")
        .eq("id", leadId)
        .single();

    if (currentLead?.status === "new") {
        await supabase
            .from("leads")
            .update({
                status: "contacted",
                updated_at: new Date().toISOString(),
            })
            .eq("id", leadId);
    }

    revalidatePath("/crm/leads");
    revalidatePath(`/crm/leads/${leadId}`);
    return { success: "Email enviado exitosamente" };
}
