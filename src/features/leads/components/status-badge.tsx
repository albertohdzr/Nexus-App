/**
 * StatusBadge Component - Server Component
 * Muestra el status de un lead con estilos visuales
 */

import { Check, X } from "lucide-react"
import { statusLabel } from "../lib/utils"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = status.toLowerCase()

  if (s === "closed" || s === "enrolled") {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/40 w-fit outline-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.06) 30%, rgba(16, 185, 129, 0) 100%)",
        }}
      >
        <Check className="size-3.5 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400 capitalize">
          {statusLabel(status)}
        </span>
      </div>
    )
  }

  if (s === "lost" || s === "archived" || s === "disqualified") {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/40 w-fit outline-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.06) 30%, rgba(245, 158, 11, 0) 100%)",
        }}
      >
        <X className="size-3.5 text-amber-400" />
        <span className="text-sm font-medium text-amber-400 capitalize">
          {statusLabel(status)}
        </span>
      </div>
    )
  }

  if (s === "new") {
    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-500/40 w-fit outline-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 30%, rgba(59, 130, 246, 0) 100%)",
        }}
      >
        <div className="size-1.5 rounded-full bg-blue-500" />
        <span className="text-sm font-medium text-blue-500 capitalize">
          {statusLabel(status)}
        </span>
      </div>
    )
  }

  // Default style para otros estados
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border w-fit">
      <span className="text-sm font-medium capitalize text-muted-foreground">
        {statusLabel(status)}
      </span>
    </div>
  )
}
