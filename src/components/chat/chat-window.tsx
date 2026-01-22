"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/src/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { sendMessage } from "@/src/app/(dashboard)/chat/actions";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { MoreVertical, Phone, Video, Smile, Send, Check, CheckCheck, Plus, Image as ImageIcon, X, FileText, Download, Hand, Mic, Search } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useChat } from "@/src/hooks/use-chat";
import { useMediaRecorder } from "@/src/hooks/use-media-recorder";
import { useFileHandler } from "@/src/hooks/use-file-handler";

export default function ChatWindow() {
    // Hooks
    const searchParams = useSearchParams();
    const chatId = searchParams.get("chatId");
    const { messages, chat, activeSession, setChat } = useChat(chatId);
    
    // Local State
    const [messageInput, setMessageInput] = useState("");
    const [captionInput, setCaptionInput] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [organizationId, setOrganizationId] = useState<string | null>(null);
    
    // Custom Hooks
    const { 
        attachment, 
        attachmentPreview, 
        handleFileSelection, 
        clearAttachment, 
        ALLOWED_IMAGE_TYPES, 
        ALLOWED_DOC_TYPES, 
        ALLOWED_AUDIO_TYPES 
    } = useFileHandler();

    const { isRecording, startRecording, stopRecording } = useMediaRecorder({
        onStop: (file) => {
            handleFileSelection(file).then(() => {
                const form = document.getElementById("message-form") as HTMLFormElement;
                if (form) {
                    setTimeout(() => form.requestSubmit(), 100);
                }
            });
        }
    });

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    // Effects
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        }

        if (showEmojiPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showEmojiPicker]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const loadOrganizationId = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setOrganizationId(null);
                return;
            }

            const { data: profile } = await supabase
                .from("user_profiles")
                .select("organization_id")
                .eq("id", user.id)
                .single();

            setOrganizationId(profile?.organization_id ?? null);
        };

        void loadOrganizationId();
    }, [supabase]);

    // Helpers
    const handoverRequested =
        Boolean(chat?.requested_handoff) ||
        messages.some((message) => message.payload?.handover);
    const lastReceivedMessage = [...messages].reverse().find((m) => m.status === "received");
    const lastReceivedTime = lastReceivedMessage
        ? new Date(lastReceivedMessage.wa_timestamp || lastReceivedMessage.created_at).getTime()
        : 0;
    const now = Date.now();
    const isWithin24Hours = (now - lastReceivedTime) < 24 * 60 * 60 * 1000;

    const isAiLocked =
        Boolean(activeSession?.ai_enabled) &&
        (activeSession?.status ?? "active") === "active" &&
        !activeSession?.closed_at;
    
    const isInputLocked = !isWithin24Hours || isAiLocked;

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setMessageInput((prev) => prev + emojiData.emoji);
    };

    const handleConcludeConversation = async () => {
        if (!chat) return;
        try {
            setIsClosing(true);
            const nowIso = new Date().toISOString();
            const orgId = organizationId;

            if (!orgId) {
                toast.error("No se pudo identificar la organizacion.");
                return;
            }

            const response = await fetch("/api/whatsapp/chats/close-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chat.id,
                    org_id: orgId,
                    model: "grok-4",
                }),
            });

            if (!response.ok) {
                throw new Error("close-session failed");
            }

            if (chat.active_session_id) {
                const { error: sessionError } = await supabase
                    .from("chat_sessions")
                    .update({
                        status: "closed",
                        closed_at: nowIso,
                        updated_at: nowIso,
                    })
                    .eq("id", chat.active_session_id);
                if (sessionError) {
                    throw sessionError;
                }
            }

            const { error: chatError } = await supabase
                .from("chats")
                .update({
                    requested_handoff: false,
                    active_session_id: null,
                    last_session_closed_at: nowIso,
                    updated_at: nowIso,
                })
                .eq("id", chat.id);

            if (chatError) {
                throw chatError;
            }

            setChat((prev) =>
                prev
                    ? {
                        ...prev,
                        requested_handoff: false,
                        active_session_id: null,
                        updated_at: nowIso,
                    }
                    : prev
            );
            toast.success("Conversación concluida");
        } catch (err) {
            console.error("Error concluyendo conversación:", err);
            toast.error("No se pudo concluir la conversación");
        } finally {
            setIsClosing(false);
        }
    };

    const handleDisableAi = async () => {
        if (!activeSession?.id) return;
        try {
            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from("chat_sessions")
                .update({ ai_enabled: false, updated_at: nowIso })
                .eq("id", activeSession.id);

            if (error) {
                throw error;
            }

            toast.success("AI desactivado. Ya puedes responder.");
        } catch (err) {
            console.error("Error disabling AI:", err);
            toast.error("No se pudo desactivar el AI.");
        }
    };

    if (!chatId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground h-full">
                <div className="bg-muted/30 p-8 rounded-full mb-4">
                    <Send className="h-12 w-12 opacity-20" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Select a chat</h3>
                <p className="text-sm max-w-xs text-center mt-2">Choose a conversation from the sidebar to start messaging.</p>
            </div>
        );
    }

    return (
        <div
            className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative"
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (isInputLocked) return;
                const file = e.dataTransfer.files?.[0];
                if (file) {
                    void handleFileSelection(file);
                }
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.06] pointer-events-none"
                style={{
                    backgroundImage: `url("/assets/whatsapp-bg.png")`,
                    backgroundSize: "412.5px"
                }}
            />

            {/* Header */}
            <div className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b dark:border-[#2a3942] flex items-center justify-between z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage src={`https://avatar.vercel.sh/${chat?.wa_id}`} />
                        <AvatarFallback className="bg-[#dfe3e5] dark:bg-[#667781] text-gray-500 dark:text-[#d1d7db]">{chat?.name ? chat.name.substring(0, 2).toUpperCase() : "WA"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col justify-center">
                        <h3 className="font-normal text-base text-[#111b21] dark:text-[#e9edef] leading-tight">{chat?.name || chat?.phone_number}</h3>
                        <p className="text-[13px] text-[#667781] dark:text-[#8696a0] leading-tight mt-0.5">
                            Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-[#54656f] dark:text-[#aebac1] pr-1">
                    {handoverRequested && (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-amber-100 text-amber-900 px-2 py-1 text-xs font-medium border border-amber-200">
                            <Hand className="h-4 w-4" />
                            <span className="hidden sm:inline">Handoff</span>
                        </span>
                    )}
                    <div className="hidden lg:flex items-center gap-2 text-xs">
                        <span className={cn(
                            "rounded-full border px-2 py-0.5",
                            activeSession ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-muted text-muted-foreground border-border"
                        )}>
                            {activeSession ? "Sesion activa" : "Sin sesion activa"}
                        </span>
                        <span className={cn(
                            "rounded-full border px-2 py-0.5",
                            activeSession?.ai_enabled ? "bg-indigo-50 text-indigo-800 border-indigo-200" : "bg-muted text-muted-foreground border-border"
                        )}>
                            {activeSession?.ai_enabled ? "AI activo" : "AI apagado"}
                        </span>
                        <span className={cn(
                            "rounded-full border px-2 py-0.5",
                            isWithin24Hours ? "bg-green-50 text-green-800 border-green-200" : "bg-orange-50 text-orange-800 border-orange-200"
                        )}>
                            {isWithin24Hours ? "Ventana 24h Activa" : "Fuera de Ventana 24h"}
                        </span>
                    </div>
                    <div className="flex bg-white/50 dark:bg-white/10 rounded-full p-1 border border-transparent hover:border-black/5 dark:hover:border-white/5 transition-colors">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isClosing}
                            onClick={handleConcludeConversation}
                            title="Concluir conversación"
                            className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Video className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Phone className="h-5 w-5" />
                        </Button>
                        <div className="w-[1px] h-6 bg-[#d1d7db] dark:bg-[#374248] mx-2"></div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <Search className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                             <MoreVertical className="h-5 w-5" />
                        </Button>
                     </div>
                </div>
            </div>

            {handoverRequested && (
                <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm z-10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                    El bot solicitó conectar con un agente. Responde aquí para tomar el caso.
                </div>
            )}

            {isAiLocked && isWithin24Hours && (
                <div className="mx-4 mt-3 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 shadow-sm z-10 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        AI activo en esta sesion. Desactivalo para responder.
                    </div>
                    <Button size="sm" variant="outline" onClick={handleDisableAi}>
                        Desactivar AI
                    </Button>
                </div>
            )}

            {!isWithin24Hours && (
                <div className="mx-4 mt-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 shadow-sm z-10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    Fuera de la ventana de 24h. Solo puedes enviar plantillas (próximamente).
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 z-0" ref={scrollRef}>
                {messages.map((message) => {
const isReceived = message.status === 'received';
                    const displayTime = message.wa_timestamp || message.created_at;
                    const mediaId = message.media_id || message.payload?.media_id;
                    const mediaUrl = message.media_url || (message.media_path ? `/api/storage/media?path=${encodeURIComponent(message.media_path)}` : undefined);
                    const mediaMime = message.payload?.media_mime_type as string | undefined;
                    const isImageMessage = message.type === "image" || Boolean(mediaId && mediaMime && typeof mediaMime === 'string' && mediaMime.startsWith("image/"));
                    const isAudioMessage = message.type === "audio" || Boolean(mediaMime && typeof mediaMime === 'string' && mediaMime.startsWith("audio/"));
                    const isDocumentMessage =
                        message.type === "document" ||
                        (mediaMime && typeof mediaMime === 'string' ? !mediaMime.startsWith("image/") && !mediaMime.startsWith("audio/") : false);

                    return (
                        <div
                            key={message.id}
                            className={cn(
                                "flex w-full mb-1",
                                isReceived ? "justify-start" : "justify-end"
                            )}
                        >
                            <div
                                className={cn(
                                    "relative max-w-[65%] px-2 py-1 shadow-[0_1px_0.5px_rgba(11,20,26,.13)] dark:shadow-none text-[14.2px] leading-[19px]",
                                    isReceived
                                        ? "bg-white dark:bg-[#202c33] rounded-lg rounded-tl-none text-[#111b21] dark:text-[#e9edef]"
                                        : "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-lg rounded-tr-none text-[#111b21] dark:text-[#e9edef]"
                                )}
                            >
                                {isReceived && (
                                    <div className="absolute top-0 left-[-8px] w-0 h-0 border-[8px] border-transparent border-t-white dark:border-t-[#202c33] border-r-white dark:border-r-[#202c33] filter drop-shadow-[0_1px_0.5px_rgba(11,20,26,.13)] dark:drop-shadow-none crop-corner-left" />
                                )}
                                {!isReceived && (
                                    <div className="absolute top-0 right-[-8px] w-0 h-0 border-[8px] border-transparent border-t-[#d9fdd3] dark:border-t-[#005c4b] border-l-[#d9fdd3] dark:border-l-[#005c4b] filter drop-shadow-[0_1px_0.5px_rgba(11,20,26,.13)] dark:drop-shadow-none crop-corner-right" />
                                )}

                                <div className={cn("px-1 pt-1", (isImageMessage || isAudioMessage || isDocumentMessage) ? "" : "pb-0")}>
                                    {isImageMessage ? (
                                        <div className="space-y-1 mb-1">
                                            {(Boolean(mediaUrl) || Boolean(mediaId)) && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={mediaUrl || `/api/whatsapp/media/${mediaId}`}
                                                    alt={message.body || "Imagen"}
                                                    className="max-h-80 w-full rounded-lg object-cover"
                                                />
                                            )}
                                            {message.body && (
                                                <p className="text-sm pt-1 whitespace-pre-wrap">
                                                    {message.body}
                                                </p>
                                            )}
                                        </div>
                                    ) : isAudioMessage ? (
                                        <div className="space-y-1 min-w-[240px]">
                                            <div className="flex items-center gap-3 p-1">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f2f5] dark:bg-[#374046] text-[#54656f] dark:text-[#aebac1]">
                                                    <Mic className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    {mediaUrl && (
                                                        <audio
                                                            controls
                                                            className="w-full h-8"
                                                            src={mediaUrl}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : isDocumentMessage ? (
                                        <div className="space-y-1 bg-[#f0f2f5] dark:bg-[#323d45] rounded-md p-2 flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-[#3f4a51] text-[#f55655]">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm truncate font-medium">{message.body || "Documento"}</p>
                                                <p className="text-xs text-muted-foreground uppercase">{String(mediaMime || "FILE").split('/')[1]}</p>
                                            </div>
                                            {mediaUrl && (
                                                 <a href={mediaUrl} target="_blank" rel="noreferrer" download className="text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/10 p-1 rounded-full">
                                                    <Download className="h-5 w-5" />
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap break-words">{message.body}</div>
                                    )}
                                </div>

                                <div className={cn(
                                    "flex items-center justify-end gap-1 select-none h-[15px] mr-1 mb-0.5",
                                    !isReceived ? "justify-end" : "justify-end"
                                )}>
                                    <span className="text-[11px] text-[#667781] dark:text-[#8696a0] min-w-fit mt-1">
                                        {format(new Date(displayTime), "HH:mm")}
                                    </span>
                                    {!isReceived && (
                                        <span className={cn("mt-1", message.status === 'read' ? "text-[#53bdeb]" : "text-[#667781] dark:text-[#8696a0]")}>
                                            {message.status === 'read' ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div
                className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t dark:border-[#2a3942] z-10 relative flex items-end gap-2"
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={(e) => {
                    if ((e.target as HTMLElement).closest(".drop-zone")) return;
                    setIsDragging(false);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (isInputLocked) return;
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                        void handleFileSelection(file);
                    }
                }}
            >
                {showEmojiPicker && (
                    <div ref={pickerRef} className="absolute bottom-16 left-8 z-50 shadow-xl rounded-xl border bg-background">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width={300}
                            height={400}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}

                {isDragging && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#f0f2f5]/90 dark:bg-[#202c33]/90 border-2 border-dashed border-[#00a884]">
                        <div className="text-[#00a884] font-medium">Suelta el archivo aquí</div>
                    </div>
                )}

                {/* Attachments & Emoji */}
                <div className="flex items-center gap-2 mb-2">
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        disabled={isInputLocked}
                        className={cn(
                            "text-[#54656f] dark:text-[#aebac1] hover:text-foreground h-10 w-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                            showEmojiPicker && "bg-black/10 dark:bg-white/10"
                        )}
                    >
                        <Smile className="h-6 w-6" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={isInputLocked}
                                className="h-10 w-10 text-[#54656f] dark:text-[#aebac1] hover:text-foreground rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="mb-2">
                             <input
                                ref={fileInputRef}
                                type="file"
                                accept={[
                                    ...ALLOWED_IMAGE_TYPES,
                                    ...ALLOWED_DOC_TYPES,
                                    ...ALLOWED_AUDIO_TYPES,
                                ].join(",")}
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleFileSelection(file);
                                }}
                            />
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 p-3">
                                <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><FileText className="h-3 w-3" /></div>
                                Documento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 p-3">
                                <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><ImageIcon className="h-3 w-3" /></div>
                                Fotos y videos
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Input Form */}
                <form
                    action={async (formData) => {
                        if (!chatId) return;
                        if (isInputLocked) {
                            if (!isWithin24Hours) toast.error("Fuera de la ventana de 24h.");
                            else toast.error("Desactiva el AI para enviar mensajes.");
                            return;
                        }
                        formData.append("chatId", chatId);
                        formData.set("message", messageInput);
                        formData.set("caption", captionInput);
                        if (attachment) formData.set("media", attachment);
                        formData.set("isVoice", attachment?.type?.startsWith("audio/") ? "true" : "false");

                        const result = await sendMessage(formData);
                        if (result.error) toast.error(result.error);
                        else {
                            setMessageInput("");
                            setCaptionInput("");
                            clearAttachment();
                            setShowEmojiPicker(false);
                            const form = document.getElementById("message-form") as HTMLFormElement;
                             if(form) form.reset();
                        }
                    }}
                    id="message-form"
                    className="flex-1 flex flex-col gap-2 mb-2"
                >
                    {attachment ? (
                        <div className="rounded-lg border bg-white p-2 flex gap-3 items-center shadow-sm">
                            <div className="h-14 w-14 overflow-hidden rounded-md border flex items-center justify-center bg-gray-100 flex-shrink-0">
                                {attachmentPreview ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={attachmentPreview} alt="Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <FileText className="h-6 w-6 text-gray-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{attachment.name}</p>
                                <Input
                                    name="caption"
                                    value={captionInput}
                                    onChange={(e) => setCaptionInput(e.target.value)}
                                    placeholder="Write a caption..."
                                    className="h-8 mt-1 border-none shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/70"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => clearAttachment()}
                                className="text-gray-500 hover:text-red-500"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    ) : (
                        <div className="relative w-full">
                            <Input
                                type="text"
                                name="message"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Escribe un mensaje"
                                className="w-full py-6 bg-white dark:bg-[#2a3942] border-none focus-visible:ring-0 rounded-lg text-base shadow-sm placeholder:text-[#54656f] dark:placeholder:text-[#8696a0] dark:text-[#e9edef]"
                                required={!attachment}
                                autoComplete="off"
                                disabled={isInputLocked}
                            />
                        </div>
                    )}
                </form>

                {/* Mic / Send Button */}
                <div className="mb-2">
                    {messageInput.trim() || attachment ? (
                        <Button
                            type="button"
                            size="icon"
                            onClick={() => {
                                const form = document.getElementById("message-form") as HTMLFormElement;
                                form?.requestSubmit();
                            }}
                            className="h-10 w-10 rounded-full shadow-sm bg-[#00a884] hover:bg-[#008f6f] text-white transition-all transform scale-100"
                            disabled={isInputLocked}
                        >
                            <Send className="h-5 w-5 ml-0.5" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                                isRecording && "text-red-500 hover:text-red-600 animate-pulse bg-red-50"
                            )}
                            disabled={isInputLocked}
                            onClick={async () => {
                                if (isRecording) {
                                    stopRecording();
                                } else {
                                    await startRecording();
                                }
                            }}
                        >
                            <Mic className="h-6 w-6" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
