import { redirect } from "next/navigation"
import { createClient } from "@/src/lib/supabase/server"
import { CyclesPanel } from "@/src/components/admissions/cycles-panel"
import { createCycleAction } from "./actions"
import type { AdmissionCycle } from "@/src/types/admission"

export default async function AdmissionCyclesPage() {
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

  const { data: cycles, error } = await supabase
    .from("admission_cycles")
    .select("id, organization_id, name, start_date, end_date, is_active, registration_fee")
    .eq("organization_id", profile.organization_id)
    .order("start_date", { ascending: false })

  if (error) {
    console.error("Error fetching admission cycles", error)
  }

  return (
    <div className="flex flex-col gap-6">
      <CyclesPanel cycles={(cycles ?? []) as AdmissionCycle[]} createAction={createCycleAction} />
    </div>
  )
}
