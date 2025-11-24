
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/src/lib/utils"
import { navigationModules, superAdminModules, ModuleConfig } from "@/src/config/navigation"
import { useUser } from "@/src/components/providers/auth-provider"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/src/components/ui/tooltip"

export function ModuleSidebar() {
    const pathname = usePathname()
    const { role } = useUser()

    // Combine modules based on role
    // If superadmin, show superadmin modules + regular modules (or maybe just superadmin context?)
    // For now, let's append superadmin modules if the user is a superadmin
    const modules = role === 'superadmin'
        ? [...superAdminModules, ...navigationModules]
        : navigationModules.filter(m => !m.roles || m.roles.includes(role as any))

    return (
        <div className="flex flex-col h-full w-16 border-r bg-card items-center py-3 gap-2">
            {/* Logo */}
            <div className="flex items-center justify-center w-10 h-10 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    N
                </div>
            </div>

            {/* Module Icons */}
            <div className="flex-1 flex flex-col gap-1 w-full items-center">
                <TooltipProvider delayDuration={0}>
                    {modules.map((module) => {
                        const isActive = pathname.startsWith(module.href) || (module.key === 'home' && pathname === '/home')
                        const Icon = module.icon

                        return (
                            <Tooltip key={module.key}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={module.href}
                                        className={cn(
                                            "flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-200",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isActive
                                                ? "bg-accent text-accent-foreground shadow-sm"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="sr-only">{module.title}</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="flex items-center gap-2">
                                    {module.title}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </div>
        </div>
    )
}
