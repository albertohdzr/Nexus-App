export type PermissionActions = Record<string, boolean>;

export type PermissionsByModule = Record<string, PermissionActions>;

export type PermissionRequirement = {
  module: string;
  action?: string;
};
