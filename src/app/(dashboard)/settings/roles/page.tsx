"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/src/lib/supabase/client";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { createRole, updateRolePermissions } from "./actions";

type Role = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type PermissionMatrix = Record<string, Record<string, boolean>>;

const MODULES = [
  {
    module: "crm",
    label: "CRM",
    actions: [
      { key: "access", label: "Acceso" },
      { key: "manage_appointments", label: "Citas" },
      { key: "manage_templates", label: "Plantillas" },
      { key: "manage_whatsapp_templates", label: "WhatsApp" },
    ],
  },
  {
    module: "admissions",
    label: "Admissions",
    actions: [{ key: "access", label: "Acceso" }],
  },
  {
    module: "finance",
    label: "Finance",
    actions: [{ key: "access", label: "Acceso" }],
  },
  {
    module: "erp",
    label: "ERP",
    actions: [{ key: "access", label: "Acceso" }],
  },
  {
    module: "settings",
    label: "Settings",
    actions: [
      { key: "access", label: "Acceso" },
      { key: "manage_org", label: "Organizacion" },
      { key: "manage_team", label: "Equipo" },
      { key: "manage_roles", label: "Roles" },
      { key: "manage_directory", label: "Directorio" },
      { key: "manage_bot", label: "Bot" },
    ],
  },
  {
    module: "ai_audit",
    label: "AI Logs",
    actions: [{ key: "access", label: "Acceso" }],
  },
];

export default function RolesPage() {
  const supabase = createClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionsByRole, setPermissionsByRole] = useState<Record<string, PermissionMatrix>>({});
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [newRole, setNewRole] = useState({ name: "", slug: "", description: "" });

  const defaultPermissions = useMemo(() => {
    const matrix: PermissionMatrix = {};
    MODULES.forEach((module) => {
      matrix[module.module] = {};
      module.actions.forEach((action) => {
        matrix[module.module][action.key] = false;
      });
    });
    return matrix;
  }, []);

  const loadRoles = async () => {
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

    const { data: rolesData } = await supabase
      .from("roles")
      .select("id, name, slug, description")
      .eq("organization_id", profile.organization_id)
      .order("name", { ascending: true });

    const roleIds = (rolesData || []).map((role) => role.id);
    const { data: permissionRows } = roleIds.length
      ? await supabase
          .from("role_permissions")
          .select("role_id, module, permissions")
          .in("role_id", roleIds)
      : { data: [] };

    const nextPermissions: Record<string, PermissionMatrix> = {};
    (rolesData || []).forEach((role) => {
      nextPermissions[role.id] = JSON.parse(JSON.stringify(defaultPermissions));
    });

    (permissionRows || []).forEach((row) => {
      const existing = nextPermissions[row.role_id];
      if (!existing) return;
      existing[row.module] = {
        ...existing[row.module],
        ...(row.permissions || {}),
      };
    });

    setRoles((rolesData || []) as Role[]);
    setPermissionsByRole(nextPermissions);
    setLoading(false);
  };

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPermissions]);

  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      const result = await createRole(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Rol creado");
      setNewRole({ name: "", slug: "", description: "" });
      await loadRoles();
    });
  };

  const handleSavePermissions = async (roleId: string) => {
    const formData = new FormData();
    formData.append("role_id", roleId);
    formData.append("permissions", JSON.stringify(permissionsByRole[roleId] || {}));
    startTransition(async () => {
      const result = await updateRolePermissions(formData);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Permisos guardados");
    });
  };

  const togglePermission = (roleId: string, module: string, action: string) => {
    setPermissionsByRole((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [module]: {
          ...prev[roleId]?.[module],
          [action]: !prev[roleId]?.[module]?.[action],
        },
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-muted-foreground">Cargando roles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">Roles & Permissions</h2>
        <p className="text-sm text-muted-foreground">
          Crea roles personalizados y define que modulos puede usar cada usuario.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo rol</CardTitle>
          <CardDescription>Define el nombre y slug que identificara el rol.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="role-name">Nombre</Label>
              <Input
                id="role-name"
                name="name"
                value={newRole.name}
                onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-slug">Slug</Label>
              <Input
                id="role-slug"
                name="slug"
                value={newRole.slug}
                onChange={(e) => setNewRole((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="direccion, admisiones, ventas"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="role-description">Descripcion</Label>
              <Input
                id="role-description"
                name="description"
                value={newRole.description}
                onChange={(e) => setNewRole((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isPending || !newRole.name.trim()}>
                {isPending ? "Creando..." : "Crear rol"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle>{role.name}</CardTitle>
              <CardDescription>{role.slug}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {MODULES.map((module) => (
                  <div key={module.module} className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-semibold">{module.label}</p>
                    <div className="space-y-2">
                      {module.actions.map((action) => (
                        <label key={action.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={Boolean(
                              permissionsByRole[role.id]?.[module.module]?.[action.key]
                            )}
                            onCheckedChange={() =>
                              togglePermission(role.id, module.module, action.key)
                            }
                          />
                          <span>{action.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => handleSavePermissions(role.id)}
                disabled={isPending}
                variant="outline"
              >
                {isPending ? "Guardando..." : "Guardar permisos"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!roles.length && (
          <p className="text-sm text-muted-foreground">No hay roles configurados.</p>
        )}
      </div>
    </div>
  );
}
