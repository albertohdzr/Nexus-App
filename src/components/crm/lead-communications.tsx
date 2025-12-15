"use client"

import { useState } from "react"
import { ChevronDown, Mail, MessageSquare, Send } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"
import { formatRelativeDate, statusLabel } from "@/src/lib/lead"
import type { LeadChatSession, LeadMessage, LeadNote } from "@/src/types/lead"

type LeadCommunicationsProps = {
  sessions: LeadChatSession[]
  emails: LeadNote[]
}

export function LeadCommunications({ sessions, emails }: LeadCommunicationsProps) {
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Chats</h4>
        </div>
        {sessions.length ? (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isOpen = openSessionId === session.id
              return (
                <div key={session.id} className="rounded-lg border p-3 bg-muted/20">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-left"
                    onClick={() => setOpenSessionId(isOpen ? null : session.id)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {statusLabel(session.status || "activa")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeDate(session.updated_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.summary || "Sin resumen capturado."}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen ? "rotate-180" : ""
                      )}
                    />
                  </button>
                  {isOpen ? (
                    <div className="mt-3 space-y-2 rounded-md bg-background/60 border p-3">
                      {session.messages?.length ? (
                        session.messages.map((msg) => (
                          <MessageRow key={msg.id} message={msg} />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No hay mensajes en esta sesión.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay sesiones de chat.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Correos enviados</h4>
        </div>
        {emails.length ? (
          <div className="space-y-2">
            {emails.map((email) => (
              <div key={email.id} className="rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{email.subject || "Correo"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(email.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <Send className="h-3 w-3" />
                    Email
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                  {email.notes || "Sin cuerpo."}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aún no hay correos enviados.</p>
        )}
      </div>
    </div>
  )
}

function MessageRow({ message }: { message: LeadMessage }) {
  const directionLabel =
    message.direction === "inbound" ? "Cliente" : message.role === "agent" ? "Agente" : "Bot"
  return (
    <div className="rounded-md border bg-muted/10 p-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium">{directionLabel}</span>
        <span>{formatRelativeDate(message.created_at)}</span>
      </div>
      <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">
        {message.body || "Mensaje vacío"}
      </p>
    </div>
  )
}
