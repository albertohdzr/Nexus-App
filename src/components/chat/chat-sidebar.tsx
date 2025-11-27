"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/src/lib/utils";
import { createClient } from "@/src/lib/supabase/client";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Plus, Search } from "lucide-react";
import { Chat } from "@/src/types/chat";

export default function ChatSidebar() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
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
                const { data } = await supabase
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
                                    ).sort((a, b) => {
                                        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                                        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                                        return dateB - dateA;
                                    })
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

    const filteredChats = chats.filter(chat =>
        (chat.name && chat.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        chat.phone_number.includes(searchTerm)
    );

    return (
        <div className="w-80 border-r bg-background flex flex-col h-full">
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-xl tracking-tight">Messages</h2>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">New Chat</span>
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filteredChats.map((chat) => (
                    <div
                        key={chat.id}
                        onClick={() => handleChatClick(chat.id)}
                        className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-muted/50 border-b border-border/40",
                            selectedChatId === chat.id && "bg-primary/5 border-l-4 border-l-primary border-b-transparent"
                        )}
                    >
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={`https://avatar.vercel.sh/${chat.wa_id}`} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {chat.name ? chat.name.substring(0, 2).toUpperCase() : "WA"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start">
                                <span className={cn(
                                    "font-medium truncate text-sm",
                                    selectedChatId === chat.id ? "text-primary" : "text-foreground"
                                )}>
                                    {chat.name || chat.phone_number}
                                </span>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                    {chat.updated_at && format(new Date(chat.updated_at), "HH:mm")}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-1">
                                {chat.phone_number}
                            </p>
                        </div>
                    </div>
                ))}
                {filteredChats.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 opacity-20" />
                        <p>No chats found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
