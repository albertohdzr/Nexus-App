import Link from "next/link"
import { notFound, redirect } from "next/navigation"
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
      campus,
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
  }

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

  return (
    <div className="flex flex-col gap-6">
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
            <p className="text-sm text-muted-foreground">
              {normalized.grade_interest || "Grado no especificado"}
              {normalized.campus ? ` • ${normalized.campus}` : ""}
              {normalized.school_year ? ` • ${normalized.school_year}` : ""}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
              <MessageSquare className="h-3 w-3" />
              <span>
                {sessions.length} sesión{sessions.length === 1 ? "" : "es"}
              </span>
              <span>•</span>
              <Clock3 className="h-3 w-3" />
              <span>{formatRelativeDate(latestActivity)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadEditButton lead={normalized} updateLeadAction={updateLeadBasic} />
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border bg-muted/30">
                  <AvatarFallback className="text-xs font-medium">
                    {(normalized.student_name || "NA")
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Estudiante</p>
                  <p className="font-medium">
                    {normalized.student_name || "Sin nombre"}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                Creado:{" "}
                {new Date(normalized.created_at).toLocaleDateString("es-MX")}
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Contacto</p>
                <p className="font-medium">
                  {normalized.contact_full_name ||
                    normalized.contact_first_name ||
                    "Sin contacto"}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                  <Mail className="h-3 w-3" />
                  <span>{normalized.contact_email || "Sin correo"}</span>
                </div>
                {normalized.contact_phone ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{normalized.contact_phone}</span>
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WA / Chatbot</p>
                <p className="font-medium">
                  {normalized.wa_id || "Sin WA ID"}{" "}
                  {normalized.wa_chat_id ? "• Chat enlazado" : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Sesiones de chat</h3>
              <Badge variant="outline">
                {sessions.length} sesión{sessions.length === 1 ? "" : "es"}
              </Badge>
            </div>
            {sessions.length ? (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border rounded-lg p-3 bg-muted/30 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">
                        {statusLabel(session.status || "activa")}
                      </span>
                      <span>{formatRelativeDate(session.updated_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {session.summary || "Sin resumen capturado."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay sesiones registradas todavía.
              </p>
            )}
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">
                Resumen consolidado
              </p>
              <p className="text-sm leading-relaxed">{summary}</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-base font-semibold">Enviar follow up</h3>
            <LeadFollowUpForm
              leadId={normalized.id}
              defaultSubject={defaultSubject}
              defaultMessage={defaultMessage}
              sendFollowUpAction={sendLeadFollowUp}
            />
          </section>
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Comunicación</h3>
              <Badge variant="outline">
                {sessions.length} chat • {emails.length} correo
                {emails.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <LeadCommunications sessions={sessions} emails={emails} />
          </section>
          <section className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Notas</h3>
              <Badge variant="outline">{notes.length} nota{notes.length === 1 ? "" : "s"}</Badge>
            </div>
            <LeadNoteForm leadId={normalized.id} sendNoteAction={addLeadNote} />
            <Separator />
            {notes.length ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-3 bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium">{note.subject || "Nota"}</span>
                      <span>{formatRelativeDate(note.created_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {note.notes || ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no hay notas.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
