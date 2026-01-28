import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildEmailHtml,
  renderTemplate,
  sendResendEmail,
  toPlainText,
} from "@/src/lib/email";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const leadWebhookToken = process.env.LEAD_WEBHOOK_TOKEN || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const resendFromEmail = process.env.RESEND_FROM_EMAIL ||
  "Nexus CRM <onboarding@team5526.com>";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type LeadCreatedPayload = {
  event_type?: string;
  lead_id?: string;
  organization_id?: string;
  source?: string | null;
  created_at?: string;
};

type TriggerRule = {
  field?: string;
  operator?: string;
  value?: string;
};

type TemplateRow = {
  id: string;
  name: string;
  subject: string;
  category: string | null;
  channel: string;
  status: string;
  body_html: string;
  base_id: string | null;
};

type TriggerRow = {
  id: string;
  event_type: string;
  source: string;
  rules: TriggerRule[];
  is_active: boolean;
  template: TemplateRow | TemplateRow[] | null;
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const expectedHeader = leadWebhookToken ? `Bearer ${leadWebhookToken}` : "";

    if (!leadWebhookToken || authHeader !== expectedHeader) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const payload = (await request.json()) as LeadCreatedPayload;

    console.log("lead_created webhook received:", payload);

    if (
      payload.event_type !== "lead_created" &&
      payload.event_type !== "lead.created"
    ) {
      return NextResponse.json({ ok: true });
    }

    if (!payload.lead_id || !payload.organization_id) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, organization_id, source, grade_interest, school_year, contact_email, contact_full_name, contact_first_name, contact_last_name_paternal, contact_last_name_maternal, student_name",
      )
      .eq("id", payload.lead_id)
      .eq("organization_id", payload.organization_id)
      .single();

    if (leadError || !lead) {
      console.error("Lead not found", leadError);
      return new NextResponse("Not Found", { status: 404 });
    }

    if (!lead.contact_email) {
      return NextResponse.json({ ok: true, skipped: "missing_email" });
    }

    const [{ data: baseData }, { data: triggerData }] = await Promise.all([
      supabase
        .from("email_template_bases")
        .select("*")
        .eq("organization_id", lead.organization_id)
        .maybeSingle(),
      supabase
        .from("email_template_triggers")
        .select(
          "id, event_type, source, rules, is_active, template:email_templates(id, name, subject, category, channel, status, body_html, base_id)",
        )
        .eq("organization_id", lead.organization_id)
        .eq("event_type", "lead_created")
        .eq("is_active", true),
    ]);

    const tokenMap = buildTokenMap(lead);
    const matchedTemplates = new Map<string, TemplateRow>();
    (triggerData || []).forEach((row) => {
      const trigger = row as TriggerRow;
      const template = Array.isArray(trigger.template)
        ? trigger.template[0]
        : trigger.template;
      if (!template) return;
      if (!matchesSource(trigger.source, lead.source)) return;
      const normalizedRules = normalizeRules(trigger.rules);
      if (!matchesRules(normalizedRules, lead)) return;

      if (template.channel !== "email") return;
      if (template.status !== "active") return;

      matchedTemplates.set(template.id, template);
    });

    if (!matchedTemplates.size) {
      return NextResponse.json({ ok: true, skipped: "no_triggers" });
    }

    for (const template of matchedTemplates.values()) {
      const subject = renderTemplate(template.subject, tokenMap) ||
        "Nuevo registro";
      const html = buildEmailHtml({
        bodyHtml: template.body_html,
        base: baseData ?? null,
        previewText: subject,
        tokens: tokenMap,
      });

      if (!resendApiKey) {
        console.error("RESEND_API_KEY missing");
        continue;
      }

      await sendResendEmail({
        from: resendFromEmail,
        to: lead.contact_email,
        subject,
        html,
        text: toPlainText(html),
      });

      const notes = toPlainText(html);

      const { error: activityError } = await supabase
        .from("lead_activities")
        .insert({
          organization_id: lead.organization_id,
          lead_id: lead.id,
          type: "email",
          subject: subject || null,
          notes: notes || null,
          completed_at: new Date().toISOString(),
        });

      if (activityError) {
        console.error("Failed to log lead activity", activityError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("lead_created webhook error", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

function matchesSource(triggerSource: string, leadSource: string | null) {
  if (!triggerSource || triggerSource === "any") return true;
  return triggerSource === (leadSource || "");
}

function matchesRules(rules: TriggerRule[], lead: Record<string, unknown>) {
  if (!rules.length) return true;

  return rules.every((rule) => {
    const field = (rule.field || "").trim();
    const operator = (rule.operator || "").trim();
    const expected = (rule.value || "").trim();

    if (!field || !operator) return false;

    const actualRaw = lead[field];
    const actual = actualRaw === null || actualRaw === undefined
      ? ""
      : String(actualRaw);

    switch (operator) {
      case "equals":
        return actual.toLowerCase() === expected.toLowerCase();
      case "not_equals":
        return actual.toLowerCase() !== expected.toLowerCase();
      case "contains":
        return actual.toLowerCase().includes(expected.toLowerCase());
      default:
        return false;
    }
  });
}

function normalizeRules(
  rules: TriggerRule[] | string | null | undefined,
): TriggerRule[] {
  if (!rules) return [];
  if (Array.isArray(rules)) return rules;
  if (typeof rules === "string") {
    try {
      const parsed = JSON.parse(rules);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Invalid trigger rules JSON", error);
      return [];
    }
  }
  return [];
}

function buildTokenMap(lead: Record<string, unknown>) {
  const firstName = lead.contact_first_name
    ? String(lead.contact_first_name)
    : "";
  const lastNamePaternal = lead.contact_last_name_paternal
    ? String(lead.contact_last_name_paternal)
    : "";
  const lastNameMaternal = lead.contact_last_name_maternal
    ? String(lead.contact_last_name_maternal)
    : "";
  const fullName = lead.contact_full_name ? String(lead.contact_full_name) : "";

  const contactName = fullName ||
    [firstName, lastNamePaternal, lastNameMaternal]
      .filter(Boolean)
      .join(" ");

  return {
    contact_full_name: contactName || "",
    student_name: lead.student_name ? String(lead.student_name) : "",
    lead_id: lead.id ? String(lead.id) : "",
    visit_date: "",
    visit_time: "",
    campus_name: "",
  };
}
