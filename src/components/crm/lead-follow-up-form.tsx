"use client"

import { useActionState } from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { cn } from "@/src/lib/utils"
import type {
  FollowUpActionState,
  SendLeadFollowUpAction,
} from "@/src/app/(dashboard)/crm/leads/actions"

const textareaClassName =
  "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"

type LeadFollowUpFormProps = {
  leadId: string
  defaultSubject: string
  defaultMessage: string
  sendFollowUpAction: SendLeadFollowUpAction
  className?: string
}

export function LeadFollowUpForm({
  leadId,
  defaultSubject,
  defaultMessage,
  sendFollowUpAction,
  className,
}: LeadFollowUpFormProps) {
  const [state, formAction, pending] = useActionState<
    FollowUpActionState,
    FormData
  >(sendFollowUpAction, {})

  return (
    <form action={formAction} className={cn("space-y-3", className)}>
      <input type="hidden" name="leadId" value={leadId} />
      <Input name="subject" defaultValue={defaultSubject} />
      <textarea
        name="message"
        defaultValue={defaultMessage}
        className={textareaClassName}
      />
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enviando..." : "Enviar correo"}
      </Button>
    </form>
  )
}
