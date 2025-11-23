import { AppSidebar } from "@/src/components/app-sidebar"
import { SiteHeader } from "@/src/components/site-header"
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar"
import { createClient } from "@/src/lib/supabase/server"
import { AuthProvider } from "@/src/components/providers/auth-provider"
import { redirect } from "next/navigation"

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

    // Fetch user role
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    const role = profile?.role || null

    return (
        <AuthProvider initialUser={user} initialRole={role}>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width": "calc(var(--spacing) * 72)",
                        "--header-height": "calc(var(--spacing) * 12)",
                    } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </AuthProvider>
    )
}
