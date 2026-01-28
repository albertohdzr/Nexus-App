"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Badge } from "@/src/components/ui/badge"
import { Calendar, Clock, MapPin, FileText, CheckCircle2, Circle, XCircle, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Appointment } from "./types"
import { cn } from "@/src/lib/utils"
// import { statusLabel } from "@/src/lib/lead" // Instead of importing, I'll replicate simple mapping or pass it if complex. 
// Actually I should try to import statusLabel if possible, but let's just handle standard statuses or pass a helper.
// The `statusLabel` is in `@/src/lib/lead`, I can import it.

const getStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20'
    case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20'
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }
}

const statusIcons: Record<string, typeof Circle> = {
  scheduled: Circle,
  completed: CheckCircle2,
  cancelled: XCircle,
}

const StatusIconRenderer = ({ status, className }: { status: string; className?: string }) => {
  const Icon = statusIcons[status] || AlertCircle
  return <Icon className={className} />
}

interface AppointmentDetailsDialogProps {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailsDialogProps) {
  if (!appointment) return null

  const date = new Date(appointment.starts_at)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden border-0 bg-background/95 backdrop-blur-xl shadow-2xl p-0 gap-0">
        <div className={cn("h-2 w-full", 
          appointment.status === 'scheduled' ? "bg-blue-500" :
          appointment.status === 'completed' ? "bg-green-500" :
          appointment.status === 'cancelled' ? "bg-red-500" : "bg-gray-500"
        )} />
        
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              Detalles de la Cita
            </DialogTitle>
            <Badge 
              variant="outline" 
              className={cn("capitalize px-2.5 py-0.5 text-xs font-semibold border", getStatusColor(appointment.status))}
            >
              <StatusIconRenderer status={appointment.status} className="w-3 h-3 mr-1.5" />
              {appointment.status === 'scheduled' ? 'Programada' : 
               appointment.status === 'completed' ? 'Completada' : 
               appointment.status === 'cancelled' ? 'Cancelada' : appointment.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha
              </span>
              <p className="font-medium text-sm">
                {format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            
            <div className="col-span-2 sm:col-span-1 space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" /> Hora
              </span>
              <p className="font-medium text-sm">
                {format(date, "h:mm a", { locale: es })} 
                {appointment.ends_at && ` - ${format(new Date(appointment.ends_at), "h:mm a", { locale: es })}`}
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Campus
              </span>
              <div className="p-3 bg-muted/30 rounded-lg text-sm font-medium">
                {appointment.campus || "No especificado"}
              </div>
            </div>

            <div className="space-y-1.5">
               <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Circle className="w-3 h-3" /> Tipo
              </span>
               <div className="p-3 bg-muted/30 rounded-lg text-sm font-medium capitalize">
                {appointment.type || "General"}
              </div>
            </div>

            {appointment.notes && (
              <div className="space-y-1.5 block">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Notas
                </span>
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-sm text-amber-900/80 dark:text-amber-200/80">
                  {appointment.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
