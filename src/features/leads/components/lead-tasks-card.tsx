/**
 * Lead Tasks Card - Server Component
 * Muestra las tareas pendientes derivadas del lead
 */

import { CheckCircle2, CircleDashed, AlertCircle } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import type { LeadTask, LeadDetail } from "../types"

interface LeadTasksCardProps {
  lead: LeadDetail
}

/**
 * Genera tareas basadas en campos faltantes del lead
 */
function getLeadTasks(lead: LeadDetail): LeadTask[] {
  const tasks: LeadTask[] = []

  if (!lead.contact_email) {
    tasks.push({
      id: "email",
      title: "Agregar email de contacto",
      description: "El email es necesario para enviar comunicaciones.",
      actionLabel: "Agregar email",
      field: "contact_email",
    })
  }

  if (!lead.contact_phone) {
    tasks.push({
      id: "phone",
      title: "Agregar teléfono de contacto",
      description: "El teléfono permite contacto directo con la familia.",
      actionLabel: "Agregar teléfono",
      field: "contact_phone",
    })
  }

  if (!lead.grade_interest) {
    tasks.push({
      id: "grade",
      title: "Especificar grado de interés",
      description: "Importante para el proceso de admisión.",
      actionLabel: "Agregar grado",
      field: "grade_interest",
    })
  }

  if (!lead.cycle_id) {
    tasks.push({
      id: "cycle",
      title: "Asignar ciclo de admisión",
      description: "Vincula el lead a un ciclo escolar específico.",
      actionLabel: "Asignar ciclo",
      field: "cycle_id",
    })
  }

  if (!lead.student_name) {
    tasks.push({
      id: "student_name",
      title: "Completar nombre del estudiante",
      description: "El nombre del estudiante es información básica.",
      actionLabel: "Agregar nombre",
      field: "student_name",
    })
  }

  return tasks
}

export function LeadTasksCard({ lead }: LeadTasksCardProps) {
  const tasks = getLeadTasks(lead)
  const completedCount = 5 - tasks.length // Asumiendo 5 campos clave

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <div className="p-5 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Tareas Pendientes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completa la información del lead
            </p>
          </div>
          <Badge variant={tasks.length === 0 ? "default" : "secondary"}>
            {completedCount}/5 completadas
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-5">
        {tasks.length === 0 ? (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="size-5" />
            <p className="text-sm font-medium">
              ¡Excelente! Toda la información está completa.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <CircleDashed className="size-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.description}
                  </p>
                </div>
                <AlertCircle className="size-4 text-amber-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
