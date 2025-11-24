import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      { error: "WHATSAPP_ACCESS_TOKEN not configured" },
      { status: 500 }
    );
  }

  try {
    // First fetch to get the media URL
    const metaResponse = await fetch(
      `https://graph.facebook.com/v24.0/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!metaResponse.ok) {
      const errorText = await metaResponse.text();
      console.error("Media meta fetch failed:", errorText);
      return NextResponse.json(
        { error: "Failed to retrieve media info" },
        { status: 502 }
      );
    }

    const meta = await metaResponse.json();
    const url = meta.url as string | undefined;
    const mimeType = meta.mime_type as string | undefined;

    if (!url) {
      return NextResponse.json(
        { error: "Media URL not provided" },
        { status: 404 }
      );
    }

    // Second fetch to download the file
    const mediaResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error("Media download failed:", errorText);
      return NextResponse.json(
        { error: "Failed to download media" },
        { status: 502 }
      );
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json(
      { error: "Unexpected error retrieving media" },
      { status: 500 }
    );
  }
}
