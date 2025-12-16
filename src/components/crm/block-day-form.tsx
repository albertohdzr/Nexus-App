"use client"

import { useActionState } from "react"
import { blockDay } from "@/src/app/(dashboard)/crm/appointments/actions"
import { Button } from "@/src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"

const DEFAULT_STATE = { success: undefined, error: undefined }

export function BlockDayForm() {
  const [state, formAction] = useActionState(blockDay, DEFAULT_STATE)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Bloquear día completo</CardTitle>
          <CardDescription>Desactiva todas las citas de un día y registra la razón.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input id="date" name="date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Razón (opcional)</Label>
            <Input id="reason" name="reason" placeholder="Asueto / evento / mantenimiento" />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="text-sm text-green-600">{state.success}</p>}

          <CardFooter className="px-0">
            <Button type="submit" className="w-full" variant="outline">
              Bloquear día
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
