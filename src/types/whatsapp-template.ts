export type WhatsAppTemplate = {
  id: string
  organization_id: string
  external_id?: string | null
  name: string
  language: string
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION" | string
  status: string
  parameter_format: "positional" | "named" | string
  components: Array<Record<string, unknown>>
  quality_score?: string | null
  last_meta_event?: Record<string, unknown> | null
  meta_updated_at?: string | null
  created_at?: string
  updated_at?: string
}
