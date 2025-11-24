"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/src/lib/utils";
import { createClient } from "@/src/lib/supabase/client";

type Chat = {
    id: string;
    wa_id: string;
    name: string;
    phone_number: string;
    updated_at: string;
    last_message?: string; // We might want to fetch this
};

export default function ChatSidebar() {
    const [chats, setChats] = useState<Chat[]>([]);
    const supabase = createClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedChatId = searchParams.get("chatId");

    useEffect(() => {
        const fetchChats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user's organization
            const { data: profile } = await supabase
                .from("user_profiles")
                .select("organization_id")
                .eq("id", user.id)
                .single();

            if (profile?.organization_id) {
                const { data, error } = await supabase
                    .from("chats")
                    .select("*")
                    .eq("organization_id", profile.organization_id)
                    .order("updated_at", { ascending: false });

                if (data) {
                    setChats(data);
                }

                // Subscribe to changes for this organization
                const channel = supabase
                    .channel("chats_channel")
                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema: "public",
                            table: "chats",
                            filter: `organization_id=eq.${profile.organization_id}`
                        },
                        (payload) => {
                            if (payload.eventType === "INSERT") {
                                setChats((prev) => [payload.new as Chat, ...prev]);
                            } else if (payload.eventType === "UPDATE") {
                                setChats((prev) =>
                                    prev.map((chat) =>
                                        chat.id === payload.new.id ? (payload.new as Chat) : chat
                                    ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                                );
                            }
                        }
                    )
                    .subscribe();

                return () => {
                    supabase.removeChannel(channel);
                };
            }
        };

        fetchChats();
    }, [supabase]);

    const handleChatClick = (chatId: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("chatId", chatId);
        router.push(`/chat?${params.toString()}`);
    };

    return (
        <div className="w-80 border-r bg-background flex flex-col">
            <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">Chats</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
                {chats.map((chat) => (
                    <div
                        key={chat.id}
                        onClick={() => handleChatClick(chat.id)}
                        className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b",
                            selectedChatId === chat.id && "bg-muted"
                        )}
                    >
                        <Avatar>
                            <AvatarImage src={`https://avatar.vercel.sh/${chat.wa_id}`} />
                            <AvatarFallback>{chat.name ? chat.name.substring(0, 2).toUpperCase() : "WA"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start">
                                <span className="font-medium truncate">{chat.name || chat.phone_number}</span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                    {chat.updated_at && format(new Date(chat.updated_at), "HH:mm")}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                                {chat.phone_number}
                            </p>
                        </div>
                    </div>
                ))}
                {chats.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                        No chats yet.
                    </div>
                )}
            </div>
        </div>
    );
}
