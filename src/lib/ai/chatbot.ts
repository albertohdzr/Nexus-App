import { openAIService, type ResponseTool } from "@/src/lib/ai/open";

const HANDOFF_RESPONSE_TEXT = "Perfecto, en un momento una persona lo contactará.";

type CreateLeadArgs = {
  contact_phone: string;
  contact_email?: string | null;
  contact_first_name?: string | null;
  contact_last_name_paternal?: string | null;
  student_first_name: string;
  student_last_name_paternal: string;
  grade_interest: string;
  student_middle_name?: string | null;
  student_last_name_maternal?: string | null;
  student_dob?: string | null;
  school_year?: string | null;
  campus?: string | null;
  summary: string;
  source?: string | null;
};

type BotContext = {
  organizationId: string;
  organizationName?: string | null;
  botName?: string | null;
  botTone?: string | null;
  botLanguage?: string | null;
  botInstructions?: string | null;
  botModel?: string | null;
  waId?: string | null;
  chatId?: string | null;
  phoneNumber?: string | null;
};

const HANDOFF_TOOL: ResponseTool[] = [
  {
    type: "function",
    name: "request_handoff",
    description: "Usa esta función si el usuario pide hablar con un humano o un agente.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Breve razón o frase que resume la solicitud del usuario.",
        },
      },
      required: ["reason"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const CREATE_LEAD_TOOL: ResponseTool = {
  type: "function",
  name: "create_lead",
  description:
    "Crea un lead cuando ya tengas los datos mínimos. Pide más información si falta algo. No llames la función hasta tener los campos requeridos.",
  parameters: {
    type: "object",
    properties: {
      contact_phone: {
        type: "string",
        description: "Teléfono de contacto con lada (ej. 5218711234567).",
      },
      contact_email: {
        type: "string",
        description: "Correo del contacto, si lo proporcionan.",
      },
      contact_first_name: {
        type: "string",
        description: "Nombre del contacto/padre/tutor.",
      },
      contact_last_name_paternal: {
        type: "string",
        description: "Apellido paterno del contacto/padre/tutor.",
      },
      student_first_name: {
        type: "string",
        description: "Nombre del estudiante.",
      },
      student_middle_name: {
        type: "string",
      },
      student_last_name_paternal: {
        type: "string",
        description: "Apellido paterno del estudiante.",
      },
      student_last_name_maternal: {
        type: "string",
      },
      student_dob: {
        type: "string",
        description: "Fecha de nacimiento del estudiante en formato YYYY-MM-DD.",
      },
      grade_interest: {
        type: "string",
        description: "Grado o nivel al que desea inscribirse (requerido).",
      },
      school_year: {
        type: "string",
        description: "Ciclo escolar de interés, si aplica.",
      },
      campus: {
        type: "string",
        description: "Campus preferido, si aplica.",
      },
      summary: {
        type: "string",
        description: "Resumen breve de la conversación y lo solicitado por el usuario.",
      },
      source: {
        type: "string",
        description: "Fuente del lead, por defecto whatsapp.",
      },
    },
    required: [
      "contact_phone",
      "contact_email",
      "contact_first_name",
      "contact_last_name_paternal",
      "student_first_name",
      "student_middle_name",
      "student_last_name_paternal",
      "student_last_name_maternal",
      "student_dob",
      "grade_interest",
      "school_year",
      "campus",
      "summary",
      "source",
    ],
    additionalProperties: false,
  },
  strict: true,
};

const BASE_INSTRUCTIONS = `
Eres un asistente de admisiones. Si el usuario pide hablar con un humano, usa la función request_handoff.
Si el usuario pide informes o quiere aplicar, recolecta datos para crear un lead usando create_lead:
- Teléfono de contacto (obligatorio, incluye lada).
- Nombre del estudiante y apellido paterno (obligatorio, pide materno si aplica).
- Grado de interés (obligatorio), ciclo escolar y campus si aplica.
- Nombre del contacto (padre/tutor) y email si lo mencionan.
- Resume la conversación en 'summary'.
Solo llama create_lead cuando tengas los campos requeridos y sean claros. Mientras falten datos, haz preguntas cortas para obtenerlos.
Responde en el idioma preferido si se indica, y mantén el tono configurado.
`;

const extractResponseText = (response: unknown) => {
  const responseAny = response as
    | { output_text?: string | null; output?: unknown[] }
    | null
    | undefined;

  if (responseAny?.output_text) {
    return responseAny.output_text;
  }

  const firstOutput = Array.isArray(responseAny?.output)
    ? responseAny.output[0]
    : undefined;

  const firstContentRaw =
    firstOutput && typeof firstOutput === "object"
      ? (firstOutput as { content?: unknown }).content
      : null;

  const firstContent = Array.isArray(firstContentRaw)
    ? firstContentRaw[0]
    : null;

  if (firstContent?.text && typeof firstContent.text === "string") {
    return firstContent.text;
  }

  if (firstContent?.value && typeof firstContent.value === "string") {
    return firstContent.value;
  }

  if (Array.isArray(responseAny?.output)) {
    for (const output of responseAny.output) {
      // @ts-expect-error - defensively traverse SDK output
      const content = output?.content;
      if (Array.isArray(content)) {
        for (const chunk of content) {
          if (typeof chunk?.text === "string" && chunk.text.trim().length > 0) {
            return chunk.text;
          }
          if (typeof chunk?.value === "string" && chunk.value.trim().length > 0) {
            return chunk.value;
          }
        }
      }
    }
  }

  return null;
};

const extractFunctionCalls = (response: unknown) => {
  const responseAny = response as { output?: unknown[] } | null | undefined;
  const outputs = Array.isArray(responseAny?.output) ? responseAny?.output : [];

  return outputs
    .map((output) => {
      if (output && typeof output === "object" && (output as { type?: string }).type === "function_call") {
        const typedOutput = output as {
          name?: string;
          arguments?: string | Record<string, unknown>;
          call_id?: string;
          id?: string;
        };
        return typedOutput;
      }
      return null;
    })
    .filter(Boolean) as Array<{
    name?: string;
    arguments?: string | Record<string, unknown>;
    call_id?: string;
    id?: string;
  }>;
};

type GenerateChatbotReplyArgs = {
  input: string;
  conversationId: string;
  context: BotContext;
};

type ChatbotReply = {
  aiResponse: unknown;
  replyText: string | null;
  handoffRequested: boolean;
  responseMessageId: string | null;
  model?: string;
  functionCalls: Array<{
    name?: string;
    arguments?: string | Record<string, unknown>;
    call_id?: string;
    id?: string;
  }>;
};

const generateChatbotReply = async ({
  input,
  conversationId,
  context,
}: GenerateChatbotReplyArgs): Promise<ChatbotReply> => {
  const tools: ResponseTool[] = [...HANDOFF_TOOL, CREATE_LEAD_TOOL];

  const dynamicContext = `
Organización: ${context.organizationName || "N/A"} (${context.organizationId})
Bot: ${context.botName || "Asistente"}${context.botTone ? `, tono: ${context.botTone}` : ""}${context.botLanguage ? `, idioma preferido: ${context.botLanguage}` : ""}.
Whatsapp wa_id: ${context.waId || "N/A"}; chat_id: ${context.chatId || "N/A"}; teléfono contacto sugerido: ${context.phoneNumber || "N/A"}.
Si llamas create_lead, usa source='whatsapp' por defecto y rellena los campos que ya conoces.`;

  const instructions = `
${BASE_INSTRUCTIONS}
${context.botInstructions || ""}

${dynamicContext}
  `;

  const aiResponse = await openAIService.createResponse({
    input,
    conversationId,
    tools,
    instructions,
    model: context.botModel || undefined,
  });

  const functionCalls = extractFunctionCalls(aiResponse);
  const handoffRequested = functionCalls.some((call) => call.name === "request_handoff");

  const firstOutput = Array.isArray((aiResponse as { output?: unknown[] }).output)
    ? (aiResponse as { output?: unknown[] }).output?.[0]
    : undefined;
  const responseMessageId =
    // @ts-expect-error - defensive read
    firstOutput?.id && typeof firstOutput.id === "string" ? firstOutput.id : null;

  return {
    aiResponse,
    replyText: handoffRequested ? HANDOFF_RESPONSE_TEXT : extractResponseText(aiResponse),
    handoffRequested,
    responseMessageId,
    model: (aiResponse as { model?: string }).model,
    functionCalls,
  };
};

export {
  HANDOFF_RESPONSE_TEXT,
  generateChatbotReply,
  extractResponseText,
  extractFunctionCalls,
};

export type { ChatbotReply, GenerateChatbotReplyArgs };
