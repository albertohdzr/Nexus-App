"use client";

/**
 * NotificationItem
 * Renders a single notification row in the notification panel.
 */

import Link from "next/link";
import { cn } from "@/src/lib/utils";
import {
    NOTIFICATION_ICONS,
    DEFAULT_NOTIFICATION_ICON,
    getRelativeTime,
} from "../lib/constants";
import type { Notification } from "../types";

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
}

export function NotificationItem({
    notification,
    onRead,
}: NotificationItemProps) {
    // Resolve icon from metadata or type_slug
    const iconName = (notification.metadata as Record<string, string>)?.icon;
    const Icon =
        (iconName ? NOTIFICATION_ICONS[iconName] : null) ||
        getIconForType(notification.type_slug);

    const content = (
        <div
            className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer",
                "hover:bg-accent/50",
                !notification.is_read && "bg-primary/5",
            )}
            onClick={() => {
                if (!notification.is_read) {
                    onRead(notification.id);
                }
            }}
        >
            {/* Icon */}
            <div
                className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    !notification.is_read
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                )}
            >
                <Icon className="size-4" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <p
                        className={cn(
                            "text-sm leading-tight",
                            !notification.is_read ? "font-semibold" : "font-medium text-muted-foreground",
                        )}
                    >
                        {notification.title}
                    </p>
                    {/* Unread indicator dot */}
                    {!notification.is_read && (
                        <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                </div>
                {notification.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {notification.body}
                    </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground/60">
                    {getRelativeTime(notification.created_at)}
                </p>
            </div>
        </div>
    );

    // If there's a deep link, wrap in a Link
    if (notification.href) {
        return (
            <Link href={notification.href} className="block">
                {content}
            </Link>
        );
    }

    return content;
}

/** Map type_slug to a lucide icon */
function getIconForType(typeSlug: string) {
    const map: Record<string, string> = {
        "lead.created": "user-plus",
        "chat_session.started": "message-square",
        "appointment.created": "calendar-plus",
        "appointment.updated": "calendar-clock",
        "appointment.cancelled": "calendar-x",
    };

    return NOTIFICATION_ICONS[map[typeSlug] || ""] || DEFAULT_NOTIFICATION_ICON;
}
