"use client";

/**
 * NotificationPanel
 * Dropdown panel showing the notification list with mark-all-read action.
 */

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { NotificationItem } from "./notification-item";
import { useNotifications } from "../hooks/use-notifications";
import type { Notification } from "../types";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/src/components/ui/popover";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";


interface NotificationBellProps {
    initialNotifications?: Notification[];
    initialUnreadCount?: number;
}

export function NotificationBell({
    initialNotifications,
    initialUnreadCount,
}: NotificationBellProps) {
    const {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
    } = useNotifications(initialNotifications, initialUnreadCount);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-8"
                    aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ""}`}
                >
                    <Bell className="size-4" />
                    {/* Unread badge */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-in zoom-in-50 duration-200">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[380px] p-0"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                            onClick={markAllAsRead}
                        >
                            <CheckCheck className="size-3.5" />
                            Marcar todo leído
                        </Button>
                    )}
                </div>

                <Separator />

                {/* Notification list */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                <Bell className="size-5 text-muted-foreground" />
                            </div>
                            <p className="mt-3 text-sm font-medium text-muted-foreground">
                                Sin notificaciones
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground/60">
                                Te notificaremos cuando haya actividad
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onRead={markAsRead}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
