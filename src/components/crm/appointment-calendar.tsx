"use client"

import { useTransition } from "react"
import { blockSlot, unblockSlot } from "@/src/app/(dashboard)/crm/appointments/actions"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"

type SlotAppointment = {
  id: string
  lead_id: string | null
  status: string | null
}

type Slot = {
  id: string
  starts_at: string
  ends_at: string
  campus?: string | null
  max_appointments: number
  appointments_count: number
  is_active: boolean
  is_blocked: boolean
  block_reason?: string | null
  appointments?: SlotAppointment[] | null
}

type Blackout = {
  id: string
  date: string
  start_time: string
  end_time: string
  reason: string | null
}

function formatHour(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function toLocalDateKey(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-CA")
}

function formatDateLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`)
  return date.toLocaleDateString("es-MX", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function AppointmentCalendar({
  slots,
  blackouts,
}: {
  slots: Slot[]
  blackouts: Blackout[]
}) {
  const [isPending, startTransition] = useTransition()

  const slotsByDate = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    const dateKey = toLocalDateKey(slot.starts_at)
    acc[dateKey] = [...(acc[dateKey] || []), slot]
    return acc
  }, {})

  const sortedDates = Object.keys(slotsByDate).sort()

  if (!sortedDates.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Aún no hay slots generados. Configura y crea disponibilidad para empezar.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendario (próximas 2 semanas)</h2>
        {isPending && <span className="text-sm text-muted-foreground">Actualizando...</span>}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {sortedDates.map((date) => {
          const dayBlackouts = blackouts.filter((b) => b.date === date)
          const daySlots = slotsByDate[date].sort(
            (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          )

          return (
            <Card key={date} className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{formatDateLabel(date)}</CardTitle>
                  {dayBlackouts.length > 0 && (
                    <Badge variant="destructive">Bloqueado</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayBlackouts.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-dashed border-destructive/60 bg-destructive/5 p-3 text-sm"
                  >
                    <div className="font-medium text-destructive">Bloqueo</div>
                    <div className="text-muted-foreground">
                      {b.start_time} - {b.end_time}
                    </div>
                    {b.reason && <div className="text-muted-foreground">{b.reason}</div>}
                  </div>
                ))}

                {daySlots.map((slot) => {
                  const isBlocked = slot.is_blocked || !slot.is_active
                  const isFull = slot.appointments_count >= slot.max_appointments
                  const status = isBlocked
                    ? "Bloqueado"
                    : isFull
                      ? "Lleno"
                      : "Disponible"

                  return (
                    <div
                      key={slot.id}
                      className="flex flex-col gap-2 rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatHour(slot.starts_at)} - {formatHour(slot.ends_at)}
                        </div>
                        <Badge
                          variant={
                            isBlocked ? "destructive" : isFull ? "secondary" : "outline"
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>
                          {slot.appointments_count}/{slot.max_appointments} citas
                        </span>
                        {slot.campus && <span>• {slot.campus}</span>}
                      </div>
                      {isBlocked && slot.block_reason && (
                        <p className="text-xs text-muted-foreground">{slot.block_reason}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {isBlocked ? (
                          <form
                            action={(formData) =>
                              startTransition(() => {
                                unblockSlot(formData)
                              })
                            }
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="slot_id" value={slot.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                            >
                              Desbloquear
                            </Button>
                          </form>
                        ) : (
                          <form
                            action={(formData) =>
                              startTransition(() => {
                                blockSlot(formData)
                              })
                            }
                            className="flex items-center gap-2"
                          >
                            <input type="hidden" name="slot_id" value={slot.id} />
                            <input type="hidden" name="reason" value="Bloqueo manual" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                            >
                              Bloquear
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  )
                })}

                {!daySlots.length && (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    No hay slots generados para este día.
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
