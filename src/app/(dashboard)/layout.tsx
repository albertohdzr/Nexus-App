import { createClient } from "@/src/lib/supabase/server"
import { AuthProvider } from "@/src/components/providers/auth-provider"
import { redirect } from "next/navigation"
import { Sidebar } from "@/src/components/layout/sidebar"
import { TopNav } from "@/src/components/layout/top-nav"

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
            <div className="flex h-screen w-full overflow-hidden bg-background">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <TopNav organizationName={orgName} organizationLogo={orgLogo} />
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    )
}
