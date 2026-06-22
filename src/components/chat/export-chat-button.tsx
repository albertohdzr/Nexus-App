"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { DropdownMenuItem } from "@/src/components/ui/dropdown-menu";
import { toast } from "sonner";
import { exportConversation } from "@/src/app/(dashboard)/chat/actions";

interface ExportChatButtonProps {
    chatId: string;
    chatName: string;
}

export function ExportChatButton({ chatId, chatName }: ExportChatButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async () => {
        if (isExporting) return;
        setIsExporting(true);

        try {
            const result = await exportConversation(chatId);

            if (result.error) {
                toast.error(result.error);
                return;
            }

            if (!result.html) {
                toast.error("No se pudo generar la exportación");
                return;
            }

            // Create and download the file
            const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const safeName = (chatName || "chat").replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "").trim().replace(/\s+/g, "_");
            const dateStr = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `Conversacion_${safeName}_${dateStr}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Conversación exportada");
        } catch {
            toast.error("Error exportando la conversación");
        } finally {
            setIsExporting(false);
        }
    }, [chatId, chatName, isExporting]);

    return (
        <DropdownMenuItem
            onClick={(e) => {
                e.preventDefault();
                void handleExport();
            }}
            disabled={isExporting}
            className="gap-2 cursor-pointer"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            {isExporting ? "Exportando..." : "Exportar conversación"}
        </DropdownMenuItem>
    );
}
