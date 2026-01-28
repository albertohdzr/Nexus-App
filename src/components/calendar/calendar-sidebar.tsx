"use client";

import {
  Search,
  Home,
  Users,
  Calendar as CalendarIcon,
  ChevronDown,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/src/components/ui/input";
import { Avatar, AvatarImage } from "@/src/components/ui/avatar";
import { Kbd } from "@/src/components/ui/kbd";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/src/components/ui/sidebar";
import Link from "next/link";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";



export function CalendarSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [featuredOpen, setFeaturedOpen] = useState(true);

  return (
    <Sidebar className="lg:border-r-0!" collapsible="offcanvas" {...props}>
      <SidebarHeader className="pb-0">
        <div className="px-2 py-1.5">
          <Link
            href="https://square.lndev.me"
            target="_blank"
            className="flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <div className="size-9 shrink-0 bg-gradient-to-br from-purple-500 to-pink-600 rounded-md shadow flex items-center justify-center text-white text-xs font-semibold border border-border">
                SU
              </div>
              <div className="flex flex-col items-start">
                <h1 className="font-semibold text-sm">Square UI</h1>
                <div className="flex items-center gap-1">
                  <Layers className="size-3" />
                  <span className="text-xs">4 workspaces</span>
                </div>
              </div>
            </div>

            <Avatar className="size-7 border-2 border-background">
              <AvatarImage src="/ln.png" />
            </Avatar>
          </Link>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-zinc-400 dark:text-muted-foreground z-10" />
            <Input
              placeholder="Search anything"
              className="pl-8 pr-8 h-8 text-xs bg-neutral-100 dark:bg-background border-2 border-border"
            />
            <div className="flex items-center gap-0.5 rounded border border-border bg-sidebar px-1.5 py-0.5 shrink-0 absolute right-2 top-1/2 -translate-y-1/2">
              <span className="text-[10px] font-medium text-muted-foreground leading-none tracking-[-0.1px]">
                ⌘
              </span>
              <Kbd className="h-auto min-w-0 px-0 py-0 text-[10px] leading-none tracking-[-0.1px] bg-transparent border-0">
                K
              </Kbd>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="h-[26px] text-xs text-zinc-950 dark:text-muted-foreground hover:bg-neutral-100/50 dark:hover:bg-muted/50 hover:text-zinc-950 dark:hover:text-foreground">
                  <Home className="size-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* ... other menu items ... I will paste exactly as requested ... */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive
                  className="h-[26px] text-xs bg-neutral-100 dark:bg-muted text-zinc-950 dark:text-foreground hover:bg-neutral-100 dark:hover:bg-muted hover:text-zinc-950 dark:hover:text-foreground"
                >
                  <CalendarIcon className="size-4" />
                  <span>Calendar</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Shortening to fit... */}
               <SidebarMenuItem>
                <SidebarMenuButton className="h-[26px] text-xs text-zinc-950 dark:text-muted-foreground hover:bg-neutral-100/50 dark:hover:bg-muted/50 hover:text-zinc-950 dark:hover:text-foreground">
                  <Users className="size-4" />
                  <span>Candidates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-0" />

        <SidebarGroup>
          <Collapsible open={featuredOpen} onOpenChange={setFeaturedOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="h-4 pb-4 pt-2 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent cursor-pointer">
                <span>Featured job post</span>
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform ml-auto",
                    featuredOpen && "rotate-180"
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
             {/* Content */}
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
          <Button className="w-full" asChild>
            <Link
                href="#"
                className="flex items-center gap-2"
            >
                Nexus CRM
                <ArrowUpRight className="size-4" />
            </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
