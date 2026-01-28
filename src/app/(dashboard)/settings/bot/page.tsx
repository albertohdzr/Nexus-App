"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Organization } from "@/src/types/organization";
import { deleteCapability, deleteCapabilityFinance, saveCapability, saveCapabilityFinance } from "./capabilities-actions";
import { updateOrganization } from "../actions";

type CapabilityFinance = {
  id: string;
  capability_id: string;
  organization_id: string;
  item: string;
  value: string;
  notes?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  priority?: number | null;
  is_active?: boolean | null;
};

type BotCapability = {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  response_template?: string | null;
  type?: string | null;
  enabled?: boolean | null;
  priority?: number | null;
  metadata?: Record<string, unknown> | null;
  finance: CapabilityFinance[];
};

const capabilityTypes = [
  { value: "custom", label: "General" },
  { value: "finance", label: "Finanzas" },
  { value: "complaint", label: "Quejas" },
];

export default function BotSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [capabilities, setCapabilities] = useState<BotCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [capPending, startCapTransition] = useTransition();
  const [financePending, startFinanceTransition] = useTransition();
  const supabase = createClient();

  const fetchCapabilities = useCallback(async (orgId: string) => {
    const [{ data: caps }, { data: finance }] = await Promise.all([
      supabase
        .from("bot_capabilities")
        .select("*")
        .eq("organization_id", orgId)
        .order("priority", { ascending: false }),
      supabase
        .from("bot_capability_finance")
        .select("*")
        .eq("organization_id", orgId)
        .order("priority", { ascending: false }),
    ]);

    const capMap = new Map<string, BotCapability>();
    (caps || []).forEach((cap) =>
      capMap.set(cap.id, { ...cap, finance: [] } as BotCapability)
    );
    (finance || []).forEach((item) => {
      const cap = capMap.get(item.capability_id);
      if (cap) {
        cap.finance.push(item as CapabilityFinance);
      }
    });

    setCapabilities(Array.from(capMap.values()));
  }, [supabase]);

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", profile.organization_id)
          .single();

        if (orgData) {
          setOrg(orgData);
          await fetchCapabilities(profile.organization_id);
        }
      }
      setLoading(false);
    };

    fetchOrg();
  }, [supabase, fetchCapabilities]);

  const handleCapabilitySubmit = async (formData: FormData) => {
    if (!org) return;
    startCapTransition(async () => {
      const res = await saveCapability({} as { error?: string; success?: string }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "Capacidad guardada");
        await fetchCapabilities(org.id);
      }
    });
  };

  const handleFinanceSubmit = async (formData: FormData) => {
    if (!org) return;
    startFinanceTransition(async () => {
      const res = await saveCapabilityFinance({} as { error?: string; success?: string }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "Información guardada");
        await fetchCapabilities(org.id);
      }
    });
  };

  const handleDeleteCapability = async (formData: FormData) => {
    if (!org) return;
    startCapTransition(async () => {
      const res = await deleteCapability(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "Capacidad eliminada");
        await fetchCapabilities(org.id);
      }
    });
  };

  const handleDeleteFinance = async (formData: FormData) => {
    if (!org) return;
    startFinanceTransition(async () => {
      const res = await deleteCapabilityFinance(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "Registro eliminado");
        await fetchCapabilities(org.id);
      }
    });
  };

  const handleSave = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateOrganization(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Bot settings updated");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Organization Not Found</CardTitle>
            <CardDescription>You do not appear to belong to an organization.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bot Settings</h1>
        <p className="text-sm text-muted-foreground">Configura nombre, tono, modelo e instrucciones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bot configuration</CardTitle>
          <CardDescription>Personaliza la voz y contexto del asistente.</CardDescription>
        </CardHeader>
        <form action={handleSave}>
          <input type="hidden" name="id" value={org.id} />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bot_name">Bot name</Label>
                <Input
                  id="bot_name"
                  name="bot_name"
                  defaultValue={org.bot_name || ""}
                  placeholder="Asistente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot_model">Modelo</Label>
                <Input
                  id="bot_model"
                  name="bot_model"
                  defaultValue={org.bot_model || "gpt-4o-mini"}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bot_language">Idioma</Label>
                <Input
                  id="bot_language"
                  name="bot_language"
                  defaultValue={org.bot_language || "es"}
                  placeholder="es"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot_tone">Tono</Label>
                <Input
                  id="bot_tone"
                  name="bot_tone"
                  defaultValue={org.bot_tone || ""}
                  placeholder="Profesional, amigable, breve..."
                />
              </div>
            </div>

              <div className="space-y-2">
                <Label htmlFor="bot_instructions">Instrucciones del bot</Label>
              <textarea
                id="bot_instructions"
                name="bot_instructions"
                defaultValue={org.bot_instructions || ""}
                className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Contexto, objetivos y límites del asistente"
              />
              <p className="text-xs text-muted-foreground">Define cómo debe responder el asistente.</p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Capacidades del bot</CardTitle>
              <CardDescription>Define habilidades, contactos y datos de apoyo.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para contactos del bot, usa el módulo de Directorio en Settings.
          </p>
          <form action={handleCapabilitySubmit} className="grid grid-cols-1 gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Nueva capacidad</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_slug">Slug</Label>
                <Input id="new_slug" name="slug" placeholder="ej. contactos, pagos, quejas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_title">Título</Label>
                <Input id="new_title" name="title" placeholder="Contactos de caja" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_type">Tipo</Label>
                <select
                  id="new_type"
                  name="type"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="custom"
                >
                  {capabilityTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_priority">Prioridad</Label>
                <Input id="new_priority" name="priority" type="number" defaultValue={0} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked />
                <span>Habilitada</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="allow_complaints" />
                <span>Permitir quejas</span>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_description">Descripción</Label>
                <textarea
                  id="new_description"
                  name="description"
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Resumen breve de cuándo usar esta capacidad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_instructions">Instrucciones</Label>
                <textarea
                  id="new_instructions"
                  name="instructions"
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Pasos que debe seguir el bot para esta capacidad"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_response_template">Plantilla de respuesta (opcional)</Label>
              <textarea
                id="new_response_template"
                name="response_template"
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Usa {{name}}, {{email}}, {{phone}} o {{value}} según aplique"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={capPending}>
                {capPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear capacidad
              </Button>
            </div>
          </form>

          <div className="space-y-4">
            {capabilities.map((cap) => (
              <Card key={cap.id} className="border-muted">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{cap.title}</CardTitle>
                      <CardDescription>{cap.description || cap.slug}</CardDescription>
                    </div>
                    <form action={handleDeleteCapability}>
                      <input type="hidden" name="id" value={cap.id} />
                      <Button variant="ghost" size="icon" disabled={capPending} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form action={handleCapabilitySubmit} className="space-y-3">
                    <input type="hidden" name="id" value={cap.id} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input name="slug" defaultValue={cap.slug} />
                      </div>
                      <div className="space-y-2">
                        <Label>Título</Label>
                        <Input name="title" defaultValue={cap.title} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <select
                          name="type"
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          defaultValue={cap.type || "custom"}
                        >
                          {capabilityTypes.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Input name="priority" type="number" defaultValue={cap.priority ?? 0} />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="enabled" defaultChecked={cap.enabled ?? true} />
                        <span>Habilitada</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="allow_complaints"
                          defaultChecked={
                            Boolean((cap.metadata as { allow_complaints?: boolean } | null)?.allow_complaints) ||
                            cap.type === "complaint"
                          }
                        />
                        <span>Permitir quejas</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Descripción</Label>
                        <textarea
                          name="description"
                          defaultValue={cap.description || ""}
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Instrucciones</Label>
                        <textarea
                          name="instructions"
                          defaultValue={cap.instructions || ""}
                          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Plantilla de respuesta</Label>
                      <textarea
                        name="response_template"
                        defaultValue={cap.response_template || ""}
                        className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <p className="text-xs text-muted-foreground">
                        Usa llaves dobles: &#123;&#123;name&#125;&#125;, &#123;&#123;email&#125;&#125;, &#123;&#123;phone&#125;&#125;, &#123;&#123;value&#125;&#125; según aplique.
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" variant="secondary" disabled={capPending}>
                        {capPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar capacidad
                      </Button>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Datos financieros</p>
                        <span className="text-xs text-muted-foreground">{cap.finance.length} registros</span>
                      </div>
                      <form action={handleFinanceSubmit} className="grid grid-cols-2 gap-3 text-sm">
                        <input type="hidden" name="capability_id" value={cap.id} />
                        <div className="space-y-1">
                          <Label>Item</Label>
                          <Input name="item" placeholder="fecha_pago, caja_contacto..." />
                        </div>
                        <div className="space-y-1">
                          <Label>Valor</Label>
                          <Input name="value" placeholder="15 de abril / correo de caja" />
                        </div>
                        <div className="space-y-1">
                          <Label>Notas</Label>
                          <Input name="notes" placeholder="Horario, referencia..." />
                        </div>
                        <div className="space-y-1">
                          <Label>Prioridad</Label>
                          <Input name="priority" type="number" defaultValue={0} />
                        </div>
                        <div className="space-y-1">
                          <Label>Vigencia desde</Label>
                          <Input name="valid_from" type="date" />
                        </div>
                        <div className="space-y-1">
                          <Label>Vigencia hasta</Label>
                          <Input name="valid_to" type="date" />
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" name="is_active" defaultChecked />
                          <span>Activo</span>
                        </label>
                        <div className="flex justify-end">
                          <Button type="submit" size="sm" disabled={financePending}>
                            {financePending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Agregar
                          </Button>
                        </div>
                      </form>
                      <div className="space-y-2 text-sm">
                        {cap.finance.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-md border p-2">
                            <div className="space-y-1">
                              <p className="font-medium">{item.item}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.value} {item.notes ? `· ${item.notes}` : ""}
                              </p>
                            </div>
                            <form action={handleDeleteFinance}>
                              <input type="hidden" name="id" value={item.id} />
                              <Button variant="ghost" size="icon" disabled={financePending} title="Eliminar">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        ))}
                        {!cap.finance.length && (
                          <p className="text-xs text-muted-foreground">Sin datos financieros aún.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!capabilities.length && (
              <p className="text-sm text-muted-foreground">Aún no hay capacidades configuradas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
