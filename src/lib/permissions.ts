import type { PermissionsByModule } from "@/src/types/permissions";

export function hasPermission(
  permissions: PermissionsByModule | null | undefined,
  module: string,
  action = "access",
  roleSlug?: string | null
): boolean {
  if (roleSlug === "superadmin") return true;
  if (!permissions) return false;
  const modulePerms = permissions[module];
  if (!modulePerms) return false;
  return Boolean(modulePerms[action]);
}
