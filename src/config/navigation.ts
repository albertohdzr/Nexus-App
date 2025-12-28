import {
    Building2,
    Calendar,
    CreditCard,
    FileText,
    GraduationCap,
    LayoutDashboard,
    Mail,
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
        roles: ["superadmin", "org_admin", "director", "admissions"],
        subNavigation: [
            { title: "Leads", href: "/crm/leads", icon: Users },
            { title: "Citas", href: "/crm/appointments", icon: Calendar },
            { title: "Activities", href: "/crm/activities", icon: Calendar },
            { title: "Chatbot", href: "/crm/chat", icon: MessageSquare },
            { title: "Plantillas", href: "/crm/templates", icon: Mail },
            { title: "Analytics", href: "/crm/analytics", icon: PieChart },
        ],
    },
    {
        key: "admissions",
        title: "Admissions",
        icon: FileText,
        href: "/admissions",
        roles: ["superadmin", "org_admin", "director", "admissions"],
        subNavigation: [
            {
                title: "Applications",
                href: "/admissions/applications",
                icon: FileText,
            },
            { title: "Cycles", href: "/admissions/cycles", icon: Calendar },
            {
                title: "Documents",
                href: "/admissions/documents",
                icon: FileText,
            },
        ],
    },
    {
        key: "finance",
        title: "Finance",
        icon: CreditCard,
        href: "/finance",
        roles: ["superadmin", "org_admin", "finance"],
        subNavigation: [
            { title: "Payments", href: "/finance/payments", icon: CreditCard },
            { title: "Invoices", href: "/finance/invoices", icon: FileText },
        ],
    },
    {
        key: "erp",
        title: "Students",
        icon: GraduationCap,
        href: "/erp",
        roles: ["superadmin", "org_admin", "director", "teacher", "staff"],
        subNavigation: [
            { title: "Students", href: "/erp/students", icon: GraduationCap },
            { title: "Families", href: "/erp/families", icon: Users },
        ],
    },
    {
        key: "settings",
        title: "Settings",
        icon: Settings,
        href: "/settings",
        roles: ["superadmin", "org_admin"],
        subNavigation: [
            {
                title: "Organization",
                href: "/settings/organization",
                icon: Building2,
            },
            { title: "Team", href: "/settings/team", icon: Users },
            { title: "Directory", href: "/settings/directory", icon: Users },
            {
                title: "Roles & Permissions",
                href: "/settings/roles",
                icon: Shield,
            },
        ],
    },
];

export const superAdminModules: ModuleConfig[] = [
    {
        key: "superadmin",
        title: "Superadmin",
        icon: Shield,
        href: "/superadmin",
        roles: ["superadmin"],
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
