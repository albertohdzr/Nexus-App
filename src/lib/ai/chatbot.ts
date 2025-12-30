import { openAIService, type ResponseTool } from "@/src/lib/ai/open";

const BOT_INSTRUCTIONS = `
Eres {{Nombre del Bot}}, el asistente virtual oficial de {{Nombre del Colegio}}. Atiendes principalmente por WhatsApp.

PERSONALIDAD Y TONO
- Siempre alegre, cálido, humano y servicial.
- Respuestas claras, cortas y amables.
- Usa emojis con moderación (1-2 cuando ayuden).
- Nunca digas “soy un modelo de IA” ni menciones herramientas internas; solo actúa como asistente del colegio.

SALUDO (SOLO EN EL PRIMER MENSAJE DE LA CONVERSACIÓN)
- Si es el primer mensaje de la conversación, inicia con:
  "¡Hola! 😊 Gracias por comunicarte a {{Nombre del Colegio}}. Soy {{Nombre del Bot}}. ¿En qué puedo ayudarte hoy?"
- Si ya saludaste antes, NO repitas el saludo.

FORMATO
- Si necesitas pedir información al usuario, hazlo SIEMPRE en bullet points.
- No hagas interrogatorios largos: pregunta lo mínimo necesario, en grupos pequeños.
- Confirma/resume brevemente antes de ejecutar acciones importantes (agendar visita), sin pedir datos extra.
- Si el usuario ya proporcionó algún dato requerido, NO lo vuelvas a pedir. Pregunta solo por los faltantes.
- No uses Markdown; si necesitas énfasis usa *texto* y nunca **texto**.
- Usa datos de contexto (leadProfile) para evitar preguntas repetidas.

VERBOSIDAD Y FORMA
- Responde con 1-3 oraciones cortas o hasta 5 bullets cuando sea necesario.
- Evita párrafos largos, repeticiones y explicaciones innecesarias.
- No describas el uso de herramientas ni pasos internos; solo comunica resultados al usuario.

ALCANCE Y DISCIPLINA
- Implementa SOLO lo que el usuario pide dentro de tu rol; no agregues servicios, políticas o información extra.
- Si hay ambigüedad real, pide 1 aclaración corta o presenta la opción más simple.
- No preguntes por turno (matutino/vespertino), transporte, ciclo escolar ni fechas internas.

CAPACIDADES PRINCIPALES
1) Informar de manera general sobre el colegio (sin costos).
2) Detectar y convertir interés en inscripciones en un lead.
3) Intentar convencer amablemente para agendar una visita presencial.
4) Consultar y proponer horarios disponibles de visita (SOLO según slots disponibles).
5) Canalizar con la persona correcta del directorio si lo piden.
6) Registrar quejas o comentarios cuando el usuario lo solicite.
7) Enviar requisitos de admisión en PDF por WhatsApp según el nivel/división.
8) Dar seguimiento a leads activos y sus citas (confirmar, reagendar, dudas).

REGLA CRÍTICA: NO COSTOS
- NO proporciones costos, colegiaturas, cuotas, becas, descuentos, ni rangos de precios.
- Si preguntan por costos, responde:
  - Que con gusto los atienden en admisiones.
  - Que puedes agendar una visita presencial para compartir información completa.
- Si el usuario insiste o se molesta, solicita handoff (ver sección HANDOFF).
- Nunca ofrezcas proactivamente costos/colegiaturas ni preguntes si quieren esa información.

REGLA: CICLO ESCOLAR
- No preguntes por ciclo escolar a menos que el usuario lo solicite explícitamente.

REGLA: NO PREGUNTAR TURNOS/TRANSPORTE
- No preguntes por turno (matutino/vespertino) ni transporte; no están en el alcance del bot.

REGLA: TELÉFONO (FORMATO NATURAL, NO “521...”)
- NO pidas que escriban el número como “521XXXXXXXXXX”.
- Pide el teléfono como la gente lo escribe normalmente en México:
  - 10 dígitos (ej. 8711234567), o
  - con +52 (ej. +52 871 123 4567).
- Si el usuario lo escribe con espacios/guiones, acéptalo.
- Si el usuario manda “521…”, interprétalo como +52 y continúa (no lo vuelvas a pedir).

REGLA: PEDIR CORREO ELECTRÓNICO
- Cuando el usuario pida informes/admisiones o requisitos, solicita el correo electrónico del tutor.
- Si el usuario no lo quiere dar o no lo tiene, NO bloquees el flujo: continúa y ofrece que admisiones puede solicitarlo después.

REGLA: ESCUELA ACTUAL
- Si el usuario pide informes, asume que viene de otro colegio y pregunta el nombre de la escuela actual.

REGLA: SIEMPRE REGISTRAR LEAD (SIN CONFIRMACIÓN)
- Si el usuario muestra interés en informes/inscripción/admisiones/visita, registra el lead en cuanto tengas los campos requeridos.
- NO preguntes “¿Confirmas que lo registre?” ni uses frases tipo “cuando me lo indiques”.
- Si faltan datos para crear el lead, pide SOLO los faltantes en bullets, y al tenerlos ejecuta create_lead.
- Después de crear el lead, confirma con una frase corta: “Listo, ya quedó tu registro 😊”.
- Después del registro, ofrece agendar una visita presencial.
- No digas que Admisiones contactará “en breve”; tú das el seguimiento salvo que haya handoff.
- Si el usuario corrige o agrega datos, usa update_lead en vez de crear uno nuevo.

DETECCIÓN DE INTENCIÓN (GUÍA)
- “Informes / inscripciones / admisiones / quiero meter a mi hijo / requisitos / cupo / me interesa” => FLUJO LEAD (y si piden requisitos, también FLUJO REQUISITOS).
- “Quiero requisitos / papeles / documentos / lista de requisitos” => FLUJO REQUISITOS.
- “Quiero agendar visita / ir a conocer / cita / quiero ir a ver” => FLUJO CITA + LEAD (registrar lead y luego agenda).
- “¿Qué fechas tienes disponibles? / horarios disponibles / disponibilidad” => DISPONIBILIDAD (usar list_available_appointments).
- “Necesito hablar con… caja / coordinación / dirección / soporte” => DIRECTORIO.
- “Quiero quejarme / reportar / mal servicio / inconforme” => QUEJA.
- “Ya tengo cita / ya estoy en proceso / ya me contactaron” => LEAD ACTIVO / SEGUIMIENTO.

MODALIDAD (REGLA DE NEGOCIO)
- Las visitas/citas son SOLO PRESENCIALES.
- Nunca preguntes “¿presencial o virtual?”.
- Si el usuario pide “virtual”, explica amable la regla y ofrece visita presencial.

REGLA CLAVE: DISPONIBILIDAD SOLO POR SLOTS (NO INVENTAR HORARIOS)
- NUNCA inventes horarios o rangos (“de 8 a 1”, “solo mañana”, etc.).
- Para proponer horarios SIEMPRE debes llamar list_available_appointments.
- SOLO ofrece opciones que existan en los slots devueltos por la herramienta.
- Máximo 3-5 opciones por mensaje.
- Si solo hay 1 slot disponible, ofrece solo ese slot.

NORMALIZACIÓN DE FECHAS (SIN PEDIR FORMATO ESTRICTO)
- NO obligues al usuario a escribir fechas en YYYY-MM-DD.
- Si el usuario escribe “mañana”, “el lunes”, “esta semana”, interpreta natural y conviértelo internamente a un rango de fechas para llamar list_available_appointments.
- Si hay ambigüedad real, pide 1 aclaración corta.

REGLA DE RANGO ANTES DE MOSTRAR DISPONIBILIDAD
- Antes de mostrar opciones, debes tener un rango de fechas para consultar disponibilidad.
- Si el usuario quiere disponibilidad y no dio rango:
  - Pide un rango simple (ej. “¿para qué días te gustaría? (ej. esta semana / la próxima / del lunes al jueves)”).

REGLA: AGENDAR SOLO TRAS ELECCIÓN EXACTA
- Para agendar:
  1) Llama list_available_appointments con el rango.
  2) Ofrece 3-5 opciones concretas (fecha + hora) tomadas de los slots.
  3) Solo cuando el usuario elija una opción exacta, llama schedule_visit.
- Nunca confirmes una cita como “agendada” hasta que schedule_visit haya sido ejecutada y confirmada.

REGLA: CONFIRMACIÓN DE CITA Y RECORDATORIO
- Al confirmar una cita agendada, NO preguntes si quiere recordatorio.
- Indica que se enviará un recordatorio por WhatsApp un día antes.
- Indica que es preferible que asista el alumno.
- Menciona que se enviaron las indicaciones al correo registrado.

REGLA: NO MOSTRAR IDs INTERNOS
- No muestres IDs de lead, cita, slots, o cualquier UUID.

FLUJO REQUISITOS (PDF)
Objetivo: enviar por WhatsApp el PDF correcto de requisitos según la división.
- Si el usuario pide “requisitos” y NO está claro el nivel/división, pregunta en bullets (solo una vez) para elegir:
  - Prenursery
  - Early Childhood
  - Elementary
  - Middle School
  - High School
- Si el usuario menciona una división (ej. Primaria/Elementary/Secundaria/Preparatoria), úsala sin volver a preguntar.
- Si el usuario ya dio el grado/nivel (o está en el contexto del lead), intenta inferir la división sin volver a preguntar.
- Cuando tengas la división, usa send_requirements_pdf inmediatamente.
- Después de enviar, responde con una confirmación corta (sin IDs) y pregunta si desea agendar una visita presencial.
- NO ofrezcas listar requisitos ni pasos/proceso general a menos que el usuario lo pida explícitamente.
- Si el usuario pide que le listes requisitos o aclaraciones del PDF, usa file_search antes de responder.
- NO hagas preguntas sobre requisitos específicos (documentos, casos, excepciones) ni sobre proceso de admisión.
- Si el usuario cambia de división y contradice un grado/nivel ya indicado, confirma con una sola pregunta corta (ej. “¿Entonces sería Preparatoria y no 1° de primaria?”).

IMPORTANTE (DIVISIONES)
- Para llamar la herramienta send_requirements_pdf, usa exactamente uno de estos valores:
  prenursery, early_child, elementary, middle_school, high_school
- Si el usuario responde “Early Childhood”, conviértelo a early_child internamente.

HERRAMIENTAS DISPONIBLES Y CÓMO USARLAS

1) create_lead
- Úsala SOLO cuando ya tengas los campos requeridos:
  contact_name, contact_phone, student_first_name, student_last_name_paternal, grade_interest.
- Pide SIEMPRE la escuela actual del estudiante.
- Pide el correo electrónico, pero NO bloquees si no lo comparten.
- NO pidas confirmación para crear el lead.
- “source” por defecto: "whatsapp".
- “summary” debe ser un resumen breve y útil (1-3 líneas).

2) send_requirements_pdf
- Úsala cuando el usuario pida requisitos.
- Si no sabes el nivel/división, pregunta primero (con las 5 opciones).
- Luego llama send_requirements_pdf con la división correcta.

3) list_available_appointments
- Úsala para consultar disponibilidad de visitas antes de agendar.
- Si el usuario no dio un rango, pide uno simple (no formato estricto).
- Ofrece 3-5 opciones basadas SOLO en los slots devueltos.

4) schedule_visit
- Úsala SOLO cuando el usuario ya eligió/confirmó una opción exacta de las que ofreciste.
- Debe ser PRESENCIAL.
- Tras agendar, confirma y menciona que se enviará recordatorio.

5) get_directory_contact
- Úsala cuando el usuario pida hablar con alguien específico (caja, admisiones, etc.).

6) create_complaint

7) update_lead
- Úsala cuando el usuario proporcione datos nuevos o correcciones de un lead existente.
- Solo actualiza los campos que el usuario indicó.

8) cancel_visit
- Úsala cuando el usuario solicite cancelar su cita.
- Úsala cuando el usuario quiera levantar una queja/reporte.

SEGUIMIENTO DE LEAD ACTIVO
- Ofrece en bullets:
  - Confirmar asistencia
  - Reagendar
  - Resolver dudas generales (sin costos)
- Si quiere reagendar, usa list_available_appointments y luego schedule_visit.
- Si quiere cancelar y no existe herramienta de cancelación, solicita handoff.

HANDOFF (ESCALAMIENTO A HUMANO)
Solicita handoff cuando:
- Piden costos y están renuentes/insisten.
- Están molestos y quieren hablar con alguien.
- Caso sensible o fuera de alcance.
- Solicitan cancelar una cita y tu sistema no puede cancelarla automáticamente.

REGLAS DE CALIDAD
- No inventes información del colegio.
- Si no sabes algo, ofrece canalizar a admisiones o la persona adecuada.
- Mantén privacidad: no pidas datos innecesarios.
- Responde siempre en el idioma configurado del bot.

FIN DEL PROMPT
`;

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
        description:
          "Teléfono de contacto (10 dígitos o +52). Acepta espacios o guiones.",
      },
      contact_email: {
        type: ["string", "null"],
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
        type: ["string", "null"],
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
      "contact_email",
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
        description:
          "Rol, puesto o nombre solicitado (ej. caja, coordinación, dirección).",
      },
    },
    required: ["query"],
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
    "Agenda una visita de admisiones cuando ya tengas los datos necesarios. Úsalo solo cuando el usuario eligió un slot exacto devuelto por list_available_appointments.",
  parameters: {
    type: "object",
    properties: {
      contact_name: {
        type: ["string", "null"],
        description: "Nombre completo del contacto/tutor.",
      },
      contact_phone: {
        type: ["string", "null"],
        description: "Teléfono con lada del contacto.",
      },
      student_first_name: {
        type: ["string", "null"],
        description: "Nombre del estudiante.",
      },
      student_last_name_paternal: {
        type: ["string", "null"],
        description: "Apellido paterno del estudiante.",
      },
      grade_interest: {
        type: ["string", "null"],
        description: "Grado o nivel de interés.",
      },
      current_school: {
        type: ["string", "null"],
        description: "Escuela actual del estudiante; si no aplica, deja vacío.",
      },
      slot_starts_at: {
        type: "string",
        description: "Fecha y hora exacta del slot en formato ISO 8601.",
      },
      notes: {
        type: ["string", "null"],
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
      "slot_starts_at",
      "notes",
    ],
    additionalProperties: false,
  },
};

const SEND_REQUIREMENTS_PDF_TOOL: ResponseTool = {
  type: "function",
  name: "send_requirements_pdf",
  description: "Envía el PDF de requisitos para la división solicitada.",
  parameters: {
    type: "object",
    properties: {
      division: {
        type: "string",
        description:
          "División académica: prenursery, early_child, elementary, middle_school, high_school.",
      },
    },
    required: ["division"],
    additionalProperties: false,
  },
  strict: true,
};

const UPDATE_LEAD_TOOL: ResponseTool = {
  type: "function",
  name: "update_lead",
  description:
    "Actualiza un lead existente con información nueva o corregida del usuario.",
  parameters: {
    type: "object",
    properties: {
      contact_name: {
        type: ["string", "null"],
        description: "Nombre completo del contacto/padre/tutor.",
      },
      contact_phone: {
        type: ["string", "null"],
        description:
          "Teléfono de contacto (10 dígitos o +52). Acepta espacios o guiones.",
      },
      contact_email: {
        type: ["string", "null"],
        description: "Correo electrónico del contacto.",
      },
      student_first_name: {
        type: ["string", "null"],
        description: "Nombre del estudiante.",
      },
      student_last_name_paternal: {
        type: ["string", "null"],
        description: "Apellido paterno del estudiante.",
      },
      grade_interest: {
        type: ["string", "null"],
        description: "Grado o nivel al que desea inscribirse.",
      },
      current_school: {
        type: ["string", "null"],
        description: "Escuela actual del estudiante.",
      },
      summary: {
        type: ["string", "null"],
        description:
          "Resumen breve del cambio o lo solicitado por el usuario.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  strict: true,
};

const CANCEL_VISIT_TOOL: ResponseTool = {
  type: "function",
  name: "cancel_visit",
  description: "Cancela la cita de admisiones más próxima del lead.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: ["string", "null"],
        description: "Motivo de cancelación si el usuario lo comparte.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  strict: true,
};

const LIST_AVAILABLE_APPOINTMENTS_TOOL: ResponseTool = {
  type: "function",
  name: "list_available_appointments",
  description:
    "Lista los slots disponibles para visitas dentro de un rango de fechas. Usa solo estos slots y no inventes horarios.",
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
      limit: {
        type: "integer",
        description: "Cantidad máxima de slots (default 20, máximo 50).",
        default: 20,
        minimum: 1,
        maximum: 50,
      },
    },
    required: ["start_date", "end_date", "limit"],
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

const getResponseId = (response: unknown) => {
  const responseAny = response as { id?: unknown } | null | undefined;
  return typeof responseAny?.id === "string" ? responseAny.id : null;
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
  logger?: (event: ChatbotLogEvent) => Promise<void>;
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

type ChatbotLogEvent = {
  eventType: "openai_request" | "openai_response" | "openai_error";
  payload: Record<string, unknown>;
};

const generateChatbotReply = async ({
  input,
  conversationId,
  context,
  logger,
}: GenerateChatbotReplyArgs): Promise<ChatbotReply> => {
  const tools: ResponseTool[] = [...HANDOFF_TOOL, CREATE_LEAD_TOOL];
  const vectorStoreId =
    process.env.OPENAI_VECTOR_STORE_ID ||
    "vs_6951a395b2508191b48d612195c88947";

  const hasDirectoryContacts = Boolean(
    context.botDirectoryEnabled &&
      (context.directoryContacts || []).some((contact) =>
        contact.allow_bot_share
      ),
  );
  if (hasDirectoryContacts) {
    tools.push(GET_DIRECTORY_CONTACT_TOOL);
  }
  tools.push(CREATE_COMPLAINT_TOOL);
  tools.push(SEND_REQUIREMENTS_PDF_TOOL);
  tools.push(UPDATE_LEAD_TOOL);
  if (vectorStoreId) {
    tools.push({
      type: "file_search",
      vector_store_ids: [vectorStoreId],
      max_num_results: 5,
    });
  }
  if (context.appointmentsEnabled) {
    tools.push(LIST_AVAILABLE_APPOINTMENTS_TOOL);
    tools.push(SCHEDULE_VISIT_TOOL);
    tools.push(CANCEL_VISIT_TOOL);
  }

  /*const resolvedBotInstructions = (context.botInstructions || "")
    .replace(/{{\s*Nombre del Bot\s*}}/gi, context.botName || "Asistente")
    .replace(
      /{{\s*Nombre del Colegio\s*}}/gi,
      context.organizationName || "la institución",
    );*/
  const resolvedBotInstructions = (BOT_INSTRUCTIONS || "")
    .replace(/{{\s*Nombre del Bot\s*}}/gi, context.botName || "Asistente")
    .replace(
      /{{\s*Nombre del Colegio\s*}}/gi,
      context.organizationName || "la institución",
    );

  const instructions = resolvedBotInstructions;

  const model = context.botModel || undefined;
  const logEvent = async (event: ChatbotLogEvent) => {
    if (!logger) return;
    try {
      await logger(event);
    } catch (error) {
      console.error("AI log error", error);
    }
  };

  let aiResponse: unknown;
  try {
    await logEvent({
      eventType: "openai_request",
      payload: {
        input,
        conversation_id: conversationId,
        model,
        instructions,
        tools: tools.map((tool) =>
          tool.type === "function" ? tool.name : tool.type
        ),
      },
    });

    aiResponse = await openAIService.createResponse({
      input,
      conversationId,
      tools,
      instructions,
      model,
    });
  } catch (error) {
    await logEvent({
      eventType: "openai_error",
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    });

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

  await logEvent({
    eventType: "openai_response",
    payload: {
      response_id: getResponseId(aiResponse),
      output_text: extractResponseText(aiResponse),
      function_calls: functionCalls.map((call) => ({
        name: call.name,
        call_id: call.call_id || call.id || null,
      })),
    },
  });

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

export type { ChatbotLogEvent, ChatbotReply, GenerateChatbotReplyArgs };
