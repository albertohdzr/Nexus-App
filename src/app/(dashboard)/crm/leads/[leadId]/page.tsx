/**
 * Lead Detail Page - Server Component
 *
 * Página de detalle del lead con arquitectura server-first:
 * - Data fetching en el servidor
 * - Componentes modulares por sección
 * - Historial de estados para trazabilidad
 * - UI profesional de CRM
 */

import { notFound, redirect } from "next/navigation"
import {
  LeadDetailHeader,
  LeadProfileCard,
  LeadTasksCard,
  LeadCommunicationsCard,
  LeadNotesCard,
  LeadStatusChanger,
  StatusHistoryTimeline,
  getLeadDetail,
  getLeadStatusHistory,
  getLeadAppointments,
  getAdmissionCycles,
  getCurrentUserOrganizationId,
  updateLeadStatus,
  addNote,
  getLeadSummary,
} from "@features/leads"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Badge } from "@/src/components/ui/badge"
import { Sparkles, Calendar, Clock } from "lucide-react"

type LeadDetailPageProps = {
  params: Promise<{ leadId: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { leadId } = await params

  const organizationId = await getCurrentUserOrganizationId()

  if (!organizationId) {
    redirect("/login")
  }

  // Fetch all data in parallel
  const [lead, statusHistory, appointments, cycles] = await Promise.all([
    getLeadDetail(leadId, organizationId),
    getLeadStatusHistory(leadId),
    getLeadAppointments(leadId, organizationId),
    getAdmissionCycles(organizationId),
  ])

  if (!lead) {
    notFound()
  }

  // Derived data
  const cycleName = cycles.find((c) => c.id === lead.cycle_id)?.name || "Sin ciclo"
  const sessions = lead.chat?.chat_sessions || []
  const summary = getLeadSummary(lead)
  const latestActivity =
    sessions[0]?.last_response_at || sessions[0]?.updated_at || lead.updated_at

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header with status changer */}
      <LeadDetailHeader lead={lead} cycleName={cycleName}>
        <LeadStatusChanger
          leadId={lead.id}
          currentStatus={lead.status}
          updateStatusAction={updateLeadStatus}
        />
      </LeadDetailHeader>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile & Status History */}
        <div className="space-y-6 lg:col-span-1">
          <LeadProfileCard lead={lead} cycleName={cycleName} />

          <section className="rounded-xl border bg-card p-5">
            <StatusHistoryTimeline
              history={statusHistory}
              currentStatus={lead.status}
              createdAt={lead.created_at}
            />
          </section>
        </div>

        {/* Right Column - Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="tasks">Tareas</TabsTrigger>
              <TabsTrigger value="communications">Comunicación</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* AI Summary Card */}
              <section className="rounded-xl border bg-card overflow-hidden">
                <div className="p-5 border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-5 text-violet-500" />
                      <h3 className="font-semibold">Resumen IA</h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      Última actividad: {formatRelativeDate(latestActivity)}
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {summary}
                  </p>
                  {sessions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-4">
                      Basado en {sessions.length} sesión
                      {sessions.length !== 1 ? "es" : ""} de chat.
                    </p>
                  )}
                </div>
              </section>

              {/* Appointments */}
              <section className="rounded-xl border bg-card overflow-hidden">
                <div className="p-5 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-5 text-primary" />
                      <h3 className="font-semibold">Citas</h3>
                    </div>
                    <Badge variant="secondary">{appointments.length}</Badge>
                  </div>
                </div>
                <div className="p-5">
                  {appointments.length > 0 ? (
                    <div className="space-y-3">
                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                        >
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {apt.type || "Visita"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(apt.starts_at).toLocaleDateString("es-MX", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <Badge
                            variant={
                              apt.status === "completed"
                                ? "default"
                                : apt.status === "cancelled"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {apt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay citas programadas para este lead.
                    </p>
                  )}
                </div>
              </section>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Sesiones de Chat"
                  value={sessions.length}
                />
                <StatCard
                  label="Emails Enviados"
                  value={lead.emails?.length || 0}
                />
                <StatCard
                  label="Notas Internas"
                  value={lead.notes?.length || 0}
                />
                <StatCard label="Citas" value={appointments.length} />
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks">
              <LeadTasksCard lead={lead} />
            </TabsContent>

            {/* Communications Tab */}
            <TabsContent value="communications">
              <LeadCommunicationsCard
                sessions={sessions}
                emails={lead.emails || []}
              />
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes">
              <LeadNotesCard
                leadId={lead.id}
                notes={lead.notes || []}
                addNoteAction={addNote}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

// Helper function
function formatRelativeDate(value: string | null | undefined): string {
  if (!value) return "Sin actividad"
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  if (Number.isNaN(diffMs)) return "Sin actividad"

  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return "hace un momento"
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 48) return `hace ${hours} h`

  const days = Math.round(hours / 24)
  return `hace ${days} d`
}

// Stat Card Component
function StatCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
