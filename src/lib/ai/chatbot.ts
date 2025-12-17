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

type CapabilityContact = {
  name: string
  role?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
  priority?: number | null
}

type CapabilityFinance = {
  item: string
  value: string
  notes?: string | null
  valid_from?: string | null
  valid_to?: string | null
  priority?: number | null
}

type CapabilityContext = {
  slug: string
  title: string
  description?: string | null
  instructions?: string | null
  response_template?: string | null
  type?: string | null
  metadata?: Record<string, any> | null
  contacts?: CapabilityContact[]
  finance?: CapabilityFinance[]
}

type DirectoryContactContext = {
  role_slug: string
  display_role: string
  name: string
  email?: string | null
  phone?: string | null
  extension?: string | null
  mobile?: string | null
  allow_bot_share?: boolean | null
  share_email?: boolean | null
  share_phone?: boolean | null
  share_extension?: boolean | null
  share_mobile?: boolean | null
}

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
  capabilities?: CapabilityContext[];
  botDirectoryEnabled?: boolean | null;
  directoryContacts?: DirectoryContactContext[];
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
        description: "Rol, puesto o nombre solicitado (ej. caja, coordinación, dirección).",
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
        description: "Slug de la capacidad financiera (ej. pagos, colegiaturas).",
      },
      item: {
        type: "string",
        description: "Etiqueta o concepto solicitado (ej. fecha_limite_inscripcion, caja_contacto).",
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
    required: ["capability_slug", "summary", "channel", "customer_name", "customer_contact"],
    additionalProperties: false,
  },
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

Estilo de conversación:
- No repitas el saludo si ya saludaste en la sesión; solo al inicio o si el usuario saluda.
- Evita repetir "soy asistente virtual" en cada respuesta.
- Responde en 1-2 frases claras y termina con una pregunta breve o siguiente paso.
- Si el usuario ya pidió un contacto, compártelo directo sin pedir permiso otra vez.
- Si no tienes un dato (ej. saldo), dilo de forma amable y ofrece el siguiente paso.
- No ofrezcas contacto si la pregunta ya quedó resuelta y no lo pidió explícitamente.
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

  const hasDirectoryContacts = Boolean(
    context.botDirectoryEnabled &&
      (context.directoryContacts || []).some((contact) => contact.allow_bot_share)
  );
  const hasFinance = context.capabilities?.some((cap) => (cap.finance?.length || 0) > 0);
  const hasComplaints = context.capabilities?.some(
    (cap) =>
      cap.type === "complaint" ||
      ((cap.metadata as { allow_complaints?: boolean } | null)?.allow_complaints === true)
  );

  if (hasDirectoryContacts) {
    tools.push(GET_DIRECTORY_CONTACT_TOOL);
  }
  if (hasFinance) {
    tools.push(GET_FINANCE_TOOL);
  }
  if (hasComplaints) {
    tools.push(CREATE_COMPLAINT_TOOL);
  }

  const capabilityBlocks =
    context.capabilities?.map((cap) => {
      const finance =
        cap.finance && cap.finance.length
          ? `Datos: ${cap.finance.map((f) => `${f.item}: ${f.value}`).join("; ")}`
          : null;

      return `- ${cap.title} (slug: ${cap.slug})${cap.description ? `: ${cap.description}` : ""}${
        cap.instructions ? `\n  Indicaciones: ${cap.instructions}` : ""
      }${finance ? `\n  ${finance}` : ""}${
        cap.response_template ? `\n  Plantilla: ${cap.response_template}` : ""
      }`;
    })?.join("\n") || "Ninguna capacidad definida.";

  const directorySummary = hasDirectoryContacts
    ? `Directorio habilitado. Roles disponibles: ${(context.directoryContacts || [])
        .filter((contact) => contact.allow_bot_share)
        .map((contact) => contact.display_role || contact.role_slug)
        .join(", ")}.`
    : "Directorio no disponible para el bot.";

  const dynamicContext = `
Organización: ${context.organizationName || "N/A"} (${context.organizationId})
Bot: ${context.botName || "Asistente"}${context.botTone ? `, tono: ${context.botTone}` : ""}${context.botLanguage ? `, idioma preferido: ${context.botLanguage}` : ""}.
Whatsapp wa_id: ${context.waId || "N/A"}; chat_id: ${context.chatId || "N/A"}; teléfono contacto sugerido: ${context.phoneNumber || "N/A"}.
Si llamas create_lead, usa source='whatsapp' por defecto y rellena los campos que ya conoces.`;

  const resolvedBotInstructions = (context.botInstructions || "")
    .replace(/{{\s*Nombre del Bot\s*}}/gi, context.botName || "Asistente")
    .replace(/{{\s*Nombre del Colegio\s*}}/gi, context.organizationName || "la institución");

  const instructions = `
${BASE_INSTRUCTIONS}
${resolvedBotInstructions}

Capacidades disponibles (elige la que corresponda por slug):
${capabilityBlocks}

${directorySummary}

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
