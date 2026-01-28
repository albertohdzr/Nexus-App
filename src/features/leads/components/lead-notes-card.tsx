/**
 * Lead Notes Card - Client Component
 * Muestra y permite agregar notas al lead
 */

"use client"

import { startTransition, useState, useActionState } from "react"
import { toast } from "sonner"
import { Plus, StickyNote, User, Loader2 } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { Textarea } from "@/src/components/ui/textarea"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog"
import { formatRelativeDate } from "../lib/utils"
import type { LeadNote, NoteActionState } from "../types"

type AddNoteAction = (
  prevState: NoteActionState,
  formData: FormData
) => Promise<NoteActionState>

interface LeadNotesCardProps {
  leadId: string
  notes: LeadNote[]
  addNoteAction: AddNoteAction
}

export function LeadNotesCard({
  leadId,
  notes,
  addNoteAction,
}: LeadNotesCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Wrap the action to handle success/error with callbacks
  const wrappedAction = async (
    prevState: NoteActionState,
    formData: FormData
  ): Promise<NoteActionState> => {
    const result = await addNoteAction(prevState, formData)
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

  const [, formAction, pending] = useActionState<NoteActionState, FormData>(
    wrappedAction,
    {}
  )

  // Ordenar notas por fecha descendente
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <div className="p-5 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Notas Internas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro de observaciones del equipo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{notes.length}</Badge>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  Nueva Nota
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Nota</DialogTitle>
                  <DialogDescription>
                    Agrega una nota interna para este lead.
                  </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="space-y-4">
                  <input type="hidden" name="lead_id" value={leadId} />
                  <div className="space-y-2">
                    <Label htmlFor="subject">Asunto (opcional)</Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="Ej: Llamada de seguimiento"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido</Label>
                    <Textarea
                      id="content"
                      name="content"
                      placeholder="Escribe la nota aquí..."
                      rows={4}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={pending}>
                      {pending ? (
                        <>
                          <Loader2 className="size-4 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar Nota"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="divide-y max-h-[400px] overflow-y-auto">
        {sortedNotes.length > 0 ? (
          sortedNotes.map((note) => (
            <div key={note.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  {note.subject && (
                    <p className="text-sm font-medium">{note.subject}</p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {note.notes}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatRelativeDate(note.created_at)}
                </span>
              </div>
              {note.created_by && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <User className="size-3" />
                  {note.created_by}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <StickyNote className="size-6" />
            </div>
            <p className="text-sm font-medium">Sin notas</p>
            <p className="text-xs mt-1">
              Agrega notas internas para dar seguimiento al lead.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
