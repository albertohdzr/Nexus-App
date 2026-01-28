"use client"

/**
 * Leads Table Filters - Client Component
 * Componente interactivo para filtrar leads
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { LEAD_STATUSES, STATUS_LABELS } from "../lib/constants"

interface LeadsTableFiltersProps {
  currentStatus?: string
  currentSearch?: string
}

export function LeadsTableFilters({
  currentStatus = "all",
  currentSearch = "",
}: LeadsTableFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Crear nueva URL con parámetros actualizados
  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === "all") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      // Resetear página al cambiar filtros
      if (!updates.hasOwnProperty("page")) {
        params.delete("page")
      }

      return params.toString()
    },
    [searchParams]
  )

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      const queryString = createQueryString({ search: value || null })
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
    })
  }

  const handleStatusChange = (status: string) => {
    startTransition(() => {
      const queryString = createQueryString({ status: status === "all" ? null : status })
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
    })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname)
    })
  }

  const hasActiveFilters = currentStatus !== "all" || currentSearch !== ""

  return (
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar leads..."
          defaultValue={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8 h-8 w-full sm:w-[250px] text-sm bg-muted/50 border-border/50"
          disabled={isPending}
        />
        {isPending && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 bg-muted/50 border-border/50"
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden xs:inline">Filtrar</span>
            {hasActiveFilters && (
              <span className="size-1.5 rounded-full bg-primary" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Status
            </p>
            <div className="space-y-1">
              <DropdownMenuCheckboxItem
                checked={currentStatus === "all"}
                onCheckedChange={() => handleStatusChange("all")}
              >
                Todos
              </DropdownMenuCheckboxItem>
              {LEAD_STATUSES.slice(0, 5).map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={currentStatus === status}
                  onCheckedChange={() => handleStatusChange(status)}
                >
                  {STATUS_LABELS[status] || status}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          </div>
          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <DropdownMenuItem onSelect={clearFilters}>
                  <X className="mr-2 size-3.5" />
                  Limpiar filtros
                </DropdownMenuItem>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
