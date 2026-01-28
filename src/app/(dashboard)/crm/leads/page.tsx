/**
 * Leads Page - Server Component
 * 
 * Esta página demuestra el patrón server-first:
 * - Data fetching en el servidor
 * - Filtrado y paginación via searchParams (en el servidor)
 * - Solo los componentes interactivos son Client Components
 */

import { redirect } from "next/navigation"
import { Suspense } from "react"
import {
  LeadsTable,
  getLeadsPaginated,
  getCurrentUserOrganizationId,
  sendFollowUp,
  DEFAULT_PAGE_SIZE,
} from "@features/leads"

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string
    pageSize?: string
    status?: string
    search?: string
  }>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const params = await searchParams
  
  const organizationId = await getCurrentUserOrganizationId()

  if (!organizationId) {
    redirect("/login")
  }

  // Extraer parámetros de búsqueda
  const page = parseInt(params.page || "1", 10)
  const pageSize = parseInt(params.pageSize || String(DEFAULT_PAGE_SIZE), 10)
  const status = params.status || "all"
  const search = params.search || ""

  // Fetch data en el servidor con filtros
  const data = await getLeadsPaginated(organizationId, page, pageSize, {
    status: status !== "all" ? status : undefined,
    search: search || undefined,
  })

  return (
    <div className="space-y-6">
      <Suspense fallback={<LeadsTableSkeleton />}>
        <LeadsTable
          data={data}
          currentStatus={status}
          currentSearch={search}
          sendFollowUpAction={sendFollowUp}
        />
      </Suspense>
    </div>
  )
}

// Skeleton para loading state
function LeadsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center pb-2">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-9 w-28 bg-muted animate-pulse rounded" />
      </div>
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex gap-3">
            <div className="h-8 w-64 bg-muted animate-pulse rounded" />
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
