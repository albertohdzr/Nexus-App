import {
    Building2,
    Calendar,
    CreditCard,
    FileText,
    GraduationCap,
    LayoutDashboard,
    Mail,
    MessageCircle,
    MessageSquare,
    PieChart,
    Settings,
    Shield,
    Users,
} from "lucide-react";
import { ModuleConfig } from "@/src/types/navigation";

export const navigationModules: ModuleConfig[] = [
    {
        key: "home",
        title: "Home",
        icon: LayoutDashboard,
        href: "/home",
        subNavigation: [], // Home might not have sub-nav, or just shortcuts
    },
    {
        key: "crm",
        title: "CRM",
        icon: MessageSquare,
        href: "/crm",
        permission: { module: "crm" },
        subNavigation: [
            { title: "Leads", href: "/crm/leads", icon: Users, permission: { module: "crm" } },
            { title: "Citas", href: "/crm/appointments", icon: Calendar, permission: { module: "crm", action: "manage_appointments" } },
            { title: "Activities", href: "/crm/activities", icon: Calendar },
            { title: "Chatbot", href: "/crm/chat", icon: MessageSquare, permission: { module: "crm" } },
            { title: "Plantillas", href: "/crm/templates", icon: Mail, permission: { module: "crm", action: "manage_templates" } },
            { title: "WhatsApp", href: "/crm/whatsapp-templates", icon: MessageCircle, permission: { module: "crm", action: "manage_whatsapp_templates" } },
            { title: "Analytics", href: "/crm/analytics", icon: PieChart },
        ],
    },
    {
        key: "admissions",
        title: "Admissions",
        icon: FileText,
        href: "/admissions",
        permission: { module: "admissions" },
        subNavigation: [
            {
                title: "Applications",
                href: "/admissions/applications",
                icon: FileText,
                permission: { module: "admissions" },
            },
            { title: "Cycles", href: "/admissions/cycles", icon: Calendar, permission: { module: "admissions" } },
            {
                title: "Documents",
                href: "/admissions/documents",
                icon: FileText,
                permission: { module: "admissions" },
            },
        ],
    },
    {
        key: "finance",
        title: "Finance",
        icon: CreditCard,
        href: "/finance",
        permission: { module: "finance" },
        subNavigation: [
            { title: "Payments", href: "/finance/payments", icon: CreditCard, permission: { module: "finance" } },
            { title: "Invoices", href: "/finance/invoices", icon: FileText },
        ],
    },
    {
        key: "erp",
        title: "Students",
        icon: GraduationCap,
        href: "/erp",
        permission: { module: "erp" },
        subNavigation: [
            { title: "Students", href: "/erp/students", icon: GraduationCap, permission: { module: "erp" } },
            { title: "Families", href: "/erp/families", icon: Users, permission: { module: "erp" } },
        ],
    },
    {
        key: "settings",
        title: "Settings",
        icon: Settings,
        href: "/settings",
        permission: { module: "settings", action: "access" },
        subNavigation: [
            {
                title: "Organization",
                href: "/settings/organization",
                icon: Building2,
                permission: { module: "settings", action: "manage_org" },
            },
            { title: "Team", href: "/settings/team", icon: Users, permission: { module: "settings", action: "manage_team" } },
            { title: "Directory", href: "/settings/directory", icon: Users, permission: { module: "settings", action: "manage_directory" } },
            {
                title: "Roles & Permissions",
                href: "/settings/roles",
                icon: Shield,
                permission: { module: "settings", action: "manage_roles" },
            },
            { title: "Bot", href: "/settings/bot", icon: MessageSquare, permission: { module: "settings", action: "manage_bot" } },
        ],
    },
];

export const superAdminModules: ModuleConfig[] = [
    {
        key: "superadmin",
        title: "Superadmin",
        icon: Shield,
        href: "/superadmin",
        permission: { module: "superadmin", action: "access" },
        subNavigation: [
            {
                title: "Organizations",
                href: "/superadmin/organizations",
                icon: Building2,
            },
            { title: "Users", href: "/superadmin/users", icon: Users },
        ],
    },
];
