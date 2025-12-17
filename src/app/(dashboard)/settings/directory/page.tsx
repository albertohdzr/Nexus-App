"use client";

import { useEffect, useState, useTransition } from "react";
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
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Organization } from "@/src/types/organization";
import { updateOrganization } from "../actions";
import { deleteDirectoryContact, saveDirectoryContact } from "./actions";

type DirectoryContact = {
  id: string;
  organization_id: string;
  role_slug: string;
  display_role: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  extension?: string | null;
  mobile?: string | null;
  notes?: string | null;
  allow_bot_share?: boolean | null;
  share_email?: boolean | null;
  share_phone?: boolean | null;
  share_extension?: boolean | null;
  share_mobile?: boolean | null;
  is_active?: boolean | null;
};

export default function DirectorySettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [contacts, setContacts] = useState<DirectoryContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [contactPending, startContactTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) {
        setLoading(false);
        return;
      }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single();

      const { data: directory } = await supabase
        .from("directory_contacts")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("display_role", { ascending: true });

      if (orgData) setOrg(orgData);
      setContacts((directory || []) as DirectoryContact[]);
      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const handleToggleBot = async (formData: FormData) => {
    if (!org) return;
    startTransition(async () => {
      const res = await updateOrganization(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Configuración actualizada");
        setOrg({ ...org, bot_directory_enabled: formData.get("bot_directory_enabled") === "on" });
      }
    });
  };

  const handleSaveContact = async (formData: FormData) => {
    startContactTransition(async () => {
      const res = await saveDirectoryContact({} as any, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "Contacto guardado");
        await reloadContacts();
      }
    });
  };

  const handleDeleteContact = async (formData: FormData) => {
    startContactTransition(async () => {
      const res = await deleteDirectoryContact(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.success || "Contacto eliminado");
        await reloadContacts();
      }
    });
  };

  const reloadContacts = async () => {
    if (!org) return;
    const { data: directory } = await supabase
      .from("directory_contacts")
      .select("*")
      .eq("organization_id", org.id)
      .order("display_role", { ascending: true });
    setContacts((directory || []) as DirectoryContact[]);
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
            <CardDescription>No encontramos tu organización.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Directorio de contactos</h1>
        <form action={handleToggleBot} className="flex items-center gap-2 text-sm">
          <input type="hidden" name="id" value={org.id} />
          <input
            type="checkbox"
            id="bot_directory_enabled"
            name="bot_directory_enabled"
            defaultChecked={Boolean(org.bot_directory_enabled)}
          />
          <Label htmlFor="bot_directory_enabled">Habilitar para el bot</Label>
          <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Nuevo contacto</CardTitle>
          </div>
          <CardDescription>Define puesto, datos de contacto y permisos para el bot.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSaveContact} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Identificador (slug)</Label>
              <Input name="role_slug" placeholder="caja, direccion, admisiones" />
            </div>
            <div className="space-y-2">
              <Label>Puesto</Label>
              <Input name="display_role" placeholder="Caja / Dirección / Admissions" />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input name="name" placeholder="Nombre completo" />
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input name="email" type="email" placeholder="correo@escuela.mx" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input name="phone" placeholder="Teléfono fijo" />
            </div>
            <div className="space-y-2">
              <Label>Extensión</Label>
              <Input name="extension" placeholder="Extensión" />
            </div>
            <div className="space-y-2">
              <Label>Móvil</Label>
              <Input name="mobile" placeholder="Número móvil" />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input name="notes" placeholder="Horario o aclaraciones" />
            </div>
            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allow_bot_share" />
                <span>El bot puede compartir este contacto</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="share_email" />
                <span>Compartir correo</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="share_phone" />
                <span>Compartir teléfono</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="share_extension" />
                <span>Compartir extensión</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="share_mobile" />
                <span>Compartir móvil</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_active" defaultChecked />
                <span>Activo</span>
              </label>
            </div>
            <div className="col-span-full flex justify-end">
              <Button type="submit" disabled={contactPending}>
                {contactPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar contacto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {contacts.map((contact) => (
          <Card key={contact.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{contact.display_role}</CardTitle>
                  <CardDescription>{contact.name}</CardDescription>
                </div>
                <form action={handleDeleteContact}>
                  <input type="hidden" name="id" value={contact.id} />
                  <Button variant="ghost" size="icon" disabled={contactPending} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <form action={handleSaveContact} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="hidden" name="id" value={contact.id} />
                <div className="space-y-2">
                  <Label>Identificador (slug)</Label>
                  <Input name="role_slug" defaultValue={contact.role_slug} />
                </div>
                <div className="space-y-2">
                  <Label>Puesto</Label>
                  <Input name="display_role" defaultValue={contact.display_role} />
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input name="name" defaultValue={contact.name} />
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input name="email" type="email" defaultValue={contact.email || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input name="phone" defaultValue={contact.phone || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Extensión</Label>
                  <Input name="extension" defaultValue={contact.extension || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Móvil</Label>
                  <Input name="mobile" defaultValue={contact.mobile || ""} />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Input name="notes" defaultValue={contact.notes || ""} />
                </div>
                <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="allow_bot_share" defaultChecked={Boolean(contact.allow_bot_share)} />
                    <span>El bot puede compartir este contacto</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="share_email" defaultChecked={Boolean(contact.share_email)} />
                    <span>Compartir correo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="share_phone" defaultChecked={Boolean(contact.share_phone)} />
                    <span>Compartir teléfono</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="share_extension" defaultChecked={Boolean(contact.share_extension)} />
                    <span>Compartir extensión</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="share_mobile" defaultChecked={Boolean(contact.share_mobile)} />
                    <span>Compartir móvil</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="is_active" defaultChecked={Boolean(contact.is_active)} />
                    <span>Activo</span>
                  </label>
                </div>
                <CardFooter className="col-span-full px-0">
                  <Button type="submit" variant="secondary" disabled={contactPending}>
                    {contactPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar cambios
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        ))}
        {!contacts.length && (
          <p className="text-sm text-muted-foreground">No hay contactos aún.</p>
        )}
      </div>
    </div>
  );
}
