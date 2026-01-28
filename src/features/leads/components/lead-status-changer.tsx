"use client"

/**
 * Lead Status Changer - Client Component
 * Permite cambiar el estado del lead con feedback visual
 */

import { startTransition, useActionState, useState } from "react"
import { toast } from "sonner"
import { ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { StatusBadge } from "./status-badge"
import { LEAD_STATUSES, STATUS_LABELS } from "../lib/constants"
import type { UpdateLeadActionState } from "../types"

type UpdateStatusAction = (
  prevState: UpdateLeadActionState,
  formData: FormData
) => Promise<UpdateLeadActionState>

interface LeadStatusChangerProps {
  leadId: string
  currentStatus: string
  updateStatusAction: UpdateStatusAction
}

export function LeadStatusChanger({
  leadId,
  currentStatus,
  updateStatusAction,
}: LeadStatusChangerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Wrap the action to handle success/error with callbacks
  const wrappedAction = async (
    prevState: UpdateLeadActionState,
    formData: FormData
  ): Promise<UpdateLeadActionState> => {
    const result = await updateStatusAction(prevState, formData)
    // Handle result in callback to avoid setState in effect
    if (result.success) {
      toast.success(result.success)
      startTransition(() => setIsOpen(false))
    }
    if (result.error) {
      toast.error(result.error)
    }
    return result
  }

  const [, formAction, pending] = useActionState<UpdateLeadActionState, FormData>(
    wrappedAction,
    {}
  )

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return

    const formData = new FormData()
    formData.set("lead_id", leadId)
    formData.set("status", newStatus)
    formAction(formData)
  }

  // Agrupar estados por categoría
  const activeStatuses = LEAD_STATUSES.slice(0, 4) // new, contacted, qualified, visit_scheduled
  const progressStatuses = LEAD_STATUSES.slice(4, 8) // visited, application_started, application_submitted, admitted
  const finalStatuses = LEAD_STATUSES.slice(8) // enrolled, lost, disqualified

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 min-w-[160px] justify-between"
          disabled={pending}
        >
          {pending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Actualizando...</span>
            </>
          ) : (
            <>
              <StatusBadge status={currentStatus} />
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Etapa Inicial
        </div>
        {activeStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={status === currentStatus ? "bg-accent" : ""}
          >
            <span className="capitalize">{STATUS_LABELS[status] || status}</span>
            {status === currentStatus && (
              <span className="ml-auto text-xs text-muted-foreground">
                Actual
              </span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          En Proceso
        </div>
        {progressStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={status === currentStatus ? "bg-accent" : ""}
          >
            <span className="capitalize">{STATUS_LABELS[status] || status}</span>
            {status === currentStatus && (
              <span className="ml-auto text-xs text-muted-foreground">
                Actual
              </span>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Estado Final
        </div>
        {finalStatuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={
              status === currentStatus
                ? "bg-accent"
                : status === "lost" || status === "disqualified"
                ? "text-destructive focus:text-destructive"
                : "text-emerald-600 focus:text-emerald-600"
            }
          >
            <span className="capitalize">{STATUS_LABELS[status] || status}</span>
            {status === currentStatus && (
              <span className="ml-auto text-xs text-muted-foreground">
                Actual
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
