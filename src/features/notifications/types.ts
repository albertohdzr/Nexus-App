/**
 * Notification System Types
 * Domain types for the notifications feature module.
 */

// ─── Database Row Types ────────────────────────────────────────────────────

export interface Notification {
  id: string;
  organization_id: string;
  recipient_profile_id: string;
  type_slug: string;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationType {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  channels: string[];
  is_active: boolean;
}

export interface NotificationPreference {
  id: string;
  profile_id: string;
  type_slug: string;
  channel: string;
  enabled: boolean;
  updated_at: string;
}

// ─── Action States ─────────────────────────────────────────────────────────

export interface ActionState {
  success?: string;
  error?: string;
}

// ─── Email Webhook Payload (from pg_net → API route) ───────────────────────

export interface EmailWebhookPayload {
  organization_id: string;
  type_slug: string;
  title: string;
  body: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
}
