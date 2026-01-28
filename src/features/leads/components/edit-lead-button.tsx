"use client"

/**
 * Edit Lead Button - Client Component
 * Botón para abrir el sheet de edición del lead
 */

import { useState } from "react"
import { Edit } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { EditLeadSheet } from "./edit-lead-sheet"
import type { LeadDetail } from "../types"

interface EditLeadButtonProps {
  lead: LeadDetail
}

export function EditLeadButton({ lead }: EditLeadButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Edit className="size-4" />
        <span className="hidden sm:inline">Editar</span>
      </Button>
      <EditLeadSheet 
        lead={lead} 
        open={open} 
        onOpenChange={setOpen} 
      />
    </>
  )
}
