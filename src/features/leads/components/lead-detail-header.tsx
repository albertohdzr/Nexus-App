/**
 * Lead Detail Header - Server Component
 * Header para la página de detalle del lead
 */

import Link from "next/link"
import { ArrowLeft, Edit, MessageSquare } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { SourceBadge } from "./source-badge"
import type { LeadDetail, AdmissionCycle } from "../types"

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
    <div className="flex flex-col gap-4 pb-6 border-b">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href="/crm/leads">
            <ArrowLeft className="size-4" />
            Volver a Leads
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {lead.wa_chat_id && (
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/chat?chatId=${lead.wa_chat_id}`}>
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline">Ver Chat</span>
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2">
            <Edit className="size-4" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        </div>
      </div>

      {/* Main header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
    </div>
  )
}
