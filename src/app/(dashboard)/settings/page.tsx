"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { Label } from "@/src/components/ui/label";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Organization } from "@/src/types/organization";
import { updateOrganization } from "./actions";

export default function SettingsPage() {
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const supabase = createClient();

    useEffect(() => {
        const fetchOrg = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("organization_id")
                .eq("id", user.id)
                .single();

            if (profile?.organization_id) {
                const { data: orgData } = await supabase
                    .from("organizations")
                    .select("*")
                    .eq("id", profile.organization_id)
                    .single();

                if (orgData) {
                    setOrg(orgData);
                }
            }
            setLoading(false);
        };

        fetchOrg();
    }, [supabase]);

    const handleSave = async (formData: FormData) => {
        startTransition(async () => {
            const result = await updateOrganization(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Organization settings updated");
            }
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="p-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Organization Not Found</CardTitle>
                        <CardDescription>You do not appear to belong to an organization.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>Manage your organization details and WhatsApp configuration.</CardDescription>
                </CardHeader>
                <form action={handleSave}>
                    <input type="hidden" name="id" value={org.id} />
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Organization Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={org.name}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug (Read-only)</Label>
                            <Input
                                id="slug"
                                value={org.slug}
                                disabled
                                className="bg-muted"
                            />
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold mb-4">WhatsApp Configuration</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="display_phone_number">Display Phone Number</Label>
                                    <Input
                                        id="display_phone_number"
                                        name="display_phone_number"
                                        defaultValue={org.display_phone_number || ""}
                                        placeholder="+1 555 123 4567"
                                    />
                                    <p className="text-xs text-muted-foreground">The number displayed on your WhatsApp profile.</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone_number_id">Phone Number ID</Label>
                                    <Input
                                        id="phone_number_id"
                                        name="phone_number_id"
                                        defaultValue={org.phone_number_id || ""}
                                        placeholder="e.g. 100000000000000"
                                    />
                                    <p className="text-xs text-muted-foreground">Found in your Meta App Dashboard under WhatsApp API Setup.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
