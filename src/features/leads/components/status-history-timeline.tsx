/**
 * Status History Timeline - Server Component
 * Muestra el historial de cambios de estado del lead
 */

import { ArrowRight, Clock, User } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { formatRelativeDate, statusLabel } from "../lib/utils"
import type { StatusHistoryEntry } from "../types"

interface StatusHistoryTimelineProps {
  history: StatusHistoryEntry[]
  currentStatus: string
  createdAt: string
}

export function StatusHistoryTimeline({
  history,
  currentStatus,
  createdAt,
}: StatusHistoryTimelineProps) {
  // Si no hay historial, mostrar solo el estado actual
  if (history.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Historial de Estados</h3>
          <span className="text-xs text-muted-foreground">1 evento</span>
        </div>
        <div className="relative pl-6 pb-4 border-l-2 border-primary/30">
          <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-primary flex items-center justify-center">
            <div className="size-2 rounded-full bg-background" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className="text-xs text-muted-foreground">
                (estado actual)
              </span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Creado {formatRelativeDate(createdAt)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Historial de Estados</h3>
        <span className="text-xs text-muted-foreground">
          {history.length + 1} eventos
        </span>
      </div>

      <div className="space-y-0">
        {/* Estado actual */}
        <div className="relative pl-6 pb-6 border-l-2 border-primary/30">
          <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-primary flex items-center justify-center">
            <div className="size-2 rounded-full bg-background" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusBadge status={currentStatus} />
              <span className="text-xs text-emerald-600 font-medium">
                Estado actual
              </span>
            </div>
          </div>
        </div>

        {/* Historial */}
        {history.map((entry) => (
          <div
            key={entry.id}
            className="relative pl-6 pb-6 border-l-2 border-muted last:border-l-transparent"
          >
            <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-muted flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {entry.previous_status ? (
                  <>
                    <span className="text-muted-foreground capitalize">
                      {statusLabel(entry.previous_status)}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-medium capitalize">
                      {statusLabel(entry.new_status)}
                    </span>
                  </>
                ) : (
                  <span className="font-medium capitalize">
                    {statusLabel(entry.new_status)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatRelativeDate(entry.created_at)}
                </span>
                {entry.changed_by_name && (
                  <span className="flex items-center gap-1">
                    <User className="size-3" />
                    {entry.changed_by_name}
                  </span>
                )}
              </div>

              {entry.notes && (
                <p className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  {entry.notes}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Creación */}
        <div className="relative pl-6">
          <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-muted flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium">Lead creado</span>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {formatRelativeDate(createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
