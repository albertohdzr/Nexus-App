import { createClient } from "@/src/lib/supabase/server"
import { OrganizationsTable } from "./organizations-table"
import { redirect } from "next/navigation"

export default async function OrganizationsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Check if superadmin
    const { data: isSuperAdmin } = await supabase.rpc('is_superadmin', { user_id: user.id })

    if (!isSuperAdmin) {
        redirect("/dashboard")
    }

    const { data: organizations } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false })

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Organizations</h2>
                    <p className="text-muted-foreground">
                        Manage all organizations in the system.
                    </p>
                </div>
            </div>
            <OrganizationsTable data={organizations || []} />
        </div>
    )
}
