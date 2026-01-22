import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { format } from "date-fns"
import { createClient } from "@/src/lib/supabase/server"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Separator } from "@/src/components/ui/separator"
import { LeadNoteForm } from "@/src/components/crm/lead-note-form"
import { LeadTaskModal } from "@/src/components/crm/lead-task-modal"
import { getLeadTasks } from "@/src/lib/lead-tasks"
import { addLeadNote, updateLeadTask } from "@/src/app/(dashboard)/crm/leads/actions"
import { finishVisit, startVisit } from "../actions"
import { cn } from "@/src/lib/utils"
import type { LeadNote, LeadRecord } from "@/src/types/lead"
import type { AdmissionCycle } from "@/src/types/admission"
import { Input } from "@/src/components/ui/input"
import { Textarea } from "@/src/components/ui/textarea"

type VisitDetailPageProps = {
  params: Promise<{ appointmentId: string }>
}

export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { appointmentId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    redirect("/dashboard")
  }

  const { data: visit, error } = await supabase
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
    .eq("id", appointmentId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching visit detail", error)
  }

  if (!visit) {
    notFound()
  }

  const { data: cycles } = await supabase
    .from("admission_cycles")
    .select("id, name")
    .eq("organization_id", profile.organization_id)

  const lead = Array.isArray(visit.lead) ? visit.lead[0] : visit.lead
  const leadRecord = lead as LeadRecord
  const tasks = getLeadTasks(leadRecord)

  const { data: notes } = await supabase
    .from("lead_activities")
    .select("id, subject, notes, created_at, created_by, type")
    .eq("lead_id", leadRecord.id)
    .eq("organization_id", profile.organization_id)
    .eq("type", "note")
    .order("created_at", { ascending: false })
    .limit(5)

  const startTime = new Date(visit.starts_at)
  const endTime = visit.ends_at ? new Date(visit.ends_at) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/crm/visits">Volver a mis visitas</Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">
            {leadRecord.student_name || "Lead sin nombre"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {leadRecord.grade_interest || "Grado no especificado"} •{" "}
            {format(startTime, "dd/MM/yyyy")} •{" "}
            {format(startTime, "HH:mm")}
            {endTime ? ` - ${format(endTime, "HH:mm")}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Visita en curso</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {visit.type || "Visita"} {visit.campus ? `• ${visit.campus}` : ""}
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
              </div>
              <form action={startVisit} className="flex flex-wrap gap-2">
                <input type="hidden" name="appointmentId" value={visit.id} />
                <Button size="sm" disabled={visit.status === "in_progress"}>
                  {visit.status === "in_progress" ? "Visita en curso" : "Iniciar visita"}
                </Button>
                <input type="hidden" name="leadId" value={leadRecord.id} />
                <Button
                  formAction={finishVisit}
                  size="sm"
                  variant="outline"
                  disabled={visit.status === "completed"}
                >
                  {visit.status === "completed" ? "Visita finalizada" : "Finalizar visita"}
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/crm/leads/${leadRecord.id}`}>Ver lead</Link>
                </Button>
                {leadRecord.contact_phone ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${leadRecord.contact_phone}`}>Llamar</a>
                  </Button>
                ) : null}
              </form>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tareas pendientes</CardTitle>
              <p className="text-xs text-muted-foreground">
                {tasks.length
                  ? `Este lead tiene ${tasks.length} tarea${tasks.length !== 1 ? "s" : ""} pendiente${tasks.length !== 1 ? "s" : ""}.`
                  : "No hay tareas pendientes para este lead."}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length ? (
                tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border bg-muted/10 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                    </div>
                    <LeadTaskModal
                      lead={leadRecord}
                      taskId={task.id}
                      title={task.title}
                      description={task.description}
                      actionLabel={task.actionLabel}
                      cycles={(cycles as AdmissionCycle[] | null) ?? []}
                      updateLeadTaskAction={updateLeadTask}
                    />
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Sin pendientes por resolver.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas del lead</CardTitle>
              <p className="text-xs text-muted-foreground">
                Agrega informacion relevante durante la visita.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <LeadNoteForm leadId={leadRecord.id} sendNoteAction={addLeadNote} />
              <Separator />
              <div className="space-y-3">
                {(notes as LeadNote[] | null)?.length ? (
                  (notes as LeadNote[]).map((note) => (
                    <div key={note.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{note.subject || "Nota interna"}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                        {note.notes}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No hay notas registradas.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recopilacion de informacion</CardTitle>
              <p className="text-xs text-muted-foreground">
                Captura datos clave para la decision.
              </p>
            </CardHeader>
            <CardContent>
              <form 
                action={async (formData) => {
                  "use server"
                  await updateLeadTask({}, formData)
                }} 
                className="space-y-4"
              >
                <input type="hidden" name="leadId" value={leadRecord.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Decision maker
                    </label>
                    <Input
                      name="decision_maker_name"
                      defaultValue={leadRecord.decision_maker_name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Rol del decision maker
                    </label>
                    <Input
                      name="decision_maker_role"
                      defaultValue={leadRecord.decision_maker_role || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Fecha de decision
                    </label>
                    <Input
                      type="date"
                      name="decision_date"
                      defaultValue={leadRecord.decision_date || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Presupuesto estimado
                    </label>
                    <Input
                      name="budget_range"
                      defaultValue={leadRecord.budget_range || ""}
                      placeholder="Ej. $50k-$80k MXN"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notas de visita
                  </label>
                  <Textarea
                    name="visit_notes"
                    defaultValue={leadRecord.visit_notes || ""}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Proximos pasos
                  </label>
                  <Textarea
                    name="next_steps"
                    defaultValue={leadRecord.next_steps || ""}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" type="submit">
                    Guardar informacion
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen del lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Contacto</p>
                <p className="font-medium">{leadRecord.contact_full_name || "Sin contacto"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Correo</p>
                <p>{leadRecord.contact_email || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Telefono</p>
                <p>{leadRecord.contact_phone || "N/A"}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Direccion</p>
                <p>
                  {[leadRecord.address_street, leadRecord.address_number, leadRecord.address_neighborhood]
                    .filter(Boolean)
                    .join(" ") || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[leadRecord.address_city, leadRecord.address_state, leadRecord.address_country]
                    .filter(Boolean)
                    .join(", ") || "N/A"}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Idioma</p>
                <p>
                  {leadRecord.native_language || "N/A"}
                  {leadRecord.secondary_language ? ` • ${leadRecord.secondary_language}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
