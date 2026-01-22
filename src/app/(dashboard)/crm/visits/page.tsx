import Link from "next/link"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/src/lib/supabase/server"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getLeadTasks } from "@/src/lib/lead-tasks"
import { cn } from "@/src/lib/utils"
import type { LeadRecord } from "@/src/types/lead"

type VisitsPageProps = {
  searchParams?: { date?: string }
}

const isValidDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
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

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const selectedDate = searchParams?.date && isValidDate(searchParams.date)
    ? searchParams.date
    : todayStr

  const startDate = new Date(`${selectedDate}T00:00:00`)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 1)

  const { data: cycles } = await supabase
    .from("admission_cycles")
    .select("id, name")
    .eq("organization_id", profile.organization_id)

  const { data: visits, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      starts_at,
      ends_at,
      campus,
      type,
      status,
      notes,
      lead_id,
      lead:leads(
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
        metadata,
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
        decision_maker_name,
        decision_maker_role,
        decision_date,
        budget_range,
        visit_notes,
        next_steps,
        created_at,
        updated_at
      )
    `
    )
    .eq("organization_id", profile.organization_id)
    .gte("starts_at", startDate.toISOString())
    .lt("starts_at", endDate.toISOString())
    .order("starts_at", { ascending: true })

  if (error) {
    console.error("Error fetching visits", error)
  }

  const cycleMap = new Map((cycles ?? []).map((cycle) => [cycle.id, cycle.name]))

  const visitRows = (visits ?? []).map((visit) => {
    const lead = Array.isArray(visit.lead) ? visit.lead[0] : visit.lead
    const leadRecord = lead as LeadRecord
    const tasks = leadRecord ? getLeadTasks(leadRecord) : []
    const cycleName = leadRecord?.cycle_id ? cycleMap.get(leadRecord.cycle_id) : null

    return {
      ...visit,
      lead: leadRecord,
      tasks,
      cycleName,
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Mis visitas</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona una fecha y revisa las visitas programadas.
        </p>
      </div>

      <Card className="p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fecha
            </label>
            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Ver visitas
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/crm/visits?date=${todayStr}`}>Hoy</Link>
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {visitRows.length ? (
          visitRows.map((visit) => (
            <Card key={visit.id} className="h-full">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {visit.lead?.student_name || "Lead sin nombre"}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {visit.lead?.grade_interest || "Grado no especificado"}
                    {visit.cycleName ? ` • ${visit.cycleName}` : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    visit.status === "in_progress"
                      ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                      : "border-border"
                  )}
                >
                  {visit.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium">
                    {format(new Date(visit.starts_at), "HH:mm")} -
                    {visit.ends_at ? ` ${format(new Date(visit.ends_at), "HH:mm")}` : " --"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {visit.type || "Visita"} {visit.campus ? `• ${visit.campus}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{visit.tasks.length} tarea{visit.tasks.length !== 1 ? "s" : ""} pendiente{visit.tasks.length !== 1 ? "s" : ""}</span>
                  <Button asChild size="sm">
                    <Link href={`/crm/visits/${visit.id}`}>Abrir visita</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No hay visitas para esta fecha.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
