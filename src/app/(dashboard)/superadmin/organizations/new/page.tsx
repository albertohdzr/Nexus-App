"use client"

import { Button } from "@/src/components/ui/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/src/components/ui/field"
import { Input } from "@/src/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select"
import { createOrganizationAction } from "@/src/app/actions/organizations"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function NewOrganizationPage() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        try {
            const result = await createOrganizationAction(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success("Organization created successfully")
                // Redirect is handled in server action, but we can also do it here if needed
            }
        } catch (error) {
            console.error("Client side error:", error)
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Organization</h2>
                    <p className="text-muted-foreground">
                        Add a new organization and assign an administrator.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Organization Details</h3>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">Organization Name</FieldLabel>
                            <Input id="name" name="name" placeholder="Acme Corp" required />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="slug">Slug (Subdomain)</FieldLabel>
                            <Input id="slug" name="slug" placeholder="acme" required />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="plan">Plan</FieldLabel>
                            <Select name="plan" defaultValue="free">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </FieldGroup>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Administrator Details</h3>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="adminName">Full Name</FieldLabel>
                            <Input id="adminName" name="adminName" placeholder="John Doe" required />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="adminEmail">Email</FieldLabel>
                            <Input id="adminEmail" name="adminEmail" type="email" placeholder="john@acme.com" required />
                        </Field>
                    </FieldGroup>
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Creating..." : "Create Organization"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
