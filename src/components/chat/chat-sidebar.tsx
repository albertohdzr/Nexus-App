"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/src/lib/utils";
import { createClient } from "@/src/lib/supabase/client";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Hand, Search, MessageSquarePlus, Users, CircleDashed, MessageSquare } from "lucide-react";
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
        <div className="w-[400px] border-r border-[#d1d7db] dark:border-[#2a3942] bg-white dark:bg-[#111b21] flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#d1d7db] dark:border-[#2a3942] flex items-center justify-between shrink-0 h-[60px]">
                <div className="w-10 h-10 rounded-full overflow-hidden cursor-pointer">
                    <Avatar className="h-full w-full">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>ME</AvatarFallback>
                    </Avatar>
                </div>
                <div className="flex items-center gap-2.5 text-[#54656f] dark:text-[#aebac1]">
                     <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Comunidades">
                        <Users className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Estados">
                         <CircleDashed className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Canales">
                         <MessageSquare className="h-5 w-5" />
                    </Button>
                     <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Nuevo chat">
                        <MessageSquarePlus className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className="" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M12,7c1.104,0,2-0.896,2-2c0-1.105-0.896-2-2-2c-1.104,0-2,0.895-2,2C10,6.104,10.896,7,12,7z M12,9c-1.104,0-2,0.896-2,2 c0,1.104,0.896,2,2,2c1.104,0,2-0.896,2-2C14,9.896,13.104,9,12,9z M12,15c-1.104,0-2,0.896-2,2c0,1.104,0.896,2,2,2 c1.104,0,2-0.896,2-2C14,15.896,13.104,15,12,15z"></path></svg>
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-3 py-2 border-b border-[#d1d7db] dark:border-[#2a3942] bg-white dark:bg-[#111b21]">
                <div className="relative flex items-center bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg h-[35px] px-3 transition-all focus-within:bg-white dark:focus-within:bg-[#2a3942] focus-within:ring-1 focus-within:ring-none">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-[#54656f] dark:text-[#aebac1] hover:bg-transparent cursor-default">
                        <Search className="h-4 w-4" />
                    </Button>
                     <Input
                        placeholder="Busca un chat o inicia uno nuevo."
                        className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 h-full text-[14px] placeholder:text-[#54656f] dark:placeholder:text-[#8696a0] dark:text-[#e9edef] px-4"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                     <Button size="icon" variant="ghost" className="h-6 w-6 text-[#54656f] dark:text-[#aebac1] hover:bg-transparent">
                        <svg viewBox="0 0 24 24" height="20" width="20" preserveAspectRatio="xMidYMid meet" className="" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M10,18.1h4v-2h-4V18.1z M3,6.1v2h18v-2H3z M6,13.1h12v-2H6V13.1z"></path></svg>
                    </Button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111b21]">
                {filteredChats.map((chat) => (
                    <div
                        key={chat.id}
                        onClick={() => handleChatClick(chat.id)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors relative group",
                            selectedChatId === chat.id ? "bg-[#f0f2f5] dark:bg-[#2a3942]" : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]"
                        )}
                    >
                        <Avatar className="h-[49px] w-[49px]">
                            <AvatarImage src={`https://avatar.vercel.sh/${chat.wa_id}`} />
                            <AvatarFallback className="bg-[#dfe3e5] dark:bg-[#667781] text-gray-500 dark:text-[#d1d7db] font-medium">
                                {chat.name ? chat.name.substring(0, 2).toUpperCase() : "WA"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden min-h-[42px] flex flex-col justify-center pr-1 border-b border-[#f0f2f5] dark:border-[#2a3942] group-last:border-b-0 pb-3 pt-1 ml-1 h-full">
                            <div className="flex justify-between items-center mb-0.5">
                                <span className={cn(
                                    "text-[#111b21] dark:text-[#e9edef] text-[17px] leading-tight truncate",
                                    selectedChatId === chat.id ? "font-normal" : "font-normal"
                                )}>
                                    {chat.name || chat.phone_number}
                                </span>
                                <span className="text-[12px] text-[#667781] dark:text-[#8696a0] whitespace-nowrap ml-2">
                                    {chat.updated_at ? format(new Date(chat.updated_at), "HH:mm") : ""}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1 text-[14px] text-[#667781] dark:text-[#8696a0] truncate">
                                    {chat.requested_handoff && (
                                         <Hand className="h-3.5 w-3.5 text-amber-500 shrink-0 mr-1" />
                                    )}
                                    <span className="truncate">
                                        {chat.phone_number}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredChats.length === 0 && (
                    <div className="p-8 text-center text-[#54656f] dark:text-[#8696a0] text-sm flex flex-col items-center gap-2 mt-10">
                        <p>No se encontraron chats</p>
                    </div>
                )}
            </div>
        </div>
    );
}
