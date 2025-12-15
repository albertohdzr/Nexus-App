"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/src/lib/supabase/server"

export type CycleActionState = {
  success?: string
  error?: string
}

export const createCycleAction = async (
  _prevState: CycleActionState,
  formData: FormData
): Promise<CycleActionState> => {
  try {
    const name = (formData.get("name") as string | null)?.trim() || ""
    const startDate = (formData.get("start_date") as string | null) || null
    const endDate = (formData.get("end_date") as string | null) || null
    const registrationFeeRaw = (formData.get("registration_fee") as string | null) || "0"
    const isActive = formData.get("is_active") === "on"

    if (!name) {
      return { error: "El nombre del ciclo es obligatorio." }
    }

    const registrationFee = Number.parseFloat(registrationFeeRaw)
    if (Number.isNaN(registrationFee)) {
      return { error: "La cuota de inscripción debe ser un número." }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Inicia sesión para crear ciclos." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      console.error("Error fetching profile for cycle creation", profileError)
      return { error: "No se pudo validar tu organización." }
    }

    const { error } = await supabase.from("admission_cycles").insert({
      organization_id: profile.organization_id,
      name,
      start_date: startDate || null,
      end_date: endDate || null,
      registration_fee: registrationFee,
      is_active: isActive,
    })

    if (error) {
      console.error("Error inserting admission cycle", error)
      return { error: "No se pudo crear el ciclo." }
    }

    revalidatePath("/admissions/cycles")
    return { success: "Ciclo creado." }
  } catch (err) {
    console.error("createCycleAction error", err)
    return { error: "No se pudo crear el ciclo." }
  }
}
