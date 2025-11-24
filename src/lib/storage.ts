import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_BUCKET = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";

if (!supabaseUrl) {
  console.warn("NEXT_PUBLIC_SUPABASE_URL is missing; storage uploads disabled.");
}
if (!serviceRoleKey) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing; storage uploads disabled.");
}

export async function uploadToStorage({
  file,
  path,
  contentType,
  bucket = DEFAULT_BUCKET,
}: {
  file: ArrayBuffer | Buffer;
  path: string;
  contentType?: string;
  bucket?: string;
}): Promise<{ path?: string; error?: string }> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { error: "Missing Supabase credentials" };
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  // Best-effort bucket creation (idempotent: if exists, ignore).
  try {
    await client.storage.createBucket(bucket, {
      public: false,
    });
  } catch {
    // If bucket exists, ignore.
  }

  const uploadResult = await client.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

  if (uploadResult.error) {
    return { error: uploadResult.error.message };
  }

  return {
    path: uploadResult.data.path,
  };
}
