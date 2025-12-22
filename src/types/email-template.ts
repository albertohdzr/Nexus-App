export type EmailTemplateBase = {
  id: string
  organization_id: string
  logo_url: string | null
  header_html: string | null
  footer_html: string | null
  created_at?: string
  updated_at?: string
}

export type EmailTemplate = {
  id: string
  organization_id: string
  base_id: string | null
  name: string
  subject: string
  category: string | null
  channel: string
  status: "active" | "draft" | "inactive" | string
  body_html: string
  created_at?: string
  updated_at?: string
}

export type EmailTemplateTriggerRule = {
  field: string
  operator: string
  value: string
}

export type EmailTemplateTrigger = {
  id: string
  organization_id: string
  template_id: string
  event_type: string
  source: string
  rules: EmailTemplateTriggerRule[]
  is_active: boolean
  created_at?: string
  updated_at?: string
}
