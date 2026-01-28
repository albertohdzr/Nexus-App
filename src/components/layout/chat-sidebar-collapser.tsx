"use client"

import { useEffect, useRef } from "react"
import { useSidebar } from "@/src/components/ui/sidebar"

export function ChatSidebarCollapser() {
  const { open, setOpen } = useSidebar()
  const initialOpen = useRef(open)
  const didCollapse = useRef(false)
  const userExpanded = useRef(false)

  useEffect(() => {
    if (!didCollapse.current && open) {
      didCollapse.current = true
      setOpen(false)
    }
  }, [open, setOpen])

  useEffect(() => {
    if (didCollapse.current && open) {
      userExpanded.current = true
    }
  }, [open])

  useEffect(() => {
    const wasInitiallyOpen = initialOpen.current
    const didUserExpand = userExpanded.current
    return () => {
      if (wasInitiallyOpen && !didUserExpand) {
        setOpen(true)
      }
    }
  }, [setOpen])

  return null
}
