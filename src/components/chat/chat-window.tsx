"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/src/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "@/src/lib/utils";

type Message = {
    id: string;
    chat_id: string;
    body: string;
    type: string;
    status: string;
    created_at: string;
    wa_message_id: string;
};

type Chat = {
    id: string;
    name: string;
    phone_number: string;
    wa_id: string;
};

export default function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const supabase = createClient();
    const searchParams = useSearchParams();
    const chatId = searchParams.get("chatId");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            setChat(null);
            return;
        }

        const fetchChatAndMessages = async () => {
            // Fetch Chat Details
            const { data: chatData } = await supabase
                .from("chats")
                .select("*")
                .eq("id", chatId)
                .single();

            if (chatData) {
                setChat(chatData);
            }

            // Fetch Messages
            const { data: messagesData } = await supabase
                .from("messages")
                .select("*")
                .eq("chat_id", chatId)
                .order("created_at", { ascending: true });

            if (messagesData) {
                setMessages(messagesData);
            }
        };

        fetchChatAndMessages();

        const channel = supabase
            .channel(`chat_${chatId}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    setMessages((prev) => [...prev, payload.new as Message]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, supabase]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!chatId) {
        return (
            <div className="flex-1 flex items-center justify-center bg-muted/20 text-muted-foreground">
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-muted/20">
            {/* Header */}
            <div className="p-4 border-b bg-background flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={`https://avatar.vercel.sh/${chat?.wa_id}`} />
                    <AvatarFallback>{chat?.name ? chat.name.substring(0, 2).toUpperCase() : "WA"}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="font-semibold">{chat?.name || chat?.phone_number}</h3>
                    <p className="text-xs text-muted-foreground">{chat?.phone_number}</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((message) => {
                    const isReceived = message.status === 'received'; // Assuming 'received' means from user to us
                    // In a real app, we'd distinguish better between "my messages" and "their messages".
                    // Since we only receive messages for now, they are all "received" from the contact.
                    // If we implement sending, we'd check if the message was sent by the system or received from WA.
                    // For now, let's assume all messages in DB are from the contact (left side) unless we add a flag.
                    // Actually, usually "received" = from contact. "sent" = from us.
                    // Let's style them as "received" (left) for now.

                    return (
                        <div
                            key={message.id}
                            className={cn(
                                "flex w-full",
                                isReceived ? "justify-start" : "justify-end"
                            )}
                        >
                            <div
                                className={cn(
                                    "max-w-[70%] rounded-lg p-3 text-sm",
                                    isReceived
                                        ? "bg-background border shadow-sm"
                                        : "bg-primary text-primary-foreground"
                                )}
                            >
                                <p>{message.body}</p>
                                <span className="text-[10px] opacity-70 block text-right mt-1">
                                    {format(new Date(message.created_at), "HH:mm")}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area (Placeholder) */}
            <div className="p-4 bg-background border-t">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        className="flex-1 p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled
                    />
                    <button
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium opacity-50 cursor-not-allowed"
                        disabled
                    >
                        Send
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Sending messages is not yet configured.
                </p>
            </div>
        </div>
    );
}
