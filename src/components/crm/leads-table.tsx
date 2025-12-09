"use client"

import { useActionState, useMemo, useState } from "react"
import Link from "next/link"
import { Clock3, Mail, MessageSquare, Phone } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Separator } from "@/src/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { cn } from "@/src/lib/utils"
import { LeadFollowUpForm } from "@/src/components/crm/lead-follow-up-form"
import {
  STATUS_STYLES,
  buildDefaultFollowUp,
  formatRelativeDate,
  getLeadSummary,
  getSessions,
  statusLabel,
} from "@/src/lib/lead"
import type { FollowUpActionState, SendLeadFollowUpAction } from "@/src/app/(dashboard)/crm/leads/actions"
import type { LeadRecord } from "@/src/types/lead"

type LeadsTableProps = {
  leads: LeadRecord[]
  sendFollowUpAction: SendLeadFollowUpAction
}

export function LeadsTable({ leads, sendFollowUpAction }: LeadsTableProps) {
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null)
  const [search, setSearch] = useState("")

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return leads
    return leads.filter((lead) => {
      const haystack = [
        lead.student_name,
        lead.contact_full_name,
        lead.contact_email,
        lead.contact_phone,
        lead.grade_interest,
        lead.source,
        lead.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [leads, search])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Leads del CRM</h2>
          <p className="text-sm text-muted-foreground">
            Leads creados por el chatbot y el equipo, con resumen de sesiones.
          </p>
        </div>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, grado o email..."
          className="w-[280px]"
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Estudiante</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead className="w-[240px]">Resumen</TableHead>
              <TableHead className="text-right">Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length ? (
              filteredLeads.map((lead) => {
                const sessions = getSessions(lead)
                const latestActivity =
                  sessions[0]?.last_response_at ||
                  sessions[0]?.updated_at ||
                  lead.updated_at
                return (
                  <TableRow key={lead.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border bg-muted/30">
                          <AvatarFallback className="text-xs font-medium">
                            {(lead.student_name || "NA")
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <div className="font-medium leading-none">
                            {lead.student_name || "Sin nombre"}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {lead.grade_interest || "Sin grado"}
                            {lead.campus ? ` • ${lead.campus}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {lead.contact_full_name ||
                            lead.contact_first_name ||
                            "Contacto"}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {lead.contact_email ? (
                            <>
                              <Mail className="h-3 w-3" />
                              <span className="truncate">
                                {lead.contact_email}
                              </span>
                            </>
                          ) : (
                            "Sin correo"
                          )}
                        </div>
                        {lead.contact_phone ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" />
                            <span>{lead.contact_phone}</span>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize border",
                          STATUS_STYLES[lead.status] || "bg-muted text-foreground"
                        )}
                      >
                        {statusLabel(lead.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {lead.source || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm line-clamp-2 text-muted-foreground">
                        {getLeadSummary(lead)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <MessageSquare className="h-3 w-3" />
                        <span>
                          {sessions.length} sesión{sessions.length === 1 ? "" : "es"}
                        </span>
                        <span>•</span>
                        <Clock3 className="h-3 w-3" />
                        <span>{formatRelativeDate(latestActivity)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("es-MX")}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLead(lead)}>
                          Vista rápida
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/crm/leads/${lead.id}`}>Abrir página</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm">
                  No hay leads todavía.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <LeadDetailsSheet
        key={selectedLead?.id || "lead-sheet"}
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        sendFollowUpAction={sendFollowUpAction}
      />
    </div>
  )
}

type LeadDetailsSheetProps = {
  lead: LeadRecord | null
  onClose: () => void
  sendFollowUpAction: SendLeadFollowUpAction
}

function LeadDetailsSheet({
  lead,
  onClose,
  sendFollowUpAction,
}: LeadDetailsSheetProps) {
  const [state, formAction, pending] = useActionState<
    FollowUpActionState,
    FormData
  >(sendFollowUpAction, {})

  if (!lead) return null

  const sessions = getSessions(lead)
  const summary = getLeadSummary(lead)
  const defaultMessage = buildDefaultFollowUp(lead)

  return (
    <Sheet open={Boolean(lead)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle>{lead.student_name || "Lead"}</SheetTitle>
          <SheetDescription>
            Detalles del lead, resumen del chat y seguimiento por correo.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize border",
                  STATUS_STYLES[lead.status] || "bg-muted text-foreground"
                )}
              >
                {statusLabel(lead.status)}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {lead.source || "N/A"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Estudiante</p>
                <p className="font-medium">{lead.student_name || "Sin nombre"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grado</p>
                <p className="font-medium">
                  {lead.grade_interest || "No especificado"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Contacto</p>
                <p className="font-medium">
                  {lead.contact_full_name ||
                    lead.contact_first_name ||
                    "Sin contacto"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {lead.contact_email || "Sin correo"}
                </p>
                {lead.contact_phone ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.contact_phone}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-muted-foreground">Campus / ciclo</p>
                <p className="font-medium">
                  {lead.campus || "N/A"}
                  {lead.school_year ? ` • ${lead.school_year}` : ""}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Sesiones de chat</h4>
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

          <Separator />

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Enviar follow up</h4>
            <LeadFollowUpForm
              leadId={lead.id}
              defaultSubject={`Seguimiento de admisiones - ${lead.student_name || "Lead"
                }`}
              defaultMessage={defaultMessage}
              sendFollowUpAction={sendFollowUpAction}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
