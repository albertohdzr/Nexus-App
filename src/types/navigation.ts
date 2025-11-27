import { type ComponentType } from "react";

export type UserRole =
  | "superadmin"
  | "org_admin"
  | "director"
  | "admissions"
  | "teacher"
  | "finance"
  | "staff"
  | "parent"
  | "student";

export interface NavItem {
  title: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

export interface ModuleConfig {
  key: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  roles?: UserRole[];
  subNavigation: NavItem[];
}
