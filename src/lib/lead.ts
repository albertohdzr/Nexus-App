import type { LeadRecord } from "@/src/types/lead"

export const STATUS_STYLES: Record<string, string> = {
  new: "bg-sky-100 text-sky-800 border-transparent",
  contacted: "bg-amber-100 text-amber-800 border-transparent",
  qualified: "bg-emerald-100 text-emerald-800 border-transparent",
  visit_scheduled: "bg-indigo-100 text-indigo-800 border-transparent",
  visited: "bg-indigo-100 text-indigo-800 border-transparent",
  application_started: "bg-blue-100 text-blue-800 border-transparent",
  application_submitted: "bg-blue-100 text-blue-800 border-transparent",
  admitted: "bg-emerald-100 text-emerald-800 border-transparent",
  enrolled: "bg-emerald-100 text-emerald-900 border-transparent",
  lost: "bg-rose-100 text-rose-800 border-transparent",
}

export const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

export const formatRelativeDate = (value: string | null | undefined) => {
  if (!value) return "Sin actividad"
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()

  if (Number.isNaN(diffMs)) return "Sin actividad"

  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return "hace un momento"
  if (minutes < 60) return `hace ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 48) return `hace ${hours} h`

  const days = Math.round(hours / 24)
  return `hace ${days} d`
}

export const getSessions = (lead: LeadRecord) =>
  [...(lead.chat?.chat_sessions ?? [])].sort((a, b) => {
    const left =
      new Date(a.last_response_at || a.updated_at || a.created_at || 0).getTime()
    const right =
      new Date(b.last_response_at || b.updated_at || b.created_at || 0).getTime()
    return right - left
  })

export const getLeadSummary = (lead: LeadRecord) => {
  const sessions = getSessions(lead)
  const latest = sessions[0]
  if (latest?.summary) return latest.summary
  if (lead.ai_summary) return lead.ai_summary
  return "Aún no hay resumen del chat."
}

export const buildDefaultFollowUp = (lead: LeadRecord) => {
  const summary = getLeadSummary(lead)
  const grade = lead.grade_interest ? ` para ${lead.grade_interest}` : ""
  return `Hola ${
    lead.contact_first_name || "familia"
  },\n\nGracias por tu interés${
    grade || " en nuestras admisiones"
  }. Te comparto un breve resumen de lo que hemos visto hasta ahora:\n\n${summary}\n\nQuedo pendiente para agendar una llamada o visita si lo prefieres.\n\nSaludos,\nEquipo de admisiones`
}
