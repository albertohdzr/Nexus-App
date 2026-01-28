/**
 * Appointments Auth Context Helper
 * Utility to get authenticated user context
 */

import { createClient } from "@/src/lib/supabase/server";

export interface UserContext {
    supabase: Awaited<ReturnType<typeof createClient>> | null;
    profile: {
        id: string;
        organization_id: string;
    } | null;
    error?: string;
}

export async function getUserContext(): Promise<UserContext> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "No autenticado", supabase: null, profile: null };
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("id, organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) {
        return {
            error: "No se encontró tu organización",
            supabase: null,
            profile: null,
        };
    }

    return { supabase, profile };
}
