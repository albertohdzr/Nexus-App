"use client"

import { User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/src/lib/supabase/client"
import type { PermissionsByModule } from "@/src/types/permissions"

type AuthContextType = {
    user: User | null
    roleSlug: string | null
    roleName: string | null
    permissions: PermissionsByModule
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    roleSlug: null,
    roleName: null,
    permissions: {},
    isLoading: true,
})

export const useUser = () => useContext(AuthContext)

export function AuthProvider({
    children,
    initialUser,
    initialRoleSlug,
    initialRoleName,
    initialPermissions,
}: {
    children: React.ReactNode
    initialUser: User | null
    initialRoleSlug: string | null
    initialRoleName: string | null
    initialPermissions: PermissionsByModule
}) {
    const [user, setUser] = useState<User | null>(initialUser)
    const [roleSlug, setRoleSlug] = useState<string | null>(initialRoleSlug)
    const [roleName, setRoleName] = useState<string | null>(initialRoleName)
    const [permissions, setPermissions] = useState<PermissionsByModule>(initialPermissions)
    const [isLoading, setIsLoading] = useState(!initialUser)
    const supabase = createClient()

    useEffect(() => {
        if (!user) {
            const getUser = async () => {
                const {
                    data: { user },
                } = await supabase.auth.getUser()

                if (user) {
                    setUser(user)
                    // Fetch role if not provided initially (though ideally it should be)
                    // For now we assume initialRole covers the server-side fetch
                    // If we need client-side role fetching on session refresh, we'd add it here
                }
                setIsLoading(false)
            }
            getUser()
        } else {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsLoading(false)
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user)
                // Ideally we'd re-fetch the role here if the user changed
            } else {
                setUser(null)
                setRoleSlug(null)
                setRoleName(null)
                setPermissions({})
            }
            setIsLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase, user])

    return (
        <AuthContext.Provider value={{ user, roleSlug, roleName, permissions, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}
