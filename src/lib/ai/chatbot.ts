type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type BotRequest = {
  organizationName?: string | null;
  latestUserMessage: string;
  history?: HistoryMessage[];
};

type BotDecision = {
  reply: string;
  handover: boolean;
  reason?: string;
  model?: string;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function buildPrompt({ organizationName }: { organizationName?: string | null }) {
  const orgName = organizationName || "CAT - Nexus";

  return [
    {
      role: "system",
      content: [
        `Eres el asistente principal de ${orgName}.`,
        "Responde siempre en español, tono natural y breve (1-3 frases).",
        `Primera respuesta de cada conversación: "Hola, Bienvenido a CAT - Nexus, ¿en qué te puedo ayudar?"`,
        "Si preguntan por horarios de salida y no tienes dato, responde: \"La salida es a las 2.\"",
        "Para admisiones/inscripciones, pide nombre del estudiante, grado y datos de contacto antes de seguir.",
        "Si el usuario pide hablar con un humano o notas frustración/tema crítico, marca handover en true y di que conectarás con un agente.",
        "Devuelve siempre JSON con las llaves: reply (string), handover (boolean), reason (string opcional). No uses ningún otro formato.",
      ].join("\n"),
    },
  ];
}

export async function generateBotReply({
  organizationName,
  latestUserMessage,
  history = [],
}: BotRequest): Promise<BotDecision | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY missing; skipping bot reply.");
    return null;
  }

  const messages = [
    ...buildPrompt({ organizationName }),
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: latestUserMessage },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content) as Partial<BotDecision>;
    if (!parsed.reply) {
      return null;
    }

    return {
      reply: parsed.reply,
      handover: Boolean(parsed.handover),
      reason: parsed.reason,
      model: data.model || DEFAULT_MODEL,
    };
  } catch (error) {
    console.error("Failed to generate bot reply:", error);
    return null;
  }
}
