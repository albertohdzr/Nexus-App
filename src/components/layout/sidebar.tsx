"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    Settings,
    FileText,
    Calendar,
    Bot,
    Book,
    GraduationCap,
    Files,
    ChevronRight,
} from "lucide-react"

import {
    Sidebar as SidebarPrimitive,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/src/components/ui/sidebar"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/src/components/ui/collapsible"
import { UserNav } from "@/src/components/layout/user-nav"

interface SidebarProps extends React.ComponentProps<typeof SidebarPrimitive> {
    organizationSlug: string
}

export function Sidebar({ organizationSlug, ...props }: SidebarProps) {
    const pathname = usePathname()

    return (
        <SidebarPrimitive collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/home">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-primary-foreground">
                                    <Image
                                        src="/nexus-logo.svg"
                                        alt="Nexus Logo"
                                        width={24}
                                        height={24}
                                        className="size-6"
                                    />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">{organizationSlug.toUpperCase()}</span>
                                    <span className="">Nexus</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === "/home"}>
                                    <Link href="/home">
                                        <LayoutDashboard />
                                        <span>Home</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Modules</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {/* Admissions Group */}
                            <Collapsible defaultOpen className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip="Admissions">
                                            <GraduationCap />
                                            <span>Admissions</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild isActive={pathname === "/admissions/cycles"}>
                                                    <Link href="/admissions/cycles">
                                                        <span>Cycles</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild isActive={pathname === "/admissions/documents"}>
                                                    <Link href="/admissions/documents">
                                                        <span>Documents</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>

                             {/* Chat Group */}
                             <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === "/chat"}>
                                    <Link href="/chat">
                                        <MessageSquare />
                                        <span>Chat</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            
                            {/* CRM Group */}
                            <Collapsible defaultOpen className="group/collapsible">
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton tooltip="CRM">
                                            <Users />
                                            <span>CRM</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild isActive={pathname === "/crm/leads"}>
                                                    <Link href="/crm/leads">
                                                        <span>Leads</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                            <SidebarMenuSubItem>
                                                <SidebarMenuSubButton asChild isActive={pathname === "/crm/appointments"}>
                                                    <Link href="/crm/appointments">
                                                        <span>Appointments</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Settings</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                                    <Link href="/settings">
                                        <Settings />
                                        <span>General</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === "/settings/bot"}>
                                    <Link href="/settings/bot">
                                        <Bot />
                                        <span>Bot</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={pathname === "/settings/directory"}>
                                    <Link href="/settings/directory">
                                        <Book />
                                        <span>Directory</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <div className="p-1">
                    <UserNav showDetails />
                </div>
            </SidebarFooter>
            <SidebarRail />
        </SidebarPrimitive>
    )
}

