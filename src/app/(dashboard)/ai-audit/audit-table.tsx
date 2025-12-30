"use client"

import { useState } from "react"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { LogDetailsSheet } from "./log-details-sheet"
import { AiLog } from "./actions"

export function AuditTable({ data }: { data: AiLog[] }) {
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = (log: AiLog) => {
    setSelectedLog(log)
    setSheetOpen(true)
  }

  return (
    <>
      <DataTable columns={columns} data={data} onRowClick={handleRowClick} />
      <LogDetailsSheet 
        log={selectedLog} 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
      />
    </>
  )
}
