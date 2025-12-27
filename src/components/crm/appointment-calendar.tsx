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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Calendar</h2>
          <p className="text-sm text-muted-foreground">Showing availability for the next 2 weeks.</p>
        </div>
        {isPending && (
            <Badge variant="secondary" className="animate-pulse">
                Updating...
            </Badge>
        )}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedDates.map((date) => {
          const dayBlackouts = blackouts.filter((b) => b.date === date)
          const daySlots = slotsByDate[date].sort(
            (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          )

          return (
            <Card key={date} className="h-full hover:shadow-sm transition-shadow border-muted">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{formatDateLabel(date)}</CardTitle>
                  {dayBlackouts.length > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 h-5">Blocked</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {dayBlackouts.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-600 dark:text-red-400"
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                         <div className="size-1.5 rounded-full bg-red-500" />
                         Blocked Period
                    </div>
                    <div className="opacity-90">
                      {b.start_time} - {b.end_time}
                    </div>
                    {b.reason && <div className="mt-1 opacity-75 italic">{b.reason}</div>}
                  </div>
                ))}

                {daySlots.map((slot) => {
                  const isBlocked = slot.is_blocked || !slot.is_active
                  const isFull = slot.appointments_count >= slot.max_appointments
                  const availabilityColor = isBlocked 
                    ? "bg-muted text-muted-foreground" 
                    : isFull 
                        ? "bg-amber-500/10 text-amber-600 border-amber-200" 
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-200"

                  const statusLabel = isBlocked
                    ? "Blocked"
                    : isFull
                      ? "Full"
                      : "Open"

                  return (
                    <div
                      key={slot.id}
                      className={`group flex flex-col gap-2 rounded-md border p-2.5 transition-colors ${
                          isBlocked ? 'bg-muted/30 border-dashed' : 'hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">
                          {formatHour(slot.starts_at)} - {formatHour(slot.ends_at)}
                        </div>
                         <div className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${availabilityColor}`}>
                            {statusLabel}
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                           <span className={isFull ? "text-amber-500 font-medium" : ""}>
                               {slot.appointments_count}
                           </span>
                           <span className="opacity-50">/</span> 
                           <span>{slot.max_appointments} slots</span>
                        </span>
                        {slot.campus && <span className="truncate max-w-[80px]" title={slot.campus}>{slot.campus}</span>}
                      </div>

                      {isBlocked && slot.block_reason && (
                        <p className="text-xs text-muted-foreground bg-background/50 p-1 rounded italic">{slot.block_reason}</p>
                      )}
                      
                      <div className="pt-2 mt-1 border-t border-dashed w-full">
                        {isBlocked ? (
                          <form
                            action={(formData) =>
                              startTransition(() => {
                                unblockSlot(formData)
                              })
                            }
                            className="w-full"
                          >
                            <input type="hidden" name="slot_id" value={slot.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="w-full h-7 text-xs"
                              disabled={isPending}
                            >
                              Unblock
                            </Button>
                          </form>
                        ) : (
                          <form
                            action={(formData) =>
                              startTransition(() => {
                                blockSlot(formData)
                              })
                            }
                            className="w-full"
                          >
                            <input type="hidden" name="slot_id" value={slot.id} />
                            <input type="hidden" name="reason" value="Manual block" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="w-full h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              disabled={isPending}
                            >
                              Block
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  )
                })}

                {!daySlots.length && (
                  <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground bg-muted/20">
                    No slots generated.
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
