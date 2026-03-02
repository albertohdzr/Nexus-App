/**
 * Notifications Feature Module — Client-safe barrel export
 *
 * ⚠️ Do NOT export services or server utilities here.
 *    Import those directly from their files to prevent barrel poisoning.
 */

// Actions (safe for client via useActionState)
export {
  markNotificationRead,
  markAllNotificationsRead,
} from "./actions";

// Types
export type {
  Notification,
  NotificationType,
  NotificationPreference,
  ActionState,
  EmailWebhookPayload,
} from "./types";

// Components (client)
export { NotificationBell, NotificationItem } from "./components";
