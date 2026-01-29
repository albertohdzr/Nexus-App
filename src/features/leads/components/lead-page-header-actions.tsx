"use client"

/**
 * Lead Page Header Actions
 * Componente cliente que registra las acciones del lead en el header global
 */

import { useMemo } from "react"
import { MessageSquare } from "lucide-react"
import { useHeaderActions } from "@/src/components/providers/header-actions-provider"
import { EditLeadButton } from "./edit-lead-button"
import type { LeadDetail } from "../types"

interface LeadPageHeaderActionsProps {
  lead: LeadDetail
}

export function LeadPageHeaderActions({ lead }: LeadPageHeaderActionsProps) {
  const config = useMemo(() => ({
    backButton: {
      href: "/crm/leads",
      label: "Leads",
    },
    actions: [
      // Ver Chat (solo si tiene chat asociado)
      ...(lead.wa_chat_id ? [{
        id: "view-chat",
        icon: MessageSquare,
        label: "Ver Chat",
        href: `/chat?chatId=${lead.wa_chat_id}`,
      }] : []),
      // Editar Lead
      {
        id: "edit-lead",
        component: <EditLeadButton lead={lead} />,
      },
    ],
  }), [lead])

  useHeaderActions(config)
  
  return null
}
