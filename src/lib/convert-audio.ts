// lib/convertBlobToMp4.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();
let loadingPromise: Promise<boolean> | null = null;

async function ensureLoaded(): Promise<void> {
  if (!loadingPromise) {
    // load() => Promise<boolean> (IsFirst)
    loadingPromise = ffmpeg.load();
  }
  await loadingPromise;
}

/**
 * Convierte un Blob de audio (webm/ogg) a AAC en contenedor MP4 (m4a),
 * compatible con WhatsApp.
 */
export async function convertBlobToMp4(inputBlob: Blob): Promise<Blob> {
  await ensureLoaded();

  const inputName = "input.webm";
  const outputName = "output.m4a";

  // Escribe el archivo de entrada en el FS de ffmpeg
  const data = await fetchFile(inputBlob);
  await ffmpeg.writeFile(inputName, data);

  // Ejecuta ffmpeg
  await ffmpeg.exec([
    "-i",
    inputName,
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputName,
  ]);

  // Lee el resultado (Uint8Array | string)
  const outputData = await ffmpeg.readFile(outputName);

  let uint8: Uint8Array;
  if (typeof outputData === "string") {
    uint8 = new TextEncoder().encode(outputData);
  } else {
    uint8 = outputData as Uint8Array;
  }

  // 👇 Creamos un ArrayBuffer real (no solo ArrayBufferLike) y copiamos los datos
  const arrayBuffer = new ArrayBuffer(uint8.byteLength);
  const view = new Uint8Array(arrayBuffer);
  view.set(uint8);

  // BlobPart acepta ArrayBuffer sin que TS se queje
  return new Blob([arrayBuffer], { type: "audio/mp4" });
}
