"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Bot } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Organization } from "@/src/types/organization";
import { updateOrganization, createOrganizationKnowledge, deleteOrganizationKnowledge, upsertEmailTemplateBase } from "./actions";
import Link from "next/link";
import { HtmlEditor } from "@/src/components/crm/html-editor";
import type { EmailTemplateBase } from "@/src/types/email-template";

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isSavingKnowledge, startSavingKnowledge] = useTransition();
    const [isDeleting, startDeleting] = useTransition();
    const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
    const [templateBase, setTemplateBase] = useState<EmailTemplateBase | null>(null);
    const [newKnowledge, setNewKnowledge] = useState({
        title: "",
        category: "",
        content: "",
    });
    const [isSavingBase, startSavingBase] = useTransition();
    const supabase = createClient();

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
                }

                const { data: baseData } = await supabase
                    .from("email_template_bases")
                    .select("*")
                    .eq("organization_id", profile.organization_id)
                    .maybeSingle();

                setTemplateBase({
                    id: baseData?.id || "",
                    organization_id: profile.organization_id,
                    logo_url: baseData?.logo_url || "",
                    header_html: baseData?.header_html || "<h2 style=\"margin:0\">Nexus Admissions</h2>",
                    footer_html: baseData?.footer_html || "<p style=\"margin:0\">Contacto: admissions@nexus.edu | Campus Norte</p>",
                });

                const { data: knowledgeData } = await supabase
                    .from("organization_knowledge")
                    .select("*")
                    .eq("organization_id", profile.organization_id)
                    .order("updated_at", { ascending: false });

                if (knowledgeData) {
                    setKnowledge(knowledgeData as KnowledgeItem[]);
                }
            }
            setLoading(false);
        };

        fetchOrg();
    }, [supabase]);

    const handleSave = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateOrganization(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Organization settings updated");
            }
        });
    };

    const handleSaveTemplateBase = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!org || !templateBase) return;
        const formData = new FormData();
        formData.append("organization_id", org.id);
        formData.append("logo_url", templateBase.logo_url || "");
        formData.append("header_html", templateBase.header_html || "");
        formData.append("footer_html", templateBase.footer_html || "");
        startSavingBase(async () => {
            const result = await upsertEmailTemplateBase(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Base de correo actualizada");
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

    const handleCreateKnowledge = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!org) return;
        const formData = new FormData(e.currentTarget);
        formData.append("organization_id", org.id);
        startSavingKnowledge(async () => {
            const result = await createOrganizationKnowledge(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Elemento agregado");
                const { data } = await supabase
                    .from("organization_knowledge")
                    .select("*")
                    .eq("organization_id", org.id)
                    .order("updated_at", { ascending: false });
                if (data) setKnowledge(data as KnowledgeItem[]);
                setNewKnowledge({ title: "", category: "", content: "" });
            }
        });
    };

    const handleDeleteKnowledge = async (id: string) => {
        const formData = new FormData();
        formData.append("id", id);
        startDeleting(async () => {
            const result = await deleteOrganizationKnowledge(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Elemento eliminado");
                setKnowledge((prev) => prev.filter((item) => item.id !== id));
            }
        });
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Settings</h1>
                <Button variant="outline" asChild>
                    <Link href="/settings/bot" className="inline-flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Bot settings
                    </Link>
                </Button>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>Manage organization details and WhatsApp configuration.</CardDescription>
                </CardHeader>
                <form action={handleSave}>
                    <input type="hidden" name="id" value={org.id} />
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Organization Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={org.name}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug (Read-only)</Label>
                                <Input
                                    id="slug"
                                    value={org.slug}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="display_phone_number">Display Phone Number</Label>
                                <Input
                                    id="display_phone_number"
                                    name="display_phone_number"
                                    defaultValue={org.display_phone_number || ""}
                                    placeholder="+1 555 123 4567"
                                />
                                <p className="text-xs text-muted-foreground">The number displayed on your WhatsApp profile.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                                <Input
                                    id="phone_number_id"
                                    name="phone_number_id"
                                    defaultValue={org.phone_number_id || ""}
                                    placeholder="e.g. 100000000000000"
                                />
                                <p className="text-xs text-muted-foreground">Found in your Meta App Dashboard under WhatsApp API Setup.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="whatsapp_business_account_id">WhatsApp Business Account ID</Label>
                                <Input
                                    id="whatsapp_business_account_id"
                                    name="whatsapp_business_account_id"
                                    defaultValue={org.whatsapp_business_account_id || ""}
                                    placeholder="e.g. 1163577092530240"
                                />
                                <p className="text-xs text-muted-foreground">Required to create templates in Meta.</p>
                            </div>
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

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Base de templates de correo</CardTitle>
                    <CardDescription>Configura logo, encabezado y footer para todas las comunicaciones.</CardDescription>
                </CardHeader>
                {templateBase ? (
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSaveTemplateBase}>
                            <div className="space-y-2">
                                <Label htmlFor="logo_url">Logo (URL)</Label>
                                <Input
                                    id="logo_url"
                                    value={templateBase.logo_url || ""}
                                    onChange={(e) => setTemplateBase((prev) => prev ? { ...prev, logo_url: e.target.value } : prev)}
                                    placeholder="https://cdn.tu-colegio.com/logo.png"
                                />
                                <p className="text-xs text-muted-foreground">Se utiliza en el encabezado y en la vista previa.</p>
                            </div>
                            <HtmlEditor
                                id="header_html"
                                label="Encabezado HTML"
                                description="Incluye logo, titulo o un CTA corto."
                                value={templateBase.header_html || ""}
                                onChange={(value) => setTemplateBase((prev) => prev ? { ...prev, header_html: value } : prev)}
                                minHeight="140px"
                            />
                            <HtmlEditor
                                id="footer_html"
                                label="Footer HTML"
                                description="Datos de contacto, campus, horarios o redes."
                                value={templateBase.footer_html || ""}
                                onChange={(value) => setTemplateBase((prev) => prev ? { ...prev, footer_html: value } : prev)}
                                minHeight="140px"
                            />
                            <CardFooter className="px-0 pt-2">
                                <Button type="submit" disabled={isSavingBase}>
                                    {isSavingBase && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar base
                                </Button>
                            </CardFooter>
                        </form>
                    </CardContent>
                ) : (
                    <CardContent>
                        <div className="text-sm text-muted-foreground">Cargando base...</div>
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Knowledge base</CardTitle>
                    <CardDescription>Información que el bot puede usar para responder.</CardDescription>
                </CardHeader>
                <CardContent>
                    {knowledge.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No hay elementos aún.</div>
                    ) : (
                        <div className="space-y-3">
                            {knowledge.map((item) => (
                                <div key={item.id} className="border rounded-lg p-3 flex items-start gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">{item.title}</p>
                                            {item.category && (
                                                <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{item.category}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                                            {item.content}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={isDeleting}
                                        onClick={() => handleDeleteKnowledge(item.id)}
                                        aria-label="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Agregar conocimiento</CardTitle>
                    <CardDescription>Sube nuevos snippets de información.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-3" onSubmit={handleCreateKnowledge}>
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input
                                id="title"
                                name="title"
                                value={newKnowledge.title}
                                onChange={(e) => setNewKnowledge((prev) => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Categoría</Label>
                            <Input
                                id="category"
                                name="category"
                                value={newKnowledge.category}
                                onChange={(e) => setNewKnowledge((prev) => ({ ...prev, category: e.target.value }))}
                                placeholder="FAQ, Políticas, Productos..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Contenido</Label>
                            <textarea
                                id="content"
                                name="content"
                                value={newKnowledge.content}
                                onChange={(e) => setNewKnowledge((prev) => ({ ...prev, content: e.target.value }))}
                                className="w-full min-h-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Texto detallado que el bot puede citar o resumir"
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSavingKnowledge}>
                                {isSavingKnowledge && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Plus className="h-4 w-4 mr-1" />
                                Guardar
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

type KnowledgeItem = {
    id: string;
    organization_id: string;
    title: string;
    category: string | null;
    content: string;
    updated_at?: string;
};
