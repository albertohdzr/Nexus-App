"use client"

/**
 * Lead Details Sheet - Client Component
 * Panel lateral para vista rápida de un lead
 */

import { Mail, Phone } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Separator } from "@/src/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet"
import { LeadFollowUpForm } from "@/src/components/crm/lead-follow-up-form"
import { StatusBadge } from "./status-badge"
import {
  formatRelativeDate,
  getSessions,
  getLeadSummary,
  buildDefaultFollowUp,
  statusLabel,
} from "../lib/utils"
import type { LeadRecord } from "../types"
import type { SendFollowUpAction } from "../actions"

interface LeadDetailsSheetProps {
  lead: LeadRecord | null
  onClose: () => void
  sendFollowUpAction: SendFollowUpAction
}

export function LeadDetailsSheet({
  lead,
  onClose,
  sendFollowUpAction,
}: LeadDetailsSheetProps) {
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
            Detalles del lead, resumen de chat y seguimiento por email.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Info Section */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={lead.status} />
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
                <p className="text-muted-foreground">Grado de interés</p>
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
                  {lead.contact_email || "Sin email"}
                </p>
                {lead.contact_phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {lead.contact_phone}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Escuela actual / Año</p>
                <p className="font-medium">
                  {lead.current_school || "N/A"}
                  {lead.school_year ? ` • ${lead.school_year}` : ""}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Chat Sessions Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Sesiones de Chat</h4>
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
                        {statusLabel(session.status || "active")}
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
                No hay sesiones registradas aún.
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

          {/* Follow-up Section */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Enviar seguimiento</h4>
            <LeadFollowUpForm
              leadId={lead.id}
              defaultSubject={`Seguimiento de Admisiones - ${lead.student_name || "Lead"}`}
              defaultMessage={defaultMessage}
              sendFollowUpAction={sendFollowUpAction}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
