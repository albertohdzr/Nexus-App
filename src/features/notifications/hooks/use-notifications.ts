"use client";

/**
 * useNotifications Hook
 * Subscribes to Supabase Realtime for instant in-app notifications.
 * Manages local state (list + unread count) with optimistic updates.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { useUser } from "@/src/components/providers/auth-provider";
import { NOTIFICATIONS_PAGE_SIZE } from "../lib/constants";
import type { Notification } from "../types";

export function useNotifications(initialNotifications?: Notification[], initialUnreadCount?: number) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>(
    initialNotifications || [],
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);
  const [isLoading, setIsLoading] = useState(!initialNotifications);
  const supabaseRef = useRef(createClient());

  // Initial fetch (only if no SSR data was provided)
  useEffect(() => {
    if (!user || initialNotifications) return;

    setIsLoading(true);
    const supabase = supabaseRef.current;

    Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("recipient_profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATIONS_PAGE_SIZE),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", user.id)
        .eq("is_read", false),
    ]).then(([listResult, countResult]) => {
      setNotifications((listResult.data as Notification[]) || []);
      setUnreadCount(countResult.count || 0);
      setIsLoading(false);
    });
  }, [user, initialNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mark a single notification as read (optimistic + DB update)
  const markAsRead = useCallback(
    async (id: string) => {
      const supabase = supabaseRef.current;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
    },
    [],
  );

  // Mark all as read (optimistic + DB update)
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const supabase = supabaseRef.current;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString(),
      })),
    );
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("recipient_profile_id", user.id)
      .eq("is_read", false);
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
