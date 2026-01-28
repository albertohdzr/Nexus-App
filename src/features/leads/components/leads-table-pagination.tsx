"use client"

/**
 * Leads Table Pagination - Client Component
 * Componente interactivo para paginación
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useTransition } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { Button } from "@/src/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "../lib/constants"

interface LeadsTablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
}

export function LeadsTablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: LeadsTablePaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      return params.toString()
    },
    [searchParams]
  )

  const handlePageChange = (page: number) => {
    startTransition(() => {
      const queryString = createQueryString({
        page: page === 1 ? null : page.toString(),
      })
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
    })
  }

  const handlePageSizeChange = (newPageSize: string) => {
    startTransition(() => {
      const queryString = createQueryString({
        pageSize: newPageSize === DEFAULT_PAGE_SIZE.toString() ? null : newPageSize,
        page: null, // Reset page when changing page size
      })
      router.push(`${pathname}${queryString ? `?${queryString}` : ""}`)
    })
  }

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Mostrando {startItem} a {endItem} de {totalItems} leads
        </span>
        <div className="h-4 w-px bg-border hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Mostrar</span>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
            disabled={isPending}
          >
            <SelectTrigger className="h-8 w-[70px] bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="hidden sm:inline">por página</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1 || isPending}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || isPending}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-1 mx-2">
          <span className="text-sm">
            Página {currentPage} de {Math.max(1, totalPages)}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0 || isPending}
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0 || isPending}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
