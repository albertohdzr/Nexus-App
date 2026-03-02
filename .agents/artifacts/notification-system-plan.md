# Notification System — Setup Guide

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│       ANY Source (Next.js UI, Bot API, DB Admin)         │
│  INSERT into leads / appointments / chat_sessions        │
└────────────────────────┬────────────────────────────────┘
                         │ Postgres Triggers
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Database Trigger Functions                   │
│  notify_on_lead_created()                                │
│  notify_on_chat_session_started()                        │
│  notify_on_appointment_change()                          │
├─────────────────────────────────────────────────────────┤
│  1. create_notifications() → INSERT into notifications   │
│     (Supabase Realtime broadcasts ✨)                    │
│  2. fire_email_webhook() → pg_net.http_post              │
│     (Non-blocking HTTP to /api/webhooks/notifications)   │
└─────────────┬───────────────────────┬───────────────────┘
              │                       │
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  Supabase         │    │  Next.js API      │
    │  Realtime         │    │  → Resend API     │
    │  (WebSocket)      │    │  (email delivery) │
    └────────┬─────────┘    └──────────────────┘
             │
             ▼
    ┌──────────────────┐
    │  🔔 Bell Icon     │
    │  DashboardHeader  │
    │  useNotifications │
    └──────────────────┘
```

## Files Created

### Database
- `supabase/migrations/20260225190000_notifications_system.sql`
  - Tables: `notification_types`, `notifications`, `notification_preferences`
  - Functions: `get_notification_recipients()`, `create_notifications()`, `fire_email_webhook()`
  - Triggers: `trg_notify_lead_created`, `trg_notify_chat_session_started`, `trg_notify_appointment_created`, `trg_notify_appointment_updated`
  - RLS policies, indexes, Realtime publication, seed data

### Feature Module
- `src/features/notifications/types.ts`
- `src/features/notifications/index.ts`
- `src/features/notifications/lib/constants.ts`
- `src/features/notifications/actions/mark-read.ts`
- `src/features/notifications/actions/index.ts`
- `src/features/notifications/services/notification-service.ts`
- `src/features/notifications/services/index.ts`
- `src/features/notifications/hooks/use-notifications.ts`
- `src/features/notifications/components/notification-bell.tsx`
- `src/features/notifications/components/notification-item.tsx`
- `src/features/notifications/components/index.ts`

### Email
- `src/lib/email/resend.ts` — Resend client singleton
- `src/lib/email/templates/notification-email.tsx` — HTML email template

### API
- `src/app/api/webhooks/notifications/route.ts` — Email webhook endpoint

### Modified
- `src/components/dashboard/header.tsx` — Added `NotificationBell` component

## Setup Steps

### 1. Run the migration
```bash
supabase db push
# or
supabase migration up
```

### 2. Configure Vault secrets (for email webhook)
In Supabase Dashboard → Settings → Vault:
```sql
-- Add these two secrets:
select vault.create_secret(
  'https://YOUR_APP_URL/api/webhooks/notifications',
  'NOTIFICATION_WEBHOOK_URL'
);

select vault.create_secret(
  'YOUR_WEBHOOK_TOKEN_HERE',
  'NOTIFICATION_WEBHOOK_TOKEN'
);
```

For local development:
```sql
select vault.create_secret(
  'http://host.docker.internal:3001/api/webhooks/notifications',
  'NOTIFICATION_WEBHOOK_URL'
);

select vault.create_secret(
  '31rOuq4q387KhuWYLEUd628oBxPMcKPX2FYlQfUFyQI=',
  'NOTIFICATION_WEBHOOK_TOKEN'
);
```

### 3. Environment variables
Add to `.env.local`:
```env
# Optional: customize the "from" email address
RESEND_FROM_EMAIL="Nexus <notificaciones@tu-dominio.com>"

# Token matching the Vault secret (for webhook auth validation)
NOTIFICATION_WEBHOOK_TOKEN="31rOuq4q387KhuWYLEUd628oBxPMcKPX2FYlQfUFyQI="
```

### 4. Restart dev server
```bash
npm run dev
```

## How It Works

### In-App Notifications
1. **Any source** (UI or Bot) inserts a row into `leads`, `appointments`, or `chat_sessions`
2. **Postgres trigger** fires automatically
3. Trigger calls `create_notifications()` which inserts one row per admissions recipient into `notifications`
4. **Supabase Realtime** broadcasts the new row instantly via WebSocket
5. **`useNotifications` hook** receives the event and updates the UI in ~100ms
6. **Bell icon** shows animated unread badge

### Email Notifications
1. Same Postgres trigger also calls `fire_email_webhook()`
2. `pg_net.http_post()` sends a non-blocking HTTP POST to `/api/webhooks/notifications`
3. API route resolves recipients, checks opt-out preferences
4. Sends personalized HTML emails via Resend
5. Failures are logged but never block the original transaction

### Why Database Triggers?
The chatbot runs as a **separate Python instance** with direct DB access. It creates leads, schedules appointments, and cancels them — all bypassing Next.js Server Actions. Database triggers ensure notifications fire regardless of who/what made the change.

## Adding New Notification Types

1. Insert into `notification_types`:
```sql
INSERT INTO public.notification_types (slug, title, icon, channels)
VALUES ('lead.status_changed', 'Lead Status Changed', 'refresh-cw', '{in_app}');
```

2. Create a trigger function and attach it to the relevant table
3. The UI automatically picks up new types (icon mapping in `constants.ts`)

## Scalability Notes

- **Recipient fan-out** is done in a single INSERT...SELECT (not individual INSERTs)
- **Partial index** on unread notifications for fast badge count queries
- **pg_net** is non-blocking: email failures never slow down DB operations
- **Notification preferences** table allows per-user, per-type, per-channel opt-out
- **notification_types registry** allows adding new types without code changes
