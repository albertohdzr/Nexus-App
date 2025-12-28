import { useRef, useState } from "react";
import { toast } from "sonner";

interface UseMediaRecorderProps {
    onStop: (file: File) => void;
}

export function useMediaRecorder({ onStop }: UseMediaRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<BlobPart[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const candidateMimes = [
                "audio/ogg; codecs=opus",
                "audio/webm",
                "audio/mp4",
            ];
            const mimeType = candidateMimes.find((m) =>
                MediaRecorder.isTypeSupported(m)
            );

            const recorder = new MediaRecorder(
                stream,
                mimeType ? { mimeType } : undefined,
            );
            recordedChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, {
                    type: mimeType || "audio/webm",
                });
                const file = new File([blob], `voice-${Date.now()}.ogg`, {
                    type: mimeType || "audio/ogg",
                });

                stream.getTracks().forEach((t) => t.stop());
                setIsRecording(false);
                onStop(file);
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast.error("Error accediendo al micrófono");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    return { isRecording, startRecording, stopRecording };
}
