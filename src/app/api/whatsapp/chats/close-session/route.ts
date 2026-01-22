import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const apiBase = process.env.CHAT_API_URL || "http://127.0.0.1:8000"

    const response = await fetch(`${apiBase}/api/whatsapp/chats/close-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const text = await response.text()

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    })
  } catch (error) {
    console.error("close-session proxy error", error)
    return NextResponse.json(
      { error: "No se pudo cerrar la sesion." },
      { status: 500 }
    )
  }
}
