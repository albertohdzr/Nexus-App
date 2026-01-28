/**
 * Lead Communications Card - Server Component
 * Muestra historial de comunicaciones (chats y emails)
 */

import { Mail, MessageSquare, Clock, User } from "lucide-react"
import { Badge } from "@/src/components/ui/badge"
import { formatRelativeDate, statusLabel } from "../lib/utils"
import type { ChatSessionWithMessages, LeadNote } from "../types"

interface LeadCommunicationsCardProps {
  sessions: ChatSessionWithMessages[]
  emails: LeadNote[]
}

export function LeadCommunicationsCard({
  sessions,
  emails,
}: LeadCommunicationsCardProps) {
  const totalChats = sessions.length
  const totalEmails = emails.length

  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <div className="p-5 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Comunicaciones</h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <MessageSquare className="size-3" />
              {totalChats}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Mail className="size-3" />
              {totalEmails}
            </Badge>
          </div>
        </div>
      </div>

      <div className="divide-y max-h-[400px] overflow-y-auto">
        {/* Chat Sessions */}
        {sessions.length > 0 && (
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sesiones de Chat
            </h4>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-3 rounded-lg border bg-muted/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-4 text-emerald-500" />
                    <span className="text-sm font-medium capitalize">
                      {statusLabel(session.status || "active")}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatRelativeDate(session.last_response_at || session.updated_at)}
                  </span>
                </div>
                {session.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {session.summary}
                  </p>
                )}
                {session.messages && session.messages.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {session.messages.length} mensaje
                    {session.messages.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Emails */}
        {emails.length > 0 && (
          <div className="p-4 space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Correos Enviados
            </h4>
            {emails.map((email) => (
              <div
                key={email.id}
                className="p-3 rounded-lg border bg-muted/20 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-blue-500" />
                    <span className="text-sm font-medium">
                      {email.subject || "Sin asunto"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(email.created_at)}
                  </span>
                </div>
                {email.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {email.notes}
                  </p>
                )}
                {email.created_by && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="size-3" />
                    {email.created_by}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && emails.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="size-6" />
            </div>
            <p className="text-sm font-medium">Sin comunicaciones</p>
            <p className="text-xs mt-1">
              No hay chats ni emails registrados para este lead.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
