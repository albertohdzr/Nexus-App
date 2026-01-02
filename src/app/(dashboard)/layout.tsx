import { createClient } from "@/src/lib/supabase/server"
import { AuthProvider } from "@/src/components/providers/auth-provider"
import { redirect } from "next/navigation"
import { Sidebar } from "@/src/components/layout/sidebar"
import { DashboardHeader } from "@/src/components/dashboard/header"
import { MainContent } from "@/src/components/dashboard/main-content"
// import { TopNav } from "@/src/components/layout/top-nav"
import { SidebarProvider, SidebarInset } from "@/src/components/ui/sidebar"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Fetch user role and organization details
    const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
            role_id,
            role:roles (
                id,
                slug,
                name
            ),
            organization:organizations (
                name,
                logo_url,
                slug
            )
        `)
        .eq("id", user.id)
        .single()

    const roleRecord = Array.isArray(profile?.role) ? profile?.role[0] : profile?.role
    const roleSlug = roleRecord?.slug || null
    const roleName = roleRecord?.name || null
    // @ts-expect-error Supabase join typing for organization is not generated
    const orgName = profile?.organization?.name || "Nexus"
    // @ts-expect-error Supabase join typing for organization is not generated
    const orgLogo = profile?.organization?.logo_url || null
    // @ts-expect-error Supabase join typing for organization is not generated
    const orgSlug = profile?.organization?.slug || "NEXUS"



    const { data: permissionRows } = profile?.role_id
        ? await supabase
            .from("role_permissions")
            .select("module, permissions")
            .eq("role_id", profile.role_id)
        : { data: [] }

    return (
        <AuthProvider
            initialUser={user}
            initialRoleSlug={roleSlug}
            initialRoleName={roleName}
            initialPermissions={(permissionRows || []).reduce((acc, row) => {
                acc[row.module] = row.permissions || {}
                return acc
            }, {} as Record<string, Record<string, boolean>>)}
        >
            <SidebarProvider className="bg-sidebar">
                <Sidebar organizationSlug={orgSlug} />
                <SidebarInset className="bg-background">
                     {/* We use a container similar to the template's page.tsx but adaptable for nested layouts */}
                    <div className="h-svh overflow-hidden lg:p-2 w-full flex flex-col">
                        <div className="flex-1 lg:rounded-md overflow-hidden flex flex-col bg-card relative shadow-sm">
                            <DashboardHeader />
                            <MainContent>
                                {children}
                            </MainContent>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </AuthProvider>
    )
}
