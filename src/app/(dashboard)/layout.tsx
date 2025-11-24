import { createClient } from "@/src/lib/supabase/server"
import { AuthProvider } from "@/src/components/providers/auth-provider"
import { redirect } from "next/navigation"
import { ModuleSidebar } from "@/src/components/layout/module-sidebar"
import { SubSidebar } from "@/src/components/layout/sub-sidebar"
import { TopNav } from "@/src/components/layout/top-nav"
import { MainContent } from "@/src/components/layout/main-content"

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
            role,
            organization:organizations (
                name,
                logo_url
            )
        `)
        .eq("id", user.id)
        .single()

    const role = profile?.role || null
    // @ts-expect-error Supabase join typing for organization is not generated
    const orgName = profile?.organization?.name || "Nexus"
    // @ts-expect-error Supabase join typing for organization is not generated
    const orgLogo = profile?.organization?.logo_url || null

    return (
        <AuthProvider initialUser={user} initialRole={role}>
            <div className="flex h-screen w-full overflow-hidden">
                <ModuleSidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <TopNav organizationName={orgName} organizationLogo={orgLogo} />
                    <div className="flex flex-1 overflow-hidden">
                        <SubSidebar />
                        <main className="flex-1 flex flex-col overflow-hidden">
                            <div className="@container/main flex flex-1 flex-col gap-2 overflow-hidden">
                                <MainContent>
                                    {children}
                                </MainContent>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </AuthProvider>
    )
}
