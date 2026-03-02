"use client"

import { Button } from "@/src/components/ui/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/src/components/ui/field"
import { Input } from "@/src/components/ui/input"
import { useState } from "react"
import { createClient } from "@/src/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function ChangePasswordPage() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        setLoading(true)

        try {
            // 1. Get current user BEFORE password change (session is still fully valid)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                toast.error("Sesión no válida. Inicia sesión de nuevo.")
                router.push("/login")
                return
            }

            // 2. Clear force_password_change flag FIRST (while current session is valid)
            //    After updateUser(), Supabase triggers a token refresh that can
            //    momentarily invalidate the session in production (Secure cookies).
            const { error: profileError } = await supabase
                .from("user_profiles")
                .update({ force_password_change: false })
                .eq("id", user.id)

            if (profileError) {
                console.error("Failed to update profile:", profileError)
                toast.error("No se pudo actualizar tu perfil. Intenta de nuevo.")
                return
            }

            // 3. Now change the password (this may trigger session refresh)
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) {
                // Rollback: re-set the flag since password change failed
                await supabase
                    .from("user_profiles")
                    .update({ force_password_change: true })
                    .eq("id", user.id)
                toast.error(error.message)
                return
            }

            toast.success("Contraseña actualizada exitosamente")

            // Small delay to let Supabase propagate the new session
            await new Promise(resolve => setTimeout(resolve, 500))
            router.push("/home")

        } catch (error) {
            toast.error("An unexpected error occurred")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
            <div className="w-full max-w-sm">
                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                    <FieldGroup>
                        <div className="flex flex-col items-center gap-1 text-center">
                            <h1 className="text-2xl font-bold">Change Password</h1>
                            <p className="text-muted-foreground text-sm text-balance">
                                You must change your password before continuing.
                            </p>
                        </div>
                        <Field>
                            <FieldLabel htmlFor="password">New Password</FieldLabel>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <Button type="submit" disabled={loading}>
                                {loading ? "Updating..." : "Update Password"}
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </div>
        </div>
    )
}
