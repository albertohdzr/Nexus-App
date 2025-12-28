"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isChat = pathname?.startsWith("/chat");

    return (
        <div className={cn(
            "flex-1 overflow-auto w-full",
            isChat ? "p-0" : "p-4 sm:p-6"
        )}>
            {children}
        </div>
    );
}
