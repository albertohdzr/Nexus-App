"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/src/lib/supabase/server"

type ActionState = {
  error?: string
  success?: string
}

const ALLOWED_ROLES = ["superadmin", "org_admin", "director", "admissions"]

async function getUserContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "No autenticado", supabase: null, profile: null }
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, organization_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { error: "No se encontró tu organización", supabase: null, profile: null }
  }

  if (!ALLOWED_ROLES.includes(profile.role)) {
    return { error: "No tienes permisos para administrar citas", supabase: null, profile: null }
  }

  return { supabase, profile }
}

export async function saveAppointmentSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getUserContext()
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error }
  }

  const slotDuration = Number(formData.get("slot_duration_minutes") || 60)
  const startTime = (formData.get("start_time") as string | null) || "08:00"
  const endTime = (formData.get("end_time") as string | null) || "14:00"
  const timezone = (formData.get("timezone") as string | null) || "America/Mexico_City"
  const bufferMinutes = Number(formData.get("buffer_minutes") || 0)
  const allowOverbooking = (formData.get("allow_overbooking") as string | null) === "on"
  const daysInput = formData.getAll("days_of_week")
  const daysOfWeek = daysInput.length
    ? daysInput.map((d) => Number(d)).filter((d) => !Number.isNaN(d))
    : [1, 2, 3, 4, 5]

  if (!slotDuration || slotDuration < 15) {
    return { error: "La duración mínima debe ser de 15 minutos" }
  }

  if (daysOfWeek.some((d) => d < 0 || d > 6)) {
    return { error: "Días de semana inválidos" }
  }

  const { error } = await ctx.supabase
    .from("appointment_settings")
    .upsert(
      {
        organization_id: ctx.profile.organization_id,
        slot_duration_minutes: slotDuration,
        start_time: startTime,
        end_time: endTime,
        timezone,
        buffer_minutes: bufferMinutes,
        allow_overbooking: allowOverbooking,
        days_of_week: daysOfWeek,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "organization_id",
      }
    )

  if (error) {
    console.error("saveAppointmentSettings error", error)
    return { error: "No se pudo guardar la configuración" }
  }

  revalidatePath("/crm/appointments")
  return { success: "Configuración actualizada" }
}

function parseTimeToMinutes(time: string) {
  const [h, m] = time.split(":").map((v) => Number(v))
  return h * 60 + (m || 0)
}

function addMinutes(date: Date, minutes: number) {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

type GenerateState = ActionState & { inserted?: number }

import { fromZonedTime, toZonedTime } from "date-fns-tz"

export async function generateSlots(
  _prevState: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  const ctx = await getUserContext()
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error }
  }

  const startDateStr = formData.get("start_date") as string | null
  const endDateStr = formData.get("end_date") as string | null
  const campus = (formData.get("campus") as string | null) || null

  if (!startDateStr || !endDateStr) {
    return { error: "Selecciona un rango de fechas" }
  }

  // We only check format, not logical validity in timezone yet
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      return { error: "Formato de fecha inválido" }
  }

  if (startDateStr > endDateStr) {
    return { error: "La fecha fin debe ser mayor o igual a la inicial" }
  }

  const { data: settings } = await ctx.supabase
    .from("appointment_settings")
    .select(
      "slot_duration_minutes, start_time, end_time, days_of_week, buffer_minutes, allow_overbooking, timezone"
    )
    .eq("organization_id", ctx.profile.organization_id)
    .single()

  const effectiveSettings = settings || {
    slot_duration_minutes: 60,
    start_time: "08:00",
    end_time: "14:00",
    days_of_week: [1, 2, 3, 4, 5],
    buffer_minutes: 0,
    allow_overbooking: false,
    timezone: "America/Mexico_City",
  }

  const timeZone = effectiveSettings.timezone || "America/Mexico_City"
  const duration = effectiveSettings.slot_duration_minutes || 60
  const bufferMinutes = effectiveSettings.buffer_minutes || 0
  const allowedDays = Array.isArray(effectiveSettings.days_of_week)
    ? effectiveSettings.days_of_week
    : [1, 2, 3, 4, 5]

  const startMinutes = parseTimeToMinutes(effectiveSettings.start_time || "08:00")
  const endMinutes = parseTimeToMinutes(effectiveSettings.end_time || "14:00")

  if (startMinutes >= endMinutes) {
    return { error: "La hora final debe ser mayor a la inicial" }
  }

  const { data: blackouts } = await ctx.supabase
    .from("appointment_blackouts")
    .select("date, start_time, end_time")
    .eq("organization_id", ctx.profile.organization_id)
    .gte("date", startDateStr)
    .lte("date", endDateStr)

  const blackoutMap = new Map<
    string,
    { start: number; end: number }[]
  >();

  (blackouts || []).forEach((b) => {
    const start = b.start_time ? parseTimeToMinutes(b.start_time) : 0
    const end = b.end_time ? parseTimeToMinutes(b.end_time) : 24 * 60
    blackoutMap.set(b.date, [...(blackoutMap.get(b.date) || []), { start, end }])
  })

  const slotsToInsert: Record<string, unknown>[] = []

  // Iterate day by day from startDate to endDate interpreting them in the target timezone
  // We constructs a Date that represents midnight *in the target timezone*
  // Then we iterate slots for that day.

  // Parse strings to create the loop range
  // Using simple string comparison/iteration or Date operations carefully
  let currentStr = startDateStr
  while (currentStr <= endDateStr) {
    // Construct midnight in the target timezone
    // e.g. "2023-10-27T00:00:00" combined with timeZone -> Absolute Date
    const dayStartZoned = fromZonedTime(`${currentStr} 00:00:00`, timeZone)
    
    // Check day of week (0-6)
    // We must check the day *in the target timezone*
    // fromZonedTime returns a Date (UTC moment). toZonedTime converts it back to context
    const zonedDate = toZonedTime(dayStartZoned, timeZone)
    const dayOfWeek = zonedDate.getDay() // 0 = Sunday

    if (allowedDays.includes(dayOfWeek)) {
       const dayBlackouts = blackoutMap.get(currentStr) || []
       
       // Generate slots for this day
       // Start at startTime minutes
       // Stop before endTime minutes
       
       let currentMinute = startMinutes
       while (currentMinute < endMinutes) {
         const slotEndMinute = currentMinute + duration
         if (slotEndMinute > endMinutes) break
         
         const totalBuffer = duration + bufferMinutes
         
         // Check overlap with blackouts
         const overlaps = dayBlackouts.some(
           (b) => currentMinute < b.end && slotEndMinute > b.start
         )
         
         if (!overlaps) {
           // Construct absolute start/end times
           // We have the day (currentStr) and the minute offset
           const slotStartHour = Math.floor(currentMinute / 60)
           const slotStartMin = currentMinute % 60
           const slotEndHour = Math.floor(slotEndMinute / 60)
           const slotEndMin = slotEndMinute % 60
           
           const paddedStart = `${String(slotStartHour).padStart(2,'0')}:${String(slotStartMin).padStart(2,'0')}:00`
           const paddedEnd = `${String(slotEndHour).padStart(2,'0')}:${String(slotEndMin).padStart(2,'0')}:00`
           
           const startAbsolute = fromZonedTime(`${currentStr} ${paddedStart}`, timeZone)
           const endAbsolute = fromZonedTime(`${currentStr} ${paddedEnd}`, timeZone)
           
           slotsToInsert.push({
             organization_id: ctx.profile.organization_id,
             starts_at: startAbsolute.toISOString(),
             ends_at: endAbsolute.toISOString(),
             campus,
             max_appointments: 1,
             is_active: true,
             is_blocked: false,
             appointments_count: 0,
             updated_at: new Date().toISOString(),
           })
         }
         
         // Advance
         currentMinute += totalBuffer
       }
    }

    // Advance to next day properly
    const nextDay = new Date(dayStartZoned)
    nextDay.setDate(nextDay.getDate() + 1)
    // Convert back to YYYY-MM-DD string to continue loop
    // Use the *target timezone* to extract the date string to ensure we just move 1 day forward in calendar
    const nextDayZoned = toZonedTime(nextDay, timeZone)
    const y = nextDayZoned.getFullYear()
    const m = String(nextDayZoned.getMonth() + 1).padStart(2,'0')
    const d = String(nextDayZoned.getDate()).padStart(2,'0')
    currentStr = `${y}-${m}-${d}`
  }

  if (!slotsToInsert.length) {
    return { error: "No se generaron slots para ese rango" }
  }

  const { error, count } = await ctx.supabase
    .from("availability_slots")
    .upsert(slotsToInsert, {
      onConflict: "organization_id,starts_at,ends_at",
      ignoreDuplicates: true,
      count: "exact",
    })

  if (error) {
    console.error("generateSlots error", error)
    return { error: "No se pudieron generar los slots" }
  }

  revalidatePath("/crm/appointments")
  return { success: "Disponibilidad generada", inserted: count || slotsToInsert.length }
}

export async function blockSlot(formData: FormData): Promise<ActionState> {
  const ctx = await getUserContext()
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error }
  }

  const slotId = formData.get("slot_id") as string | null
  const reason = (formData.get("reason") as string | null) || "Bloqueado manualmente"

  if (!slotId) {
    return { error: "Falta el slot a bloquear" }
  }

  const { error } = await ctx.supabase
    .from("availability_slots")
    .update({
      is_blocked: true,
      is_active: false,
      block_reason: reason,
      blocked_by_profile_id: ctx.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId)
    .eq("organization_id", ctx.profile.organization_id)

  if (error) {
    console.error("blockSlot error", error)
    return { error: "No se pudo bloquear el slot" }
  }

  revalidatePath("/crm/appointments")
  return { success: "Slot bloqueado" }
}

export async function unblockSlot(formData: FormData): Promise<ActionState> {
  const ctx = await getUserContext()
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error }
  }

  const slotId = formData.get("slot_id") as string | null
  if (!slotId) {
    return { error: "Falta el slot a desbloquear" }
  }

  const { error } = await ctx.supabase
    .from("availability_slots")
    .update({
      is_blocked: false,
      is_active: true,
      block_reason: null,
      blocked_by_profile_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId)
    .eq("organization_id", ctx.profile.organization_id)

  if (error) {
    console.error("unblockSlot error", error)
    return { error: "No se pudo desbloquear el slot" }
  }

  revalidatePath("/crm/appointments")
  return { success: "Slot desbloqueado" }
}

export async function blockDay(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ctx = await getUserContext()
  if (!ctx.supabase || !ctx.profile) {
    return { error: ctx.error }
  }

  const dateStr = formData.get("date") as string | null
  const reason = (formData.get("reason") as string | null) || "Bloqueo manual"

  if (!dateStr) {
    return { error: "Selecciona un día para bloquear" }
  }

  const dayStart = new Date(`${dateStr}T00:00:00`)
  const nextDay = new Date(dayStart)
  nextDay.setDate(nextDay.getDate() + 1)

  const { error: blackoutError } = await ctx.supabase
    .from("appointment_blackouts")
    .upsert(
      {
        organization_id: ctx.profile.organization_id,
        date: dateStr,
        start_time: "00:00",
        end_time: "23:59:59",
        reason,
        created_by_profile_id: ctx.profile.id,
      },
      { onConflict: "organization_id,date,start_time,end_time" }
    )

  if (blackoutError) {
    console.error("blockDay blackout insert error", blackoutError)
    return { error: "No se pudo guardar el bloqueo" }
  }

  const { error } = await ctx.supabase
    .from("availability_slots")
    .update({
      is_blocked: true,
      is_active: false,
      block_reason: reason,
      blocked_by_profile_id: ctx.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", ctx.profile.organization_id)
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", nextDay.toISOString())

  if (error) {
    console.error("blockDay slot update error", error)
    return { error: "Se registró el bloqueo pero no se pudieron actualizar los slots" }
  }

  revalidatePath("/crm/appointments")
  return { success: "Día bloqueado" }
}
