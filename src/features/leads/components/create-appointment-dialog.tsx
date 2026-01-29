"use client"

/**
 * Create Appointment Dialog - Client Component
 * Diálogo para crear una cita desde el contexto de un lead
 */

import { useState, useEffect, useTransition } from "react"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Loader2,
  User,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Calendar } from "@/src/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { Textarea } from "@/src/components/ui/textarea"
import { cn } from "@/src/lib/utils"
import { createCalendarEvent } from "@features/appointments"
import { getCalendarSlots } from "@features/appointments/services/calendar-service"
import type { LeadDetail } from "../types"
import type { CalendarSlotOption } from "@/src/types/calendar"

interface CreateAppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: LeadDetail
}

const APPOINTMENT_TYPES = [
  { value: "visit", label: "Visita al campus" },
  { value: "tour", label: "Tour guiado" },
  { value: "interview", label: "Entrevista" },
  { value: "meeting", label: "Reunión" },
  { value: "other", label: "Otro" },
]

export function CreateAppointmentDialog({
  open,
  onOpenChange,
  lead,
}: CreateAppointmentDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1))
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [slotId, setSlotId] = useState("")
  const [type, setType] = useState("visit")
  const [notes, setNotes] = useState("")
  const [slots, setSlots] = useState<CalendarSlotOption[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Cargar slots cuando cambia la fecha
  useEffect(() => {
    if (!open || !date) return

    const fetchSlots = async () => {
      setLoadingSlots(true)
      try {
        const dateStr = format(date, "yyyy-MM-dd")
        const fetchedSlots = await getCalendarSlots(dateStr, dateStr)
        setSlots(fetchedSlots)
        // Si solo hay un slot disponible, pre-seleccionarlo
        const availableSlots = fetchedSlots.filter(
          s => !s.isBlocked && s.appointmentsCount < s.maxAppointments
        )
        if (availableSlots.length === 1) {
          setSlotId(availableSlots[0].id)
        } else {
          setSlotId("")
        }
      } catch (error) {
        console.error("Error loading slots:", error)
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    fetchSlots()
  }, [open, date])

  // Reset form cuando se abre
  useEffect(() => {
    if (open) {
      setDate(addDays(new Date(), 1))
      setSlotId("")
      setType("visit")
      setNotes("")
      setFormError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!date || !slotId) {
      setFormError("Selecciona una fecha y horario disponible.")
      return
    }

    startTransition(async () => {
      try {
        const response = await createCalendarEvent({
          leadId: lead.id,
          slotId,
          type,
          notes: notes || undefined,
        })

        if (!response.success) {
          setFormError(response.error || "No se pudo crear la cita.")
          return
        }

        toast.success("Cita agendada exitosamente")
        onOpenChange(false)
      } catch (error) {
        console.error("Error creating appointment:", error)
        setFormError("Error al crear la cita. Intenta de nuevo.")
      }
    })
  }

  const selectedSlot = slots.find(s => s.id === slotId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5 text-primary" />
            Nueva Cita
          </DialogTitle>
          <DialogDescription>
            Agenda una cita para {lead.student_name || "este lead"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Lead info (read-only) */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="size-4 text-muted-foreground" />
                <span className="font-medium">{lead.student_name}</span>
              </div>
              {lead.contact_full_name && (
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  Contacto: {lead.contact_full_name}
                </p>
              )}
            </div>

            {/* Date picker */}
            <div className="grid gap-2">
              <Label>Fecha</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {date ? (
                      format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate)
                      setDatePickerOpen(false)
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Slot selector */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Clock className="size-3.5" />
                Horario disponible
              </Label>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Cargando horarios...
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No hay horarios disponibles para esta fecha.
                  <br />
                  <span className="text-xs">Selecciona otra fecha o contacta al administrador.</span>
                </div>
              ) : (
                <Select value={slotId} onValueChange={setSlotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un horario" />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((slot) => {
                      const startTime = format(new Date(slot.startsAt), "HH:mm")
                      const endTime = format(new Date(slot.endsAt), "HH:mm")
                      const isFull = slot.appointmentsCount >= slot.maxAppointments
                      const isBlocked = slot.isBlocked || !slot.isActive
                      const isDisabled = isFull || isBlocked
                      const remaining = slot.maxAppointments - slot.appointmentsCount

                      return (
                        <SelectItem
                          key={slot.id}
                          value={slot.id}
                          disabled={isDisabled}
                        >
                          <div className="flex items-center gap-2">
                            <span>{startTime} - {endTime}</span>
                            {slot.campus && (
                              <span className="text-muted-foreground">• {slot.campus}</span>
                            )}
                            {!isDisabled && (
                              <span className="text-xs text-muted-foreground">
                                ({remaining} {remaining === 1 ? "lugar" : "lugares"})
                              </span>
                            )}
                            {isBlocked && (
                              <span className="text-xs text-destructive">Bloqueado</span>
                            )}
                            {isFull && !isBlocked && (
                              <span className="text-xs text-amber-600">Lleno</span>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Appointment type */}
            <div className="grid gap-2">
              <Label>Tipo de cita</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <FileText className="size-3.5" />
                Notas (opcional)
              </Label>
              <Textarea
                placeholder="Agregar instrucciones o notas para la cita..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Selected slot summary */}
            {selectedSlot && (
              <div className="rounded-lg border bg-primary/5 p-3 text-sm">
                <p className="font-medium text-primary flex items-center gap-2">
                  <CalendarIcon className="size-4" />
                  Resumen de la cita
                </p>
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Clock className="size-3.5" />
                    {date && format(date, "EEEE d 'de' MMMM", { locale: es })} a las{" "}
                    {format(new Date(selectedSlot.startsAt), "HH:mm")}
                  </p>
                  {selectedSlot.campus && (
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5" />
                      {selectedSlot.campus}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {formError && (
              <p className="text-xs text-destructive mr-auto">{formError}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isPending || !slotId}
              className="min-w-[120px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Agendando...
                </>
              ) : (
                "Agendar cita"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
