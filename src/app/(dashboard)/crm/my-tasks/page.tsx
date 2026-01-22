import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/src/lib/supabase/server"
import { getLeadTasks } from "@/src/lib/lead-tasks"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import type { LeadRecord } from "@/src/types/lead"

export default async function MyTasksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    redirect("/dashboard")
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(`
      id,
      organization_id,
      status,
      source,
      grade_interest,
      school_year,
      current_school,
      cycle_id,
      division,
      student_first_name,
      student_middle_name,
      student_last_name_paternal,
      student_last_name_maternal,
      wa_chat_id,
      wa_id,
      ai_summary,
      ai_metadata,
      contact_email,
      contact_phone,
      contact_middle_name,
      contact_last_name_maternal,
      contact_first_name,
      contact_last_name_paternal,
      contact_full_name,
      student_name,
      address_street,
      address_number,
      address_neighborhood,
      address_postal_code,
      address_city,
      address_state,
      address_country,
      nationality,
      native_language,
      secondary_language,
      created_at,
      updated_at
    `)
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads for tasks", error)
  }

  const tasksByLead = (leads ?? []).map((lead) => {
    const record = lead as LeadRecord
    const tasks = getLeadTasks(record)
    return { lead: record, tasks }
  })

  const pendingLeads = tasksByLead.filter((entry) => entry.tasks.length > 0)
  const totalTasks = pendingLeads.reduce((sum, entry) => sum + entry.tasks.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold">My Tasks</h2>
        <p className="text-sm text-muted-foreground">
          {totalTasks
            ? `Tienes ${totalTasks} tarea${totalTasks !== 1 ? "s" : ""} pendiente${totalTasks !== 1 ? "s" : ""} en ${pendingLeads.length} lead${pendingLeads.length !== 1 ? "s" : ""}.`
            : "No tienes tareas pendientes."}
        </p>
      </div>

      {pendingLeads.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingLeads.map(({ lead, tasks }) => (
            <Card key={lead.id} className="h-full">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {lead.student_name || "Lead sin nombre"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.grade_interest || "Grado no especificado"}
                  </p>
                </div>
                <Badge>{tasks.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {tasks.map((task) => (
                    <li key={task.id} className="border rounded-md px-3 py-2 bg-muted/10">
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-xs mt-1">{task.description}</p>
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm" className="w-full">
                  <Link href={`/crm/leads/${lead.id}`}>Resolver tareas</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No hay tareas pendientes por resolver.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
