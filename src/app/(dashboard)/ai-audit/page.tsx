import { getAiLogs } from "./actions"
import { AuditTable } from "./audit-table"

export const metadata = {
  title: "Auditoría IA | Nexus",
  description: "Logs de actividad de la IA",
}

export default async function AiAuditPage() {
  const { data: logs, error } = await getAiLogs()

  if (error || !logs) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Error cargando los logs.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Auditoría IA</h2>
      </div>
      <AuditTable data={logs} />
    </div>
  )
}
