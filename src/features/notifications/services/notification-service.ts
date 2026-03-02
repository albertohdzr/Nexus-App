/**
 * Notification Service
 * Server-side data fetching for notifications.
 */

import { createClient } from "@/src/lib/supabase/server";
import type { Notification } from "../types";
import { NOTIFICATIONS_PAGE_SIZE } from "../lib/constants";

/**
 * Fetch the latest notifications for the current user.
 * Used in server components for initial page load.
 */
export async function getNotifications(limit = NOTIFICATIONS_PAGE_SIZE): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  // Parallel fetch: notifications list + unread count
  const [notificationsResult, countResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("recipient_profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", user.id)
      .eq("is_read", false),
  ]);

  return {
    notifications: (notificationsResult.data as Notification[]) || [],
    unreadCount: countResult.count || 0,
  };
}
