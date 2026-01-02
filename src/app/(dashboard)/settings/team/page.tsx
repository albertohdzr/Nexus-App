"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { createTeamMember, updateTeamMemberRole } from "./actions";

type RoleOption = {
  id: string;
  name: string;
  slug: string;
};

type TeamMember = {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  role_id: string | null;
  role: RoleOption | null;
};

export default function TeamPage() {
  const supabase = createClient();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [newMember, setNewMember] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_id: "",
  });

  const canSubmit = useMemo(
    () => newMember.full_name.trim() && newMember.email.trim() && newMember.role_id,
    [newMember]
  );

  const loadTeam = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    const [{ data: roleData }, { data: memberData }] = await Promise.all([
      supabase
        .from("roles")
        .select("id, name, slug")
        .eq("organization_id", profile.organization_id)
        .order("name", { ascending: true }),
      supabase
        .from("user_profiles")
        .select("id, full_name, email, is_active, role_id, role:roles(id, name, slug)")
        .eq("organization_id", profile.organization_id)
        .order("full_name", { ascending: true }),
    ]);

    setRoles((roleData || []) as RoleOption[]);
    const normalizedMembers = (memberData || []).map((member) => {
      const role = Array.isArray(member.role) ? member.role[0] : member.role;
      return {
        ...member,
        role: role ? { id: role.id, name: role.name, slug: role.slug } : null,
      } as TeamMember;
    });
    setMembers(normalizedMembers);
    setLoading(false);
  };

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createTeamMember(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Miembro agregado");
      setNewMember({ full_name: "", email: "", phone: "", role_id: "" });
      await loadTeam();
    });
  };

  const handleRoleChange = async (memberId: string, roleId: string) => {
    const formData = new FormData();
    formData.append("member_id", memberId);
    formData.append("role_id", roleId);
    startTransition(async () => {
      const result = await updateTeamMemberRole(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Rol actualizado");
      await loadTeam();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Cargando equipo...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Team</h2>
        <p className="text-sm text-muted-foreground">
          Administra miembros, roles y accesos dentro de tu organizacion.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregar miembro</CardTitle>
          <CardDescription>
            Se enviara un correo con credenciales temporales y el rol asignado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <Input
                id="full_name"
                name="full_name"
                value={newMember.full_name}
                onChange={(e) => setNewMember((prev) => ({ ...prev, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                name="phone"
                value={newMember.phone}
                onChange={(e) => setNewMember((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <input type="hidden" name="role_id" value={newMember.role_id} />
              <Select
                value={newMember.role_id}
                onValueChange={(value) => setNewMember((prev) => ({ ...prev, role_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={!canSubmit || isPending}>
                {isPending ? "Creando..." : "Crear miembro"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Miembros actuales</CardTitle>
          <CardDescription>Actualiza roles y revisa el estado del equipo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 border rounded-lg p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{member.full_name || "Sin nombre"}</p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {member.is_active ? "Activo" : "Inactivo"}
                </span>
                <Select
                  value={member.role_id || ""}
                  onValueChange={(value) => handleRoleChange(member.id, value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="min-w-[200px]">
                    <SelectValue placeholder="Selecciona rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
          {!members.length && (
            <p className="text-sm text-muted-foreground">No hay miembros registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
