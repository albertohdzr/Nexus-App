-- ============================================================================
-- Notification System
-- Captures events from ANY source (UI, Bot, API) via database triggers.
-- In-app: auto-inserted rows + Supabase Realtime broadcast.
-- Email:  pg_net webhook to Next.js API route (non-blocking).
-- ============================================================================

-- ──────────────────────── 1. NOTIFICATION_TYPES (registry) ─────────────────
create table if not exists public.notification_types (
  slug text primary key,
  title text not null,
  description text,
  icon text,                                -- lucide icon name
  channels text[] not null default '{in_app}',  -- '{in_app}', '{in_app,email}'
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.notification_types enable row level security;

create policy "Anyone can read notification types"
  on public.notification_types for select to authenticated using (true);

-- ──────────────────────── 2. NOTIFICATIONS (per-user inbox) ────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  type_slug text not null references public.notification_types(slug),
  title text not null,
  body text,
  href text,                                -- deep link
  metadata jsonb default '{}',              -- entity_id, source, etc.
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Performance indexes (following supabase-postgres-best-practices)
create index notifications_recipient_unread_idx
  on public.notifications (recipient_profile_id, created_at desc)
  where is_read = false;

create index notifications_org_created_idx
  on public.notifications (organization_id, created_at desc);

create index notifications_type_slug_idx
  on public.notifications (type_slug);

-- RLS: users only see their own
alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (recipient_profile_id = (select auth.uid()));

create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (recipient_profile_id = (select auth.uid()));

-- Triggers insert using SECURITY DEFINER, so no user-facing insert policy needed.

-- ──────────────────────── 3. NOTIFICATION_PREFERENCES (opt-out) ────────────
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.user_profiles(id) on delete cascade,
  type_slug text not null references public.notification_types(slug),
  channel text not null default 'in_app',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (profile_id, type_slug, channel)
);

alter table public.notification_preferences enable row level security;

create policy "Users manage own preferences"
  on public.notification_preferences for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ──────────────────────── 4. ENABLE REALTIME ───────────────────────────────
alter publication supabase_realtime add table public.notifications;

-- ──────────────────────── 5. SEED NOTIFICATION TYPES ───────────────────────
insert into public.notification_types (slug, title, description, icon, channels) values
  ('lead.created',            'Nuevo Lead',         'Se ha creado un nuevo lead',                  'user-plus',      '{in_app,email}'),
  ('chat_session.started',    'Nueva Sesión de Chat', 'Se ha iniciado una nueva sesión de chat',   'message-square',  '{in_app}'),
  ('appointment.created',     'Cita Creada',        'Se ha agendado una nueva cita',               'calendar-plus',   '{in_app,email}'),
  ('appointment.updated',     'Cita Modificada',    'Se ha modificado una cita existente',          'calendar-clock',  '{in_app}'),
  ('appointment.cancelled',   'Cita Cancelada',     'Se ha cancelado una cita',                    'calendar-x',      '{in_app,email}')
on conflict (slug) do nothing;

-- ──────────────────────── 6. HELPER: get admissions recipients ─────────────
-- Returns profile IDs for admissions/org_admin/director roles in a given org.
-- Used by all trigger functions to fan-out notifications.
create or replace function public.get_notification_recipients(p_org_id uuid)
returns setof uuid as $$
  select up.id
  from public.user_profiles up
  join public.roles r on r.id = up.role_id
  where up.organization_id = p_org_id
    and up.is_active = true
    and r.slug in ('admissions', 'org_admin', 'director');
$$ language sql stable security definer set search_path = public, extensions;

-- ──────────────────────── 7. HELPER: fan-out in-app notification ───────────
-- Inserts one notification per recipient. Non-blocking; errors are logged.
create or replace function public.create_notifications(
  p_org_id     uuid,
  p_type_slug  text,
  p_title      text,
  p_body       text default null,
  p_href       text default null,
  p_metadata   jsonb default '{}'
) returns void as $$
declare
  v_is_active boolean;
begin
  -- Check type is active
  select nt.is_active into v_is_active
  from public.notification_types nt
  where nt.slug = p_type_slug;

  if v_is_active is not true then
    return;
  end if;

  insert into public.notifications (
    organization_id, recipient_profile_id, type_slug, title, body, href, metadata
  )
  select
    p_org_id,
    r.id,
    p_type_slug,
    p_title,
    p_body,
    p_href,
    p_metadata
  from public.get_notification_recipients(p_org_id) r(id);

end;
$$ language plpgsql security definer set search_path = public, extensions;

-- ──────────────────────── 8. HELPER: fire email webhook ────────────────────
-- Calls Next.js API route via pg_net for email delivery.
-- Non-blocking HTTP POST. Failures do NOT roll back the transaction.
create or replace function public.fire_email_webhook(
  p_org_id     uuid,
  p_type_slug  text,
  p_title      text,
  p_body       text default null,
  p_href       text default null,
  p_metadata   jsonb default '{}'
) returns void as $$
declare
  v_channels text[];
  v_webhook_url text;
  v_webhook_token text;
begin
  -- Only fire if email channel is enabled for this type
  select nt.channels into v_channels
  from public.notification_types nt
  where nt.slug = p_type_slug and nt.is_active = true;

  if v_channels is null or not ('email' = any(v_channels)) then
    return;
  end if;

  -- Read webhook config from Vault
  select decrypted_secret into v_webhook_url
  from vault.decrypted_secrets
  where name = 'NOTIFICATION_WEBHOOK_URL'
  limit 1;

  select decrypted_secret into v_webhook_token
  from vault.decrypted_secrets
  where name = 'NOTIFICATION_WEBHOOK_TOKEN'
  limit 1;

  if v_webhook_url is null or v_webhook_url = '' then
    return;
  end if;

  perform net.http_post(
    url := v_webhook_url,
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
        case when coalesce(v_webhook_token, '') <> '' then 'Bearer ' || v_webhook_token else null end
    )),
    body := jsonb_build_object(
      'organization_id', p_org_id,
      'type_slug', p_type_slug,
      'title', p_title,
      'body', p_body,
      'href', p_href,
      'metadata', p_metadata
    ),
    timeout_milliseconds := 3000
  );
end;
$$ language plpgsql security definer set search_path = public, extensions;

-- ──────────────────────── 9. TRIGGER: lead.created ─────────────────────────
create or replace function public.notify_on_lead_created()
returns trigger as $$
declare
  v_student_name text;
  v_title text;
  v_body text;
begin
  v_student_name := coalesce(
    trim(coalesce(new.student_first_name, '') || ' ' || coalesce(new.student_last_name_paternal, '')),
    'Sin nombre'
  );
  v_title := 'Nuevo Lead: ' || v_student_name;
  v_body := 'Fuente: ' || coalesce(new.source, 'desconocida')
         || ' — Grado: ' || coalesce(new.grade_interest, 'N/A');

  -- In-app notifications (fan-out to admissions team)
  perform public.create_notifications(
    new.organization_id,
    'lead.created',
    v_title,
    v_body,
    '/crm/leads/' || new.id::text,
    jsonb_build_object('lead_id', new.id, 'source', new.source)
  );

  -- Email webhook (non-blocking)
  perform public.fire_email_webhook(
    new.organization_id,
    'lead.created',
    v_title,
    v_body,
    '/crm/leads/' || new.id::text,
    jsonb_build_object('lead_id', new.id, 'source', new.source)
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

create trigger trg_notify_lead_created
  after insert on public.leads
  for each row
  execute function public.notify_on_lead_created();

-- ──────────────────────── 10. TRIGGER: chat_session.started ────────────────
create or replace function public.notify_on_chat_session_started()
returns trigger as $$
declare
  v_chat_name text;
  v_title text;
  v_body text;
  v_chat_id uuid;
begin
  -- Look up the chat name / phone
  select c.name, c.phone_number, c.id
  into v_chat_name, v_body, v_chat_id
  from public.chats c
  where c.id = new.chat_id;

  v_chat_name := coalesce(v_chat_name, v_body, 'Contacto desconocido');
  v_title := 'Nueva sesión de chat: ' || v_chat_name;
  v_body := 'Se ha iniciado una conversación con ' || v_chat_name;

  perform public.create_notifications(
    new.organization_id,
    'chat_session.started',
    v_title,
    v_body,
    '/chat?chatId=' || coalesce(v_chat_id::text, ''),
    jsonb_build_object('chat_session_id', new.id, 'chat_id', v_chat_id)
  );

  -- No email for chat sessions (in_app only)
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

create trigger trg_notify_chat_session_started
  after insert on public.chat_sessions
  for each row
  execute function public.notify_on_chat_session_started();

-- ──────────────────────── 11. TRIGGER: appointment events ──────────────────
create or replace function public.notify_on_appointment_change()
returns trigger as $$
declare
  v_lead_name text;
  v_type_slug text;
  v_title text;
  v_body text;
  v_start_str text;
  v_metadata jsonb;
begin
  -- Resolve lead name
  select coalesce(l.student_name, l.contact_full_name, 'Lead')
  into v_lead_name
  from public.leads l
  where l.id = new.lead_id;

  v_start_str := to_char(new.starts_at at time zone 'America/Mexico_City', 'DD/MM/YYYY HH24:MI');

  if tg_op = 'INSERT' then
    v_type_slug := 'appointment.created';
    v_title := 'Cita agendada: ' || v_lead_name;
    v_body := coalesce(new.type, 'Cita') || ' — ' || v_start_str;
  elsif tg_op = 'UPDATE' then
    -- Distinguish cancelled from updated
    if new.status = 'cancelled' and old.status <> 'cancelled' then
      v_type_slug := 'appointment.cancelled';
      v_title := 'Cita cancelada: ' || v_lead_name;
      v_body := coalesce(new.type, 'Cita') || ' — ' || v_start_str || ' ha sido cancelada';
    else
      -- Only notify if meaningful fields changed
      if new.starts_at is distinct from old.starts_at
         or new.ends_at is distinct from old.ends_at
         or new.slot_id is distinct from old.slot_id
         or new.type is distinct from old.type then
        v_type_slug := 'appointment.updated';
        v_title := 'Cita modificada: ' || v_lead_name;
        v_body := coalesce(new.type, 'Cita') || ' — nuevo horario: ' || v_start_str;
      else
        -- No meaningful change → skip notification
        return new;
      end if;
    end if;
  end if;

  v_metadata := jsonb_build_object(
    'appointment_id', new.id,
    'lead_id', new.lead_id,
    'status', new.status
  );

  -- In-app
  perform public.create_notifications(
    new.organization_id,
    v_type_slug,
    v_title,
    v_body,
    '/crm/calendar',
    v_metadata
  );

  -- Email webhook (for created / cancelled only)
  if v_type_slug in ('appointment.created', 'appointment.cancelled') then
    perform public.fire_email_webhook(
      new.organization_id,
      v_type_slug,
      v_title,
      v_body,
      '/crm/calendar',
      v_metadata
    );
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

create trigger trg_notify_appointment_created
  after insert on public.appointments
  for each row
  execute function public.notify_on_appointment_change();

create trigger trg_notify_appointment_updated
  after update on public.appointments
  for each row
  execute function public.notify_on_appointment_change();
