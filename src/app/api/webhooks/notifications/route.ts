/**
 * Notification Email Webhook API Route
 * Called by Postgres triggers via pg_net to send email notifications.
 *
 * Flow:
 *   1. DB trigger fires → pg_net.http_post → this route
 *   2. This route resolves admissions recipients
 *   3. Sends emails via Resend to each recipient (respecting preferences)
 *
 * Auth: Bearer token from Vault (NOTIFICATION_WEBHOOK_TOKEN)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResend } from "@/src/lib/email/resend";
import { buildNotificationEmailHtml } from "@/src/lib/email/templates/notification-email";
import type { EmailWebhookPayload } from "@/src/features/notifications/types";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  // 1. Verify auth token
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.NOTIFICATION_WEBHOOK_TOKEN || process.env.LEAD_WEBHOOK_TOKEN;

  if (!expectedToken || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== expectedToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse payload
  let payload: EmailWebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { organization_id, type_slug, title, body, href, metadata } = payload;

  if (!organization_id || !type_slug || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // 3. Get organization details
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, slug")
      .eq("id", organization_id)
      .single();

    // 4. Find email recipients (admissions, org_admin, director)
    const { data: recipients } = await supabaseAdmin
      .from("user_profiles")
      .select(`
        id,
        email,
        first_name,
        role_id,
        role:roles!inner (slug)
      `)
      .eq("organization_id", organization_id)
      .eq("is_active", true)
      .not("email", "is", null);

    if (!recipients?.length) {
      return NextResponse.json({ sent: 0, reason: "No recipients found" });
    }

    // Filter to admissions-related roles
    const admissionsRecipients = recipients.filter((r) => {
      const roleRecord = Array.isArray(r.role) ? r.role[0] : r.role;
      const slug = roleRecord?.slug;
      return slug && ["admissions", "org_admin", "director"].includes(slug);
    });

    if (!admissionsRecipients.length) {
      return NextResponse.json({ sent: 0, reason: "No admissions recipients" });
    }

    // 5. Check preferences and send emails
    const resend = getResend();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Nexus <onboarding@resend.dev>";

    let sent = 0;
    const errors: string[] = [];

    for (const recipient of admissionsRecipients) {
      // Check if user opted out of email for this type
      const { data: pref } = await supabaseAdmin
        .from("notification_preferences")
        .select("enabled")
        .eq("profile_id", recipient.id)
        .eq("type_slug", type_slug)
        .eq("channel", "email")
        .maybeSingle();

      if (pref && !pref.enabled) continue;

      const actionUrl = href ? `${appUrl}${href}` : null;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: recipient.email,
          subject: title,
          html: buildNotificationEmailHtml({
            recipientName: recipient.first_name || "Equipo",
            title,
            body,
            actionUrl,
            orgName: org?.name || "Nexus",
          }),
        });
        sent++;
      } catch (emailError) {
        const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
        errors.push(`${recipient.email}: ${errorMsg}`);
        console.error(`[notification-email] Error sending to ${recipient.email}:`, emailError);
      }
    }

    return NextResponse.json({
      sent,
      total: admissionsRecipients.length,
      ...(errors.length > 0 && { errors }),
      metadata,
    });
  } catch (error) {
    console.error("[notification-email] Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
