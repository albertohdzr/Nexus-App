
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/src/lib/utils"
import { navigationModules, superAdminModules, UserRole } from "@/src/config/navigation"
import { useUser } from "@/src/components/providers/auth-provider"

export function SubSidebar() {
    const pathname = usePathname()
    const { role } = useUser()

    // Determine active module
    const allModules = [...superAdminModules, ...navigationModules]
    const activeModule = allModules.find(m =>
        (m.key === 'home' && pathname === '/home') ||
        (m.key !== 'home' && pathname.startsWith(m.href))
    )

    if (!activeModule || activeModule.subNavigation.length === 0) {
        return null
    }

    // Filter sub-navigation based on role
    const subNav = activeModule.subNavigation.filter(item => !item.roles || (role ? item.roles.includes(role as UserRole) : true))

    return (
        <div className="flex flex-col h-full w-64 border-r bg-card">
            <div className="h-14 flex items-center px-4 border-b">
                <h2 className="font-semibold text-base tracking-tight">{activeModule.title}</h2>
            </div>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid gap-0.5 px-2">
                    {subNav.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive
                                        ? "bg-accent text-accent-foreground shadow-sm"
                                        : "text-muted-foreground"
                                )}
                            >
                                {Icon && <Icon className="h-4 w-4" />}
                                <span>{item.title}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
