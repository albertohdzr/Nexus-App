export type AdmissionCycle = {
  id: string
  organization_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  registration_fee: number | null
  created_at?: string
  updated_at?: string
}
