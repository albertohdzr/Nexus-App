"use client"

import { useActionState, useMemo, useState } from "react"
import { Country, State, City } from "country-state-city"
import { Button } from "@/src/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Separator } from "@/src/components/ui/separator"
import { cn } from "@/src/lib/utils"
import { LANGUAGE_OPTIONS, LEAD_DIVISIONS } from "@/src/lib/lead-options"
import type { LeadRecord } from "@/src/types/lead"
import type { AdmissionCycle } from "@/src/types/admission"
import type { UpdateLeadActionState, UpdateLeadTaskAction } from "@/src/app/(dashboard)/crm/leads/actions"

type LeadTaskModalProps = {
  lead: LeadRecord
  taskId: string
  title: string
  description: string
  actionLabel: string
  cycles: AdmissionCycle[]
  updateLeadTaskAction: UpdateLeadTaskAction
  className?: string
}

const taskTitles: Record<string, string> = {
  contact: "Contacto principal",
  cycle: "Ciclo de admision",
  division: "Division academica",
  profile: "Perfil del lead",
}

export function LeadTaskModal({
  lead,
  taskId,
  title,
  description,
  actionLabel,
  cycles,
  updateLeadTaskAction,
  className,
}: LeadTaskModalProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<UpdateLeadActionState, FormData>(
    updateLeadTaskAction,
    {}
  )

  const countries = useMemo(() => {
    return Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name))
  }, [])
  const initialCountryCode = useMemo(() => {
    if (!lead.address_country) return "none"
    return countries.find((country) => country.name === lead.address_country)?.isoCode || "none"
  }, [countries, lead.address_country])
  const initialStateCode = useMemo(() => {
    if (!lead.address_state || initialCountryCode === "none") return "none"
    return (
      State.getStatesOfCountry(initialCountryCode).find(
        (stateItem) => stateItem.name === lead.address_state
      )?.isoCode || "none"
    )
  }, [initialCountryCode, lead.address_state])
  const initialCityName = useMemo(() => {
    if (!lead.address_city || initialCountryCode === "none" || initialStateCode === "none") {
      return "none"
    }
    const cities = City.getCitiesOfState(initialCountryCode, initialStateCode)
    return cities.find((city) => city.name === lead.address_city)?.name || "none"
  }, [initialCountryCode, initialStateCode, lead.address_city])

  const [countryValue, setCountryValue] = useState<string>(initialCountryCode)
  const [stateValue, setStateValue] = useState<string>(initialStateCode)
  const [cityValue, setCityValue] = useState<string>(initialCityName)
  const [nativeLanguageValue, setNativeLanguageValue] = useState<string>(
    lead.native_language ?? "none"
  )
  const [secondaryLanguageValue, setSecondaryLanguageValue] = useState<string>(
    lead.secondary_language ?? "none"
  )
  const [cycleValue, setCycleValue] = useState<string>(lead.cycle_id ?? "none")
  const [divisionValue, setDivisionValue] = useState<string>(lead.division ?? "none")

  const stateOptions = useMemo(() => {
    if (!countryValue || countryValue === "none") return []
    return State.getStatesOfCountry(countryValue).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [countryValue])

  const cityOptions = useMemo(() => {
    if (!countryValue || countryValue === "none" || !stateValue || stateValue === "none") {
      return []
    }
    return City.getCitiesOfState(countryValue, stateValue).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }, [countryValue, stateValue])

  const selectedCountryName =
    countryValue === "none"
      ? ""
      : countries.find((country) => country.isoCode === countryValue)?.name || ""
  const selectedStateName =
    stateValue === "none"
      ? ""
      : stateOptions.find((stateItem) => stateItem.isoCode === stateValue)?.name || ""
  const selectedCityName = cityValue === "none" ? "" : cityValue

  const withCurrent = (options: string[], current: string) => {
    if (!current || current === "none") return options
    if (options.includes(current)) return options
    return [current, ...options]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-center", className)}>
          {actionLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{taskTitles[taskId] || title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </DialogHeader>
        <form
          action={formAction}
          className="space-y-4"
          onSubmit={() => setOpen(true)}
        >
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="address_country" value={selectedCountryName} />
          <input type="hidden" name="address_state" value={selectedStateName} />
          <input type="hidden" name="address_city" value={selectedCityName} />
          <input type="hidden" name="native_language" value={nativeLanguageValue === "none" ? "" : nativeLanguageValue} />
          <input type="hidden" name="secondary_language" value={secondaryLanguageValue === "none" ? "" : secondaryLanguageValue} />
          <input type="hidden" name="cycle_id" value={cycleValue === "none" ? "" : cycleValue} />
          <input type="hidden" name="division" value={divisionValue === "none" ? "" : divisionValue} />

          {taskId === "contact" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</label>
                  <Input name="contact_first_name" defaultValue={lead.contact_first_name || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segundo nombre</label>
                  <Input name="contact_middle_name" defaultValue={lead.contact_middle_name || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apellido paterno</label>
                  <Input name="contact_last_name_paternal" defaultValue={lead.contact_last_name_paternal || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apellido materno</label>
                  <Input name="contact_last_name_maternal" defaultValue={lead.contact_last_name_maternal || ""} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo</label>
                <Input name="contact_email" type="email" defaultValue={lead.contact_email || ""} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telefono</label>
                <Input name="contact_phone" defaultValue={lead.contact_phone || ""} />
              </div>
            </div>
          ) : null}

          {taskId === "cycle" ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciclo de admision</label>
              <Select value={cycleValue} onValueChange={setCycleValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin ciclo</SelectItem>
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {taskId === "division" ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Division</label>
              <Select value={divisionValue} onValueChange={setDivisionValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin division</SelectItem>
                  {LEAD_DIVISIONS.map((division) => (
                    <SelectItem key={division.value} value={division.value}>
                      {division.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {taskId === "profile" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pais</label>
                  <Select
                    value={countryValue}
                    onValueChange={(val) => {
                      setCountryValue(val)
                      setStateValue("none")
                      setCityValue("none")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona pais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin pais</SelectItem>
                      {countries.map((country) => (
                        <SelectItem key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</label>
                  <Select
                    value={stateValue}
                    onValueChange={(val) => {
                      setStateValue(val)
                      setCityValue("none")
                    }}
                    disabled={countryValue === "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin estado</SelectItem>
                      {stateOptions.map((stateItem) => (
                        <SelectItem key={stateItem.isoCode} value={stateItem.isoCode}>
                          {stateItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ciudad</label>
                  <Select
                    value={cityValue}
                    onValueChange={setCityValue}
                    disabled={stateValue === "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin ciudad</SelectItem>
                      {cityOptions.map((cityItem) => (
                        <SelectItem key={cityItem.name} value={cityItem.name}>
                          {cityItem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Codigo postal</label>
                  <Input name="address_postal_code" defaultValue={lead.address_postal_code || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Calle</label>
                  <Input name="address_street" defaultValue={lead.address_street || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Numero</label>
                  <Input name="address_number" defaultValue={lead.address_number || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colonia</label>
                  <Input name="address_neighborhood" defaultValue={lead.address_neighborhood || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nacionalidad</label>
                  <Input name="nationality" defaultValue={lead.nationality || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Idioma nativo</label>
                  <Select value={nativeLanguageValue} onValueChange={setNativeLanguageValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin idioma</SelectItem>
                      {withCurrent(LANGUAGE_OPTIONS, nativeLanguageValue).map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segundo idioma</label>
                  <Select value={secondaryLanguageValue} onValueChange={setSecondaryLanguageValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin segundo idioma</SelectItem>
                      {withCurrent(LANGUAGE_OPTIONS, secondaryLanguageValue).map((language) => (
                        <SelectItem key={language} value={language}>
                          {language}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}

          {state.error ? (
            <p className="text-xs text-destructive">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-xs text-emerald-600">{state.success}</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
