"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/src/lib/utils"
import {
    LayoutDashboard,
    Users,
    Briefcase,
    Folder,
    Contact,
    Package,
    Store,
    Activity,
    FileText,
    Megaphone,
    Inbox,
    CheckSquare,
    Calendar,
    HelpCircle,
    Settings,
    Search,
    Command,
    ChevronRight,
    Shield,
    UserX
} from "lucide-react"
import { Input } from "@/src/components/ui/input"
import { UserNav } from "@/src/components/layout/user-nav"

const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/home" },
    { title: "Leads", icon: Users, href: "/crm/leads" },
    { title: "Deals", icon: Briefcase, href: "/crm/deals" },
    { title: "Projects", icon: Folder, href: "/projects" },
    { title: "Contacts", icon: Contact, href: "/contacts" },
    { title: "Products", icon: Package, href: "/products" },
    { title: "Marketplace", icon: Store, href: "/marketplace" },
]

const insightItems = [
    { title: "Activities", icon: Activity, href: "/crm/activities" },
    { title: "Reports", icon: FileText, href: "/reports" },
    { title: "Campaigns", icon: Megaphone, href: "/campaigns" },
    { title: "Inbox", icon: Inbox, href: "/inbox" },
    { title: "Tasks", icon: CheckSquare, href: "/tasks" },
    { title: "Calendar", icon: Calendar, href: "/calendar" },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex flex-col h-full w-64 border-r bg-sidebar text-sidebar-foreground">
            {/* Header */}
            <div className="h-14 flex items-center px-4 gap-2 border-b border-sidebar-border/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold">
                    <div className="w-4 h-4 bg-current rounded-full animate-pulse" />
                </div>
                <span className="font-semibold text-lg">Bright</span>
                <div className="ml-auto text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-4">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search"
                        className="pl-8 bg-sidebar-accent/50 border-sidebar-border h-9"
                    />
                    <div className="absolute right-2 top-2.5 flex items-center gap-1">
                        <Command className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">K</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-3 gap-6 flex flex-col">
                {/* Menu Section */}
                <div>
                    <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground">Menu</h3>
                    <nav className="grid gap-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="h-4 w-4" />
                                        <span>{item.title}</span>
                                    </div>
                                    {isActive && (
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                                    )}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Insights Section */}
                <div>
                    <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground">Insights</h3>
                    <nav className="grid gap-1">
                        {insightItems.map((item) => {
                            const isActive = pathname === item.href
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto p-3 border-t border-sidebar-border/50 gap-1 flex flex-col">
                <Link
                    href="/help"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <HelpCircle className="h-4 w-4" />
                    <span>Help Center</span>
                </Link>
                <Link
                    href="/privacy-policy"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <Shield className="h-4 w-4" />
                    <span>Privacy Policy</span>
                </Link>
                <Link
                    href="/terms-of-service"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <FileText className="h-4 w-4" />
                    <span>Terms of Service</span>
                </Link>
                <Link
                    href="/data-deletion"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <UserX className="h-4 w-4" />
                    <span>Data Deletion</span>
                </Link>
                <Link
                    href="/settings"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </Link>

                <div className="mt-2 pt-2 border-t border-sidebar-border/50">
                    <UserNav showDetails />
                </div>
            </div>
        </div>
    )
}

