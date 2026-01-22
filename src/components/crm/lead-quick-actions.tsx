"use client"

import { useActionState, useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { cn } from "@/src/lib/utils"
import { LEAD_STATUSES, statusLabel } from "@/src/lib/lead"
import type { UpdateLeadActionState, UpdateLeadStatusAction } from "@/src/app/(dashboard)/crm/leads/actions"

type LeadQuickActionsProps = {
  leadId: string
  status: string
  updateStatusAction: UpdateLeadStatusAction
  className?: string
}

export function LeadQuickActions({
  leadId,
  status,
  updateStatusAction,
  className,
}: LeadQuickActionsProps) {
  const [statusValue, setStatusValue] = useState(
    LEAD_STATUSES.includes(status) ? status : "new"
  )
  const [state, formAction, pending] = useActionState<UpdateLeadActionState, FormData>(
    updateStatusAction,
    {}
  )

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="status" value={statusValue} />
        <Select value={statusValue} onValueChange={setStatusValue}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="Estado del lead" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STATUSES.map((item) => (
              <SelectItem key={item} value={item} className="capitalize">
                {statusLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Actualizando..." : "Actualizar estado"}
        </Button>
      </form>

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="status" value="disqualified" />
        <Button type="submit" size="sm" variant="destructive">
          Disqualified
        </Button>
      </form>

      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-emerald-600">{state.success}</p>
      ) : null}
    </div>
  )
}
