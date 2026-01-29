"use client"

/**
 * Lead Appointments Card - Client Component
 * Muestra las citas del lead y permite crear nuevas
 */

import { useState } from "react"
import { Calendar, Plus } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { CreateAppointmentDialog } from "./create-appointment-dialog"
import type { LeadDetail } from "../types"

interface LeadAppointment {
  id: string
  type: string | null
  starts_at: string
  status: string
}

interface LeadAppointmentsCardProps {
  lead: LeadDetail
  appointments: LeadAppointment[]
}

export function LeadAppointmentsCard({ lead, appointments }: LeadAppointmentsCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completada"
      case "cancelled":
        return "Cancelada"
      case "scheduled":
        return "Programada"
      case "in_progress":
        return "En curso"
      default:
        return status
    }
  }

  return (
    <>
      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              <h3 className="font-semibold">Citas</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{appointments.length}</Badge>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-7"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-3.5" />
                <span className="hidden sm:inline">Nueva</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="p-5">
          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
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
                  <Badge variant={getStatusVariant(apt.status)}>
                    {getStatusLabel(apt.status)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="size-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mt-2">
                No hay citas programadas
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 mt-3"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="size-3.5" />
                Agendar primera cita
              </Button>
            </div>
          )}
        </div>
      </section>

      <CreateAppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={lead}
      />
    </>
  )
}
