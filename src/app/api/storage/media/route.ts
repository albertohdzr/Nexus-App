import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";

export async function GET(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Storage credentials not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await client.storage.from(bucket).download(path);

  if (error || !data) {
    console.error("Storage download error:", error);
    return NextResponse.json(
      { error: "Failed to download media" },
      { status: 404 }
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const mimeType = data.type || "application/octet-stream";

  return new NextResponse(Buffer.from(arrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
