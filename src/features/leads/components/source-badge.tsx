/**
 * SourceBadge Component - Server Component
 * Muestra la fuente de un lead con estilos e íconos
 */

import { Search, Globe, Users2, Linkedin } from "lucide-react"

interface SourceBadgeProps {
  source: string
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const s = source?.toLowerCase() || "direct"

  if (s.includes("linkedin")) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-blue-500/10">
        <Linkedin className="size-3 text-blue-400" />
        <span className="text-xs font-medium text-blue-400">LinkedIn</span>
      </div>
    )
  }

  if (s.includes("google")) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-red-500/10">
        <Search className="size-3 text-red-400" />
        <span className="text-xs font-medium text-red-400">Google</span>
      </div>
    )
  }

  if (s.includes("referral")) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-violet-500/10">
        <Users2 className="size-3 text-violet-400" />
        <span className="text-xs font-medium text-violet-400">Referral</span>
      </div>
    )
  }

  if (s.includes("website")) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-cyan-500/10">
        <Globe className="size-3 text-cyan-400" />
        <span className="text-xs font-medium text-cyan-400">Website</span>
      </div>
    )
  }

  if (s.includes("whatsapp")) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-green-500/10">
        <span className="text-xs font-medium text-green-400">WhatsApp</span>
      </div>
    )
  }

  // Default
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md w-fit bg-muted/50">
      <span className="text-xs font-medium text-muted-foreground capitalize">
        {s}
      </span>
    </div>
  )
}
