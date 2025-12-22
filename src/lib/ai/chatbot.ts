import { openAIService, type ResponseTool } from "@/src/lib/ai/open";

const HANDOFF_RESPONSE_TEXT =
  "Perfecto, en un momento una persona lo contactará.";

type DirectoryContactContext = {
  role_slug: string;
  display_role: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  extension?: string | null;
  mobile?: string | null;
  allow_bot_share?: boolean | null;
  share_email?: boolean | null;
  share_phone?: boolean | null;
  share_extension?: boolean | null;
  share_mobile?: boolean | null;
};

type LeadProfileContext = {
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  student_first_name?: string | null;
  student_last_name_paternal?: string | null;
  grade_interest?: string | null;
  school_year?: string | null;
  current_school?: string | null;
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
  botDirectoryEnabled?: boolean | null;
  directoryContacts?: DirectoryContactContext[];
  leadActive?: boolean | null;
  leadId?: string | null;
  leadStatus?: string | null;
  leadProfile?: LeadProfileContext | null;
  appointmentsEnabled?: boolean | null;
};

const HANDOFF_TOOL: ResponseTool[] = [
  {
    type: "function",
    name: "request_handoff",
    description:
      "Usa esta función si el usuario pide hablar con un humano o un agente.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description:
            "Breve razón o frase que resume la solicitud del usuario.",
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
    "Crea un registro de interés cuando ya tengas los datos mínimos. No pidas datos extra si no los mencionan. No llames la función hasta tener los campos requeridos.",
  parameters: {
    type: "object",
    properties: {
      contact_name: {
        type: "string",
        description: "Nombre completo del contacto/padre/tutor.",
      },
      contact_phone: {
        type: "string",
        description: "Teléfono de contacto con lada (ej. 5218711234567).",
      },
      contact_email: {
        type: "string",
        description: "Correo electrónico del contacto.",
      },
      student_first_name: {
        type: "string",
        description: "Nombre del estudiante.",
      },
      student_last_name_paternal: {
        type: "string",
        description: "Apellido paterno del estudiante.",
      },
      grade_interest: {
        type: "string",
        description: "Grado o nivel al que desea inscribirse (requerido).",
      },
      current_school: {
        type: "string",
        description: "Escuela actual del estudiante.",
      },
      summary: {
        type: "string",
        description:
          "Resumen breve de la conversación y lo solicitado por el usuario.",
      },
      source: {
        type: "string",
        description: "Fuente del registro, por defecto whatsapp.",
      },
    },
    required: [
      "contact_name",
      "contact_phone",
      "student_first_name",
      "student_last_name_paternal",
      "grade_interest",
      "current_school",
      "summary",
      "source",
      "contact_email",
    ],
    additionalProperties: false,
  },
  strict: true,
};

const GET_DIRECTORY_CONTACT_TOOL: ResponseTool = {
  type: "function",
  name: "get_directory_contact",
  description:
    "Obtén el contacto adecuado del directorio interno. Úsalo si piden hablar con alguien específico (ej. caja, admisiones, soporte).",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Rol, puesto o nombre solicitado (ej. caja, coordinación, dirección).",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
};

const GET_FINANCE_TOOL: ResponseTool = {
  type: "function",
  name: "get_finance_info",
  description:
    "Devuelve información financiera predefinida (fechas de pago, conceptos, montos, contacto de caja). Úsalo para resolver preguntas de pagos.",
  parameters: {
    type: "object",
    properties: {
      capability_slug: {
        type: "string",
        description:
          "Slug de la capacidad financiera (ej. pagos, colegiaturas).",
      },
      item: {
        type: "string",
        description:
          "Etiqueta o concepto solicitado (ej. fecha_limite_inscripcion, caja_contacto).",
      },
    },
    required: ["capability_slug", "item"],
    additionalProperties: false,
  },
};

const CREATE_COMPLAINT_TOOL: ResponseTool = {
  type: "function",
  name: "create_complaint",
  description:
    "Registra una queja o comentario del usuario. Úsalo cuando el usuario quiera levantar una queja o reporte.",
  parameters: {
    type: "object",
    properties: {
      capability_slug: {
        type: "string",
        description: "Slug de la capacidad configurada para quejas.",
      },
      summary: {
        type: "string",
        description: "Descripción breve de la queja.",
      },
      channel: {
        type: "string",
        description: "Canal de origen (ej. whatsapp).",
      },
      customer_name: {
        type: "string",
      },
      customer_contact: {
        type: "string",
      },
    },
    required: [
      "capability_slug",
      "summary",
      "channel",
      "customer_name",
      "customer_contact",
    ],
    additionalProperties: false,
  },
};

const SCHEDULE_VISIT_TOOL: ResponseTool = {
  type: "function",
  name: "schedule_visit",
  description:
    "Agenda una visita de admisiones cuando ya tengas los datos necesarios. Úsalo solo cuando el usuario confirmó interés en agendar.",
  parameters: {
    type: "object",
    properties: {
      contact_name: {
        type: "string",
        description: "Nombre completo del contacto/tutor.",
      },
      contact_phone: {
        type: "string",
        description: "Teléfono con lada del contacto.",
      },
      student_first_name: {
        type: "string",
        description: "Nombre del estudiante.",
      },
      student_last_name_paternal: {
        type: "string",
        description: "Apellido paterno del estudiante.",
      },
      grade_interest: {
        type: "string",
        description: "Grado o nivel de interés.",
      },
      current_school: {
        type: "string",
        description: "Escuela actual del estudiante; si no aplica, deja vacío.",
      },
      preferred_date: {
        type: "string",
        description: "Fecha preferida para la visita (YYYY-MM-DD).",
      },
      preferred_time: {
        type: "string",
        description: "Hora preferida (HH:MM) o 'mañana/tarde'.",
      },
      notes: {
        type: "string",
        description: "Resumen breve de la solicitud; si no hay, deja vacío.",
      },
    },
    required: [
      "contact_name",
      "contact_phone",
      "student_first_name",
      "student_last_name_paternal",
      "grade_interest",
      "current_school",
      "preferred_date",
      "preferred_time",
      "notes",
    ],
    additionalProperties: false,
  },
};

const LIST_AVAILABLE_APPOINTMENTS_TOOL: ResponseTool = {
  type: "function",
  name: "list_available_appointments",
  description:
    "Lista los slots disponibles para visitas dentro de un rango de fechas.",
  parameters: {
    type: "object",
    properties: {
      start_date: {
        type: "string",
        description: "Fecha inicial del rango (YYYY-MM-DD).",
      },
      end_date: {
        type: "string",
        description: "Fecha final del rango (YYYY-MM-DD).",
      },
    },
    required: ["start_date", "end_date"],
    additionalProperties: false,
  },
  strict: true,
};

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

  const firstContentRaw = firstOutput && typeof firstOutput === "object"
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
          if (
            typeof chunk?.value === "string" && chunk.value.trim().length > 0
          ) {
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
      if (
        output && typeof output === "object" &&
        (output as { type?: string }).type === "function_call"
      ) {
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

  const hasDirectoryContacts = Boolean(
    context.botDirectoryEnabled &&
      (context.directoryContacts || []).some((contact) =>
        contact.allow_bot_share
      ),
  );
  if (hasDirectoryContacts) {
    tools.push(GET_DIRECTORY_CONTACT_TOOL);
  }
  if (!context.leadActive) {
    tools.push(GET_FINANCE_TOOL);
  }
  tools.push(CREATE_COMPLAINT_TOOL);
  if (context.appointmentsEnabled) {
    tools.push(LIST_AVAILABLE_APPOINTMENTS_TOOL);
    tools.push(SCHEDULE_VISIT_TOOL);
  }

  const resolvedBotInstructions = (context.botInstructions || "")
    .replace(/{{\s*Nombre del Bot\s*}}/gi, context.botName || "Asistente")
    .replace(
      /{{\s*Nombre del Colegio\s*}}/gi,
      context.organizationName || "la institución",
    );

  const instructions = resolvedBotInstructions;

  const model = context.botModel || undefined;
  let aiResponse: unknown;
  try {
    aiResponse = await openAIService.createResponse({
      input,
      conversationId,
      tools,
      instructions,
      model,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const callIdMatch = errorMessage.match(/function call (call_[A-Za-z0-9]+)/);
    if (callIdMatch && conversationId) {
      await openAIService.submitToolOutputs({
        conversationId,
        model,
        toolOutputs: [
          {
            tool_call_id: callIdMatch[1],
            output: JSON.stringify({ status: "auto_acknowledged" }),
          },
        ],
      });
      aiResponse = await openAIService.createResponse({
        input,
        conversationId,
        tools,
        instructions,
        model,
      });
    } else {
      throw error;
    }
  }

  const functionCalls = extractFunctionCalls(aiResponse);
  const handoffRequested = functionCalls.some((call) =>
    call.name === "request_handoff"
  );

  const responseAny = aiResponse as { output?: unknown[] } | null | undefined;
  const firstOutput =
    Array.isArray(responseAny?.output) && responseAny?.output.length
      ? responseAny?.output[0]
      : undefined;
  const responseMessageId =
    firstOutput && typeof firstOutput === "object" && "id" in firstOutput
      ? typeof (firstOutput as { id?: unknown }).id === "string"
        ? (firstOutput as { id?: string }).id ?? null
        : null
      : null;

  return {
    aiResponse,
    replyText: handoffRequested
      ? HANDOFF_RESPONSE_TEXT
      : extractResponseText(aiResponse),
    handoffRequested,
    responseMessageId,
    model: (aiResponse as { model?: string }).model,
    functionCalls,
  };
};

export {
  extractFunctionCalls,
  extractResponseText,
  generateChatbotReply,
  HANDOFF_RESPONSE_TEXT,
};

export type { ChatbotReply, GenerateChatbotReplyArgs };
