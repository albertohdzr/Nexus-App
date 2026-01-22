"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarClock, ExternalLink, Mail, Phone } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Separator } from "@/src/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/src/components/ui/sheet"
import { LeadEditButton } from "@/src/components/crm/lead-edit-button"
import { LeadNoteForm } from "@/src/components/crm/lead-note-form"
import { createClient } from "@/src/lib/supabase/client"
import { cn } from "@/src/lib/utils"
import { STATUS_STYLES, formatRelativeDate, statusLabel } from "@/src/lib/lead"
import type { AdmissionCycle } from "@/src/types/admission"
import type { LeadChatSession, LeadRecord } from "@/src/types/lead"
import type {
  AddLeadNoteAction,
  CreateLeadFromChatAction,
  CreateLeadActionState,
  UpdateLeadAction,
} from "@/src/app/(dashboard)/crm/leads/actions"

type Appointment = {
  id: string
  starts_at: string
  ends_at: string | null
  campus: string | null
  type: string | null
  status: string | null
  notes: string | null
}

type ChatInfo = {
  id: string
  wa_id: string | null
  name: string | null
  phone_number: string | null
  active_session_id: string | null
  updated_at?: string | null
}

type LeadSidePanelProps = {
  updateLeadAction: UpdateLeadAction
  addLeadNoteAction: AddLeadNoteAction
  createLeadAction: CreateLeadFromChatAction
}

export default function LeadSidePanel({
  updateLeadAction,
  addLeadNoteAction,
  createLeadAction,
}: LeadSidePanelProps) {
  const searchParams = useSearchParams()
  const chatId = searchParams.get("chatId")
  const router = useRouter()
  const supabase = createClient()
  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null)
  const [sessions, setSessions] = useState<LeadChatSession[]>([])
  const [cycles, setCycles] = useState<AdmissionCycle[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLead, setHasLead] = useState<boolean | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [createState, createActionHandler, createPending] = useActionState<
    CreateLeadActionState,
    FormData
  >(createLeadAction, {})

  useEffect(() => {
    if (!createState) return
    if (createState.error) {
      toast.error(createState.error)
    }
    if (createState.success && createState.leadId) {
      toast.success(createState.success)
      setCreateOpen(false)
      setRefreshKey((prev) => prev + 1)
      router.refresh()
    }
  }, [createState, router])

  useEffect(() => {
    let isMounted = true

    const loadLead = async () => {
      if (!chatId) {
        setLead(null)
        setHasLead(null)
        setAppointments([])
        setCycles([])
        setChatInfo(null)
        setSessions([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        if (isMounted) {
          setIsLoading(false)
          setHasLead(false)
        }
        return
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (!profile?.organization_id) {
        if (isMounted) {
          setIsLoading(false)
          setHasLead(false)
        }
        return
      }

      const { data: chatData } = await supabase
        .from("chats")
        .select("id, wa_id, name, phone_number, active_session_id, updated_at")
        .eq("id", chatId)
        .maybeSingle()

      if (!isMounted) return

      setChatInfo((chatData as ChatInfo) ?? null)

      const { data: leadData } = await supabase
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
          updated_at
        `
        )
        .eq("organization_id", profile.organization_id)
        .eq("wa_chat_id", chatId)
        .maybeSingle()

      const { data: sessionsData } = await supabase
        .from("chat_sessions")
        .select("id, status, summary, last_response_at, updated_at, created_at, ai_enabled, closed_at")
        .eq("chat_id", chatId)
        .order("updated_at", { ascending: false })

      if (!isMounted) return

      setSessions((sessionsData as LeadChatSession[]) ?? [])

      if (!leadData) {
        setLead(null)
        setHasLead(false)
        setAppointments([])
        setCycles([])
        setIsLoading(false)
        return
      }

      setLead(leadData as LeadRecord)
      setHasLead(true)

      const [cyclesResponse, appointmentsResponse] = await Promise.all([
        supabase
          .from("admission_cycles")
          .select("id, name")
          .eq("organization_id", profile.organization_id)
          .order("start_date", { ascending: false }),
        supabase
          .from("appointments")
          .select("id, starts_at, ends_at, campus, type, status, notes")
          .eq("organization_id", profile.organization_id)
          .eq("lead_id", leadData.id)
          .order("starts_at", { ascending: true }),
      ])

      if (!isMounted) return

      setCycles((cyclesResponse.data as AdmissionCycle[]) ?? [])
      setAppointments((appointmentsResponse.data as Appointment[]) ?? [])
      setIsLoading(false)
    }

    void loadLead()

    return () => {
      isMounted = false
    }
  }, [chatId, refreshKey, supabase])

  useEffect(() => {
    if (!chatId) return
    const channel = supabase
      .channel(`chat_sessions_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_sessions",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSessions((prev) => [payload.new as LeadChatSession, ...prev])
          }
          if (payload.eventType === "UPDATE") {
            setSessions((prev) =>
              prev
                .map((session) =>
                  session.id === payload.new.id
                    ? (payload.new as LeadChatSession)
                    : session
                )
                .sort((a, b) => {
                  const left = new Date(a.updated_at || a.created_at || 0).getTime()
                  const right = new Date(b.updated_at || b.created_at || 0).getTime()
                  return right - left
                })
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, supabase])

  const cycleName = useMemo(() => {
    if (!lead?.cycle_id) return "Sin ciclo"
    return cycles.find((cycle) => cycle.id === lead.cycle_id)?.name || "Sin ciclo"
  }, [cycles, lead?.cycle_id])

  const upcomingAppointment = useMemo(() => {
    const now = Date.now()
    return appointments.find((appointment) => {
      const startsAt = new Date(appointment.starts_at).getTime()
      return !Number.isNaN(startsAt) && startsAt >= now
    })
  }, [appointments])

  const latestAppointment = useMemo(() => {
    if (!appointments.length) return null
    const past = appointments.filter((appointment) => {
      const startsAt = new Date(appointment.starts_at).getTime()
      return !Number.isNaN(startsAt) && startsAt < Date.now()
    })
    return past.length ? past[past.length - 1] : null
  }, [appointments])

  const activeSession = useMemo(() => {
    if (!chatInfo?.active_session_id) return null
    return (
      sessions.find((session) => session.id === chatInfo.active_session_id) ||
      null
    )
  }, [chatInfo?.active_session_id, sessions])

  if (!chatId) {
    return null
  }

  return (
    <aside className="hidden lg:flex w-[360px] min-w-[320px] max-w-[420px] border-l border-[#d1d7db] dark:border-[#2a3942] bg-white dark:bg-[#111b21] flex-col h-full">
      <div className="px-5 py-4 border-b border-[#d1d7db] dark:border-[#2a3942] flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {lead ? "Detalle del lead" : "Resumen del chat"}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {lead?.student_name || chatInfo?.name || "Chat sin nombre"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Ultima actividad: {formatRelativeDate(chatInfo?.updated_at)}
          </p>
        </div>
        {lead ? (
          <Button variant="ghost" size="icon" asChild title="Ver ficha">
            <Link href={`/crm/leads/${lead.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {isLoading ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 p-4 text-sm text-muted-foreground">
            Cargando informacion del lead...
          </div>
        ) : (
          <>
            <section className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={activeSession ? "secondary" : "outline"}>
                  {activeSession ? "Sesion activa" : "Sin sesion activa"}
                </Badge>
                <Badge variant={activeSession?.ai_enabled ? "default" : "outline"}>
                  {activeSession?.ai_enabled ? "AI activo" : "AI apagado"}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    Contacto
                  </p>
                  <p className="font-medium">{chatInfo?.name || "Sin nombre"}</p>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{chatInfo?.phone_number || "Sin telefono"}</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Sesiones</h4>
                <Badge variant="outline">{sessions.length}</Badge>
              </div>
              {sessions.length ? (
                <div className="space-y-3">
                  {sessions.slice(0, 3).map((session) => {
                    const lastActivity =
                      session.last_response_at ||
                      session.updated_at ||
                      session.created_at
                    return (
                      <div key={session.id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary" className="capitalize">
                            {session.status || "active"}
                          </Badge>
                          <Badge variant={session.ai_enabled ? "default" : "outline"}>
                            {session.ai_enabled ? "AI activo" : "AI apagado"}
                          </Badge>
                          <span className="text-muted-foreground">
                            {formatRelativeDate(lastActivity)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.summary || "Sin resumen para esta sesion."}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay sesiones registradas.
                </p>
              )}
            </section>

            {!hasLead ? (
              <section className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">Lead no asociado</h4>
                    <p className="text-xs text-muted-foreground">
                      Crea un lead para registrar el seguimiento.
                    </p>
                  </div>
                  <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                    <SheetTrigger asChild>
                      <Button size="sm">Crear lead</Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-xl overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Crear lead desde el chat</SheetTitle>
                      </SheetHeader>
                      <form action={createActionHandler} className="py-4 space-y-6">
                        <input type="hidden" name="chatId" value={chatId} />
                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold">Estudiante</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor="student_first_name">Nombre</Label>
                              <Input id="student_first_name" name="student_first_name" required />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="student_middle_name">Segundo nombre</Label>
                              <Input id="student_middle_name" name="student_middle_name" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="student_last_name_paternal">Apellido paterno</Label>
                              <Input id="student_last_name_paternal" name="student_last_name_paternal" required />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="student_last_name_maternal">Apellido materno</Label>
                              <Input id="student_last_name_maternal" name="student_last_name_maternal" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="grade_interest">Grado de interes</Label>
                              <Input id="grade_interest" name="grade_interest" required />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="school_year">Ciclo escolar</Label>
                              <Input id="school_year" name="school_year" placeholder="2025-2026" />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <Label htmlFor="current_school">Escuela actual</Label>
                              <Input id="current_school" name="current_school" />
                            </div>
                          </div>
                        </section>

                        <Separator />

                        <section className="space-y-3">
                          <h4 className="text-sm font-semibold">Contacto</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor="contact_first_name">Nombre</Label>
                              <Input
                                id="contact_first_name"
                                name="contact_first_name"
                                defaultValue={chatInfo?.name || ""}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="contact_middle_name">Segundo nombre</Label>
                              <Input id="contact_middle_name" name="contact_middle_name" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="contact_last_name_paternal">Apellido paterno</Label>
                              <Input id="contact_last_name_paternal" name="contact_last_name_paternal" required />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="contact_last_name_maternal">Apellido materno</Label>
                              <Input id="contact_last_name_maternal" name="contact_last_name_maternal" />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="contact_phone">Telefono</Label>
                              <Input
                                id="contact_phone"
                                name="contact_phone"
                                defaultValue={chatInfo?.phone_number || ""}
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="contact_email">Correo</Label>
                              <Input id="contact_email" name="contact_email" type="email" />
                            </div>
                          </div>
                        </section>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCreateOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={createPending}>
                            {createPending ? "Guardando..." : "Crear lead"}
                          </Button>
                        </div>
                      </form>
                    </SheetContent>
                  </Sheet>
                </div>
              </section>
            ) : null}

            {lead ? (
              <>
                <section className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize border",
                        STATUS_STYLES[lead.status] || "bg-muted text-foreground"
                      )}
                    >
                      {statusLabel(lead.status)}
                    </Badge>
                    <Badge variant="secondary">{cycleName}</Badge>
                    <Badge variant="secondary" className="capitalize">
                      {lead.source || "Sin fuente"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Contacto
                      </p>
                      <p className="font-medium">
                        {lead.contact_full_name || lead.contact_first_name || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {lead.contact_email ? (
                        <a
                          href={`mailto:${lead.contact_email}`}
                          className="text-sm hover:underline"
                        >
                          {lead.contact_email}
                        </a>
                      ) : (
                        <span className="text-sm">Sin correo</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {lead.contact_phone ? (
                        <a
                          href={`tel:${lead.contact_phone}`}
                          className="text-sm hover:underline"
                        >
                          {lead.contact_phone}
                        </a>
                      ) : (
                        <span className="text-sm">Sin telefono</span>
                      )}
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          Grado
                        </p>
                        <p className="font-medium">{lead.grade_interest || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">
                          Escuela actual
                        </p>
                        <p className="font-medium">{lead.current_school || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                  <LeadEditButton
                    lead={lead}
                    updateLeadAction={updateLeadAction}
                    cycles={cycles}
                    className="w-full justify-center"
                  />
                </section>

                <section className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Visitas</h4>
                    <Badge variant="outline">{appointments.length}</Badge>
                  </div>
                  {upcomingAppointment ? (
                    <div className="rounded-lg border p-3 bg-muted/10 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarClock className="h-4 w-4 text-primary" />
                        {new Date(upcomingAppointment.starts_at).toLocaleString("es-MX", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">
                          {statusLabel(upcomingAppointment.status || "scheduled")}
                        </Badge>
                        {upcomingAppointment.type ? (
                          <Badge variant="outline">{upcomingAppointment.type}</Badge>
                        ) : null}
                      </div>
                      {upcomingAppointment.campus ? (
                        <p className="text-xs text-muted-foreground">
                          Campus: {upcomingAppointment.campus}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay visitas programadas.
                    </p>
                  )}
                  {latestAppointment ? (
                    <div className="text-xs text-muted-foreground">
                      Ultima visita:{" "}
                      {new Date(latestAppointment.starts_at).toLocaleDateString("es-MX")}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-xl border bg-card p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Notas internas</h4>
                  <LeadNoteForm leadId={lead.id} sendNoteAction={addLeadNoteAction} />
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </aside>
  )
}
