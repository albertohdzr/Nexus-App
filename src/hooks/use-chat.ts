import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { Chat, Message } from "@/src/types/chat";

export function useChat(chatId: string | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            setChat(null);
            return;
        }

        const fetchChatAndMessages = async () => {
            setIsLoading(true);
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
            setIsLoading(false);
        };

        fetchChatAndMessages();

        const channel = supabase
            .channel(`chat_${chatId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setMessages((
                            prev,
                        ) => [...prev, payload.new as Message]);
                    }
                    if (payload.eventType === "UPDATE") {
                        setMessages((prev) =>
                            prev
                                .map((msg) =>
                                    msg.id === payload.new.id
                                        ? (payload.new as Message)
                                        : msg
                                )
                                .sort(
                                    (a, b) =>
                                        new Date(a.created_at).getTime() -
                                        new Date(b.created_at).getTime(),
                                )
                        );
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, supabase]);

    return { messages, chat, setMessages, setChat, isLoading };
}
