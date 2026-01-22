import type { LeadRecord } from "@/src/types/lead"

export type LeadTask = {
  id: string
  title: string
  description: string
  actionLabel: string
}

const isBlank = (value?: string | null) => !value || !value.trim()

export const getLeadTasks = (lead: LeadRecord) => {
  if (lead.status?.toLowerCase() === "disqualified") return []

  const tasks: LeadTask[] = []

  const missingContact: string[] = []
  const missingContactName =
    isBlank(lead.contact_first_name) || isBlank(lead.contact_last_name_paternal)

  if (missingContactName) missingContact.push("nombre")
  if (isBlank(lead.contact_email)) missingContact.push("correo")
  if (isBlank(lead.contact_phone)) missingContact.push("telefono")

  if (missingContact.length > 0) {
    const noContact =
      isBlank(lead.contact_first_name) &&
      isBlank(lead.contact_last_name_paternal) &&
      isBlank(lead.contact_email) &&
      isBlank(lead.contact_phone)

    tasks.push({
      id: "contact",
      title: noContact ? "Agregar contacto" : "Actualizar contacto",
      description: noContact
        ? "No hay informacion de contacto registrada."
        : `Falta ${missingContact.join(", ")} del contacto.`,
      actionLabel: noContact ? "Completar contacto" : "Actualizar contacto",
    })
  }

  if (!lead.cycle_id) {
    tasks.push({
      id: "cycle",
      title: "Asignar ciclo de admision",
      description: "El lead no tiene un ciclo asociado.",
      actionLabel: "Actualizar ciclo",
    })
  }

  if (isBlank(lead.division)) {
    tasks.push({
      id: "division",
      title: "Asignar division academica",
      description: "Selecciona la division correspondiente.",
      actionLabel: "Asignar division",
    })
  }

  const missingProfile: string[] = []
  if (isBlank(lead.address_street)) missingProfile.push("calle")
  if (isBlank(lead.address_number)) missingProfile.push("numero")
  if (isBlank(lead.address_neighborhood)) missingProfile.push("colonia")
  if (isBlank(lead.address_postal_code)) missingProfile.push("codigo postal")
  if (isBlank(lead.address_city)) missingProfile.push("ciudad")
  if (isBlank(lead.address_state)) missingProfile.push("estado")
  if (isBlank(lead.address_country)) missingProfile.push("pais")
  if (isBlank(lead.nationality)) missingProfile.push("nacionalidad")
  if (isBlank(lead.native_language)) missingProfile.push("idioma nativo")
  if (isBlank(lead.secondary_language)) missingProfile.push("segundo idioma")

  if (missingProfile.length > 0) {
    tasks.push({
      id: "profile",
      title: "Completar perfil del lead",
      description: `Falta ${missingProfile.join(", ")}.`,
      actionLabel: "Completar perfil",
    })
  }

  return tasks
}
