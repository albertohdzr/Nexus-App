"use client"

import { User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/src/lib/supabase/client"

type AuthContextType = {
    user: User | null
    role: string | null
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    isLoading: true,
})

export const useUser = () => useContext(AuthContext)

export function AuthProvider({
    children,
    initialUser,
    initialRole,
}: {
    children: React.ReactNode
    initialUser: User | null
    initialRole: string | null
}) {
    const [user, setUser] = useState<User | null>(initialUser)
    const [role, setRole] = useState<string | null>(initialRole)
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
                setRole(null)
            }
            setIsLoading(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase, user])

    return (
        <AuthContext.Provider value={{ user, role, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}
