"use client"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet"
import { AiLog } from "./actions"
import { Badge } from "@/src/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface LogDetailsSheetProps {
  log: AiLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogDetailsSheet({ log, open, onOpenChange }: LogDetailsSheetProps) {
  if (!log) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalles del Evento
            <Badge variant="outline">{log.event_type}</Badge>
          </SheetTitle>
          <SheetDescription>
            {format(new Date(log.created_at), "PPPP pp", { locale: es })}
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
             <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">ID</h4>
                <p className="text-sm font-mono bg-muted p-2 rounded">{log.id}</p>
             </div>
             <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Conversation ID</h4>
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">{log.conversation_id || "N/A"}</p>
             </div>
             <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Chat ID</h4>
                <p className="text-sm font-mono bg-muted p-2 rounded break-all">{log.chat_id || "N/A"}</p>
             </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Payload Completo</h4>
            <div className="bg-muted p-4 rounded-md overflow-x-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words text-wrap">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
