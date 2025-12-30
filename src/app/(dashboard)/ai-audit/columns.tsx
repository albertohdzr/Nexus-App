"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AiLog } from "./actions"
import { Badge } from "@/src/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/src/components/ui/button"
import { IconDotsVertical, IconEye } from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"

export const columns: ColumnDef<AiLog>[] = [
  {
    accessorKey: "created_at",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {format(date, "d MMM yyyy", { locale: es })}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(date, "HH:mm:ss", { locale: es })}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "event_type",
    header: "Evento",
    cell: ({ row }) => {
      const type = row.getValue("event_type") as string
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
      let className = ""

      switch (type) {
        case "openai_request":
          variant = "secondary"
          className = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          break
        case "openai_response":
          variant = "default"
          className = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-100"
          break
        case "tool_call":
          variant = "outline"
          className = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
          break
        case "tool_output":
           variant = "outline"
           className = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
           break
        default:
          variant = "outline"
      }

      return <Badge variant={variant} className={className}>{type}</Badge>
    },
  },
  {
    accessorKey: "payload",
    header: "Resumen",
    cell: ({ row }) => {
      const type = row.original.event_type
      const payload = row.original.payload as any
      
      let summary = ""

      if (type === "openai_request") {
        summary = `Input: "${payload?.input?.substring(0, 50)}${payload?.input?.length > 50 ? "..." : ""}"`
      } else if (type === "openai_response") {
        if (payload?.answer) {
             summary = `AI: "${payload.answer.substring(0, 50)}..."`
        } else if (payload?.output_text) {
             summary = `AI: "${payload.output_text.substring(0, 50)}..."`
        } else if (payload?.function_calls) {
             summary = `Calls: ${payload.function_calls.map((c: any) => c.name).join(", ")}`
        }
      } else if (type === "tool_call") {
         summary = `Call: ${payload?.name} (${JSON.stringify(payload?.args || {}).substring(0, 30)}...)`
      } else if (type === "tool_output") {
         summary = `Output: ${payload?.name} -> ${JSON.stringify(payload?.output || {}).substring(0, 30)}...`
      }

      return <span className="text-sm text-muted-foreground truncate block max-w-[300px]" title={JSON.stringify(payload)}>{summary || JSON.stringify(payload).substring(0, 50)}</span>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const log = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <IconDotsVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2))}
            >
              Copiar Payload
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(log.id)}
            >
              Copiar ID
            </DropdownMenuItem>
             <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(log.conversation_id || "")}
            >
              Copiar Conversation ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
