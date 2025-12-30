"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
import { Copy, Plus, Save, Trash2 } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { Textarea } from "@/src/components/ui/textarea"
import type { WhatsAppTemplate } from "@/src/types"
import {
  deleteWhatsAppTemplate,
  syncWhatsAppTemplateToMeta,
  upsertWhatsAppTemplate,
} from "./actions"

type ButtonDraft = {
  id: string
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "OTP_COPY_CODE"
  text: string
  url?: string
  phone_number?: string
}

type TemplateDraft = {
  id?: string
  name: string
  language: string
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION"
  status: string
  parameter_format: "positional" | "named"
  external_id?: string | null
  header_text: string
  body_text: string
  footer_text: string
  buttons: ButtonDraft[]
  body_example_values: Record<string, string>
  editor_mode: "guided" | "advanced"
  components_json: string
  components_error?: string | null
}

const categoryOptions = [
  { value: "UTILITY", label: "Utility" },
  { value: "MARKETING", label: "Marketing" },
  { value: "AUTHENTICATION", label: "Authentication" },
]

const languageOptions = [
  { value: "es_MX", label: "Espanol (MX)" },
  { value: "es_ES", label: "Espanol (ES)" },
  { value: "en_US", label: "English (US)" },
  { value: "pt_BR", label: "Portugues (BR)" },
]

const statusOptions = [
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
  { value: "paused", label: "Pausado" },
]

const buttonTypeOptions = [
  { value: "QUICK_REPLY", label: "Respuesta rapida" },
  { value: "URL", label: "URL" },
  { value: "PHONE_NUMBER", label: "Telefono" },
  { value: "OTP_COPY_CODE", label: "OTP copiar codigo" },
]

export default function WhatsAppTemplatesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [isSaving, startSaving] = useTransition()
  const [isDeleting, startDeleting] = useTransition()
  const [isPublishing, startPublishing] = useTransition()

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

      const { data: templateData } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("updated_at", { ascending: false })

      const normalizedTemplates = (templateData || []) as WhatsAppTemplate[]
      setTemplates(normalizedTemplates)

      if (normalizedTemplates.length) {
        const firstTemplate = normalizedTemplates[0]
        setActiveTemplateId(firstTemplate.id)
        setDraft(toDraft(firstTemplate))
      } else {
        setDraft(createEmptyDraft())
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  useEffect(() => {
    if (activeTemplate) {
      setDraft(toDraft(activeTemplate))
    }
  }, [activeTemplate])

  const bodyTokens = useMemo(() => {
    if (!draft) return []
    return getBodyTokens(draft.body_text, draft.parameter_format)
  }, [draft])

  useEffect(() => {
    if (!draft) return
    setDraft((prev) => {
      if (!prev) return prev
      const existing = prev.body_example_values || {}
      const next: Record<string, string> = {}
      bodyTokens.forEach((token) => {
        next[token] = existing[token] || ""
      })
      const changed =
        Object.keys(existing).length !== Object.keys(next).length ||
        bodyTokens.some((token) => existing[token] !== next[token])
      if (!changed) return prev
      return { ...prev, body_example_values: next }
    })
  }, [bodyTokens, draft])

  const resolvedComponents = useMemo(() => {
    if (!draft) return { components: [], error: null as string | null }
    return resolveComponents(draft)
  }, [draft])

  const createPayload = useMemo(() => {
    if (!draft) return null
    if (resolvedComponents.error) return null
    return {
      name: draft.name,
      language: draft.language,
      category: draft.category,
      parameter_format: draft.parameter_format,
      components: resolvedComponents.components,
    }
  }, [draft, resolvedComponents])

  const sendPayload = useMemo(() => {
    if (!draft) return null
    if (resolvedComponents.error) return null
    const parameters = buildMessageParameters(draft)
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "+16505551234",
      type: "template",
      template: {
        name: draft.name,
        language: { code: draft.language },
        components: parameters.length
          ? [
              {
                type: "body",
                parameters,
              },
            ]
          : [],
      },
    }
  }, [draft, resolvedComponents])

  const previewText = useMemo(() => {
    if (!draft) return ""
    const replacements = draft.body_example_values || {}
    return renderPreviewText(draft.body_text, draft.parameter_format, replacements)
  }, [draft])

  const handleSelectTemplate = (templateId: string) => {
    setActiveTemplateId(templateId)
    const template = templates.find((item) => item.id === templateId)
    if (template) {
      setDraft(toDraft(template))
    }
  }

  const handleNewTemplate = () => {
    setActiveTemplateId(null)
    setDraft(createEmptyDraft())
  }

  const handleSave = async () => {
    if (!draft || !organizationId) return
    const resolved = resolveComponents(draft)

    if (resolved.error) {
      toast.error(resolved.error)
      return
    }

    startSaving(async () => {
      const result = await upsertWhatsAppTemplate({
        id: draft.id,
        name: draft.name.trim(),
        language: draft.language,
        category: draft.category,
        status: draft.status,
        parameter_format: draft.parameter_format,
        external_id: draft.external_id || null,
        components: resolved.components,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Plantilla guardada")

      const { data: templateData } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })

      const updatedTemplates = (templateData || []) as WhatsAppTemplate[]
      setTemplates(updatedTemplates)

      if (result.id) {
        setActiveTemplateId(result.id)
      }
    })
  }

  const handlePublish = async () => {
    if (!draft || !organizationId) return
    const resolved = resolveComponents(draft)

    if (resolved.error) {
      toast.error(resolved.error)
      return
    }

    startPublishing(async () => {
      let templateId = draft.id
      if (!templateId) {
        const result = await upsertWhatsAppTemplate({
          name: draft.name.trim(),
          language: draft.language,
          category: draft.category,
          status: draft.status,
          parameter_format: draft.parameter_format,
          external_id: draft.external_id || null,
          components: resolved.components,
        })

        if (result.error) {
          toast.error(result.error)
          return
        }

        templateId = result.id
      }

      if (!templateId) {
        toast.error("No se pudo guardar la plantilla")
        return
      }

      const syncResult = await syncWhatsAppTemplateToMeta(templateId)
      if (syncResult.error) {
        toast.error(syncResult.error)
        return
      }

      toast.success("Plantilla enviada a Meta")
      const { data: templateData } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })

      const updatedTemplates = (templateData || []) as WhatsAppTemplate[]
      setTemplates(updatedTemplates)

      if (templateId) {
        setActiveTemplateId(templateId)
      }
    })
  }

  const handleDelete = async () => {
    if (!draft?.id) return
    startDeleting(async () => {
      const result = await deleteWhatsAppTemplate(draft.id as string)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Plantilla eliminada")
      const remaining = templates.filter((item) => item.id !== draft.id)
      setTemplates(remaining)
      if (remaining.length) {
        setActiveTemplateId(remaining[0].id)
      } else {
        setActiveTemplateId(null)
        setDraft(createEmptyDraft())
      }
    })
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copiado al portapapeles")
    } catch (error) {
      console.error("Clipboard error", error)
      toast.error("No se pudo copiar")
    }
  }

  if (loading || !draft) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Cargando plantillas...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Plantillas de WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Disena, valida y guarda tus templates antes de enviarlos a Meta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva plantilla
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing}
          >
            Enviar a Meta
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            Guardar cambios
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Plantillas existentes</CardTitle>
            <CardDescription>Selecciona una plantilla para editarla.</CardDescription>
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
                      <p className="text-xs text-muted-foreground">{template.language}</p>
                    </div>
                    <Badge
                      variant={
                        String(template.status || "").toLowerCase() === "approved"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {String(template.status || "").toLowerCase() || "draft"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    {template.quality_score ? (
                      <Badge variant="outline" className="text-xs">
                        QS: {template.quality_score}
                      </Badge>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Aun no hay plantillas.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle de la plantilla</CardTitle>
              <CardDescription>
                Completa la informacion basica antes de definir el contenido.
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
                    placeholder="order_confirmation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-language">Idioma</Label>
                  <Select
                    value={draft.language}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev ? { ...prev, language: value } : prev
                      )
                    }
                  >
                    <SelectTrigger id="template-language">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-category">Categoria</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              category: value as TemplateDraft["category"],
                            }
                          : prev
                      )
                    }
                  >
                    <SelectTrigger id="template-category">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-status">Estado</Label>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      setDraft((prev) => (prev ? { ...prev, status: value } : prev))
                    }
                  >
                    <SelectTrigger id="template-status">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="template-parameter-format">Formato de parametros</Label>
                  <Select
                    value={draft.parameter_format}
                    onValueChange={(value) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              parameter_format: value as TemplateDraft["parameter_format"],
                            }
                          : prev
                      )
                    }
                  >
                    <SelectTrigger id="template-parameter-format">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positional">Posicional</SelectItem>
                      <SelectItem value="named">Nombrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-external-id">ID en Meta (opcional)</Label>
                  <Input
                    id="template-external-id"
                    value={draft.external_id || ""}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, external_id: event.target.value } : prev
                      )
                    }
                    placeholder="1070894051799472"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido del template</CardTitle>
              <CardDescription>
                Usa el modo guiado para mensajes comunes o edita el JSON si necesitas
                componentes avanzados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs
                value={draft.editor_mode}
                onValueChange={(value) =>
                  setDraft((prev) =>
                    prev
                      ? {
                          ...prev,
                          editor_mode: value as TemplateDraft["editor_mode"],
                          components_json:
                            value === "advanced" && prev.editor_mode === "guided"
                              ? JSON.stringify(
                                  resolveComponents({ ...prev, editor_mode: "guided" }).components,
                                  null,
                                  2
                                )
                              : prev.components_json,
                        }
                      : prev
                  )
                }
              >
                <TabsList>
                  <TabsTrigger value="guided">Guiado</TabsTrigger>
                  <TabsTrigger value="advanced">JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="guided" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-header">Header (opcional)</Label>
                    <Input
                      id="template-header"
                      value={draft.header_text}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, header_text: event.target.value } : prev
                        )
                      }
                      placeholder="Forget something {{1}}?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-body">Body</Label>
                    <Textarea
                      id="template-body"
                      value={draft.body_text}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, body_text: event.target.value } : prev
                        )
                      }
                      placeholder="Gracias {{first_name}}, tu orden {{order_number}} fue confirmada."
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: usa {`{{1}}`} para posicionales o {`{{first_name}}`} para
                      parametros nombrados.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-footer">Footer (opcional)</Label>
                    <Input
                      id="template-footer"
                      value={draft.footer_text}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev ? { ...prev, footer_text: event.target.value } : prev
                        )
                      }
                      placeholder="No responder a este mensaje"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Botones</p>
                        <p className="text-xs text-muted-foreground">
                          Puedes agregar respuestas rapidas, URLs o telefonos.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addButton(setDraft)}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar boton
                      </Button>
                    </div>
                    {draft.buttons.length ? (
                      draft.buttons.map((button) => (
                        <div
                          key={button.id}
                          className="grid gap-3 rounded-lg border p-3 md:grid-cols-[140px_1fr_1fr_auto]"
                        >
                          <Select
                            value={button.type}
                            onValueChange={(value) =>
                              updateButton(setDraft, button.id, {
                                type: value as ButtonDraft["type"],
                                url: undefined,
                                phone_number: undefined,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {buttonTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={button.text}
                            onChange={(event) =>
                              updateButton(setDraft, button.id, {
                                text: event.target.value,
                              })
                            }
                            placeholder="Texto del boton"
                          />
                          {button.type === "URL" ? (
                            <Input
                              value={button.url || ""}
                              onChange={(event) =>
                                updateButton(setDraft, button.id, {
                                  url: event.target.value,
                                })
                              }
                              placeholder="https://"
                            />
                          ) : button.type === "PHONE_NUMBER" ? (
                            <Input
                              value={button.phone_number || ""}
                              onChange={(event) =>
                                updateButton(setDraft, button.id, {
                                  phone_number: event.target.value,
                                })
                              }
                              placeholder="+52 55 1234 5678"
                            />
                          ) : (
                            <div className="text-xs text-muted-foreground flex items-center">
                              {button.type === "OTP_COPY_CODE"
                                ? "Usa OTP con copiar codigo"
                                : "Sin parametros"}
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeButton(setDraft, button.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sin botones configurados.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Ejemplos de parametros</p>
                      <p className="text-xs text-muted-foreground">
                        Se usan para el payload de ejemplo y para aprobar templates.
                      </p>
                    </div>
                    {bodyTokens.length ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {bodyTokens.map((token) => (
                          <div key={token} className="space-y-2">
                            <Label>{token}</Label>
                            <Input
                              value={draft.body_example_values[token] || ""}
                              onChange={(event) =>
                                setDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        body_example_values: {
                                          ...prev.body_example_values,
                                          [token]: event.target.value,
                                        },
                                      }
                                    : prev
                                )
                              }
                              placeholder="Ejemplo"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No se detectaron variables en el body.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="template-components">Components JSON</Label>
                    <Textarea
                      id="template-components"
                      value={draft.components_json}
                      onChange={(event) =>
                        updateComponentsJson(setDraft, event.target.value)
                      }
                    />
                    {draft.components_error ? (
                      <p className="text-xs text-destructive">{draft.components_error}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Estructura esperada: un arreglo de components como en la API de Meta.
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Consejo: Guarda la plantilla local primero y luego mandala a Meta.
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
              <CardTitle className="text-base">Estado en Meta</CardTitle>
              <CardDescription>
                Se actualiza con los webhooks de WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>ID en Meta</Label>
                  <Input value={draft.external_id || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input value={draft.status || ""} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={draft.category || ""} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Quality Score</Label>
                  <Input
                    value={activeTemplate?.quality_score || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ultima actualizacion</Label>
                <Input
                  value={activeTemplate?.meta_updated_at || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Ultimo evento</Label>
                <pre className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground overflow-auto whitespace-pre-wrap break-words">
                  {activeTemplate?.last_meta_event
                    ? JSON.stringify(activeTemplate.last_meta_event, null, 2)
                    : "Sin eventos registrados."}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vista previa rapida</CardTitle>
              <CardDescription>
                Simula como se veria el mensaje en un telefono.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/10 p-4">
                {draft.header_text ? (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {draft.header_text}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed">{previewText || "..."}</p>
                {draft.footer_text ? (
                  <p className="mt-2 text-xs text-muted-foreground">{draft.footer_text}</p>
                ) : null}
                {draft.buttons.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draft.buttons.map((button) => (
                      <Badge key={button.id} variant="outline" className="text-xs">
                        {button.text || "Boton"}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payloads de referencia</CardTitle>
              <CardDescription>
                Copia estos JSON para crear o enviar la plantilla.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Crear template</Label>
                  {createPayload ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(JSON.stringify(createPayload, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                  ) : null}
                </div>
                <pre className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground overflow-auto whitespace-pre-wrap break-words">
                  {createPayload
                    ? JSON.stringify(createPayload, null, 2)
                    : "Completa el editor para generar el payload."}
                </pre>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Enviar template</Label>
                  {sendPayload ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(JSON.stringify(sendPayload, null, 2))}
                    >
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                  ) : null}
                </div>
                <pre className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground overflow-auto whitespace-pre-wrap break-words">
                  {sendPayload
                    ? JSON.stringify(sendPayload, null, 2)
                    : "Completa el editor para generar el payload."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function toDraft(template: WhatsAppTemplate): TemplateDraft {
  const components = Array.isArray(template.components) ? template.components : []
  const normalizedCategory = normalizeCategory(template.category)
  const normalizedFormat = normalizeFormat(template.parameter_format)
  const parsed = parseComponents(components, normalizedFormat)

  return {
    id: template.id,
    name: template.name || "",
    language: template.language || "es_MX",
    category: normalizedCategory,
    status: normalizeStatus(template.status),
    parameter_format: normalizedFormat,
    external_id: template.external_id || null,
    header_text: parsed.header_text,
    body_text: parsed.body_text,
    footer_text: parsed.footer_text,
    buttons: parsed.buttons,
    body_example_values: parsed.body_example_values,
    editor_mode: parsed.uses_advanced ? "advanced" : "guided",
    components_json: JSON.stringify(components, null, 2),
    components_error: null,
  }
}

function createEmptyDraft(): TemplateDraft {
  const bodyText = "Gracias {{first_name}}, tu orden {{order_number}} fue confirmada."
  return {
    name: "",
    language: "es_MX",
    category: "UTILITY",
    status: "draft",
    parameter_format: "named",
    external_id: "",
    header_text: "",
    body_text: bodyText,
    footer_text: "",
    buttons: [],
    body_example_values: {
      first_name: "Pablo",
      order_number: "860198-230332",
    },
    editor_mode: "guided",
    components_json: JSON.stringify(
      [
        {
          type: "BODY",
          text: bodyText,
          example: {
            body_text_named_params: [
              { param_name: "first_name", example: "Pablo" },
              { param_name: "order_number", example: "860198-230332" },
            ],
          },
        },
      ],
      null,
      2
    ),
    components_error: null,
  }
}

function normalizeCategory(value?: string | null) {
  const upper = (value || "UTILITY").toUpperCase()
  if (upper === "MARKETING" || upper === "AUTHENTICATION") {
    return upper as TemplateDraft["category"]
  }
  return "UTILITY" as TemplateDraft["category"]
}

function normalizeFormat(value?: string | null) {
  return value === "named" ? "named" : "positional"
}

function normalizeStatus(value?: string | null) {
  return (value || "draft").toLowerCase()
}

function parseComponents(components: Array<Record<string, unknown>>, format: "named" | "positional") {
  let header_text = ""
  let body_text = ""
  let footer_text = ""
  let buttons: ButtonDraft[] = []
  let uses_advanced = false
  let body_example_values: Record<string, string> = {}

  components.forEach((component, index) => {
    const type = String(component.type || "").toUpperCase()
    if (type === "HEADER") {
      const formatValue = String(component.format || "TEXT").toUpperCase()
      if (formatValue !== "TEXT" || typeof component.text !== "string") {
        uses_advanced = true
        return
      }
      header_text = component.text as string
      return
    }

    if (type === "BODY") {
      if (typeof component.text === "string") {
        body_text = component.text as string
      } else if (typeof component.text !== "undefined") {
        uses_advanced = true
      }

      const example = component.example as
        | { body_text?: string[][]; body_text_named_params?: Array<{ param_name: string; example: string }> }
        | undefined

      if (example?.body_text_named_params && Array.isArray(example.body_text_named_params)) {
        body_example_values = example.body_text_named_params.reduce(
          (acc, param) => {
            acc[param.param_name] = param.example
            return acc
          },
          {} as Record<string, string>
        )
      }

      if (example?.body_text && Array.isArray(example.body_text)) {
        const tokens = getBodyTokens(body_text, format)
        const values = example.body_text[0] || []
        body_example_values = tokens.reduce((acc, token, idx) => {
          acc[token] = values[idx] || ""
          return acc
        }, {} as Record<string, string>)
      }

      if (component.add_security_recommendation || component.code_expiration_minutes) {
        uses_advanced = true
      }
      return
    }

    if (type === "FOOTER") {
      if (typeof component.text === "string") {
        footer_text = component.text as string
      } else if (typeof component.text !== "undefined") {
        uses_advanced = true
      }
      return
    }

    if (type === "BUTTONS") {
      const buttonsValue = Array.isArray(component.buttons) ? component.buttons : []
      buttons = buttonsValue.map((button, buttonIndex) => {
        const buttonType = String(button.type || "").toUpperCase()
        if (buttonType === "URL") {
          return {
            id: `btn-${index}-${buttonIndex}`,
            type: "URL",
            text: String(button.text || ""),
            url: typeof button.url === "string" ? button.url : "",
          }
        }
        if (buttonType === "PHONE_NUMBER") {
          return {
            id: `btn-${index}-${buttonIndex}`,
            type: "PHONE_NUMBER",
            text: String(button.text || ""),
            phone_number: typeof button.phone_number === "string" ? button.phone_number : "",
          }
        }
        if (buttonType === "OTP") {
          return {
            id: `btn-${index}-${buttonIndex}`,
            type: "OTP_COPY_CODE",
            text: String(button.text || ""),
          }
        }
        if (buttonType === "QUICK_REPLY") {
          return {
            id: `btn-${index}-${buttonIndex}`,
            type: "QUICK_REPLY",
            text: String(button.text || ""),
          }
        }
        uses_advanced = true
        return {
          id: `btn-${index}-${buttonIndex}`,
          type: "QUICK_REPLY",
          text: String(button.text || ""),
        }
      })
      return
    }

    if (type) {
      uses_advanced = true
    }
  })

  return { header_text, body_text, footer_text, buttons, uses_advanced, body_example_values }
}

function resolveComponents(draft: TemplateDraft) {
  if (draft.editor_mode === "advanced") {
    try {
      const parsed = JSON.parse(draft.components_json)
      if (!Array.isArray(parsed)) {
        return { components: [], error: "El JSON debe ser un arreglo de components." }
      }
      return { components: parsed as Array<Record<string, unknown>>, error: null }
    } catch {
      return { components: [], error: "El JSON de components es invalido." }
    }
  }

  const components: Array<Record<string, unknown>> = []

  if (draft.header_text.trim()) {
    components.push({
      type: "HEADER",
      format: "TEXT",
      text: draft.header_text,
    })
  }

  if (draft.body_text.trim()) {
    const bodyComponent: Record<string, unknown> = {
      type: "BODY",
      text: draft.body_text,
    }
    const bodyExample = buildBodyExample(draft)
    if (bodyExample) {
      bodyComponent.example = bodyExample
    }
    components.push(bodyComponent)
  }

  if (draft.footer_text.trim()) {
    components.push({
      type: "FOOTER",
      text: draft.footer_text,
    })
  }

  if (draft.buttons.length) {
    components.push({
      type: "BUTTONS",
      buttons: draft.buttons.map((button) => {
        if (button.type === "URL") {
          return { type: "URL", text: button.text, url: button.url }
        }
        if (button.type === "PHONE_NUMBER") {
          return { type: "PHONE_NUMBER", text: button.text, phone_number: button.phone_number }
        }
        if (button.type === "OTP_COPY_CODE") {
          return { type: "OTP", otp_type: "COPY_CODE", text: button.text }
        }
        return { type: "QUICK_REPLY", text: button.text }
      }),
    })
  }

  return { components, error: null }
}

function buildBodyExample(draft: TemplateDraft) {
  const tokens = getBodyTokens(draft.body_text, draft.parameter_format)
  if (!tokens.length) return null
  const values = tokens.map((token) => draft.body_example_values[token] || "Ejemplo")
  if (draft.parameter_format === "named") {
    return {
      body_text_named_params: tokens.map((token, idx) => ({
        param_name: token,
        example: values[idx] || "Ejemplo",
      })),
    }
  }
  return {
    body_text: [values],
  }
}

function buildMessageParameters(draft: TemplateDraft) {
  const tokens = getBodyTokens(draft.body_text, draft.parameter_format)
  if (!tokens.length) return []
  if (draft.parameter_format === "named") {
    return tokens.map((token) => ({
      type: "text",
      parameter_name: token,
      text: draft.body_example_values[token] || "Ejemplo",
    }))
  }
  return tokens.map((token) => ({
    type: "text",
    text: draft.body_example_values[token] || "Ejemplo",
  }))
}

function renderPreviewText(
  bodyText: string,
  format: "named" | "positional",
  examples: Record<string, string>
) {
  return bodyText.replace(/{{\s*([^}]+)\s*}}/g, (_, token) => {
    const key = String(token || "").trim()
    if (format === "positional" && !/^\d+$/.test(key)) {
      return `{{${key}}}`
    }
    if (format === "named" && /^\d+$/.test(key)) {
      return `{{${key}}}`
    }
    return examples[key] || `{{${key}}}`
  })
}

function getBodyTokens(bodyText: string, format: "named" | "positional") {
  const tokens: string[] = []
  const regex = /{{\s*([^}]+)\s*}}/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(bodyText)) !== null) {
    const token = match[1].trim()
    if (!token) continue
    const isNumeric = /^\d+$/.test(token)
    if (format === "positional" && !isNumeric) continue
    if (format === "named" && isNumeric) continue
    if (!tokens.includes(token)) {
      tokens.push(token)
    }
  }

  if (format === "positional") {
    tokens.sort((a, b) => Number(a) - Number(b))
  }

  return tokens
}

function updateComponentsJson(
  setDraft: Dispatch<SetStateAction<TemplateDraft | null>>,
  value: string
) {
  setDraft((prev) => {
    if (!prev) return prev
    let error: string | null = null
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        error = "El JSON debe ser un arreglo de components."
      }
    } catch {
      error = "El JSON de components es invalido."
    }
    return { ...prev, components_json: value, components_error: error }
  })
}

function addButton(
  setDraft: Dispatch<SetStateAction<TemplateDraft | null>>
) {
  setDraft((prev) => {
    if (!prev) return prev
    const nextButton: ButtonDraft = {
      id: `btn-${Date.now()}`,
      type: "QUICK_REPLY",
      text: "",
    }
    return { ...prev, buttons: [...prev.buttons, nextButton] }
  })
}

function updateButton(
  setDraft: Dispatch<SetStateAction<TemplateDraft | null>>,
  buttonId: string,
  patch: Partial<ButtonDraft>
) {
  setDraft((prev) => {
    if (!prev) return prev
    const buttons = prev.buttons.map((button) =>
      button.id === buttonId ? { ...button, ...patch } : button
    )
    return { ...prev, buttons }
  })
}

function removeButton(
  setDraft: Dispatch<SetStateAction<TemplateDraft | null>>,
  buttonId: string
) {
  setDraft((prev) => {
    if (!prev) return prev
    return { ...prev, buttons: prev.buttons.filter((button) => button.id !== buttonId) }
  })
}
