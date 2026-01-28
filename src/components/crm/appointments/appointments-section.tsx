"use client"

import { useState } from "react"
import { Badge } from "@/src/components/ui/badge"
import { Clock3 } from "lucide-react"
import { Appointment } from "./types"
import { AppointmentDetailsDialog } from "./appointment-details-dialog"
import { AppointmentHistoryDialog } from "./appointment-history-dialog"



interface AppointmentsSectionProps {
  appointments: Appointment[]
}

const statusLabelMap: Record<string, string> = {
  scheduled: 'Programada',
  visited: 'Visitada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  noshow: 'No Asistió'
}

const localStatusLabel = (status: string) => statusLabelMap[status] || status

export function AppointmentsSection({ appointments }: AppointmentsSectionProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const [now] = useState(() => Date.now())
  const nextAppointment =
    appointments.find((appointment) => {
      const start = new Date(appointment.starts_at).getTime()
      return !Number.isNaN(start) && start >= now
    }) ?? null
  
  const latestAppointment =
    appointments.length > 0 ? appointments[appointments.length - 1] : null
  
  const currentAppointment = nextAppointment ?? latestAppointment

  const handleOpenDetails = (apt: Appointment) => {
    setSelectedAppointment(apt)
    setDetailsOpen(true)
    // Optional: close history if opening from history, or keep it stacked.
    // If we want stacked, we don't close history.
    // Shadcn dialogs manage z-index well mostly.
    // User requested: "al hacer click en una visita del historial quiero ver la información detallada de esa visita"
    // Usually a nested modal or replacing the modal.
    // Let's try stacking (keeping history open). If it feels weird we can toggle.
  }

  const handleOpenHistory = () => {
    setHistoryOpen(true)
  }

  return (
    <>
      <section className="rounded-xl border bg-card p-5 space-y-3 transition-all hover:shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground/90">Próxima Visita</h3>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted transition-colors"
            onClick={handleOpenHistory}
          >
            {appointments.length} total
          </Badge>
        </div>

        {currentAppointment ? (
          <div 
            onClick={() => handleOpenDetails(currentAppointment)}
            className="space-y-3 p-3 border rounded-lg bg-accent/20 cursor-pointer hover:bg-accent/30 transition-colors group relative overflow-hidden"
          >
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-primary/20 transition-all duration-500" />
            
            <div className="flex items-center gap-2 font-medium relative z-10">
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
              <div className="text-sm text-muted-foreground relative z-10">
                Campus: {currentAppointment.campus}
              </div>
            )}
            
            <div className="flex gap-2 relative z-10">
              <Badge variant="secondary" className="text-xs">
                {localStatusLabel(currentAppointment.status || 'scheduled')}
              </Badge>
              {currentAppointment.type && (
                <Badge variant="outline" className="text-xs">
                  {currentAppointment.type}
                </Badge>
              )}
            </div>
            
            {currentAppointment.notes && (
              <p className="text-xs text-muted-foreground mt-2 border-t pt-2 border-border/50 truncate relative z-10">
                {currentAppointment.notes}
              </p>
            )}
            
            {/* Hint to click */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground">
                Ver detalles
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg border-dashed">
            No hay citas programadas
          </div>
        )}
      </section>

      <AppointmentHistoryDialog 
        appointments={appointments}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectAppointment={handleOpenDetails}
      />

      <AppointmentDetailsDialog 
        appointment={selectedAppointment}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  )
}
