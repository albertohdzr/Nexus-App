"use client"

import { useActionState } from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { cn } from "@/src/lib/utils"
import type {
  AddLeadNoteAction,
  NoteActionState,
} from "@/src/app/(dashboard)/crm/leads/actions"

const textareaClassName =
  "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"

type LeadNoteFormProps = {
  leadId: string
  sendNoteAction: AddLeadNoteAction
  className?: string
}

export function LeadNoteForm({
  leadId,
  sendNoteAction,
  className,
}: LeadNoteFormProps) {
  const [state, formAction, pending] = useActionState<
    NoteActionState,
    FormData
  >(sendNoteAction, {})

  return (
    <form action={formAction} className={cn("space-y-3", className)}>
      <input type="hidden" name="leadId" value={leadId} />
      <Input name="subject" placeholder="Título opcional" />
      <textarea
        name="note"
        placeholder="Escribe una nota para este lead..."
        className={textareaClassName}
      />
      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : "Agregar nota"}
      </Button>
    </form>
  )
}
