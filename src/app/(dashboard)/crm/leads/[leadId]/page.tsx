import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { ArrowLeft, Clock3, Mail, MessageSquare, Phone } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Separator } from "@/src/components/ui/separator"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { LeadFollowUpForm } from "@/src/components/crm/lead-follow-up-form"
import { LeadNoteForm } from "@/src/components/crm/lead-note-form"
import { createClient } from "@/src/lib/supabase/server"
import { cn } from "@/src/lib/utils"
import {
  STATUS_STYLES,
  buildDefaultFollowUp,
  formatRelativeDate,
  getLeadSummary,
  getSessions,
  statusLabel,
} from "@/src/lib/lead"
import { addLeadNote, sendLeadFollowUp, updateLeadBasic } from "../actions"
import { LeadEditButton } from "@/src/components/crm/lead-edit-button"
import { LeadCommunications } from "@/src/components/crm/lead-communications"
import type { AdmissionCycle } from "@/src/types/admission"
import type { LeadNote, LeadRecord, LeadMessage } from "@/src/types/lead"

type LeadPageProps = {
  params: Promise<{ leadId: string }>
}

export default async function LeadDetailPage({ params }: LeadPageProps) {
  const { leadId } = await params
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

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      `
      id,
      organization_id,
      status,
      source,
      grade_interest,
      school_year,
      current_school,
      student_first_name,
      student_middle_name,
      student_last_name_paternal,
      student_last_name_maternal,
      wa_chat_id,
      wa_id,
      ai_summary,
      ai_metadata,
      metadata,
      cycle_id,
      contact_email,
      contact_phone,
      contact_middle_name,
      contact_last_name_maternal,
      contact_first_name,
      contact_last_name_paternal,
      contact_full_name,
      student_name,
      created_at,
      updated_at,
      chat:chats!leads_wa_chat_id_fkey (
        id,
        wa_id,
        active_session_id,
        requested_handoff,
        chat_sessions:chat_sessions!chat_sessions_chat_id_fkey (
          id,
          status,
          summary,
          last_response_at,
          updated_at,
          created_at,
          ai_enabled,
          closed_at,
          messages:messages!messages_chat_session_id_fkey (
            id,
            role,
            direction,
            body,
            media_url,
            created_at,
            sender_name
          )
        )
      ),
      notes:lead_activities (
        id,
        subject,
        notes,
        created_at,
        created_by,
        type
      ),
      emails:lead_activities (
        id,
        subject,
        notes,
        created_at,
        created_by,
        type
      )
    `
    )
    .eq("id", leadId)
    .eq("organization_id", profile.organization_id)
    .eq("notes.type", "note")
    .eq("emails.type", "email")
    .maybeSingle()

  if (error) {
    console.error("Error fetching lead detail", error)
  }

  if (!lead) {
    notFound()
  }

  const { data: cycles } = await supabase
    .from("admission_cycles")
    .select("id, name")
    .eq("organization_id", profile.organization_id)
    .order("start_date", { ascending: false })

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, campus, type, status, notes")
    .eq("organization_id", profile.organization_id)
    .eq("lead_id", leadId)
    .order("starts_at", { ascending: true })

  const chat = Array.isArray(lead.chat) ? lead.chat[0] : lead.chat
  const normalized: LeadRecord = {
    ...lead,
    chat: chat
      ? {
          id: chat.id,
          wa_id: chat.wa_id,
          active_session_id: chat.active_session_id,
          requested_handoff: chat.requested_handoff,
          chat_sessions: chat.chat_sessions ?? null,
        }
      : null,
    notes: lead.notes as LeadNote[] | null,
    emails: lead.emails as LeadNote[] | null,
    cycle_id: lead.cycle_id || null,
  }

  const cycleName =
    cycles?.find((cycle) => cycle.id === normalized.cycle_id)?.name || "Sin ciclo"

  const sessions = getSessions(normalized)
  const summary = getLeadSummary(normalized)
  const defaultMessage = buildDefaultFollowUp(normalized)
  const defaultSubject = `Seguimiento de admisiones - ${
    normalized.student_name || "Lead"
  }`
  const latestActivity =
    sessions[0]?.last_response_at ||
    sessions[0]?.updated_at ||
    normalized.updated_at
  const notes = [...(normalized.notes ?? [])].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const emails = [...(normalized.emails ?? [])].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const now = Date.now()
  const nextAppointment =
    appointments?.find((appointment) => {
      const start = new Date(appointment.starts_at).getTime()
      return !Number.isNaN(start) && start >= now
    }) ?? null
  const latestAppointment =
    appointments && appointments.length ? appointments[appointments.length - 1] : null
  const currentAppointment = nextAppointment ?? latestAppointment



// ... imports remain the same

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/crm/leads">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              {normalized.student_name || "Lead sin nombre"}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {normalized.grade_interest || "Grado no especificado"}
              {normalized.current_school ? ` • ${normalized.current_school}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {cycleName}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize border",
                  STATUS_STYLES[normalized.status] || "bg-muted text-foreground"
                )}
              >
                {statusLabel(normalized.status)}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {normalized.source || "N/A"}
              </Badge>
            </div>
           <LeadEditButton
            lead={normalized}
            updateLeadAction={updateLeadBasic}
            cycles={cycles as AdmissionCycle[] | undefined}
          />
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-6">
        <TabsList>
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="communication">Comunicación</TabsTrigger>
            <TabsTrigger value="notes">Notas Internas</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* AI Summary Card */}
                <section className="rounded-xl border bg-card p-5 space-y-3 lg:col-span-2">
                     <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-foreground/90">Resumen IA</h3>
                         <div className="text-xs text-muted-foreground">
                            Última actividad: {formatRelativeDate(latestActivity)}
                        </div>
                    </div>
                     <div className="rounded-lg border p-4 bg-muted/10">
                        <p className="text-sm leading-relaxed">{summary}</p>
                    </div>
                     {sessions.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                            Basado en {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} de chat.
                        </div>
                     )}
                </section>

                {/* Appointment Card */}
                <section className="rounded-xl border bg-card p-5 space-y-3">
                     <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-foreground/90">Próxima Cita</h3>
                        <Badge variant="outline">
                            {appointments?.length ?? 0} total
                        </Badge>
                    </div>
                    {currentAppointment ? (
                    <div className="space-y-3 p-3 border rounded-lg bg-accent/20">
                        <div className="flex items-center gap-2 font-medium">
                           <Clock3 className="h-4 w-4 text-primary" />
                           {new Date(currentAppointment.starts_at).toLocaleString("es-MX", {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                         {currentAppointment.campus && (
                            <div className="text-sm text-muted-foreground">
                                Campus: {currentAppointment.campus}
                            </div>
                        )}
                        <div className="flex gap-2">
                             <Badge variant="secondary" className="text-xs">{statusLabel(currentAppointment.status || 'scheduled')}</Badge>
                             {currentAppointment.type && <Badge variant="outline" className="text-xs">{currentAppointment.type}</Badge>}
                        </div>
                         {currentAppointment.notes && (
                            <p className="text-xs text-muted-foreground mt-2 border-t pt-2 border-border/50">
                                {currentAppointment.notes}
                            </p>
                         )}
                    </div>
                    ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                        No hay citas programadas
                    </div>
                    )}
                </section>

                 {/* Contact Info */}
                 <section className="rounded-xl border bg-card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-foreground/90">Contacto</h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Nombre</p>
                            <p className="font-medium text-sm">{normalized.contact_full_name || normalized.contact_first_name || "N/A"}</p>
                        </div>
                        <div>
                             <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Email</p>
                             <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                {normalized.contact_email ? (
                                    <a href={`mailto:${normalized.contact_email}`} className="hover:underline">{normalized.contact_email}</a>
                                ) : "N/A"}
                             </div>
                        </div>
                         <div>
                             <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Teléfono</p>
                             <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {normalized.contact_phone ? (
                                     <a href={`tel:${normalized.contact_phone}`} className="hover:underline">{normalized.contact_phone}</a>
                                ) : "N/A"}
                             </div>
                        </div>
                    </div>
                 </section>

                 {/* Student Profile */}
                  <section className="rounded-xl border bg-card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-foreground/90">Perfil del Estudiante</h3>
                    <div className="space-y-3">
                        <div className="flex gap-4">
                           <Avatar className="h-12 w-12 border bg-secondary/50">
                                <AvatarFallback className="text-sm font-bold text-primary">
                                    {(normalized.student_name || "NA").substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{normalized.student_name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">ID: {normalized.id.slice(0,8)}</p>
                            </div>
                        </div>
                        <Separator />
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Grado</p>
                                <p className="text-sm">{normalized.grade_interest || "N/A"}</p>
                            </div>
                             <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Escuela Actual</p>
                                <p className="text-sm">{normalized.current_school || "N/A"}</p>
                            </div>
                             <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Ciclo</p>
                                <p className="text-sm">{cycleName}</p>
                            </div>
                         </div>
                    </div>
                 </section>

                 {/* WhatsApp Info */}
                 <section className="rounded-xl border bg-card p-5 space-y-4">
                    <h3 className="text-base font-semibold text-foreground/90">Detalles Técnicos</h3>
                    <div className="space-y-3 text-sm">
                         <div>
                            <p className="text-muted-foreground mb-1">ID WhatsApp</p>
                            <p className="font-mono bg-muted px-2 py-1 rounded text-xs">{normalized.wa_id || "N/A"}</p>
                        </div>
                        <div>
                             <p className="text-muted-foreground mb-1">Chat ID</p>
                             <div className="flex items-center gap-2">
                                <Badge variant={normalized.wa_chat_id ? "default" : "outline"}>
                                    {normalized.wa_chat_id ? "Enlazado" : "No Enlazado"}
                                </Badge>
                             </div>
                        </div>
                    </div>
                 </section>
            </div>
        </TabsContent>

        <TabsContent value="communication" className="grid gap-6 md:grid-cols-2">
             <section className="rounded-xl border bg-card p-0 overflow-hidden flex flex-col h-fit">
                <div className="p-5 border-b bg-muted/10">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Nuevo Mensaje
                    </h3>
                </div>
                <div className="p-5">
                    <LeadFollowUpForm
                        leadId={normalized.id}
                        defaultSubject={defaultSubject}
                        defaultMessage={defaultMessage}
                        sendFollowUpAction={sendLeadFollowUp}
                    />
                </div>
            </section>

             <section className="rounded-xl border bg-card p-0 overflow-hidden flex flex-col">
                 <div className="p-5 border-b bg-muted/10 flex justify-between items-center">
                    <h3 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Historial
                    </h3>
                     <Badge variant="outline">
                        {sessions.length} chats • {emails.length} correos
                    </Badge>
                </div>
                <div className="p-5">
                    <LeadCommunications sessions={sessions} emails={emails} />
                </div>
            </section>
        </TabsContent>

        <TabsContent value="notes" className="grid gap-6 md:grid-cols-3">
             <section className="rounded-xl border bg-card md:col-span-1 h-fit">
                <div className="p-5 border-b">
                    <h3 className="font-semibold">Nueva Nota</h3>
                </div>
                <div className="p-5">
                     <LeadNoteForm leadId={normalized.id} sendNoteAction={addLeadNote} />
                </div>
             </section>

             <section className="rounded-xl border bg-card md:col-span-2">
                 <div className="p-5 border-b flex justify-between items-center">
                    <h3 className="font-semibold">Historial de Notas</h3>
                     <Badge variant="secondary">{notes.length}</Badge>
                </div>
                <div className="p-5 space-y-4">
                    {notes.length ? (
                    notes.map((note) => (
                        <div key={note.id} className="group border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-sm">{note.subject || "Nota interna"}</span>
                                <span className="text-xs text-muted-foreground">{formatRelativeDate(note.created_at)}</span>
                            </div>
                            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                                {note.notes}
                            </p>
                             <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex justify-between">
                                 <span>Por: {note.created_by || "Sistema"}</span>
                             </div>
                        </div>
                    ))
                    ) : (
                    <div className="text-center py-10 text-muted-foreground space-y-2">
                        <div className="p-3 bg-muted rounded-full w-fit mx-auto">
                            <div className="h-6 w-6 border-2 border-current rounded-sm opacity-20" />
                        </div>
                        <p>No hay notas internas registradas.</p>
                    </div>
                    )}
                </div>
             </section>
        </TabsContent>

      </Tabs>
    </div>
  )
}
