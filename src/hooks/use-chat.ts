import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { Chat, Message } from "@/src/types/chat";
import type { LeadChatSession } from "@/src/types/lead";

export function useChat(chatId: string | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [sessions, setSessions] = useState<LeadChatSession[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!chatId) {
            return;
        }

        const fetchChatAndMessages = async () => {
            // Reset state immediately before fetching
            setMessages([]);
            setChat(null);
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

            const { data: sessionsData } = await supabase
                .from("chat_sessions")
                .select("*")
                .eq("chat_id", chatId)
                .order("updated_at", { ascending: false });

            if (sessionsData) {
                setSessions(sessionsData);
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
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "chats",
                    filter: `id=eq.${chatId}`,
                },
                (payload) => {
                    setChat(payload.new as Chat);
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "chat_sessions",
                    filter: `chat_id=eq.${chatId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setSessions((prev) => [payload.new as LeadChatSession, ...prev]);
                    }
                    if (payload.eventType === "UPDATE") {
                        setSessions((prev) =>
                            prev
                                .map((session) =>
                                    session.id === payload.new.id
                                        ? (payload.new as LeadChatSession)
                                        : session
                                )
                                .sort((a, b) => {
                                    const left = new Date(a.updated_at || a.created_at || 0).getTime();
                                    const right = new Date(b.updated_at || b.created_at || 0).getTime();
                                    return right - left;
                                })
                        );
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, supabase]);

    const activeSession = chat?.active_session_id
        ? sessions.find((session) => session.id === chat.active_session_id) || null
        : null;

    return { messages, chat, sessions, activeSession, setMessages, setChat, isLoading };
}
