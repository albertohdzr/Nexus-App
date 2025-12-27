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
    <Card className="h-full border-muted">
      <CardHeader>
        <CardTitle>Block Full Day</CardTitle>
        <CardDescription>Disable all appointments for a specific day.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input id="reason" name="reason" placeholder="e.g. Holiday / Maintenance" />
          </div>

          {state.error && <p className="text-sm text-destructive font-medium">{state.error}</p>}
          {state.success && <p className="text-sm text-emerald-600 font-medium">{state.success}</p>}

          <CardFooter className="px-0 pt-2">
            <Button type="submit" className="w-full" variant="outline">
              Block Day
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
