"use client"

import { Bell, Search } from "lucide-react"
import { usePathname } from "next/navigation"
import { Input } from "@/src/components/ui/input"
import { Button } from "@/src/components/ui/button"
import { SidebarTrigger } from "@/src/components/ui/sidebar"
import { Separator } from "@/src/components/ui/separator"

export function TopNav() {
    const pathname = usePathname()

    // Get the current page title based on the path
    const pathSegments = pathname.split('/').filter(Boolean)
    const currentTitle = pathSegments.length > 0
        ? pathSegments[pathSegments.length - 1].charAt(0).toUpperCase() + pathSegments[pathSegments.length - 1].slice(1)
        : "Dashboard"

    return (
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-6 py-4">
            <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <h1 className="text-xl font-semibold text-foreground">{currentTitle}</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-full md:w-[200px] lg:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search"
                        className="w-full bg-muted/50 pl-9 shadow-none"
                    />
                </div>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                    <span className="sr-only">Notifications</span>
                </Button>
            </div>
        </header>
    )
}
