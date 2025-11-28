import { openAIService, type ResponseTool } from "@/src/lib/ai/open";

const HANDOFF_RESPONSE_TEXT = "Perfecto, en un momento una persona lo contactará.";

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

const HANDOFF_INSTRUCTIONS =
  "Si el usuario pide hablar con una persona/humano/agente, llama a la función request_handoff y no respondas directamente.";

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
};

type ChatbotReply = {
  aiResponse: unknown;
  replyText: string | null;
  handoffRequested: boolean;
  responseMessageId: string | null;
  model?: string;
};

const generateChatbotReply = async ({
  input,
  conversationId,
}: GenerateChatbotReplyArgs): Promise<ChatbotReply> => {
  const aiResponse = await openAIService.createResponse({
    input,
    conversationId,
    tools: HANDOFF_TOOL,
    instructions: HANDOFF_INSTRUCTIONS,
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
  };
};

export {
  HANDOFF_RESPONSE_TEXT,
  generateChatbotReply,
  extractResponseText,
  extractFunctionCalls,
};

export type { ChatbotReply, GenerateChatbotReplyArgs };
