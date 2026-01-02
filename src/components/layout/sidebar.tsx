"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserNav } from "@/src/components/layout/user-nav"
import {
    Sidebar as SidebarPrimitive,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/src/components/ui/sidebar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/src/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
    Settings,
    UserPlus,
    LogOut,
    ChevronsUpDown,
    Users,
    MessageSquare,
    LayoutDashboard,
    Shield,
    ChevronRight,
    Calendar,
    Contact,
    Mail,
    GraduationCap,
    Files,
    CreditCard,
    Plus,
    FileText,
    LucideIcon
} from "lucide-react"
import { useUser } from "@/src/components/providers/auth-provider"
import { hasPermission } from "@/src/lib/permissions"

interface NavItem {
    title: string;
    url?: string;
    icon: LucideIcon;
    isActive: boolean;
    id?: string;
    module?: string;
    action?: string;
    children?: {
        title: string;
        url: string;
        icon?: LucideIcon;
        module?: string;
        action?: string;
    }[];
}

interface SidebarProps extends React.ComponentProps<typeof SidebarPrimitive> {
    organizationSlug: string
}

export function Sidebar({ organizationSlug, ...props }: SidebarProps) {
    const pathname = usePathname()
    const { permissions, roleSlug } = useUser()
    
    // Helper to check if a path is active
    const isPathActive = (path: string) => pathname.includes(path)

    // State for expanded items
    const [expandedItems, setExpandedItems] = React.useState<string[]>([
        "crm",
        "admissions",
        "settings",
    ])

    const toggleItem = (id: string) => {
        setExpandedItems((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
    }

    // Navigation Structure
    const navItems: NavItem[] = [
        {
            title: "Dashboard",
            url: `/home`,
            icon: LayoutDashboard,
            isActive: pathname === `/home` || pathname === `/`,
        },
        {
            title: "CRM",
            icon: Users,
            id: "crm",
            isActive: isPathActive("/crm"),
            module: "crm",
            children: [
                { title: "Overview", url: `/crm`, icon: LayoutDashboard, module: "crm" },
                { title: "Leads", url: `/crm/leads`, icon: Contact, module: "crm" },
                { title: "Calendar", url: `/crm/calendar`, icon: Calendar, module: "crm", action: "manage_appointments" },
                { title: "Appointments", url: `/crm/appointments`, icon: Calendar, module: "crm", action: "manage_appointments" },
                { title: "Templates", url: `/crm/templates`, icon: Mail, module: "crm", action: "manage_templates" },
                { title: "WhatsApp", url: `/crm/whatsapp-templates`, icon: MessageSquare, module: "crm", action: "manage_whatsapp_templates" },
            ]
        },
        {
            title: "Chat",
            url: `/chat`,
            icon: MessageSquare,
            isActive: isPathActive("/chat"),
            module: "crm",
        },
        {
            title: "Admissions",
            icon: GraduationCap,
            id: "admissions",
            isActive: isPathActive("/admissions"),
            module: "admissions",
            children: [
                { title: "Overview", url: `/admissions`, icon: LayoutDashboard, module: "admissions" },
                { title: "Cycles", url: `/admissions/cycles`, icon: Plus, module: "admissions" },
                { title: "Documents", url: `/admissions/documents`, icon: Files, module: "admissions" },
            ]
        },
        {
            title: "Finance",
            url: `/finance`,
            icon: CreditCard,
            isActive: isPathActive("/finance"),
            module: "finance",
        },
        {
            title: "AI Logs",
            url: `/ai-audit`,
            icon: FileText,
            isActive: isPathActive("/ai-audit"),
            module: "ai_audit",
        },
        {
            title: "Settings",
            url: `/settings`,
            icon: Settings,
            id: "settings",
            isActive: isPathActive("/settings"),
            module: "settings",
             children: [
                { title: "General", url: `/settings`, icon: Settings, module: "settings", action: "manage_org" },
                { title: "Team", url: `/settings/team`, icon: Users, module: "settings", action: "manage_team" },
                { title: "Roles & Permissions", url: `/settings/roles`, icon: Shield, module: "settings", action: "manage_roles" },
                { title: "Directory", url: `/settings/directory`, icon: Users, module: "settings", action: "manage_directory" },
                { title: "Bot", url: `/settings/bot`, icon: MessageSquare, module: "settings", action: "manage_bot" },
            ]
        },
    ]

    // Add Superadmin link if applicable
    if (roleSlug === "superadmin") {
        navItems.push({
            title: "Superadmin",
            url: "/superadmin",
            icon: Shield,
            isActive: pathname.includes("/superadmin"),
            module: "superadmin",
        })
    }

    const canSeeItem = (item: { module?: string; action?: string }) => {
        if (!item.module) return true
        return hasPermission(permissions, item.module, item.action || "access", roleSlug)
    }

    const visibleNavItems = navItems
        .map((item) => {
            if (!item.children?.length) return item
            const visibleChildren = item.children.filter(canSeeItem)
            return { ...item, children: visibleChildren }
        })
        .filter((item) => {
            if (item.children?.length) return canSeeItem(item) || item.children.length > 0
            return canSeeItem(item)
        })

    const renderNavItem = (item: NavItem) => {
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = hasChildren && item.id ? expandedItems.includes(item.id) : false
        const Icon = item.icon

        if (hasChildren && item.id) {
            return (
                <Collapsible
                    key={item.title}
                    open={isExpanded}
                    onOpenChange={() => toggleItem(item.id!)}
                >
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                className="h-8 text-sm group/collapsible"
                                tooltip={item.title}
                                isActive={item.isActive}
                            >
                                <Icon className="size-4" />
                                <span className="flex-1">{item.title}</span>
                                <ChevronRight className="ml-auto size-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.children?.map((child) => (
                                    <SidebarMenuSubItem key={child.title}>
                                        <SidebarMenuSubButton asChild isActive={pathname === child.url}>
                                            <Link href={child.url}>
                                                {child.icon && <child.icon className="size-3.5 mr-2 opacity-70" />}
                                                <span>{child.title}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            )
        }

        return (
            <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                    asChild
                    isActive={item.isActive}
                    tooltip={item.title}
                    className="h-8"
                >
                    <Link href={item.url!}>
                        <Icon className="size-4" />
                        <span className="text-sm">{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        )
    }

    return (
        <SidebarPrimitive collapsible="icon" className="!border-r-0" {...props}>
            <SidebarHeader className="px-2.5 py-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2.5 w-full hover:bg-sidebar-accent rounded-md p-1 -m-1 transition-colors shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0 shadow-sm">
                                <span className="text-sm font-bold uppercase">{organizationSlug.substring(0, 2)}</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-0 group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-semibold truncate">{organizationSlug.toUpperCase()}</span>
                                <ChevronsUpDown className="size-3 text-muted-foreground ml-auto" />
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem>
                            <Settings className="mr-2 size-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <UserPlus className="mr-2 size-4" />
                            <span>Invite members</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2 size-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarHeader>

            <SidebarContent className="px-2.5">
                <SidebarGroup className="p-0">
                    <SidebarGroupContent>
                        <SidebarMenu>
                             {visibleNavItems.map(renderNavItem)}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="px-2.5 pb-3 group-data-[collapsible=icon]:hidden">
                 <UserNav showDetails />
            </SidebarFooter>
            <SidebarRail />
        </SidebarPrimitive>
    )
}
