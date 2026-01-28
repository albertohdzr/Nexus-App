"use client"

/**
 * Create Lead Sheet - Client Component
 * Panel lateral para crear un nuevo lead
 */

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet"
import { createLead } from "../actions"
import { LEAD_SOURCES } from "../lib/constants"
import type { CreateLeadActionState } from "../types"

interface CreateLeadSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (leadId: string) => void
}

export function CreateLeadSheet({
  open,
  onOpenChange,
  onCreated,
}: CreateLeadSheetProps) {
  const [state, formAction, pending] = useActionState<
    CreateLeadActionState,
    FormData
  >(createLead, {})

  useEffect(() => {
    if (state.success && state.leadId) {
      toast.success(state.success)
      onOpenChange(false)
      onCreated(state.leadId)
    }
    if (state.error) {
      toast.error(state.error)
    }
  }, [state, onOpenChange, onCreated])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle>Nuevo Lead</SheetTitle>
          <SheetDescription>
            Ingresa los datos del prospecto para crear un nuevo lead.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="py-6 space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Información del Estudiante</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="student_first_name">Nombre</Label>
                <Input
                  id="student_first_name"
                  name="student_first_name"
                  placeholder="Nombre"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student_middle_name">Segundo nombre</Label>
                <Input
                  id="student_middle_name"
                  name="student_middle_name"
                  placeholder="Segundo nombre"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student_last_name_paternal">Apellido paterno</Label>
                <Input
                  id="student_last_name_paternal"
                  name="student_last_name_paternal"
                  placeholder="Apellido paterno"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student_last_name_maternal">Apellido materno</Label>
                <Input
                  id="student_last_name_maternal"
                  name="student_last_name_maternal"
                  placeholder="Apellido materno"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="grade_interest">Grado de interés</Label>
                <Input
                  id="grade_interest"
                  name="grade_interest"
                  placeholder="Ej: 1° Primaria"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="current_school">Escuela actual</Label>
                <Input
                  id="current_school"
                  name="current_school"
                  placeholder="Escuela actual"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Información del Contacto</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_first_name">Nombre</Label>
                <Input
                  id="contact_first_name"
                  name="contact_first_name"
                  placeholder="Nombre"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_middle_name">Segundo nombre</Label>
                <Input
                  id="contact_middle_name"
                  name="contact_middle_name"
                  placeholder="Segundo nombre"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_last_name_paternal">Apellido paterno</Label>
                <Input
                  id="contact_last_name_paternal"
                  name="contact_last_name_paternal"
                  placeholder="Apellido paterno"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_last_name_maternal">Apellido materno</Label>
                <Input
                  id="contact_last_name_maternal"
                  name="contact_last_name_maternal"
                  placeholder="Apellido materno"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact_phone">Teléfono</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Source */}
          <div className="space-y-1.5">
            <Label htmlFor="source">Fuente</Label>
            <Select name="source" defaultValue="direct">
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona una fuente" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((source) => (
                  <SelectItem key={source} value={source} className="capitalize">
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creando..." : "Crear Lead"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
