"use client"

/**
 * Leads Table Container - Client Component
 * Contenedor que integra filtros, tabla y paginación con sheets
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Upload } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { LeadsTableFilters } from "./leads-table-filters"
import { LeadsTableClient } from "./leads-table-client"
import { LeadsTablePagination } from "./leads-table-pagination"
import { LeadDetailsSheet } from "./lead-details-sheet"
import { CreateLeadSheet } from "./create-lead-sheet"
import type { LeadRecord, PaginatedLeadsResponse } from "../types"
import type { SendFollowUpAction } from "../actions"

interface LeadsTableProps {
  data: PaginatedLeadsResponse
  currentStatus?: string
  currentSearch?: string
  sendFollowUpAction: SendFollowUpAction
}

export function LeadsTable({
  data,
  currentStatus = "all",
  currentSearch = "",
  sendFollowUpAction,
}: LeadsTableProps) {
  const router = useRouter()
  const [selectedLeadForSheet, setSelectedLeadForSheet] = useState<LeadRecord | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div>
          <h3 className="font-semibold text-xl tracking-tight">
            Gestión de Leads
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra tus prospectos y revisa actividad reciente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Nuevo Lead</span>
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3.5 border-b">
          <LeadsTableFilters
            currentStatus={currentStatus}
            currentSearch={currentSearch}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5">
              <Upload className="size-3.5" />
              <span className="hidden xs:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <LeadsTableClient
          leads={data.leads}
          onQuickView={setSelectedLeadForSheet}
        />

        {/* Pagination */}
        <LeadsTablePagination
          currentPage={data.page}
          totalPages={data.totalPages}
          totalItems={data.total}
          pageSize={data.pageSize}
        />
      </div>

      {/* Sheets */}
      <LeadDetailsSheet
        key={selectedLeadForSheet?.id || "lead-sheet"}
        lead={selectedLeadForSheet}
        onClose={() => setSelectedLeadForSheet(null)}
        sendFollowUpAction={sendFollowUpAction}
      />

      <CreateLeadSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(leadId) => router.push(`/crm/leads/${leadId}`)}
      />
    </div>
  )
}
