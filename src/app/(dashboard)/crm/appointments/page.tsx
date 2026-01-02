import { redirect } from "next/navigation"
import { createClient } from "@/src/lib/supabase/server"
import { AppointmentCalendar } from "@/src/components/crm/appointment-calendar"
import { AppointmentSettingsForm } from "@/src/components/crm/appointment-settings-form"
import { BlockDayForm } from "@/src/components/crm/block-day-form"
import { GenerateSlotsForm } from "@/src/components/crm/generate-slots-form"

const DEFAULT_SETTINGS = {
  slot_duration_minutes: 60,
  start_time: "08:00",
  end_time: "14:00",
  buffer_minutes: 0,
  allow_overbooking: false,
  timezone: "America/Mexico_City",
  days_of_week: [1, 2, 3, 4, 5],
}

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    redirect("/dashboard")
  }

  const startRange = new Date()
  startRange.setHours(0, 0, 0, 0)
  const endRange = new Date(startRange)
  endRange.setDate(endRange.getDate() + 14)
  endRange.setHours(23, 59, 59, 999)

  const startDateStr = startRange.toISOString().slice(0, 10)
  const endDateStr = endRange.toISOString().slice(0, 10)

  const [{ data: settings }, { data: slots }, { data: blackouts }] = await Promise.all([
    supabase
      .from("appointment_settings")
      .select(
        "slot_duration_minutes, start_time, end_time, buffer_minutes, allow_overbooking, timezone, days_of_week"
      )
      .eq("organization_id", profile.organization_id)
      .maybeSingle(),
    supabase
      .from("availability_slots")
      .select(
        "id, starts_at, ends_at, campus, max_appointments, appointments_count, is_active, is_blocked, block_reason, appointments(id, status, lead_id)"
      )
      .eq("organization_id", profile.organization_id)
      .gte("starts_at", startRange.toISOString())
      .lt("starts_at", endRange.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("appointment_blackouts")
      .select("id, date, start_time, end_time, reason")
      .eq("organization_id", profile.organization_id)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true }),
  ])

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Appointments & Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your availability, configure settings, and view the calendar.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AppointmentSettingsForm settings={settings || DEFAULT_SETTINGS} />
        <GenerateSlotsForm defaultStart={startDateStr} defaultEnd={endDateStr} />
        <BlockDayForm />
      </div>
      <AppointmentCalendar slots={slots || []} blackouts={blackouts || []} />
    </div>
  )
}
