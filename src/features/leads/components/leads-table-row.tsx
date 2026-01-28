"use client"

/**
 * Leads Table Row - Client Component
 * Fila individual de la tabla con interactividad (click, selection)
 */

import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Eye,
  ExternalLink,
  MoreHorizontal,
  Mail,
  Activity,
  Target,
} from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { TableCell, TableRow } from "@/src/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { StatusBadge } from "./status-badge"
import { SourceBadge } from "./source-badge"
import { formatRelativeDate, getLatestActivity, getLeadInitials } from "../lib/utils"
import type { LeadRecord } from "../types"

interface LeadsTableRowProps {
  lead: LeadRecord
  isSelected: boolean
  onSelectChange: (selected: boolean) => void
  onQuickView: () => void
}

export function LeadsTableRow({
  lead,
  isSelected,
  onSelectChange,
  onQuickView,
}: LeadsTableRowProps) {
  const router = useRouter()
  const latestActivity = getLatestActivity(lead)

  return (
    <TableRow
      className="border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => router.push(`/crm/leads/${lead.id}`)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectChange(!!checked)}
            onClick={(e) => e.stopPropagation()}
            className="border-border/50 bg-background/70"
          />
          <Avatar className="size-8 border shadow-sm">
            <AvatarFallback className="text-xs font-bold text-primary bg-primary/10">
              {getLeadInitials(lead)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm text-foreground">
              {lead.student_name || "Sin nombre"}
            </span>
            <span className="text-xs text-muted-foreground">
              {lead.grade_interest || "Sin grado"}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">{lead.contact_full_name}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
            {lead.contact_email}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={lead.status} />
      </TableCell>
      <TableCell>
        <SourceBadge source={lead.source} />
      </TableCell>
      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
        {formatRelativeDate(latestActivity)}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={onQuickView}>
              <Eye className="mr-2 h-4 w-4" />
              Vista rápida
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/crm/leads/${lead.id}`} className="cursor-pointer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver detalles
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
