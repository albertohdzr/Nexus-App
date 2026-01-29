"use client";

import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { SidebarTrigger } from "@/src/components/ui/sidebar";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Sparkles,
  Plus,
  Mail,
  Link2,
  Users,
  ArrowLeft,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useHeaderActionsConfig, type HeaderAction } from "@/src/components/providers/header-actions-provider";

export function DashboardHeader() {
  const pathname = usePathname();
  const headerConfig = useHeaderActionsConfig();

  // Helper to determine title from path
  const getPageTitle = (path: string) => {
    // Si hay un título personalizado en la configuración, usarlo
    if (headerConfig?.title) {
      return headerConfig.title;
    }

    if (path === '/' || path === '/home') return 'Dashboard';

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';

    const lastSegment = segments[segments.length - 1];
    
    // Check if last segment is an ID (e.g. UUID or long string), if so take the one before
    const isId = lastSegment.length > 20 || !isNaN(Number(lastSegment));
    const titleSegment = isId && segments.length > 1 ? segments[segments.length - 2] : lastSegment;

    // Handle standard "home" segment
    if (titleSegment === 'home') return 'Dashboard';

    // Special formatting map
    const specialTitles: Record<string, string> = {
        crm: 'CRM',
        chat: 'Chat',
        admissions: 'Admissions',
        finance: 'Finance',
        settings: 'Settings',
        bot: 'Bot',
        directory: 'Directory',
        leads: 'Leads',
        calendar: 'Calendar',
        appointments: 'Appointments',
    };

    if (specialTitles[titleSegment.toLowerCase()]) {
        return specialTitles[titleSegment.toLowerCase()];
    }

    // Default formatting: Capitalize and replace hyphens
    return titleSegment
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  };

  const title = getPageTitle(pathname);

  // Renderizar una acción individual
  const renderAction = (action: HeaderAction) => {
    // Si tiene un component personalizado, renderizarlo directamente
    if (action.component) {
      return <div key={action.id}>{action.component}</div>;
    }

    const Icon = action.icon;
    const variant = action.variant || "outline";

    // Si tiene href, es un Link
    if (action.href) {
      return (
        <Button key={action.id} variant={variant} size="sm" asChild className="gap-2 h-7">
          <Link href={action.href}>
            {Icon && <Icon className="size-3.5" />}
            {action.label && <span className="hidden sm:inline">{action.label}</span>}
          </Link>
        </Button>
      );
    }

    // Si tiene onClick, es un Button
    if (action.onClick) {
      return (
        <Button 
          key={action.id} 
          variant={variant} 
          size="sm" 
          onClick={action.onClick}
          className="gap-2 h-7"
        >
          {Icon && <Icon className="size-3.5" />}
          {action.label && <span className="hidden sm:inline">{action.label}</span>}
        </Button>
      );
    }

    return null;
  };

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-card sticky top-0 z-10 w-full">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-2" />
        
        {/* Back button (si está configurado) */}
        {headerConfig?.backButton && (
          <>
            <div className="h-5 w-px bg-border" />
            <Button variant="ghost" size="sm" asChild className="gap-1.5 h-7 -ml-1">
              <Link href={headerConfig.backButton.href}>
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline text-sm">
                  {headerConfig.backButton.label || "Volver"}
                </span>
              </Link>
            </Button>
          </>
        )}

        <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Page Actions (acciones contextuales de la página) */}
        {headerConfig?.actions && headerConfig.actions.length > 0 && (
          <>
            <div className="flex items-center gap-1.5">
              {headerConfig.actions.map(renderAction)}
            </div>
            <div className="h-5 w-px bg-border mx-1" />
          </>
        )}

        {/* Global Actions */}
        <div className="hidden lg:flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex -space-x-2 mr-3 cursor-pointer hover:opacity-80 transition-opacity">
                <Avatar className="size-6 border-2 border-card">
                  <AvatarImage src="https://api.dicebear.com/9.x/glass/svg?seed=user1" />
                  <AvatarFallback className="text-[9px]">U1</AvatarFallback>
                </Avatar>
                <Avatar className="size-6 border-2 border-card">
                  <AvatarImage src="https://api.dicebear.com/9.x/glass/svg?seed=user2" />
                  <AvatarFallback className="text-[9px]">U2</AvatarFallback>
                </Avatar>
                <Avatar className="size-6 border-2 border-card">
                  <AvatarImage src="https://api.dicebear.com/9.x/glass/svg?seed=user3" />
                  <AvatarFallback className="text-[9px]">U3</AvatarFallback>
                </Avatar>
                <div className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted">
                  <Plus className="size-3" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Team Members
                </p>
              </div>
              <DropdownMenuItem>
                <Avatar className="size-5 mr-2">
                  <AvatarImage src="https://api.dicebear.com/9.x/glass/svg?seed=user1" />
                  <AvatarFallback className="text-[9px]">U1</AvatarFallback>
                </Avatar>
                <span>Sarah M.</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Avatar className="size-5 mr-2">
                  <AvatarImage src="https://api.dicebear.com/9.x/glass/svg?seed=user2" />
                  <AvatarFallback className="text-[9px]">U2</AvatarFallback>
                </Avatar>
                <span>James K.</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Avatar className="size-5 mr-2">
                  <AvatarImage src="https://api.dicebear.com/9.x/glass/svg?seed=user3" />
                  <AvatarFallback className="text-[9px]">U3</AvatarFallback>
                </Avatar>
                <span>Emily R.</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Mail className="size-4 mr-2" />
                <span>Invite by email</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link2 className="size-4 mr-2" />
                <span>Copy invite link</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Users className="size-4 mr-2" />
                <span>Manage team</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="h-5 w-px bg-border mx-2" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 hidden sm:flex"
            >
              <Sparkles className="size-3.5" />
              <span className="text-sm">Ask AI</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Generate report</DropdownMenuItem>
            <DropdownMenuItem>Analyze leads</DropdownMenuItem>
            <DropdownMenuItem>Suggest follow-ups</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />
      </div>
    </header>
  );
}

export function WelcomeSection() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          Welcome Back LN!
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Let&apos;s tackle down some work
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="h-9 gap-1.5 bg-card hover:bg-card/80 border-border/50"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add Project</span>
        </Button>
        <Button className="h-9 gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white border border-border/50">
          <Users className="size-4" />
          <span className="hidden sm:inline">New Client</span>
        </Button>
      </div>
    </div>
  );
}
