/**
 * Lead Profile Card - Server Component
 * Muestra información del estudiante y contacto
 */

import { Mail, Phone, MapPin, Globe, Languages } from "lucide-react"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { Separator } from "@/src/components/ui/separator"
import type { LeadDetail } from "../types"

interface LeadProfileCardProps {
  lead: LeadDetail
  cycleName?: string
  divisionLabel?: string
}

export function LeadProfileCard({
  lead,
  cycleName = "Sin ciclo",
  divisionLabel = "Sin división",
}: LeadProfileCardProps) {
  const initials = (lead.student_name || "NA").substring(0, 2).toUpperCase()

  const hasAddress =
    lead.address_street ||
    lead.address_city ||
    lead.address_state ||
    lead.address_country

  const fullAddress = [
    lead.address_street,
    lead.address_number ? `#${lead.address_number}` : null,
    lead.address_neighborhood,
    lead.address_city,
    lead.address_state,
    lead.address_postal_code ? `CP ${lead.address_postal_code}` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="space-y-6">
      {/* Student Section */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
          Estudiante
        </h3>
        <div className="flex items-start gap-4">
          <Avatar className="size-14 border-2 bg-primary/10">
            <AvatarFallback className="text-lg font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-lg">
              {lead.student_name || "Sin nombre"}
            </p>
            <p className="text-sm text-muted-foreground">
              ID: {lead.id.slice(0, 8)}...
            </p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Grado de Interés</p>
            <p className="text-sm font-medium">
              {lead.grade_interest || "No especificado"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Escuela Actual</p>
            <p className="text-sm font-medium">
              {lead.current_school || "No especificada"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Ciclo</p>
            <p className="text-sm font-medium">{cycleName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">División</p>
            <p className="text-sm font-medium">{divisionLabel}</p>
          </div>
        </div>

        {(lead.nationality || lead.native_language) && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {lead.nationality && (
                <div className="flex items-start gap-2">
                  <Globe className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Nacionalidad
                    </p>
                    <p className="text-sm font-medium">{lead.nationality}</p>
                  </div>
                </div>
              )}
              {lead.native_language && (
                <div className="flex items-start gap-2">
                  <Languages className="size-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Idiomas</p>
                    <p className="text-sm font-medium">
                      {lead.native_language}
                      {lead.secondary_language && `, ${lead.secondary_language}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Contact Section */}
      <section className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
          Contacto
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nombre</p>
            <p className="text-sm font-medium">
              {lead.contact_full_name || lead.contact_first_name || "Sin nombre"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            {lead.contact_email ? (
              <a
                href={`mailto:${lead.contact_email}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {lead.contact_email}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">Sin email</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            {lead.contact_phone ? (
              <a
                href={`tel:${lead.contact_phone}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {lead.contact_phone}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">Sin teléfono</span>
            )}
          </div>
        </div>
      </section>

      {/* Address Section */}
      {hasAddress && (
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
            Dirección
          </h3>
          <div className="flex items-start gap-2">
            <MapPin className="size-4 text-muted-foreground mt-0.5" />
            <p className="text-sm">{fullAddress || "Sin dirección completa"}</p>
          </div>
          {lead.address_country && (
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium">{lead.address_country}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
