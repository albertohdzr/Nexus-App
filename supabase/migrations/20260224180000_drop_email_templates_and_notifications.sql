-- Drop all email template, notification, and event outbox infrastructure
-- Order: triggers -> templates -> bases (respects FK dependencies)

-- 1. Drop policies first
drop policy if exists "Users select email_template_triggers by org" on public.email_template_triggers;
drop policy if exists "Users insert email_template_triggers by org" on public.email_template_triggers;
drop policy if exists "Users update email_template_triggers by org" on public.email_template_triggers;

drop policy if exists "Users select email_templates by org" on public.email_templates;
drop policy if exists "Users insert email_templates by org" on public.email_templates;
drop policy if exists "Users update email_templates by org" on public.email_templates;

drop policy if exists "Users select email_template_bases by org" on public.email_template_bases;
drop policy if exists "Users insert email_template_bases by org" on public.email_template_bases;
drop policy if exists "Users update email_template_bases by org" on public.email_template_bases;

-- 2. Drop email template tables (order matters for FK)
drop table if exists public.email_template_triggers;
drop table if exists public.email_templates;
drop table if exists public.email_template_bases;

-- 3. Drop the lead_created webhook trigger and its function
drop trigger if exists lead_created_webhook on public.leads;
drop function if exists public.notify_lead_created();

-- 4. Drop the event outbox table (used for webhook idempotency)
drop table if exists public.event_outbox;
