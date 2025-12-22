
"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal,
} from "@/src/components/ui/dropdown-menu"
import { useUser } from "@/src/components/providers/auth-provider"
import { createClient } from "@/src/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Laptop, Moon, Sun, LogOut, User, Settings } from "lucide-react"
import { useTheme } from "next-themes"

interface UserNavProps {
    showDetails?: boolean
}

export function UserNav({ showDetails = false }: UserNavProps) {
    const { user } = useUser()
    const router = useRouter()
    const supabase = createClient()
    const { setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    if (!mounted || !user) {
        return <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
    }

    // Get initials from metadata or email
    const fullName = user.user_metadata?.full_name || "User"
    const email = user.email || ""
    const initials = fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn("relative h-8 w-8 rounded-full overflow-hidden", showDetails && "h-auto w-full justify-start px-2 rounded-lg hover:bg-sidebar-accent")}>
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={user.user_metadata?.avatar_url} alt={fullName} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    {showDetails && (
                        <div className="flex flex-col items-start ml-3 text-sm flex-1 min-w-0 pr-2">
                            <span className="font-medium truncate w-full text-left">{fullName}</span>
                            <span className="text-xs text-muted-foreground truncate w-full text-left">{email}</span>
                        </div>
                    )}
                    {showDetails && (
                        <div className="ml-auto shrink-0">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </div>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align={showDetails ? "start" : "end"} forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{fullName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/settings/profile")}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                        <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="ml-2">Theme</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                                <DropdownMenuItem onClick={() => setTheme("light")}>
                                    <Sun className="mr-2 h-4 w-4" />
                                    <span>Light</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("dark")}>
                                    <Moon className="mr-2 h-4 w-4" />
                                    <span>Dark</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("system")}>
                                    <Laptop className="mr-2 h-4 w-4" />
                                    <span>System</span>
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
