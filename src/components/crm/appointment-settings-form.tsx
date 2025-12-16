"use client"

import { useActionState, useEffect, useState } from "react"
import { saveAppointmentSettings } from "@/src/app/(dashboard)/crm/appointments/actions"
import { Button } from "@/src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/src/components/ui/toggle-group"

type AppointmentSettings = {
  slot_duration_minutes: number
  start_time: string
  end_time: string
  buffer_minutes?: number | null
  allow_overbooking?: boolean | null
  timezone?: string | null
  days_of_week: number[]
}

const DEFAULT_STATE = { success: undefined, error: undefined }

export function AppointmentSettingsForm({ settings }: { settings: AppointmentSettings }) {
  const [state, formAction] = useActionState(saveAppointmentSettings, DEFAULT_STATE)
  const [days, setDays] = useState<string[]>(
    settings.days_of_week?.map(String) ?? ["1", "2", "3", "4", "5"]
  )

  useEffect(() => {
    setDays(settings.days_of_week?.map(String) ?? ["1", "2", "3", "4", "5"])
  }, [settings.days_of_week])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Configuración de citas</CardTitle>
          <CardDescription>
            Duración, horario y días activos para generar los espacios de visita.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot_duration_minutes">Duración (minutos)</Label>
              <Input
                id="slot_duration_minutes"
                name="slot_duration_minutes"
                type="number"
                min={15}
                step={15}
                defaultValue={settings.slot_duration_minutes || 60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="buffer_minutes">Buffer entre citas (min)</Label>
              <Input
                id="buffer_minutes"
                name="buffer_minutes"
                type="number"
                min={0}
                step={5}
                defaultValue={settings.buffer_minutes ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Hora inicio</Label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                defaultValue={settings.start_time || "08:00"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Hora fin</Label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                defaultValue={settings.end_time || "14:00"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Días activos</Label>
            <ToggleGroup
              type="multiple"
              value={days}
              onValueChange={(value) => setDays(value)}
              className="flex flex-wrap gap-2"
            >
              {[
                { value: "1", label: "L" },
                { value: "2", label: "M" },
                { value: "3", label: "X" },
                { value: "4", label: "J" },
                { value: "5", label: "V" },
                { value: "6", label: "S" },
                { value: "0", label: "D" },
              ].map((day) => (
                <ToggleGroupItem key={day.value} value={day.value} className="w-10">
                  {day.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {days.map((day) => (
              <input key={day} type="hidden" name="days_of_week" value={day} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="allow_overbooking"
              name="allow_overbooking"
              defaultChecked={Boolean(settings.allow_overbooking)}
            />
            <Label htmlFor="allow_overbooking">Permitir overbooking manual</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Zona horaria</Label>
            <Input
              id="timezone"
              name="timezone"
              type="text"
              defaultValue={settings.timezone || "America/Mexico_City"}
              placeholder="America/Mexico_City"
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm text-green-600">{state.success}</p>}

          <CardFooter className="px-0">
            <Button type="submit" className="w-full">
              Guardar configuración
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
