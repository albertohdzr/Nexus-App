"use client"

import { useActionState, useMemo, useState, type ComponentProps } from "react"
import { Pencil } from "lucide-react"
import { Separator } from "@/src/components/ui/separator"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/src/components/ui/sheet"
import { cn } from "@/src/lib/utils"
import { Country, State, City } from "country-state-city"
import { LEAD_STATUSES, statusLabel } from "@/src/lib/lead"
import { LANGUAGE_OPTIONS, LEAD_DIVISIONS } from "@/src/lib/lead-options"
import type { LeadRecord } from "@/src/types/lead"
import type { AdmissionCycle } from "@/src/types/admission"
import type { UpdateLeadAction, UpdateLeadActionState } from "@/src/app/(dashboard)/crm/leads/actions"

type LeadEditButtonProps = {
  lead: LeadRecord
  updateLeadAction: UpdateLeadAction
  cycles?: AdmissionCycle[]
  className?: string
  triggerLabel?: string
  triggerVariant?: ComponentProps<typeof Button>["variant"]
  triggerSize?: ComponentProps<typeof Button>["size"]
}

export function LeadEditButton({
  lead,
  updateLeadAction,
  cycles = [],
  className,
  triggerLabel,
  triggerVariant,
  triggerSize,
}: LeadEditButtonProps) {
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
        (state) => state.name === lead.address_state
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

  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<UpdateLeadActionState, FormData>(
    updateLeadAction,
    {}
  )
  const currentStatus = useMemo(
    () => (LEAD_STATUSES.includes(lead.status) ? lead.status : "new"),
    [lead.status]
  )
  const [statusValue, setStatusValue] = useState(currentStatus)
  const [cycleId, setCycleId] = useState<string | null>(lead.cycle_id ?? null)
  const [cycleValue, setCycleValue] = useState<string>(cycleId ?? "none")
  const [divisionValue, setDivisionValue] = useState<string>(lead.division ?? "none")
  const [countryValue, setCountryValue] = useState<string>(initialCountryCode)
  const [stateValue, setStateValue] = useState<string>(initialStateCode)
  const [cityValue, setCityValue] = useState<string>(initialCityName)
  const [nativeLanguageValue, setNativeLanguageValue] = useState<string>(
    lead.native_language ?? "none"
  )
  const [secondaryLanguageValue, setSecondaryLanguageValue] = useState<string>(
    lead.secondary_language ?? "none"
  )

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
      : stateOptions.find((state) => state.isoCode === stateValue)?.name || ""
  const selectedCityName = cityValue === "none" ? "" : cityValue

  const withCurrent = (options: string[], current: string) => {
    if (!current || current === "none") return options
    if (options.includes(current)) return options
    return [current, ...options]
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant={triggerVariant ?? "outline"}
          size={triggerSize ?? "sm"}
          className={cn("gap-2", className)}
        >
          <Pencil className="h-4 w-4" />
          {triggerLabel ?? "Editar lead"}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-2xl overflow-y-auto w-full p-0">
        <div className="p-6 pb-0">
            <SheetHeader className="mb-4">
            <SheetTitle>Editar Información del Lead</SheetTitle>
            </SheetHeader>
        </div>
        
        <form
          action={formAction}
          className="flex flex-col gap-6 p-6 pt-0"
          onSubmit={() => setOpen(true)}
        >
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="status" value={statusValue} />
          <input type="hidden" name="cycle_id" value={cycleId || ""} />
          <input type="hidden" name="division" value={divisionValue === "none" ? "" : divisionValue} />
          <input type="hidden" name="address_country" value={selectedCountryName} />
          <input type="hidden" name="address_state" value={selectedStateName} />
          <input type="hidden" name="address_city" value={selectedCityName} />
          <input type="hidden" name="native_language" value={nativeLanguageValue === "none" ? "" : nativeLanguageValue} />
          <input type="hidden" name="secondary_language" value={secondaryLanguageValue === "none" ? "" : secondaryLanguageValue} />

          {/* Student Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Estudiante</h3>
                <Separator className="flex-1" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium">Nombre(s)</label>
                <Input
                    name="student_first_name"
                    defaultValue={lead.student_first_name || lead.student_name || ""}
                    placeholder="Ej. Juan"
                    required
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Segundo nombre</label>
                <Input
                    name="student_middle_name"
                    defaultValue={lead.student_middle_name || ""}
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Apellido Paterno</label>
                <Input
                    name="student_last_name_paternal"
                    defaultValue={lead.student_last_name_paternal || ""}
                    placeholder="Ej. Pérez"
                    required
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Apellido Materno</label>
                <Input
                    name="student_last_name_maternal"
                    defaultValue={lead.student_last_name_maternal || ""}
                />
                </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contacto Principal</h3>
                <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium">Nombre(s)</label>
                <Input
                    name="contact_first_name"
                    defaultValue={lead.contact_first_name || lead.contact_full_name || ""}
                    required
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Segundo nombre</label>
                <Input
                    name="contact_middle_name"
                    defaultValue={lead.contact_middle_name || ""}
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Apellido Paterno</label>
                <Input
                    name="contact_last_name_paternal"
                    defaultValue={lead.contact_last_name_paternal || ""}
                    required
                />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Apellido Materno</label>
                <Input
                    name="contact_last_name_maternal"
                    defaultValue={lead.contact_last_name_maternal || ""}
                />
                </div>
                 <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Correo Electrónico</label>
                    <Input name="contact_email" type="email" defaultValue={lead.contact_email || ""} placeholder="correo@ejemplo.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Teléfono / WhatsApp</label>
                    <Input name="contact_phone" defaultValue={lead.contact_phone || ""} placeholder="52..." />
                </div>
            </div>
          </div>

          {/* Admissions Info */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Admisiones e Interés</h3>
                <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium">Grado de interés</label>
                <Input name="grade_interest" defaultValue={lead.grade_interest || ""} required />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Escuela anterior / actual</label>
                <Input name="current_school" defaultValue={lead.current_school || ""} />
                </div>
                 <div className="space-y-2">
                <label className="text-sm font-medium">Ciclo escolar (texto)</label>
                <Input name="school_year" defaultValue={lead.school_year || ""} />
                </div>
                <div className="space-y-2">
                <label className="text-sm font-medium">Ciclo de Admisión</label>
                <Select
                    value={cycleValue}
                    onValueChange={(val) => {
                    setCycleValue(val)
                    setCycleId(val === "none" ? null : val)
                    }}
                >
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
                <div className="space-y-2">
                <label className="text-sm font-medium">Division</label>
                <Select
                  value={divisionValue}
                  onValueChange={setDivisionValue}
                >
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
                 <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Estado del Lead</label>
                <Select value={statusValue} onValueChange={setStatusValue}>
                    <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                    {LEAD_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="capitalize">
                        {statusLabel(status)}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Perfil y Direccion</h3>
                <Separator className="flex-1" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pais</label>
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
                  <label className="text-sm font-medium">Estado</label>
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
                  <label className="text-sm font-medium">Ciudad</label>
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
                  <label className="text-sm font-medium">Codigo postal</label>
                  <Input name="address_postal_code" defaultValue={lead.address_postal_code || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Calle</label>
                  <Input name="address_street" defaultValue={lead.address_street || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Numero</label>
                  <Input name="address_number" defaultValue={lead.address_number || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Colonia</label>
                  <Input name="address_neighborhood" defaultValue={lead.address_neighborhood || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nacionalidad</label>
                  <Input name="nationality" defaultValue={lead.nationality || ""} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Idioma nativo</label>
                  <Select
                    value={nativeLanguageValue}
                    onValueChange={setNativeLanguageValue}
                  >
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
                  <label className="text-sm font-medium">Segundo idioma</label>
                  <Select
                    value={secondaryLanguageValue}
                    onValueChange={setSecondaryLanguageValue}
                  >
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

          {state.error ? (
            <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-emerald-600 font-medium bg-emerald-50 p-3 rounded-md">{state.success}</p>
          ) : null}

          <div className="sticky bottom-0 pt-4 bg-background mt-2">
             <Button type="submit" disabled={pending} className="w-full h-11 text-base">
                {pending ? "Guardando cambios..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
