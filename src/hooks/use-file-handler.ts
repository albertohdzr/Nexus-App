import { useEffect, useState } from "react";
import { toast } from "sonner";

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

export function useFileHandler() {
    const [attachment, setAttachment] = useState<File | null>(null);
    const [attachmentPreview, setAttachmentPreview] = useState<string | null>(
        null,
    );
    const [isConverting, setIsConverting] = useState(false);

    const handleFileSelection = async (file: File) => {
        let workingFile = file;
        const wantsAudioConversion = file.type.startsWith("audio/") &&
            file.type !== "audio/mp4";

        if (wantsAudioConversion) {
            try {
                setIsConverting(true);
                const { convertBlobToMp4 } = await import(
                    "@/src/lib/convert-audio"
                );
                const mp4Blob = await convertBlobToMp4(file);
                const baseName = file.name.replace(/\.[^/.]+$/, "") || "audio";
                workingFile = new File(
                    [mp4Blob],
                    `${baseName}-${Date.now()}.m4a`,
                    { type: "audio/mp4" },
                );
            } catch (err) {
                console.error("Error converting audio:", err);
                toast.error("No se pudo convertir el audio a MP4/AAC.");
                setIsConverting(false);
                return;
            }
            setIsConverting(false);
        }

        const isImage = ALLOWED_IMAGE_TYPES.includes(workingFile.type);
        const isDoc = ALLOWED_DOC_TYPES.includes(workingFile.type);
        const isAudio = ALLOWED_AUDIO_TYPES.includes(workingFile.type);

        if (!isImage && !isDoc && !isAudio) {
            toast.error(
                "Tipo de archivo no permitido. Usa PDF, DOC(X), XLS(X), PPT(X), TXT, audio (AAC/AMR/MP3/OGG/MP4) o imagen JPEG/PNG.",
            );
            return;
        }

        if (isImage && workingFile.size > MAX_IMAGE_BYTES) {
            toast.error("La imagen debe pesar máximo 5 MB");
            return;
        }
        if (isDoc && workingFile.size > MAX_DOC_BYTES) {
            toast.error("El archivo debe pesar máximo 100 MB");
            return;
        }
        if (isAudio && workingFile.size > MAX_AUDIO_BYTES) {
            toast.error("El audio debe pesar máximo 16 MB");
            return;
        }

        if (attachmentPreview) {
            URL.revokeObjectURL(attachmentPreview);
        }

        const previewUrl = isImage || workingFile.type === "application/pdf"
            ? URL.createObjectURL(workingFile)
            : null;

        setAttachment(workingFile);
        setAttachmentPreview(previewUrl);
    };

    const clearAttachment = () => {
        if (attachmentPreview) {
            URL.revokeObjectURL(attachmentPreview);
        }
        setAttachment(null);
        setAttachmentPreview(null);
    };

    useEffect(() => {
        return () => {
            if (attachmentPreview) {
                URL.revokeObjectURL(attachmentPreview);
            }
        };
    }, [attachmentPreview]);

    return {
        attachment,
        attachmentPreview,
        isConverting,
        handleFileSelection,
        clearAttachment,
        setAttachment,
        setAttachmentPreview,
        ALLOWED_IMAGE_TYPES,
        ALLOWED_DOC_TYPES,
        ALLOWED_AUDIO_TYPES,
    };
}
