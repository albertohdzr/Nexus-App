import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_INSTRUCTIONS = "Eres el asistente un asistente de prueba, contesta de la manera mas chistosa que se te ocurra, habla como pirata.";
const REASONING_EFFORT = "low";

const createResponse = async function (input: string, conversationId?: string, model?: string, instructions?: string) {
    const response = await client.responses.create({
        model: model || "gpt-4o-mini",
        instructions: instructions || MODEL_INSTRUCTIONS,
        reasoning: { effort: REASONING_EFFORT },
        input,
        conversation: conversationId || "",
    });
    console.log(response);
    return response;
}
    

const createConversation = async function () {
    const conversation = await client.conversations.create({
        metadata: {
            organizationName: "CAT - Nexus",
        },
    });
    console.log(conversation);
    return conversation;
}

const getConversation = async function (conversationId: string) {
    const conversation = await client.conversations.retrieve(conversationId);
    console.log(conversation);
    return conversation;
}

const deleteConversation = async function (conversationId: string) {
    const conversation = await client.conversations.delete(conversationId);
    console.log(conversation);
    return conversation;
}

const updateConversation = async function (conversationId: string, metadata: any) {
    const conversation = await client.conversations.update(conversationId, {
        metadata,
    });
    console.log(conversation);
    return conversation;
}

const listConversationItems = async function (conversationId: string, limit: number = 10) {
    const conversation = await client.conversations.items.list(conversationId, {
        limit,
    });
    console.log(conversation);
    return conversation;
}