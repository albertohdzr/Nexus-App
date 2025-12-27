"use client"

import { useActionState } from "react"
import { generateSlots } from "@/src/app/(dashboard)/crm/appointments/actions"
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

type Props = {
  defaultStart: string
  defaultEnd: string
}

const DEFAULT_STATE = { success: undefined, error: undefined, inserted: undefined }

export function GenerateSlotsForm({ defaultStart, defaultEnd }: Props) {
  const [state, formAction] = useActionState(generateSlots, DEFAULT_STATE)

  return (
    <Card className="h-full border-muted">
      <CardHeader>
        <CardTitle>Generate Availability</CardTitle>
        <CardDescription>
          Create slots for the specified date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={defaultStart} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={defaultEnd} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campus">Campus (Optional)</Label>
            <Input id="campus" name="campus" placeholder="e.g. Main Campus / Online" />
          </div>

          {state.error && <p className="text-sm text-destructive font-medium">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-emerald-600 font-medium">
              {state.success}
              {state.inserted ? ` (${state.inserted} slots created)` : ""}
            </p>
          )}

          <CardFooter className="px-0 pt-2">
            <Button type="submit" className="w-full">
              Generate Slots
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
