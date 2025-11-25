"use client";

import { useEffect, useState, useRef } from "react";
import { useFormStatus } from "react-dom";
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
import { MoreVertical, Phone, Video, Smile, Send, Check, CheckCheck, Plus, Image as ImageIcon, X, FileText, Download } from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

type Message = {
    id: string;
    chat_id: string;
    body: string;
    type: string;
    status: string;
    created_at: string;
    wa_message_id: string;
    wa_timestamp?: string | null;
    sent_at?: string | null;
    delivered_at?: string | null;
    read_at?: string | null;
    sender_name?: string | null;
    media_id?: string | null;
    media_url?: string | null;
    media_path?: string | null;
    payload?: MessagePayload | null;
};

type MessagePayload = {
    from?: string;
    handover?: boolean;
    reason?: string;
    model?: string;
    media_id?: string;
    media_mime_type?: string;
    media_file_name?: string;
    media_caption?: string;
    voice?: boolean;
    status_detail?: unknown;
};

type Chat = {
    id: string;
    name: string;
    phone_number: string;
    wa_id: string;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_AUDIO_TYPES = [
    "audio/aac",
    "audio/amr",
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/ogg; codecs=opus",
    "audio/opus",
];
const MAX_AUDIO_BYTES = 16 * 1024 * 1024; // 16 MB
const ALLOWED_DOC_TYPES = [
    "text/plain",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/pdf",
];
const MAX_DOC_BYTES = 100 * 1024 * 1024; // 100 MB

export default function ChatWindow() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [chat, setChat] = useState<Chat | null>(null);
    const [messageInput, setMessageInput] = useState("");
    const [captionInput, setCaptionInput] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<BlobPart[]>([]);
    const supabase = createClient();
    const searchParams = useSearchParams();
    const chatId = searchParams.get("chatId");
    const scrollRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelection = (file: File) => {
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isDoc = ALLOWED_DOC_TYPES.includes(file.type);
        const isAudio = ALLOWED_AUDIO_TYPES.includes(file.type);
        if (!isImage && !isDoc && !isAudio) {
            toast.error("Tipo de archivo no permitido. Usa PDF, DOC(X), XLS(X), PPT(X), TXT, audio (AAC/AMR/MP3/OGG) o imagen JPEG/PNG.");
            return;
        }
        if (isImage && file.size > MAX_IMAGE_BYTES) {
            toast.error("La imagen debe pesar máximo 5 MB");
            return;
        }
        if (isDoc && file.size > MAX_DOC_BYTES) {
            toast.error("El archivo debe pesar máximo 100 MB");
            return;
        }
        if (isAudio && file.size > MAX_AUDIO_BYTES) {
            toast.error("El audio debe pesar máximo 16 MB");
            return;
        }
        if (attachmentPreview) {
            URL.revokeObjectURL(attachmentPreview);
        }
        const previewUrl = isImage || file.type === "application/pdf" ? URL.createObjectURL(file) : null;
        setAttachment(file);
        setAttachmentPreview(previewUrl);
    };

    useEffect(() => {
        if (!chatId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
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
                { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setMessages((prev) => [...prev, payload.new as Message]);
                    }
                    if (payload.eventType === "UPDATE") {
                        setMessages((prev) =>
                            prev
                                .map((msg) =>
                                    msg.id === payload.new.id ? (payload.new as Message) : msg
                                )
                                .sort(
                                    (a, b) =>
                                        new Date(a.created_at).getTime() -
                                        new Date(b.created_at).getTime()
                                )
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [chatId, supabase]);

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
        return () => {
            if (attachmentPreview) {
                URL.revokeObjectURL(attachmentPreview);
            }
        };
    }, [attachmentPreview]);

    const handoverRequested = messages.some((message) => message.payload?.handover);
    const canSend = Boolean(messageInput.trim() || captionInput.trim() || attachment);

    const onEmojiClick = (emojiData: EmojiClickData) => {
        setMessageInput((prev) => prev + emojiData.emoji);
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
            className="flex-1 flex flex-col h-full bg-muted/10 relative"
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                    handleFileSelection(file);
                }
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />

            {/* Header */}
            <div className="p-4 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={`https://avatar.vercel.sh/${chat?.wa_id}`} />
                        <AvatarFallback className="bg-primary/10 text-primary">{chat?.name ? chat.name.substring(0, 2).toUpperCase() : "WA"}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold text-sm">{chat?.name || chat?.phone_number}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                            Online
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {handoverRequested && (
                <div className="mx-4 mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm z-10 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                    El bot solicitó conectar con un agente. Responde aquí para tomar el caso.
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 z-0" ref={scrollRef}>
                {messages.map((message) => {
                    const isReceived = message.status === 'received';
                    const isBot = message.payload?.from === "bot";
                    const displayTime = message.wa_timestamp || message.created_at;
                    const mediaId = message.media_id || message.payload?.media_id;
                    const mediaUrl = message.media_url || (message.media_path ? `/api/storage/media?path=${encodeURIComponent(message.media_path)}` : undefined);
                    const mediaMime = message.payload?.media_mime_type;
                    const isImageMessage = message.type === "image" || Boolean(mediaId && mediaMime?.startsWith?.("image/"));
                    const isAudioMessage = message.type === "audio" || Boolean(mediaMime && mediaMime.startsWith("audio/"));
                    const isDocumentMessage =
                        message.type === "document" ||
                        (mediaMime ? !mediaMime.startsWith("image/") && !mediaMime.startsWith("audio/") : false);
                    const displayName =
                        message.sender_name ||
                        (isBot ? "Bot" : isReceived ? "Contacto" : "Agente");

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
                                    "max-w-[70%] px-4 py-2 shadow-sm relative group",
                                    isReceived
                                        ? "bg-background border rounded-2xl rounded-tl-none text-foreground"
                                        : "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
                                )}
                            >
                                {isImageMessage ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background/60 text-muted-foreground">
                                                <ImageIcon className="h-4 w-4" />
                                            </span>
                                            <span>Imagen</span>
                                        </div>
                                        {(mediaUrl || mediaId) && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={mediaUrl || `/api/whatsapp/media/${mediaId}`}
                                                alt={message.body || "Imagen"}
                                                className="max-h-72 w-full rounded-xl object-cover border border-border/50"
                                            />
                                        )}
                                        {message.body && (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {message.body}
                                            </p>
                                        )}
                                        {message.payload?.media_file_name && (
                                            <p className="text-[11px] opacity-80">
                                                {message.payload.media_file_name}
                                            </p>
                                        )}
                                    </div>
                                ) : isAudioMessage ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background/60 text-muted-foreground">
                                                🎤
                                            </span>
                                            <span>{message.payload?.voice ? "Nota de voz" : "Audio"}</span>
                                        </div>
                                        {mediaUrl && (
                                            <audio
                                                controls
                                                className="w-full"
                                                src={mediaUrl}
                                            />
                                        )}
                                        {message.payload?.media_file_name && (
                                            <p className="text-[11px] opacity-80">
                                                {message.payload.media_file_name}
                                            </p>
                                        )}
                                    </div>
                                ) : isDocumentMessage ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background/60 text-muted-foreground">
                                                <FileText className="h-4 w-4" />
                                            </span>
                                            <span>Documento</span>
                                        </div>
                                        {message.body && (
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                {message.body}
                                            </p>
                                        )}
                                        {mediaUrl && mediaMime === "application/pdf" && (
                                            <div className="border rounded-lg overflow-hidden">
                                                <iframe
                                                    src={mediaUrl}
                                                    className="w-full h-64"
                                                    title={message.body || "PDF"}
                                                />
                                            </div>
                                        )}
                                        {mediaUrl && (
                                            <Button
                                                asChild
                                                variant="outline"
                                                size="sm"
                                                className="inline-flex items-center gap-2"
                                            >
                                                <a href={mediaUrl} target="_blank" rel="noreferrer" download>
                                                    <Download className="h-4 w-4" />
                                                    Descargar
                                                </a>
                                            </Button>
                                        )}
                                        {message.payload?.media_file_name && (
                                            <p className="text-[11px] opacity-80">
                                                {message.payload.media_file_name}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.body}</p>
                                )}
                                <div className={cn(
                                    "mt-1 flex items-center gap-1 text-[10px]",
                                    isReceived ? "text-muted-foreground justify-end" : "text-primary-foreground/70 justify-end"
                                )}>
                                    <span>{displayName} · {format(new Date(displayTime), "HH:mm")}</span>
                                    {!isReceived && (
                                        <span>
                                            {message.status === 'read' ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
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
                className="p-4 bg-background/80 backdrop-blur-sm border-t z-10 relative"
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
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                        handleFileSelection(file);
                    }
                }}
            >
                {showEmojiPicker && (
                    <div ref={pickerRef} className="absolute bottom-full right-4 mb-2 z-50 shadow-xl rounded-xl border bg-background">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            width={300}
                            height={400}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}

                {isDragging && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/70 bg-primary/5 drop-zone">
                        <div className="text-primary font-medium">Suelta la imagen para adjuntarla</div>
                    </div>
                )}

                {attachment && (
                    <div className="max-w-4xl mx-auto mb-3 rounded-2xl border bg-muted/40 p-3 flex gap-3 items-start">
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl border bg-background flex items-center justify-center">
                            {attachment.type === "application/pdf" && attachmentPreview ? (
                                <div className="text-muted-foreground">
                                    <FileText className="h-6 w-6" />
                                </div>
                            ) : attachmentPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={attachmentPreview} alt={attachment.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    {ALLOWED_IMAGE_TYPES.includes(attachment.type) ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium truncate">{attachment.name}</div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Cambiar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setAttachment(null);
                                            setAttachmentPreview(null);
                                            setCaptionInput("");
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Eliminar adjunto</span>
                                    </Button>
                                </div>
                            </div>
                            <Input
                                name="caption"
                                value={captionInput}
                                onChange={(e) => setCaptionInput(e.target.value)}
                                placeholder="Añade un caption (opcional)"
                            />
                        </div>
                    </div>
                )}

                <form
                    action={async (formData) => {
                        if (!chatId) return;
                        formData.append("chatId", chatId);
                        // Ensure the message from state is sent if the input is controlled
                        formData.set("message", messageInput);
                        formData.set("caption", captionInput);
                        if (attachment) {
                            formData.set("media", attachment);
                        }
                        formData.set("isVoice", attachment?.type?.startsWith("audio/") ? "true" : "false");

                        const result = await sendMessage(formData);
                        if (result.error) {
                            toast.error(result.error);
                        } else {
                            setMessageInput("");
                            setCaptionInput("");
                            setAttachment(null);
                            setAttachmentPreview(null);
                            setShowEmojiPicker(false);
                        }
                    }}
                    id="message-form"
                    className="flex items-end gap-2 max-w-4xl mx-auto"
                >
                    <div className="flex gap-1 mb-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full">
                                    <Plus className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-4 w-4" />
                                    Agregar archivo
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                if (file) handleFileSelection(file);
                            }}
                        />
                    </div>

                    <div className="flex-1 relative">
                        <Input
                            type="text"
                            name="message"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full pl-4 pr-10 py-6 bg-muted/50 border-none focus-visible:ring-1 rounded-2xl"
                            required={!attachment}
                            autoComplete="off"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-8 w-8 rounded-full",
                                showEmojiPicker && "text-primary bg-primary/10"
                            )}
                        >
                            <Smile className="h-5 w-5" />
                        </Button>
                    </div>

                    <SubmitButton disabled={!canSend} />
                </form>
                <div className="flex items-center gap-2 max-w-4xl mx-auto mt-2">
                    <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        onClick={async () => {
                            if (isRecording) {
                                mediaRecorderRef.current?.stop();
                                setIsRecording(false);
                                return;
                            }
                            try {
                                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                // Prefer containers WhatsApp accepts and that browsers emit with correct mime.
                                const candidateMimes = [
                                    "audio/ogg; codecs=opus",
                                    "audio/ogg",
                                    "audio/mpeg",
                                    "audio/aac",
                                    "audio/amr",
                                ];
                                const mimeType = candidateMimes.find((m) => MediaRecorder.isTypeSupported(m));
                                if (!mimeType) {
                                    toast.error("Tu navegador no soporta grabación en un formato aceptado por WhatsApp.");
                                    return;
                                }
                                const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
                                recordedChunksRef.current = [];
                                recorder.ondataavailable = (event) => {
                                    if (event.data.size > 0) {
                                        recordedChunksRef.current.push(event.data);
                                    }
                                };
                                recorder.onstop = () => {
                                    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                                    const extension = mimeType.includes("ogg")
                                        ? "ogg"
                                        : mimeType.includes("mpeg")
                                        ? "mp3"
                                        : mimeType.includes("aac")
                                        ? "aac"
                                        : mimeType.includes("amr")
                                        ? "amr"
                                        : "audio";
                                    const file = new File([blob], `voice-${Date.now()}.${extension}`, { type: mimeType });
                                    handleFileSelection(file);
                                    // Mark as voice note
                                    setCaptionInput("");
                                    const form = document.getElementById("message-form") as HTMLFormElement | null;
                                    if (form) {
                                        const hidden = form.querySelector("input[name='isVoice']") as HTMLInputElement | null;
                                        if (hidden) hidden.value = "true";
                                    }
                                };
                                mediaRecorderRef.current = recorder;
                                recorder.start();
                                setIsRecording(true);
                            } catch (err) {
                                console.error("Error recording audio:", err);
                                toast.error("No se pudo iniciar la grabación. Revisa permisos del micrófono.");
                            }
                        }}
                    >
                        {isRecording ? "Detener grabación" : "Grabar audio"}
                    </Button>
                    {attachment?.type?.startsWith("audio/") && (
                        <span className="text-sm text-muted-foreground">Se enviará como nota de voz</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();

    return (
        <Button
            type="submit"
            size="icon"
            className="h-12 w-12 rounded-full shrink-0 shadow-sm"
            disabled={pending || disabled}
        >
            <Send className={cn("h-5 w-5", pending && "opacity-50")} />
            <span className="sr-only">Send</span>
        </Button>
    );
}
