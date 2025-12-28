import OpenAI from "openai";

type ReasoningEffort = "low" | "medium" | "high";

type ResponseTool = {
  type: "function";
  name: string;
  description?: string;
  parameters?: Record<string, unknown> | null;
  strict?: boolean;
};

type CreateResponseOptions = {
  input: string;
  conversationId?: string;
  model?: string;
  instructions?: string;
  reasoningEffort?: ReasoningEffort;
  tools?: ResponseTool[];
};

type ToolOutput = {
  tool_call_id: string;
  output: string;
};

type SubmitToolOutputsOptions = {
  conversationId: string;
  toolOutputs: ToolOutput[];
  model?: string;
};

type ConversationMetadata = Record<string, string>;

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY environment variable.");
}

const client = new OpenAI({ apiKey });

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_INSTRUCTIONS =
  "Eres el asistente un asistente de prueba, contesta de la manera mas chistosa que se te ocurra, habla como pirata.";
const DEFAULT_REASONING: ReasoningEffort = "medium";

const createResponse = async ({
  input,
  conversationId,
  model,
  instructions,
  reasoningEffort,
  tools,
}: CreateResponseOptions) => {
  return client.responses.create({
    model: model ?? DEFAULT_MODEL,
    instructions: instructions ?? DEFAULT_INSTRUCTIONS,
    reasoning: { effort: reasoningEffort ?? DEFAULT_REASONING },
    input,
    ...(tools?.length
      ? {
        tools: tools.map((tool) => ({
          ...tool,
          strict: tool.strict ?? true,
          parameters: tool.parameters ?? {},
        })),
      }
      : {}),
    ...(conversationId ? { conversation: conversationId } : {}),
  });
};

const submitToolOutputs = async ({
  conversationId,
  toolOutputs,
  model,
}: SubmitToolOutputsOptions) => {
  return client.responses.create({
    model: model ?? DEFAULT_MODEL,
    reasoning: { effort: DEFAULT_REASONING },
    conversation: conversationId,
    input: toolOutputs.map((tool) => ({
      type: "custom_tool_call_output",
      call_id: tool.tool_call_id,
      output: tool.output,
    })),
  });
};

const createConversation = async (metadata?: ConversationMetadata) => {
  return client.conversations.create({
    metadata: metadata ?? {
      organizationName: "CAT - Nexus",
    },
  });
};

const getConversation = async (conversationId: string) => {
  return client.conversations.retrieve(conversationId);
};

const deleteConversation = async (conversationId: string) => {
  return client.conversations.delete(conversationId);
};

const updateConversation = async (
  conversationId: string,
  metadata: ConversationMetadata,
) => {
  return client.conversations.update(conversationId, { metadata });
};

const listConversationItems = async (
  conversationId: string,
  limit = 10,
) => {
  return client.conversations.items.list(conversationId, { limit });
};

export const openAIService = {
  createResponse,
  submitToolOutputs,
  createConversation,
  getConversation,
  deleteConversation,
  updateConversation,
  listConversationItems,
};

export type {
  ConversationMetadata,
  CreateResponseOptions,
  ReasoningEffort,
  ResponseTool,
  SubmitToolOutputsOptions,
  ToolOutput,
};
