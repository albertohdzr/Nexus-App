"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { CalendarCheck, Plus, Save, Trash2 } from "lucide-react"
import { createClient } from "@/src/lib/supabase/client"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card"
import { Checkbox } from "@/src/components/ui/checkbox"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { Separator } from "@/src/components/ui/separator"
import { HtmlEditor } from "@/src/components/crm/html-editor"
import type {
  EmailTemplate,
  EmailTemplateBase,
  EmailTemplateTrigger,
  EmailTemplateTriggerRule,
} from "@/src/types"
import { deleteEmailTemplate, upsertEmailTemplate } from "./actions"

type TriggerDraft = {
  event_type: string
  source: string
  is_active: boolean
  rules: EmailTemplateTriggerRule[]
}

type TemplateDraft = {
  id?: string
  name: string
  subject: string
  category: string
  channel: string
  status: string
  body_html: string
  triggers: TriggerDraft[]
}

const tokens = [
  "{{contact_full_name}}",
  "{{student_name}}",
  "{{lead_id}}",
  "{{visit_date}}",
  "{{visit_time}}",
  "{{campus_name}}",
]

const triggerFields = [
  { value: "source", label: "Fuente" },
  { value: "campus", label: "Campus" },
  { value: "grade_interest", label: "Grado" },
  { value: "school_year", label: "Ciclo escolar" },
]

const triggerOperators = [
  { value: "equals", label: "Es igual a" },
  { value: "contains", label: "Contiene" },
  { value: "not_equals", label: "No es" },
]

const defaultBody = `<p>Hola {{contact_full_name}},</p><p>Tu registro fue exitoso y ya tenemos la informacion principal del estudiante {{student_name}}.</p><ul><li>ID de lead: {{lead_id}}</li><li>Campus: {{campus_name}}</li></ul><p>En breve nos comunicaremos contigo para compartir los siguientes pasos.</p><p>Gracias por confiar en nosotros.</p>`

export default function EmailTemplatesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [base, setBase] = useState<EmailTemplateBase | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [triggers, setTriggers] = useState<Record<string, EmailTemplateTrigger[]>>(
    {}
  )
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [isSaving, startSaving] = useTransition()
  const [isDeleting, startDeleting] = useTransition()

  const activeTemplate = useMemo(() => {
    if (!activeTemplateId) return null
    return templates.find((template) => template.id === activeTemplateId) || null
  }, [activeTemplateId, templates])

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (!profile?.organization_id) {
        setLoading(false)
        return
      }

      setOrganizationId(profile.organization_id)

      const [{ data: baseData }, { data: templateData }, { data: triggerData }] =
        await Promise.all([
          supabase
            .from("email_template_bases")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .maybeSingle(),
          supabase
            .from("email_templates")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .order("updated_at", { ascending: false }),
          supabase
            .from("email_template_triggers")
            .select("*")
            .eq("organization_id", profile.organization_id),
        ])

      if (baseData) {
        setBase(baseData as EmailTemplateBase)
      }

      const normalizedTemplates = (templateData || []) as EmailTemplate[]
      setTemplates(normalizedTemplates)

      const triggerMap: Record<string, EmailTemplateTrigger[]> = {}
      ;(triggerData || []).forEach((trigger) => {
        const typed = trigger as EmailTemplateTrigger
        if (!triggerMap[typed.template_id]) {
          triggerMap[typed.template_id] = []
        }
        triggerMap[typed.template_id].push({
          ...typed,
          rules: Array.isArray(typed.rules) ? typed.rules : [],
        })
      })
      setTriggers(triggerMap)

      if (normalizedTemplates.length) {
        const firstTemplate = normalizedTemplates[0]
        setActiveTemplateId(firstTemplate.id)
        setDraft(toDraft(firstTemplate, triggerMap[firstTemplate.id] || []))
      } else {
        setDraft(createEmptyDraft())
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  useEffect(() => {
    if (activeTemplate && triggers[activeTemplate.id]) {
      setDraft(toDraft(activeTemplate, triggers[activeTemplate.id]))
    }
  }, [activeTemplate, triggers])

  const handleSelectTemplate = (templateId: string) => {
    setActiveTemplateId(templateId)
    const template = templates.find((item) => item.id === templateId)
    if (template) {
      setDraft(toDraft(template, triggers[templateId] || []))
    }
  }

  const handleNewTemplate = () => {
    setActiveTemplateId(null)
    setDraft(createEmptyDraft())
  }

  const handleSave = async () => {
    if (!draft || !organizationId) return

    startSaving(async () => {
      const result = await upsertEmailTemplate({
        id: draft.id,
        name: draft.name,
        subject: draft.subject,
        category: draft.category || null,
        channel: draft.channel,
        status: draft.status,
        body_html: draft.body_html,
        base_id: base?.id || null,
        triggers: draft.triggers.map((trigger) => ({
          event_type: trigger.event_type,
          source: trigger.source,
          is_active: trigger.is_active,
          rules: trigger.rules,
        })),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Template guardado")
      const [{ data: templateData }, { data: triggerData }] = await Promise.all([
        supabase
          .from("email_templates")
          .select("*")
          .eq("organization_id", organizationId)
          .order("updated_at", { ascending: false }),
        supabase
          .from("email_template_triggers")
          .select("*")
          .eq("organization_id", organizationId),
      ])

      const updatedTemplates = (templateData || []) as EmailTemplate[]
      setTemplates(updatedTemplates)

      const triggerMap: Record<string, EmailTemplateTrigger[]> = {}
      ;(triggerData || []).forEach((trigger) => {
        const typed = trigger as EmailTemplateTrigger
        if (!triggerMap[typed.template_id]) {
          triggerMap[typed.template_id] = []
        }
        triggerMap[typed.template_id].push({
          ...typed,
          rules: Array.isArray(typed.rules) ? typed.rules : [],
        })
      })
      setTriggers(triggerMap)

      if (result.id) {
        setActiveTemplateId(result.id)
      }
    })
  }

  const handleDelete = async () => {
    if (!draft?.id) return
    startDeleting(async () => {
      const result = await deleteEmailTemplate(draft.id as string)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Template eliminado")
      const remaining = templates.filter((item) => item.id !== draft.id)
      setTemplates(remaining)
      setTriggers((prev) => {
        const next = { ...prev }
        delete next[draft.id as string]
        return next
      })
      if (remaining.length) {
        setActiveTemplateId(remaining[0].id)
      } else {
        setActiveTemplateId(null)
        setDraft(createEmptyDraft())
      }
    })
  }

  if (loading || !draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Cargando templates...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            Configure templates, triggers, and rules for automated or manual communication.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Templates existentes</CardTitle>
            <CardDescription>Selecciona un template para editarlo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templates.length ? (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    activeTemplateId === template.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.subject}
                      </p>
                    </div>
                    <Badge variant={template.status === "active" ? "secondary" : "outline"} className="text-xs">
                      {template.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {template.category ? (
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="text-xs">
                      {template.channel}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Aun no hay templates.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle del template</CardTitle>
              <CardDescription>
                Edita el asunto, el contenido HTML y los disparadores.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nombre</Label>
                  <Input
                    id="template-name"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, name: event.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Categoria</Label>
                  <Input
                    id="template-category"
                    value={draft.category}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, category: event.target.value } : prev
                      )
                    }
                    placeholder="Lead, Visita, General"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-channel">Canal</Label>
                  <Select
                    value={draft.channel}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev ? { ...prev, channel: value } : prev
                      )
                    }
                  >
                    <SelectTrigger id="template-channel">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-status">Estado</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev ? { ...prev, status: value } : prev
                      )
                    }
                  >
                    <SelectTrigger id="template-status">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-subject">Asunto</Label>
                <Input
                  id="template-subject"
                  value={draft.subject}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev ? { ...prev, subject: event.target.value } : prev
                    )
                  }
                />
              </div>

              <HtmlEditor
                id="template-body"
                label="Cuerpo HTML"
                description="Editor HTML completo. Usa tokens para personalizar el contenido."
                value={draft.body_html}
                onChange={(value) =>
                  setDraft((prev) => (prev ? { ...prev, body_html: value } : prev))
                }
                tokens={tokens}
                minHeight="240px"
              />
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="h-4 w-4" />
                Se puede usar en chatbot y en flujos manuales.
              </div>
              {draft.id ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              ) : null}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disparadores y reglas</CardTitle>
              <CardDescription>
                Define cuando se envia este template y bajo que condiciones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {draft.triggers.map((trigger, index) => (
                <div key={`trigger-${index}`} className="rounded-lg border p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Evento</Label>
                        <Select
                          value={trigger.event_type}
                          onValueChange={(value) =>
                            updateTrigger(index, { event_type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead_created">Lead creado</SelectItem>
                            <SelectItem value="visit_created">Visita agendada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Fuente</Label>
                        <Select
                          value={trigger.source}
                          onValueChange={(value) => updateTrigger(index, { source: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Cualquiera</SelectItem>
                            <SelectItem value="chatbot">Chatbot</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <Checkbox
                          checked={trigger.is_active}
                          onCheckedChange={(checked) =>
                            updateTrigger(index, { is_active: checked === true })
                          }
                        />
                        <span className="text-sm">Activo</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTrigger(index)}
                    >
                      Eliminar disparador
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Reglas</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addRule(index)}
                      >
                        Agregar regla
                      </Button>
                    </div>
                    {trigger.rules.length ? (
                      trigger.rules.map((rule, ruleIndex) => (
                        <div
                          key={`rule-${index}-${ruleIndex}`}
                          className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                        >
                          <Select
                            value={rule.field}
                            onValueChange={(value) =>
                              updateRule(index, ruleIndex, { field: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {triggerFields.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={rule.operator}
                            onValueChange={(value) =>
                              updateRule(index, ruleIndex, { operator: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operador" />
                            </SelectTrigger>
                            <SelectContent>
                              {triggerOperators.map((op) => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={rule.value}
                            onChange={(event) =>
                              updateRule(index, ruleIndex, {
                                value: event.target.value,
                              })
                            }
                            placeholder="Valor"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRule(index, ruleIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin reglas. Este disparador aplica a todos los casos.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addTrigger}>
                <Plus className="h-4 w-4" />
                Agregar disparador
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vista previa</CardTitle>
              <CardDescription>
                Combinacion del template con la base configurada en Settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase text-muted-foreground">Preview</p>
                  <Badge variant="outline" className="text-xs">
                    Base aplicada
                  </Badge>
                </div>
                <Separator className="my-3" />
                <div
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: buildPreviewHtml(base, draft.body_html),
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  function updateTrigger(index: number, patch: Partial<TriggerDraft>) {
    setDraft((prev) => {
      if (!prev) return prev
      const updated = [...prev.triggers]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, triggers: updated }
    })
  }

  function addTrigger() {
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        triggers: [
          ...prev.triggers,
          {
            event_type: "lead_created",
            source: "any",
            is_active: true,
            rules: [],
          },
        ],
      }
    })
  }

  function removeTrigger(index: number) {
    setDraft((prev) => {
      if (!prev) return prev
      const updated = prev.triggers.filter((_, idx) => idx !== index)
      return { ...prev, triggers: updated }
    })
  }

  function addRule(triggerIndex: number) {
    setDraft((prev) => {
      if (!prev) return prev
      const updated = [...prev.triggers]
      const rules = [...updated[triggerIndex].rules, { field: "", operator: "", value: "" }]
      updated[triggerIndex] = { ...updated[triggerIndex], rules }
      return { ...prev, triggers: updated }
    })
  }

  function updateRule(
    triggerIndex: number,
    ruleIndex: number,
    patch: Partial<EmailTemplateTriggerRule>
  ) {
    setDraft((prev) => {
      if (!prev) return prev
      const updated = [...prev.triggers]
      const rules = [...updated[triggerIndex].rules]
      rules[ruleIndex] = { ...rules[ruleIndex], ...patch }
      updated[triggerIndex] = { ...updated[triggerIndex], rules }
      return { ...prev, triggers: updated }
    })
  }

  function removeRule(triggerIndex: number, ruleIndex: number) {
    setDraft((prev) => {
      if (!prev) return prev
      const updated = [...prev.triggers]
      const rules = updated[triggerIndex].rules.filter((_, idx) => idx !== ruleIndex)
      updated[triggerIndex] = { ...updated[triggerIndex], rules }
      return { ...prev, triggers: updated }
    })
  }
}

function toDraft(template: EmailTemplate, triggers: EmailTemplateTrigger[]) {
  return {
    id: template.id,
    name: template.name,
    subject: template.subject,
    category: template.category || "",
    channel: template.channel || "email",
    status: template.status || "active",
    body_html: template.body_html || defaultBody,
    triggers: triggers.length
      ? triggers.map((trigger) => ({
          event_type: trigger.event_type,
          source: trigger.source,
          is_active: trigger.is_active,
          rules: Array.isArray(trigger.rules) ? trigger.rules : [],
        }))
      : [
          {
            event_type: "lead_created",
            source: "any",
            is_active: true,
            rules: [],
          },
        ],
  }
}

function createEmptyDraft(): TemplateDraft {
  return {
    name: "",
    subject: "",
    category: "",
    channel: "email",
    status: "draft",
    body_html: defaultBody,
    triggers: [
      {
        event_type: "lead_created",
        source: "any",
        is_active: true,
        rules: [],
      },
    ],
  }
}

function buildPreviewHtml(base: EmailTemplateBase | null, bodyHtml: string) {
  const logoHtml = base?.logo_url
    ? `<div style="margin-bottom:16px"><img src="${base.logo_url}" alt="Logo" style="height:48px" /></div>`
    : ""
  const headerHtml = base?.header_html || ""
  const footerHtml = base?.footer_html || ""
  return `
    <div style="font-family:Arial, sans-serif; color:#1f2937; line-height:1.6;">
      ${logoHtml}
      ${headerHtml}
      <div style="margin:16px 0;">${bodyHtml || ""}</div>
      ${footerHtml}
    </div>
  `
}
