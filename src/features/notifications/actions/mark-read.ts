"use server";

/**
 * Mark Notification(s) as Read
 * Server action to update notification read status.
 */

import { createClient } from "@/src/lib/supabase/server";
import type { ActionState } from "../types";

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_profile_id", user.id);

  if (error) {
    console.error("Error marking notification read:", error);
    return { error: "No se pudo marcar como leída" };
  }

  return { success: "Notificación marcada como leída" };
}

/**
 * Mark all unread notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autorizado" };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("recipient_profile_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("Error marking all notifications read:", error);
    return { error: "No se pudieron marcar como leídas" };
  }

  return { success: "Todas las notificaciones marcadas como leídas" };
}
