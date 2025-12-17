"use client"

import { useActionState, useMemo, useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet"
import { cn } from "@/src/lib/utils"
import type { LeadRecord } from "@/src/types/lead"
import type { AdmissionCycle } from "@/src/types/admission"
import type { UpdateLeadAction, UpdateLeadActionState } from "@/src/app/(dashboard)/crm/leads/actions"

const leadStatuses = [
  "new",
  "contacted",
  "qualified",
  "visit_scheduled",
  "visited",
  "application_started",
  "application_submitted",
  "admitted",
  "enrolled",
  "lost",
]

type LeadEditButtonProps = {
  lead: LeadRecord
  updateLeadAction: UpdateLeadAction
  cycles?: AdmissionCycle[]
  className?: string
}

export function LeadEditButton({ lead, updateLeadAction, cycles = [], className }: LeadEditButtonProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<UpdateLeadActionState, FormData>(
    updateLeadAction,
    {}
  )
  const currentStatus = useMemo(
    () => (leadStatuses.includes(lead.status) ? lead.status : "new"),
    [lead.status]
  )
  const [statusValue, setStatusValue] = useState(currentStatus)
  const [cycleId, setCycleId] = useState<string | null>(lead.cycle_id ?? null)
  const [cycleValue, setCycleValue] = useState<string>(cycleId ?? "none")

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <Pencil className="h-4 w-4" />
          Editar lead
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar lead</SheetTitle>
        </SheetHeader>
        <form
          action={formAction}
          className="mt-4 space-y-3"
          onSubmit={() => setOpen(true)}
        >
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="status" value={statusValue} />
          <input type="hidden" name="cycle_id" value={cycleId || ""} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nombre estudiante</label>
              <Input
                name="student_first_name"
                defaultValue={lead.student_first_name || lead.student_name || ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Apellido paterno estudiante</label>
              <Input
                name="student_last_name_paternal"
                defaultValue={lead.student_last_name_paternal || ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Segundo nombre estudiante</label>
              <Input
                name="student_middle_name"
                defaultValue={lead.student_middle_name || ""}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Apellido materno estudiante</label>
              <Input
                name="student_last_name_maternal"
                defaultValue={lead.student_last_name_maternal || ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contacto - Nombre</label>
              <Input
                name="contact_first_name"
                defaultValue={lead.contact_first_name || lead.contact_full_name || ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contacto - Apellido paterno</label>
              <Input
                name="contact_last_name_paternal"
                defaultValue={lead.contact_last_name_paternal || ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contacto - Segundo nombre</label>
              <Input
                name="contact_middle_name"
                defaultValue={lead.contact_middle_name || ""}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Contacto - Apellido materno</label>
              <Input
                name="contact_last_name_maternal"
                defaultValue={lead.contact_last_name_maternal || ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Correo de contacto</label>
            <Input name="contact_email" type="email" defaultValue={lead.contact_email || ""} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Teléfono de contacto</label>
            <Input name="contact_phone" defaultValue={lead.contact_phone || ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Grado de interés</label>
              <Input name="grade_interest" defaultValue={lead.grade_interest || ""} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Escuela actual</label>
              <Input name="current_school" defaultValue={lead.current_school || ""} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Ciclo escolar</label>
              <Input name="school_year" defaultValue={lead.school_year || ""} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Admisión - Ciclo</label>
              <Select
                value={cycleValue}
                onValueChange={(val) => {
                  setCycleValue(val)
                  setCycleId(val === "none" ? null : val)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ciclo</SelectItem>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-600">{state.success}</p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
