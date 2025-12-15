"use client"

import { useActionState } from "react"
import { Calendar, CheckCircle2 } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table"
import { cn } from "@/src/lib/utils"
import type { AdmissionCycle } from "@/src/types/admission"
import type { CycleActionState } from "@/src/app/(dashboard)/admissions/cycles/actions"

type CyclesPanelProps = {
  cycles: AdmissionCycle[]
  createAction: (
    prevState: CycleActionState,
    formData: FormData
  ) => Promise<CycleActionState>
}

export function CyclesPanel({ cycles, createAction }: CyclesPanelProps) {
  const [state, formAction, pending] = useActionState<CycleActionState, FormData>(
    createAction,
    {}
  )

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Ciclos escolares</h2>
            <p className="text-sm text-muted-foreground">
              Agrega y administra los ciclos de admisiones para tu organización.
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            {cycles.length} ciclo{cycles.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Nombre</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Cuota inscripción</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.length ? (
                cycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">{cycle.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cycle.start_date
                        ? new Date(cycle.start_date).toLocaleDateString("es-MX")
                        : "Sin inicio"}{" "}
                      —{" "}
                      {cycle.end_date
                        ? new Date(cycle.end_date).toLocaleDateString("es-MX")
                        : "Sin fin"}
                    </TableCell>
                    <TableCell className="text-sm">
                      ${cycle.registration_fee?.toFixed(2) ?? "0.00"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1",
                          cycle.is_active
                            ? "bg-emerald-100 text-emerald-800 border-transparent"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {cycle.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm py-6">
                    Aún no hay ciclos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-3">Agregar ciclo</h3>
        <form action={formAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="name" placeholder="Ciclo 2024-2025" required />
            <Input name="registration_fee" type="number" step="0.01" placeholder="Cuota de inscripción" />
            <Input name="start_date" type="date" />
            <Input name="end_date" type="date" />
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4" />
            Activo
          </label>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Crear ciclo"}
          </Button>
        </form>
      </section>
    </div>
  )
}
