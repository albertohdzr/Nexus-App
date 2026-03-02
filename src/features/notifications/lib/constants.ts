/**
 * Notification Constants
 * Icon mappings and type metadata for the notification system.
 */

import {
  UserPlus,
  MessageSquare,
  CalendarPlus,
  CalendarClock,
  CalendarX,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const NOTIFICATION_ICONS: Record<string, LucideIcon> = {
  "user-plus": UserPlus,
  "message-square": MessageSquare,
  "calendar-plus": CalendarPlus,
  "calendar-clock": CalendarClock,
  "calendar-x": CalendarX,
};

export const DEFAULT_NOTIFICATION_ICON = Bell;

/** How many notifications to fetch initially */
export const NOTIFICATIONS_PAGE_SIZE = 50;

/** Relative time labels in Spanish */
export function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin}m`;
  if (diffHour < 24) return `Hace ${diffHour}h`;
  if (diffDay < 7) return `Hace ${diffDay}d`;

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
