"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Badge } from "@/src/components/ui/badge"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Appointment } from "./types"
import { cn } from "@/src/lib/utils"
import { CalendarDays, ArrowRight, History } from "lucide-react"

interface AppointmentHistoryDialogProps {
  appointments: Appointment[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectAppointment: (appointment: Appointment) => void
}

export function AppointmentHistoryDialog({
  appointments,
  open,
  onOpenChange,
  onSelectAppointment,
}: AppointmentHistoryDialogProps) {
  // Sort descending for history
  const sorted = [...appointments].sort((a, b) => 
    new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-0 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Historial de Visitas
            <Badge variant="secondary" className="ml-2">
                {appointments.length} total
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <div className="p-4 rounded-full bg-muted/50">
                    <CalendarDays className="w-8 h-8 opacity-50" />
                </div>
              <p>No hay citas registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map((apt) => {
                const date = new Date(apt.starts_at)
                const isPast = date.getTime() < Date.now()
                
                return (
                  <div
                    key={apt.id}
                    onClick={() => {
                        // Close this (optional, or stack) and open details
                        // For better UX, we might keep this open if details is a nested dialog, 
                        // but usually stacking dialogs is tricky in some libs.
                        // We will call onSelect which will open the other dialog. 
                        // The parent can decide to close this one or not.
                        // Assuming the parent will swap or stack them.
                        onSelectAppointment(apt)
                    }}
                    className={cn(
                      "group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:border-primary/50 relative overflow-hidden",
                      isPast ? "bg-card/50" : "bg-card border-l-4 border-l-primary"
                    )}
                  >
                     {/* Hover glow effect */}
                     <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    <div className="flex-shrink-0 flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50 min-w-[4rem] text-center border">
                      <span className="text-xs font-bold uppercase text-muted-foreground">
                        {format(date, "MMM", { locale: es })}
                      </span>
                      <span className="text-2xl font-bold text-foreground">
                        {format(date, "d", { locale: es })}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-1.5">
                      <div className="flex items-center justify-between">
                         <span className="font-semibold text-base group-hover:text-primary transition-colors">
                            {format(date, "EEEE, h:mm a", { locale: es })}
                         </span>
                         <Badge 
                            variant="outline" 
                            className={cn(
                                "text-[10px] px-1.5 h-5 capitalize",
                                apt.status === 'scheduled' ? "text-blue-600 bg-blue-50 border-blue-100" :
                                apt.status === 'completed' ? "text-green-600 bg-green-50 border-green-100" :
                                apt.status === 'cancelled' ? "text-red-600 bg-red-50 border-red-100" : ""
                            )}
                         >
                            {apt.status === 'scheduled' ? 'Prog' : apt.status}
                         </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                         <span>
                             {apt.type || "Cita General"}
                         </span>
                         {apt.campus && (
                             <span className="flex items-center gap-1 before:content-['•'] before:mr-3 before:text-muted-foreground/30">
                                {apt.campus}
                             </span>
                         )}
                      </div>
                    </div>
                    
                    <div className="hidden sm:flex items-center justify-center text-muted-foreground/30 group-hover:text-primary/70 transition-colors pl-2 border-l border-border/10">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div >
      </DialogContent>
    </Dialog>
  )
}
