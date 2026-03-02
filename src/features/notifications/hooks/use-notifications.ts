"use client";

/**
 * useNotifications Hook
 * Subscribes to Supabase Realtime for instant in-app notifications.
 * Manages local state (list + unread count) with optimistic updates.
 *
 * KEY: Uses stable `userId` string as dependency instead of the `user`
 * object to prevent infinite re-renders caused by Supabase auth token
 * refreshes which create new user object references.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { useUser } from "@/src/components/providers/auth-provider";
import { NOTIFICATIONS_PAGE_SIZE } from "../lib/constants";
import type { Notification } from "../types";

export function useNotifications(
  initialNotifications?: Notification[],
  initialUnreadCount?: number,
) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [notifications, setNotifications] = useState<Notification[]>(
    initialNotifications || [],
  );
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount ?? 0);
  const [isLoading, setIsLoading] = useState(!initialNotifications);

  // Stable refs to prevent infinite loops
  const supabaseRef = useRef(createClient());
  const hasFetchedRef = useRef(false);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // ── Initial fetch (runs once per userId) ──────────────────────────────
  useEffect(() => {
    // Skip if: no user, already have SSR data, or already fetched for this user
    if (!userId || initialNotifications || hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    setIsLoading(true);
    const supabase = supabaseRef.current;

    Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("recipient_profile_id", userId)
        .order("created_at", { ascending: false })
        .limit(NOTIFICATIONS_PAGE_SIZE),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_profile_id", userId)
        .eq("is_read", false),
    ]).then(([listResult, countResult]) => {
      setNotifications((listResult.data as Notification[]) || []);
      setUnreadCount(countResult.count || 0);
      setIsLoading(false);
    });
  }, [userId, initialNotifications]);

  // ── Realtime subscription (one channel per userId) ────────────────────
  useEffect(() => {
    if (!userId) return;

    const supabase = supabaseRef.current;

    // Prevent duplicate subscriptions
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_profile_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  // ── Mark single notification as read (optimistic) ─────────────────────
  const markAsRead = useCallback(async (id: string) => {
    const supabase = supabaseRef.current;

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
  }, []);

  // ── Mark all as read (optimistic) ─────────────────────────────────────
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const supabase = supabaseRef.current;

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
      .eq("recipient_profile_id", userId)
      .eq("is_read", false);
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
}
