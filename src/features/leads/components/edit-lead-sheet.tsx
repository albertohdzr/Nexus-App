"use client"

/**
 * Edit Lead Sheet - Client Component
 * Panel lateral para editar la información de un lead
 */

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { 
  User, 
  GraduationCap, 
  Phone, 
  Mail, 
  School,
  Loader2,
  ChevronDown,
  ChevronUp,
  Save,
} from "lucide-react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible"
import { updateLead } from "../actions"
import { LEAD_DIVISIONS } from "../lib/constants"
import type { LeadDetail, UpdateLeadActionState } from "../types"

interface EditLeadSheetProps {
  lead: LeadDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function FormSection({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function EditLeadSheet({
  lead,
  open,
  onOpenChange,
}: EditLeadSheetProps) {
  const [state, formAction, pending] = useActionState<
    UpdateLeadActionState,
    FormData
  >(updateLead, {})

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      onOpenChange(false)
    }
    if (state.error) {
      toast.error(state.error)
    }
  }, [state, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-5">
          <SheetHeader className="space-y-1.5">
            <SheetTitle className="text-xl flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-50">
                <Save className="size-4.5 text-amber-600" />
              </div>
              Editar Lead
            </SheetTitle>
            <SheetDescription className="text-sm">
              Actualiza la información del prospecto.
            </SheetDescription>
          </SheetHeader>
        </div>

        <form action={formAction} className="px-6 py-4">
          <input type="hidden" name="lead_id" value={lead.id} />

          {/* Student Information */}
          <FormSection title="Información del Estudiante" icon={GraduationCap} defaultOpen={true}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="student_first_name" className="text-xs text-muted-foreground">
                    Nombre
                  </Label>
                  <Input
                    id="student_first_name"
                    name="student_first_name"
                    defaultValue={lead.student_first_name || ""}
                    placeholder="Juan"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="student_middle_name" className="text-xs text-muted-foreground">
                    Segundo nombre
                  </Label>
                  <Input
                    id="student_middle_name"
                    name="student_middle_name"
                    defaultValue={lead.student_middle_name || ""}
                    placeholder="Carlos"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="student_last_name_paternal" className="text-xs text-muted-foreground">
                    Apellido paterno
                  </Label>
                  <Input
                    id="student_last_name_paternal"
                    name="student_last_name_paternal"
                    defaultValue={lead.student_last_name_paternal || ""}
                    placeholder="García"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="student_last_name_maternal" className="text-xs text-muted-foreground">
                    Apellido materno
                  </Label>
                  <Input
                    id="student_last_name_maternal"
                    name="student_last_name_maternal"
                    defaultValue={lead.student_last_name_maternal || ""}
                    placeholder="López"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="grade_interest" className="text-xs text-muted-foreground">
                    Grado de interés
                  </Label>
                  <Input
                    id="grade_interest"
                    name="grade_interest"
                    defaultValue={lead.grade_interest || ""}
                    placeholder="Ej: 3° Primaria"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="division" className="text-xs text-muted-foreground">
                    División
                  </Label>
                  <Select name="division" defaultValue={lead.division || ""}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_DIVISIONS.map((div) => (
                        <SelectItem key={div.value} value={div.value}>
                          {div.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="current_school" className="text-xs text-muted-foreground">
                    Escuela actual
                  </Label>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="current_school"
                      name="current_school"
                      defaultValue={lead.current_school || ""}
                      placeholder="Nombre de la escuela"
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="school_year" className="text-xs text-muted-foreground">
                    Ciclo escolar
                  </Label>
                  <Input
                    id="school_year"
                    name="school_year"
                    defaultValue={lead.school_year || ""}
                    placeholder="2025-2026"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </FormSection>

          <div className="border-t" />

          {/* Contact Information */}
          <FormSection title="Información del Contacto" icon={User} defaultOpen={true}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_first_name" className="text-xs text-muted-foreground">
                    Nombre
                  </Label>
                  <Input
                    id="contact_first_name"
                    name="contact_first_name"
                    defaultValue={lead.contact_first_name || ""}
                    placeholder="María"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_middle_name" className="text-xs text-muted-foreground">
                    Segundo nombre
                  </Label>
                  <Input
                    id="contact_middle_name"
                    name="contact_middle_name"
                    defaultValue={lead.contact_middle_name || ""}
                    placeholder="Elena"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_last_name_paternal" className="text-xs text-muted-foreground">
                    Apellido paterno
                  </Label>
                  <Input
                    id="contact_last_name_paternal"
                    name="contact_last_name_paternal"
                    defaultValue={lead.contact_last_name_paternal || ""}
                    placeholder="López"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_last_name_maternal" className="text-xs text-muted-foreground">
                    Apellido materno
                  </Label>
                  <Input
                    id="contact_last_name_maternal"
                    name="contact_last_name_maternal"
                    defaultValue={lead.contact_last_name_maternal || ""}
                    placeholder="Martínez"
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email" className="text-xs text-muted-foreground">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      defaultValue={lead.contact_email || ""}
                      placeholder="correo@ejemplo.com"
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone" className="text-xs text-muted-foreground">
                    Teléfono
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="contact_phone"
                      name="contact_phone"
                      type="tel"
                      defaultValue={lead.contact_phone || ""}
                      placeholder="+52 55 1234 5678"
                      className="h-9 pl-9"
                    />
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Sticky footer */}
          <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 -mx-6 px-6">
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="min-w-[140px]">
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
