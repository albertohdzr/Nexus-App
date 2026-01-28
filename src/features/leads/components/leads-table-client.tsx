"use client"

/**
 * Leads Table Client - Client Component
 * Maneja estado de selección y renderiza las filas
 */

import { useState } from "react"
import { Search, Mail, Activity, Target } from "lucide-react"
import { Checkbox } from "@/src/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table"
import { LeadsTableRow } from "./leads-table-row"
import type { LeadRecord } from "../types"

interface LeadsTableClientProps {
  leads: LeadRecord[]
  onQuickView: (lead: LeadRecord) => void
}

export function LeadsTableClient({ leads, onQuickView }: LeadsTableClientProps) {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const toggleSelectAll = () => {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map((lead) => lead.id))
    }
  }

  const toggleSelectLead = (id: string, selected: boolean) => {
    setSelectedLeads((prev) =>
      selected ? [...prev, id] : prev.filter((i) => i !== id)
    )
  }

  if (leads.length === 0) {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[280px]">
                <div className="flex items-center gap-2">
                  <Checkbox disabled className="border-border/50" />
                  <span className="text-muted-foreground">Estudiante / Lead</span>
                </div>
              </TableHead>
              <TableHead className="min-w-[200px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span>Contacto</span>
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Activity className="size-3.5" />
                  <span>Status</span>
                </div>
              </TableHead>
              <TableHead className="w-[140px]">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Target className="size-3.5" />
                  <span>Fuente</span>
                </div>
              </TableHead>
              <TableHead className="w-[150px] text-right">
                <span className="text-muted-foreground">Última actividad</span>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <div className="p-3 rounded-full bg-muted/50">
                    <Search className="size-6" />
                  </div>
                  <p className="text-sm font-medium">No se encontraron leads</p>
                  <p className="text-xs">
                    Intenta ajustar los filtros o términos de búsqueda.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="w-[280px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={leads.length > 0 && selectedLeads.length === leads.length}
                  onCheckedChange={toggleSelectAll}
                  className="border-border/50 bg-background/70"
                />
                <span className="text-muted-foreground">Estudiante / Lead</span>
              </div>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="size-3.5" />
                <span>Contacto</span>
              </div>
            </TableHead>
            <TableHead className="w-[120px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="size-3.5" />
                <span>Status</span>
              </div>
            </TableHead>
            <TableHead className="w-[140px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Target className="size-3.5" />
                <span>Fuente</span>
              </div>
            </TableHead>
            <TableHead className="w-[150px] text-right">
              <span className="text-muted-foreground">Última actividad</span>
            </TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadsTableRow
              key={lead.id}
              lead={lead}
              isSelected={selectedLeads.includes(lead.id)}
              onSelectChange={(selected) => toggleSelectLead(lead.id, selected)}
              onQuickView={() => onQuickView(lead)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
