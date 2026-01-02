import { type ComponentType } from "react";
import type { PermissionRequirement } from "@/src/types/permissions";

export type UserRole = string;

export interface NavItem {
  title: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  permission?: PermissionRequirement;
}

export interface ModuleConfig {
  key: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  permission?: PermissionRequirement;
  subNavigation: NavItem[];
}
