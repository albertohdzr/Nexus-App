"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/src/lib/utils"

interface MainContentProps {
    children: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
    const pathname = usePathname()
    const isChatPage = pathname?.startsWith("/chat")

    return (
        <div className={cn(
            "flex flex-col flex-1 overflow-auto",
            !isChatPage && "gap-4 py-4 md:gap-6 md:py-6"
        )}>
            {children}
        </div>
    )
}
