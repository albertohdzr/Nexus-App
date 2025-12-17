import { openAIService, type ResponseTool } from "@/src/lib/ai/open";

const HANDOFF_RESPONSE_TEXT = "Perfecto, en un momento una persona lo contactará.";

type CreateLeadArgs = {
  contact_name?: string | null;
  contact_phone: string;
  student_first_name: string;
  student_last_name_paternal: string;
  grade_interest: string;
  current_school?: string | null;
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

type LeadProfileContext = {
  contact_name?: string | null
  contact_phone?: string | null
  contact_email?: string | null
  student_first_name?: string | null
  student_last_name_paternal?: string | null
  grade_interest?: string | null
  school_year?: string | null
  current_school?: string | null
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
        description: "Resumen breve de la conversación y lo solicitado por el usuario.",
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

const BASE_INSTRUCTIONS = `
Eres un asistente de admisiones. Si el usuario pide hablar con un humano, usa la función request_handoff.
Si el usuario pide informes o quiere aplicar, recolecta datos para crear un registro de interés usando create_lead:
- Teléfono de contacto (obligatorio, incluye lada).
- Nombre del estudiante y apellido paterno (obligatorio).
- Grado de interés y escuela actual (obligatorio).
- Nombre del contacto (padre/tutor) en una sola línea.
- Resume la conversación en 'summary'.
Solo llama create_lead cuando tengas los campos requeridos y sean claros. Mientras falten datos, haz preguntas cortas para obtenerlos.
No solicites apellido materno, email o fecha de nacimiento si el usuario no los menciona.
Responde en el idioma preferido si se indica, y mantén el tono configurado.
Nunca uses la palabra "lead" con el usuario; di "registro", "solicitud" o "datos de inscripción".
Si hay un registro activo (prospecto), no compartas colegiaturas, costos, cuotas o mensualidades por chat; esa información solo se da en la visita.
Si hay un registro activo y el usuario insiste con colegiaturas/costos, usa request_handoff para canalizarlo con un asesor.
Si NO hay registro activo y preguntan por pagos/colegiaturas, puedes usar get_finance_info según la configuración.
No pidas al usuario que escriba un resumen; tú generas el resumen internamente.
En el primer mensaje de la conversación, preséntate con el nombre del colegio.

Estilo de conversación:
- No repitas el saludo si ya saludaste en la sesión; solo al inicio o si el usuario saluda.
- Evita repetir "soy asistente virtual" en cada respuesta.
- Responde en 1-2 frases claras y termina con una pregunta breve o siguiente paso.
- Si el usuario ya pidió un contacto, compártelo directo sin pedir permiso otra vez.
- Si no tienes un dato (ej. saldo), dilo de forma amable y ofrece el siguiente paso.
- No ofrezcas contacto si la pregunta ya quedó resuelta y no lo pidió explícitamente.
- Si el usuario quiere informes de inscripción, guía la conversación para obtener datos y propone agendar una visita.
- Si está disponible, usa schedule_visit solo cuando ya tengas todos los datos requeridos.
- Si hay un registro activo, prioriza seguimiento de admisiones y evita temas financieros.
- Si hay un registro activo y el usuario comparte fecha u horario, asume que es para agendar o reprogramar la visita.
- No repitas preguntas ya respondidas; usa la información previa del chat.
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
  const hasComplaints = context.capabilities?.some(
    (cap) =>
      cap.type === "complaint" ||
      ((cap.metadata as { allow_complaints?: boolean } | null)?.allow_complaints === true)
  );
  const hasFinance = context.capabilities?.some((cap) => (cap.finance?.length || 0) > 0);
  const allowFinance = !context.leadActive && hasFinance;

  if (hasDirectoryContacts) {
    tools.push(GET_DIRECTORY_CONTACT_TOOL);
  }
  if (allowFinance) {
    tools.push(GET_FINANCE_TOOL);
  }
  if (hasComplaints) {
    tools.push(CREATE_COMPLAINT_TOOL);
  }
  if (context.appointmentsEnabled) {
    tools.push(SCHEDULE_VISIT_TOOL);
  }

  const capabilityBlocks =
    context.capabilities?.map((cap) => {
      const finance =
        allowFinance && cap.finance && cap.finance.length
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

  const leadSummary = context.leadActive
    ? `Registro activo detectado (id: ${context.leadId || "N/A"}, status: ${
        context.leadStatus || "N/A"
      }). Prioriza seguimiento y citas.`
    : "No hay registro activo detectado.";

  const leadProfile = context.leadProfile
    ? `Datos del registro: contacto ${context.leadProfile.contact_name || "N/A"} (${
        context.leadProfile.contact_phone || "N/A"
      }${context.leadProfile.contact_email ? `, ${context.leadProfile.contact_email}` : ""}), estudiante ${
        context.leadProfile.student_first_name || "N/A"
      } ${context.leadProfile.student_last_name_paternal || ""}, grado ${
        context.leadProfile.grade_interest || "N/A"
      }, escuela actual ${context.leadProfile.current_school || "N/A"}${
        context.leadProfile.school_year ? `, ciclo ${context.leadProfile.school_year}` : ""
      }.`
    : "";

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
${leadSummary}
${leadProfile}

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
