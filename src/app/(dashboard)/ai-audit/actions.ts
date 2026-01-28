"use server";

import { createClient } from "@/src/lib/supabase/server";

export type AiLog = {
    id: string;
    created_at: string;
    organization_id: string;
    chat_id: string;
    conversation_id: string | null;
    event_type: string;
    payload: Record<string, unknown>;
    idx?: number;
};

export async function getAiLogs() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.organization_id) {
        return { error: "Organization not found" };
    }

    const { data, error } = await supabase
        .from("ai_logs")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(500);

    if (error) {
        console.error("Error fetching AI logs", error);
        return { error: "Failed to fetch logs" };
    }

    return { data: data as AiLog[] };
}
