
import { 
    LayoutDashboard, 
    Users, 
    GraduationCap, 
    CreditCard, 
    Settings, 
    MessageSquare,
    FileText,
    Calendar,
    PieChart,
    Building2,
    Shield,
} from "lucide-react"
import { type ComponentType } from "react"

export type UserRole = 'superadmin' | 'org_admin' | 'director' | 'admissions' | 'teacher' | 'finance' | 'staff' | 'parent' | 'student'

export interface NavItem {
    title: string
    href: string
    icon?: ComponentType<{ className?: string }>
    roles?: UserRole[] // If undefined, accessible by all authenticated users (or handled by parent)
}

export interface ModuleConfig {
    key: string
    title: string
    icon: ComponentType<{ className?: string }>
    href: string // Landing page for the module
    roles?: UserRole[]
    subNavigation: NavItem[]
}

export const navigationModules: ModuleConfig[] = [
    {
        key: 'home',
        title: 'Home',
        icon: LayoutDashboard,
        href: '/home',
        subNavigation: [] // Home might not have sub-nav, or just shortcuts
    },
    {
        key: 'crm',
        title: 'CRM',
        icon: MessageSquare,
        href: '/crm',
        roles: ['superadmin', 'org_admin', 'director', 'admissions'],
        subNavigation: [
            { title: 'Leads', href: '/crm/leads', icon: Users },
            { title: 'Activities', href: '/crm/activities', icon: Calendar },
            { title: 'Chatbot', href: '/crm/chat', icon: MessageSquare },
            { title: 'Analytics', href: '/crm/analytics', icon: PieChart },
        ]
    },
    {
        key: 'admissions',
        title: 'Admissions',
        icon: FileText,
        href: '/admissions',
        roles: ['superadmin', 'org_admin', 'director', 'admissions'],
        subNavigation: [
            { title: 'Applications', href: '/admissions/applications', icon: FileText },
            { title: 'Cycles', href: '/admissions/cycles', icon: Calendar },
            { title: 'Documents', href: '/admissions/documents', icon: FileText },
        ]
    },
    {
        key: 'finance',
        title: 'Finance',
        icon: CreditCard,
        href: '/finance',
        roles: ['superadmin', 'org_admin', 'finance'],
        subNavigation: [
            { title: 'Payments', href: '/finance/payments', icon: CreditCard },
            { title: 'Invoices', href: '/finance/invoices', icon: FileText },
        ]
    },
    {
        key: 'erp',
        title: 'Students',
        icon: GraduationCap,
        href: '/erp',
        roles: ['superadmin', 'org_admin', 'director', 'teacher', 'staff'],
        subNavigation: [
            { title: 'Students', href: '/erp/students', icon: GraduationCap },
            { title: 'Families', href: '/erp/families', icon: Users },
        ]
    },
    {
        key: 'settings',
        title: 'Settings',
        icon: Settings,
        href: '/settings',
        roles: ['superadmin', 'org_admin'],
        subNavigation: [
            { title: 'Organization', href: '/settings/organization', icon: Building2 },
            { title: 'Team', href: '/settings/team', icon: Users },
            { title: 'Roles & Permissions', href: '/settings/roles', icon: Shield },
        ]
    }
]

export const superAdminModules: ModuleConfig[] = [
    {
        key: 'superadmin',
        title: 'Superadmin',
        icon: Shield,
        href: '/superadmin',
        roles: ['superadmin'],
        subNavigation: [
            { title: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
            { title: 'Users', href: '/superadmin/users', icon: Users },
        ]
    }
]
