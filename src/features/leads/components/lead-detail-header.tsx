/**
 * Lead Detail Header - Server Component
 * Titulo y información principal del lead (sin botones de navegación)
 */

import { Badge } from "@/src/components/ui/badge"
import { SourceBadge } from "./source-badge"
import type { LeadDetail } from "../types"

interface LeadDetailHeaderProps {
  lead: LeadDetail
  cycleName?: string
  children?: React.ReactNode // Para el status changer (client component)
}

export function LeadDetailHeader({
  lead,
  cycleName = "Sin ciclo",
  children,
}: LeadDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          {lead.student_name || "Lead sin nombre"}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{lead.grade_interest || "Grado no especificado"}</span>
          {lead.current_school && (
            <>
              <span>•</span>
              <span>{lead.current_school}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="capitalize">
          {cycleName}
        </Badge>
        <SourceBadge source={lead.source} />
        {children}
      </div>
    </div>
  )
}
