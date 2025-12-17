import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { openAIService } from "@/src/lib/ai/open";
import { generateChatbotReply, HANDOFF_RESPONSE_TEXT } from "@/src/lib/ai/chatbot";
import { sendWhatsAppText } from "@/src/lib/whatsapp";
import { uploadToStorage } from "@/src/lib/storage";
import { WhatsAppValue } from "@/src/types/whatsapp";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "my_secure_token";
const SESSION_TIMEOUT_MS = 60_000;
const LEAD_CONFIRMATION_TEXT = "Gracias, nos comunicaremos contigo más adelante.";

type ChatRecord = {
  id: string;
  name: string | null;
  organization_id: string | null;
  active_session_id?: string | null;
  requested_handoff?: boolean | null;
  phone_number?: string | null;
};

type ChatSessionRecord = {
  id: string;
  status: string | null;
  conversation_id: string | null;
  last_response_at: string | null;
  updated_at: string | null;
  created_at: string | null;
  ai_enabled?: boolean | null;
};

type CapabilityContact = {
  id: string;
  capability_id: string;
  organization_id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  priority?: number | null;
  is_active?: boolean | null;
};

type CapabilityFinance = {
  id: string;
  capability_id: string;
  organization_id: string;
  item: string;
  value: string;
  notes?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  priority?: number | null;
  is_active?: boolean | null;
};

type BotCapability = {
  id: string;
  organization_id: string;
  slug: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  response_template?: string | null;
  type?: string | null;
  enabled?: boolean | null;
  priority?: number | null;
  metadata?: Record<string, any> | null;
  contacts?: CapabilityContact[];
  finance?: CapabilityFinance[];
};

type DirectoryContact = {
  id: string;
  organization_id: string;
  role_slug: string;
  display_role: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  extension?: string | null;
  mobile?: string | null;
  notes?: string | null;
  allow_bot_share?: boolean | null;
  share_email?: boolean | null;
  share_phone?: boolean | null;
  share_extension?: boolean | null;
  share_mobile?: boolean | null;
  is_active?: boolean | null;
};

type CreateLeadArgs = {
  contact_phone: string;
  contact_email?: string | null;
  contact_first_name?: string | null;
  contact_last_name_paternal?: string | null;
  student_first_name: string;
  student_last_name_paternal: string;
  student_middle_name?: string | null;
  student_last_name_maternal?: string | null;
  student_dob?: string | null;
  grade_interest: string;
  school_year?: string | null;
  campus?: string | null;
  summary: string;
  source?: string | null;
};

const getLastSessionActivity = (session: ChatSessionRecord) => {
  const lastTimestamp =
    session.last_response_at || session.updated_at || session.created_at;
  return lastTimestamp ? new Date(lastTimestamp).getTime() : null;
};

const isSessionExpired = (session: ChatSessionRecord) => {
  if (session.ai_enabled === false || session.status === "handoff") {
    return false;
  }
  const lastActivity = getLastSessionActivity(session);
  return lastActivity
    ? Date.now() - lastActivity > SESSION_TIMEOUT_MS
    : false;
};

const closeChatSession = async ({
  chatId,
  sessionId,
}: {
  chatId: string;
  sessionId: string;
}) => {
  const closedAt = new Date().toISOString();

  const { error: sessionError } = await supabase
    .from("chat_sessions")
    .update({
      status: "closed",
      closed_at: closedAt,
      updated_at: closedAt,
    })
    .eq("id", sessionId);

  if (sessionError) {
    console.error("Error closing chat session", sessionError);
  }

  const { error: chatError } = await supabase
    .from("chats")
    .update({
      active_session_id: null,
      last_session_closed_at: closedAt,
      updated_at: closedAt,
    })
    .eq("id", chatId);

  if (chatError) {
    console.error("Error unlinking chat session from chat", chatError);
  }
};

const splitName = (fullName?: string | null) => {
  if (!fullName) {
    return { first: null, lastPaternal: null };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], lastPaternal: null };
  }
  const first = parts[0];
  const lastPaternal = parts.slice(1).join(" ");
  return { first, lastPaternal };
};

const ensureContact = async ({
  organizationId,
  waId,
  phone,
  name,
  email,
}: {
  organizationId: string;
  waId?: string | null;
  phone?: string | null;
  name?: string | null;
  email?: string | null;
}) => {
  if (!phone) {
    throw new Error("contact_phone is required to create a lead");
  }

  const { data: existingContact, error: contactFetchError } = await supabase
    .from("crm_contacts")
    .select("id, phone, email")
    .eq("organization_id", organizationId)
    .eq("whatsapp_wa_id", waId || "")
    .maybeSingle();

  if (contactFetchError) {
    console.error("Error fetching contact", contactFetchError);
  }

  const { first, lastPaternal } = splitName(name);

  if (existingContact?.id) {
    const { error: updateError } = await supabase
      .from("crm_contacts")
      .update({
        phone: existingContact.phone || phone,
        email: existingContact.email || email,
      })
      .eq("id", existingContact.id);

    if (updateError) {
      console.error("Error updating existing contact", updateError);
    }

    return existingContact.id as string;
  }

  const { data: newContact, error: insertError } = await supabase
    .from("crm_contacts")
    .insert({
      organization_id: organizationId,
      first_name: first || "Contacto",
      last_name_paternal: lastPaternal,
      phone,
      email,
      whatsapp_wa_id: waId,
      source: "whatsapp",
    })
    .select("id")
    .single();

  if (insertError || !newContact?.id) {
    console.error("Error creating contact", insertError);
    throw new Error("Failed to create contact");
  }

  return newContact.id as string;
};

const createLeadRecord = async ({
  organizationId,
  chatId,
  waId,
  contactId,
  args,
}: {
  organizationId: string;
  chatId: string;
  waId: string;
  contactId: string;
  args: CreateLeadArgs;
}) => {
  const leadPayload = {
    organization_id: organizationId,
    status: "new",
    source: args.source || "whatsapp",
    student_first_name: args.student_first_name,
    student_middle_name: args.student_middle_name,
    student_last_name_paternal: args.student_last_name_paternal,
    student_last_name_maternal: args.student_last_name_maternal,
    student_dob: args.student_dob || null,
    grade_interest: args.grade_interest,
    school_year: args.school_year,
    campus: args.campus,
    contact_first_name: args.contact_first_name || "Contacto",
    contact_last_name_paternal: args.contact_last_name_paternal,
    contact_email: args.contact_email,
    contact_phone: args.contact_phone,
    contact_id: contactId,
    wa_chat_id: chatId,
    wa_id: waId,
    ai_summary: args.summary,
    metadata: { source: "whatsapp", tool: "create_lead" },
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(leadPayload)
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("Error creating lead", error);
    throw new Error("Failed to create lead");
  }

  return data.id as string;
};

const parseFunctionArgs = (args: string | Record<string, unknown> | undefined) => {
  if (!args) return {};
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch (err) {
      console.error("Failed to parse function call args", err);
      return {};
    }
  }
  return args;
};

const loadBotCapabilities = async (organizationId: string): Promise<BotCapability[]> => {
  const [capabilitiesRes, financeRes] = await Promise.all([
    supabase
      .from("bot_capabilities")
      .select("id, organization_id, slug, title, description, instructions, response_template, type, enabled, priority, metadata")
      .eq("organization_id", organizationId)
      .eq("enabled", true)
      .order("priority", { ascending: false }),
    supabase
      .from("bot_capability_finance")
      .select("id, capability_id, organization_id, item, value, notes, valid_from, valid_to, priority, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
  ]);

  const capabilityMap = new Map<string, BotCapability>();
  (capabilitiesRes.data || []).forEach((cap) => {
    capabilityMap.set(cap.id, { ...cap, contacts: [], finance: [] });
  });

  const today = new Date().toISOString().slice(0, 10);

  (financeRes.data || []).forEach((item) => {
    const cap = capabilityMap.get(item.capability_id);
    const withinDates =
      (!item.valid_from || item.valid_from <= today) &&
      (!item.valid_to || item.valid_to >= today);
    if (cap && withinDates) {
      cap.finance = cap.finance || [];
      cap.finance.push(item);
    }
  });

  return Array.from(capabilityMap.values());
};

const loadDirectoryContacts = async (organizationId: string): Promise<DirectoryContact[]> => {
  const { data } = await supabase
    .from("directory_contacts")
    .select(
      "id, organization_id, role_slug, display_role, name, phone, email, extension, mobile, notes, allow_bot_share, share_email, share_phone, share_extension, share_mobile, is_active"
    )
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("display_role", { ascending: true });

  return (data || []) as DirectoryContact[];
};

const submitToolOutputs = async ({
  conversationId,
  toolCalls,
  output,
  model,
}: {
  conversationId: string;
  toolCalls: Array<{ call_id?: string; id?: string; name?: string }>;
  output: string;
  model?: string | null;
}) => {
  const toolOutputs = toolCalls
    .map((call) => call.call_id || call.id)
    .filter(Boolean)
    .map((toolCallId) => ({
      tool_call_id: toolCallId as string,
      output,
    }));

  if (!toolOutputs.length) {
    return;
  }

  try {
    await openAIService.submitToolOutputs({
      conversationId,
      toolOutputs,
      model: model || undefined,
    });
  } catch (error) {
    console.error("Error submitting tool outputs", error);
  }
};
const resolveChatSession = async ({
  chat,
  organizationName,
}: {
  chat: ChatRecord;
  organizationName?: string | null;
}): Promise<ChatSessionRecord | null> => {
  let activeSession: ChatSessionRecord | null = null;

  if (chat.active_session_id) {
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .select("id, status, conversation_id, last_response_at, updated_at, created_at, ai_enabled")
      .eq("id", chat.active_session_id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching active chat session", error);
    }

    if (session?.status === "handoff") {
      return session;
    }

    if (session?.status === "active" && !isSessionExpired(session)) {
      activeSession = session;
    } else if (session?.id) {
      await closeChatSession({ chatId: chat.id, sessionId: session.id });
    }
  }

  if (activeSession) {
    return activeSession;
  }

  if (chat.requested_handoff) {
    const nowIso = new Date().toISOString();
    const { data: handoffSession, error: handoffError } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: chat.organization_id,
        chat_id: chat.id,
        status: "handoff",
        ai_enabled: false,
        last_response_at: nowIso,
        updated_at: nowIso,
      })
      .select("id, status, conversation_id, last_response_at, updated_at, created_at, ai_enabled")
      .single();

    if (handoffError) {
      console.error("Error creating handoff session", handoffError);
      return null;
    }

    const { error: chatLinkError } = await supabase
      .from("chats")
      .update({
        active_session_id: handoffSession.id,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (chatLinkError) {
      console.error("Error linking handoff session to chat", chatLinkError);
    }

    return handoffSession;
  }

  try {
    const conversation = await openAIService.createConversation({
      organizationName: organizationName ?? "",
      chatId: chat.id,
    });

    if (!conversation?.id) {
      console.error("OpenAI conversation did not return an id");
      return null;
    }

    const nowIso = new Date().toISOString();

    const { data: newSession, error: sessionCreateError } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: chat.organization_id,
        chat_id: chat.id,
        status: "active",
        conversation_id: conversation.id,
        last_response_at: nowIso,
        updated_at: nowIso,
        ai_enabled: true,
      })
      .select("id, status, conversation_id, last_response_at, updated_at, created_at, ai_enabled")
      .single();

    if (sessionCreateError) {
      console.error("Error creating chat session", sessionCreateError);
      return null;
    }

    if (newSession?.id) {
      const { error: chatLinkError } = await supabase
        .from("chats")
        .update({
          active_session_id: newSession.id,
          updated_at: nowIso,
        })
        .eq("id", chat.id);

      if (chatLinkError) {
        console.error("Error linking chat session to chat", chatLinkError);
      }
    }

    return newSession;
  } catch (err) {
    console.error("Error creating OpenAI conversation", err);
    return null;
  }
};

const handleAIResponse = async ({
  chat,
  organization,
  session,
  waId,
  phoneNumberId,
  latestUserMessage,
  contactName,
  capabilities,
  directoryContacts,
  botDirectoryEnabled,
}: {
  chat: ChatRecord;
  organization: {
    id: string;
    name?: string | null;
    bot_name?: string | null;
    bot_instructions?: string | null;
    bot_tone?: string | null;
    bot_language?: string | null;
    bot_model?: string | null;
    bot_directory_enabled?: boolean | null;
  };
  session: ChatSessionRecord | null;
  waId: string;
  phoneNumberId: string;
  latestUserMessage: string;
  contactName?: string | null;
  capabilities: BotCapability[];
  directoryContacts: DirectoryContact[];
  botDirectoryEnabled: boolean;
}) => {
  const handleHandoff = async (aiResponseId?: string) => {
    const nowIso = new Date().toISOString();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!accessToken) {
      console.warn("WHATSAPP_ACCESS_TOKEN missing; handoff response skipped.");
      return;
    }

    const { error: sessionUpdateError } = session?.id
      ? await supabase
          .from("chat_sessions")
          .update({
            ai_enabled: false,
            status: "handoff",
            updated_at: nowIso,
          })
          .eq("id", session.id)
      : { error: null };

    if (sessionUpdateError) {
      console.error("Error updating chat session to handoff", sessionUpdateError);
    }

    const { error: chatUpdateError } = await supabase
      .from("chats")
      .update({
        requested_handoff: true,
        active_session_id: session?.id ?? chat.active_session_id ?? null,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (chatUpdateError) {
      console.error("Error marking chat handoff", chatUpdateError);
    }

    const { messageId, error } = await sendWhatsAppText({
      phoneNumberId,
      accessToken,
      to: waId,
      body: HANDOFF_RESPONSE_TEXT,
    });

    if (error) {
      console.error("WhatsApp send error during handoff:", error);
      return;
    }

    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chat.id,
      chat_session_id: session?.id ?? null,
      response_id: aiResponseId ?? null,
      wa_message_id: messageId,
      body: HANDOFF_RESPONSE_TEXT,
      type: "text",
      status: "sent",
      sent_at: nowIso,
      sender_name: "Bot",
      payload: {
        handover: true,
        reason: "user_requested_handoff",
        conversation_id: session?.conversation_id,
      },
      created_at: nowIso,
    });

    if (insertError) {
      console.error("Error saving handoff reply:", insertError);
    }
  };

  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    console.warn("WHATSAPP_ACCESS_TOKEN missing; bot reply skipped.");
    return;
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!session?.conversation_id) {
    console.warn("No active chat session found; skipping AI response.");
    return;
  }

  if (session.ai_enabled === false) {
    console.warn("Chat session has AI disabled (handoff requested); skipping AI response.");
    return;
  }

  try {
    const capabilityContext = capabilities.map((cap) => ({
      slug: cap.slug,
      title: cap.title,
      description: cap.description,
      instructions: cap.instructions,
      response_template: cap.response_template,
      type: cap.type,
      metadata: cap.metadata,
      contacts: cap.contacts,
      finance: cap.finance,
    }));

    const normalizedMessage = latestUserMessage.toLowerCase();
    const contactIntent = /(contacto|tel|teléfono|telefono|correo|email|mail|ext|extensión|extension|móvil|movil|cel|celular|número|numero|pásalo|pasalo|pasame|pásame|pásamelo|pasamelo)/i.test(
      latestUserMessage
    );
    const shouldHandleDirectory = botDirectoryEnabled && contactIntent;

    if (shouldHandleDirectory) {
      const allowedContacts = directoryContacts.filter((contact) => contact.allow_bot_share);
      if (allowedContacts.length > 0) {
        const prefersCaja = normalizedMessage.includes("caja");
        const match =
          (prefersCaja
            ? allowedContacts.find((contact) =>
                `${contact.display_role} ${contact.role_slug}`.toLowerCase().includes("caja")
              )
            : undefined) || allowedContacts[0];

        const fields: string[] = [];
        if (match.share_email && match.email) fields.push(`correo: ${match.email}`);
        if (match.share_phone && match.phone) fields.push(`teléfono: ${match.phone}`);
        if (match.share_extension && match.extension)
          fields.push(`extensión: ${match.extension}`);
        if (match.share_mobile && match.mobile) fields.push(`móvil: ${match.mobile}`);

        const isCorrection = /(no es|incorrecto|equivocado|ese no)/i.test(latestUserMessage);
        const responseText =
          fields.length > 0
            ? `${isCorrection ? "Gracias por avisar." : "Claro,"} ${
                match.display_role ? `contacto de ${match.display_role}` : "el contacto"
              } es ${match.name}. ${fields.join(", ")}.`
            : `Tengo el contacto de ${match.display_role}, pero no tengo datos autorizados para compartir. ¿Quieres que te canalice con un asesor?`;

        const { messageId, error } = await sendWhatsAppText({
          phoneNumberId,
          accessToken,
          to: waId,
          body: responseText,
        });

        if (!error) {
          const nowIso = new Date().toISOString();
          await supabase.from("messages").insert({
            chat_id: chat.id,
            chat_session_id: session?.id ?? null,
            response_id: null,
            wa_message_id: messageId,
            body: responseText,
            type: "text",
            status: "sent",
            sent_at: nowIso,
            sender_name: "Bot",
            payload: {
              tool: "directory_shortcut",
              conversation_id: session?.conversation_id,
              directory_contact_id: match.id,
              query: latestUserMessage,
            },
            created_at: nowIso,
          });
        }
        return;
      }
    }

    const createReply = async (conversationId: string) =>
      generateChatbotReply({
        input: latestUserMessage,
        conversationId,
        context: {
          organizationId: organization.id,
          organizationName: organization.name,
          botName: organization.bot_name,
          botInstructions: organization.bot_instructions,
          botTone: organization.bot_tone,
          botLanguage: organization.bot_language,
          botModel: organization.bot_model,
          waId,
          chatId: chat.id,
          phoneNumber: chat.phone_number,
          capabilities: capabilityContext,
          botDirectoryEnabled,
          directoryContacts: directoryContacts.map((contact) => ({
            role_slug: contact.role_slug,
            display_role: contact.display_role,
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            extension: contact.extension,
            mobile: contact.mobile,
            allow_bot_share: contact.allow_bot_share,
            share_email: contact.share_email,
            share_phone: contact.share_phone,
            share_extension: contact.share_extension,
            share_mobile: contact.share_mobile,
          })),
        },
      });

    let chatbotReply;
    try {
      chatbotReply = await createReply(session.conversation_id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "";
      if (errorMessage.includes("No tool output found") && session?.id) {
        const freshConversation = await openAIService.createConversation({
          organizationName: organization.name || "CAT - Nexus",
        });
        if (freshConversation?.id) {
          await supabase
            .from("chat_sessions")
            .update({
              conversation_id: freshConversation.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.id);
          chatbotReply = await createReply(freshConversation.id);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (chatbotReply.handoffRequested) {
      if (session?.conversation_id) {
        await submitToolOutputs({
          conversationId: session.conversation_id,
          toolCalls: chatbotReply.functionCalls.filter((call) => call.name === "request_handoff"),
          output: JSON.stringify({ status: "handoff_requested" }),
          model: organization.bot_model,
        });
      }
      await handleHandoff((chatbotReply.aiResponse as { id?: string })?.id);
      return;
    }

    const directoryCall = chatbotReply.functionCalls.find(
      (call) => call.name === "get_directory_contact"
    );
    if (directoryCall) {
      const args = parseFunctionArgs(directoryCall.arguments) as { query?: string };
      const normalizedQuery = (args.query || "").trim().toLowerCase();
      const hasContactIntent = /(contacto|tel|teléfono|telefono|correo|email|mail|ext|extensión|extension|móvil|movil|cel|celular|número|numero)/i.test(
        args.query || ""
      );
      const allowedContacts = directoryContacts.filter((contact) => contact.allow_bot_share);
      const match =
        allowedContacts.find((contact) =>
          normalizedQuery
            ? `${contact.display_role} ${contact.role_slug} ${contact.name}`
                .toLowerCase()
                .includes(normalizedQuery)
            : false
        ) || allowedContacts[0];

      const fallback =
        "Por ahora no tengo permiso para compartir ese contacto. Si quieres, te canalizo con un asesor.";

      if (!botDirectoryEnabled || !match) {
        const { messageId, error } = await sendWhatsAppText({
          phoneNumberId,
          accessToken,
          to: waId,
          body: fallback,
        });
        if (!error) {
          const nowIso = new Date().toISOString();
          await supabase.from("messages").insert({
            chat_id: chat.id,
            chat_session_id: session?.id ?? null,
            response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
            wa_message_id: messageId,
            body: fallback,
            type: "text",
            status: "sent",
            sent_at: nowIso,
            sender_name: "Bot",
            payload: {
              tool: "get_directory_contact",
              conversation_id: session?.conversation_id,
              query: args.query,
            },
            created_at: nowIso,
          });
        }
        if (session?.conversation_id) {
          await submitToolOutputs({
            conversationId: session.conversation_id,
            toolCalls: chatbotReply.functionCalls.filter(
              (call) => call.name === "get_directory_contact"
            ),
            output: JSON.stringify({ status: "not_shared" }),
            model: organization.bot_model,
          });
        }
        return;
      }

      if (!hasContactIntent) {
        const reply = "¿Buscas el contacto de caja o el horario? Dime cuál y te ayudo.";
        const { messageId, error } = await sendWhatsAppText({
          phoneNumberId,
          accessToken,
          to: waId,
          body: reply,
        });
        if (!error) {
          const nowIso = new Date().toISOString();
          await supabase.from("messages").insert({
            chat_id: chat.id,
            chat_session_id: session?.id ?? null,
            response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
            wa_message_id: messageId,
            body: reply,
            type: "text",
            status: "sent",
            sent_at: nowIso,
            sender_name: "Bot",
            payload: {
              tool: "get_directory_contact",
              conversation_id: session?.conversation_id,
              query: args.query,
              note: "no_contact_intent",
            },
            created_at: nowIso,
          });
        }
        return;
      }

      const fields: string[] = [];
      if (match.share_email && match.email) fields.push(`correo: ${match.email}`);
      if (match.share_phone && match.phone) fields.push(`teléfono: ${match.phone}`);
      if (match.share_extension && match.extension)
        fields.push(`extensión: ${match.extension}`);
      if (match.share_mobile && match.mobile) fields.push(`móvil: ${match.mobile}`);

      const responseText =
        fields.length > 0
          ? `Claro, te comparto el contacto de ${match.display_role}: ${match.name}. ${fields.join(", ")}.`
          : `Tengo el contacto de ${match.display_role}, pero no tengo datos autorizados para compartir. ¿Quieres que te canalice con un asesor?`;

      const { messageId, error } = await sendWhatsAppText({
        phoneNumberId,
        accessToken,
        to: waId,
        body: responseText,
      });

      if (!error) {
        const nowIso = new Date().toISOString();
        await supabase.from("messages").insert({
          chat_id: chat.id,
          chat_session_id: session?.id ?? null,
          response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
          wa_message_id: messageId,
          body: responseText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "get_directory_contact",
            conversation_id: session?.conversation_id,
            directory_contact_id: match.id,
            query: args.query,
          },
          created_at: nowIso,
        });
      }
      if (session?.conversation_id) {
        await submitToolOutputs({
          conversationId: session.conversation_id,
          toolCalls: chatbotReply.functionCalls.filter(
            (call) => call.name === "get_directory_contact"
          ),
          output: JSON.stringify({
            status: "shared",
            contact_id: match.id,
            shared_fields: fields,
          }),
          model: organization.bot_model,
        });
      }
      return;
    }

    const financeCall = chatbotReply.functionCalls.find((call) => call.name === "get_finance_info");
    if (financeCall) {
      const args = parseFunctionArgs(financeCall.arguments) as {
        capability_slug?: string;
        item?: string;
      };
      const capability =
        capabilities.find((cap) => cap.slug === (args.capability_slug || "").trim()) ||
        capabilities.find((cap) => cap.type === "finance");
      const financeItems = capability?.finance || [];
      const normalizedItem = args.item?.trim().toLowerCase();
      const match =
        financeItems.find((f) =>
          normalizedItem ? f.item.toLowerCase().includes(normalizedItem) : false
        ) || financeItems[0];

      const text = match
        ? capability?.response_template
            ?.replace(/\{\{\s*item\s*\}\}/g, match.item)
            ?.replace(/\{\{\s*value\s*\}\}/g, match.value)
            ?.replace(/\{\{\s*notes\s*\}\}/g, match.notes || "")
          || `${match.item}: ${match.value}${match.notes ? ` (${match.notes})` : ""}.`
        : "Por ahora no tengo ese dato configurado, pero puedo pasarte con caja si lo necesitas.";

      const { messageId, error } = await sendWhatsAppText({
        phoneNumberId,
        accessToken,
        to: waId,
        body: text,
      });

      if (!error) {
        const nowIso = new Date().toISOString();
        await supabase.from("messages").insert({
          chat_id: chat.id,
          chat_session_id: session?.id ?? null,
          response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
          wa_message_id: messageId,
          body: text,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "get_finance_info",
            conversation_id: session?.conversation_id,
            capability: capability?.slug,
            finance_id: match?.id,
            item_requested: args.item,
          },
          created_at: nowIso,
        });
      }
      if (session?.conversation_id) {
        await submitToolOutputs({
          conversationId: session.conversation_id,
          toolCalls: chatbotReply.functionCalls.filter(
            (call) => call.name === "get_finance_info"
          ),
          output: JSON.stringify({
            status: match ? "shared" : "not_found",
            finance_id: match?.id,
          }),
          model: organization.bot_model,
        });
      }
      return;
    }

    const complaintCall = chatbotReply.functionCalls.find((call) => call.name === "create_complaint");
    if (complaintCall) {
      const args = parseFunctionArgs(complaintCall.arguments) as {
        capability_slug?: string;
        summary?: string;
        channel?: string;
        customer_name?: string;
        customer_contact?: string;
      };
      const capability =
        capabilities.find((cap) => cap.slug === (args.capability_slug || "").trim()) ||
        capabilities.find((cap) => cap.type === "complaint" || cap.metadata?.allow_complaints === true);

      const { data, error: complaintError } = await supabase
        .from("bot_complaints")
        .insert({
          organization_id: organization.id,
          capability_id: capability?.id ?? null,
          channel: args.channel?.trim() || "whatsapp",
          customer_name: args.customer_name?.trim() || contactName || null,
          customer_contact: args.customer_contact?.trim() || waId,
          summary: args.summary?.trim() || latestUserMessage,
          status: "open",
        })
        .select("id")
        .single();

      const replyText = complaintError
        ? "No pude registrar la queja en este momento. ¿Puedes intentar más tarde?"
        : `Tu queja ha sido registrada${data?.id ? ` (folio: ${data.id})` : ""}. Gracias por contarnos, daremos seguimiento.`;

      const { messageId, error } = await sendWhatsAppText({
        phoneNumberId,
        accessToken,
        to: waId,
        body: replyText,
      });

      if (!error) {
        const nowIso = new Date().toISOString();
        await supabase.from("messages").insert({
          chat_id: chat.id,
          chat_session_id: session?.id ?? null,
          response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "create_complaint",
            conversation_id: session?.conversation_id,
            capability: capability?.slug,
            complaint_id: data?.id,
          },
          created_at: nowIso,
        });
      }
      if (session?.conversation_id) {
        await submitToolOutputs({
          conversationId: session.conversation_id,
          toolCalls: chatbotReply.functionCalls.filter(
            (call) => call.name === "create_complaint"
          ),
          output: JSON.stringify({
            status: complaintError ? "failed" : "created",
            complaint_id: data?.id,
          }),
          model: organization.bot_model,
        });
      }

      return;
    }

    const leadCall = chatbotReply.functionCalls.find((call) => call.name === "create_lead");
    if (leadCall) {
      const parsedArgs = parseFunctionArgs(leadCall.arguments) as Partial<CreateLeadArgs>;
      const contactPhone =
        (parsedArgs.contact_phone as string | undefined) || chat.phone_number || waId;

      if (!contactPhone || !parsedArgs.student_first_name || !parsedArgs.student_last_name_paternal || !parsedArgs.grade_interest) {
        console.warn("Lead tool invoked without required fields");
        if (session?.conversation_id) {
          await submitToolOutputs({
            conversationId: session.conversation_id,
            toolCalls: chatbotReply.functionCalls.filter((call) => call.name === "create_lead"),
            output: JSON.stringify({ status: "invalid_fields" }),
            model: organization.bot_model,
          });
        }
        return;
      }

      const leadArgs: CreateLeadArgs = {
        contact_phone: contactPhone,
        contact_email: parsedArgs.contact_email || null,
        contact_first_name: parsedArgs.contact_first_name || contactName || "Contacto",
        contact_last_name_paternal: parsedArgs.contact_last_name_paternal || null,
        student_first_name: parsedArgs.student_first_name,
        student_last_name_paternal: parsedArgs.student_last_name_paternal,
        student_middle_name: parsedArgs.student_middle_name || null,
        student_last_name_maternal: parsedArgs.student_last_name_maternal || null,
        student_dob: parsedArgs.student_dob || null,
        grade_interest: parsedArgs.grade_interest,
        school_year: parsedArgs.school_year || null,
        campus: parsedArgs.campus || null,
        summary: parsedArgs.summary || "Resumen no proporcionado",
        source: parsedArgs.source || "whatsapp",
      };

      try {
        const contactId = await ensureContact({
          organizationId: organization.id,
          waId,
          phone: leadArgs.contact_phone,
          name: leadArgs.contact_first_name,
          email: leadArgs.contact_email,
        });

        const leadId = await createLeadRecord({
          organizationId: organization.id,
          chatId: chat.id,
          waId,
          contactId,
          args: leadArgs,
        });

        const { messageId, error } = await sendWhatsAppText({
          phoneNumberId,
          accessToken,
          to: waId,
          body: LEAD_CONFIRMATION_TEXT,
        });

        if (error) {
          console.error("WhatsApp send error during lead creation:", error);
          return;
        }

        const nowIso = new Date().toISOString();
        const { error: insertError } = await supabase.from("messages").insert({
          chat_id: chat.id,
          chat_session_id: session.id,
          response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
          wa_message_id: messageId,
          body: LEAD_CONFIRMATION_TEXT,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            model: chatbotReply.model,
            conversation_id: session.conversation_id,
            organization: organization.name,
            response_message_id: chatbotReply.responseMessageId,
            lead_id: leadId,
            tool: "create_lead",
            lead_summary: leadArgs.summary,
          },
          created_at: nowIso,
        });

        if (insertError) {
          console.error("Error saving lead confirmation reply:", insertError);
        }

        if (session?.conversation_id) {
          await submitToolOutputs({
            conversationId: session.conversation_id,
            toolCalls: chatbotReply.functionCalls.filter((call) => call.name === "create_lead"),
            output: JSON.stringify({ status: "created", lead_id: leadId }),
            model: organization.bot_model,
          });
        }
        return;
      } catch (leadErr) {
        console.error("Error handling lead creation", leadErr);
        if (session?.conversation_id) {
          await submitToolOutputs({
            conversationId: session.conversation_id,
            toolCalls: chatbotReply.functionCalls.filter((call) => call.name === "create_lead"),
            output: JSON.stringify({ status: "failed" }),
            model: organization.bot_model,
          });
        }
        return;
      }
    }

    if (!chatbotReply.replyText) {
      console.warn("AI response did not return text output.");
      return;
    }

    const { messageId, error } = await sendWhatsAppText({
      phoneNumberId,
      accessToken,
      to: waId,
      body: chatbotReply.replyText,
    });

    if (error) {
      console.error("WhatsApp bot send error:", error);
      return;
    }

    const nowIso = new Date().toISOString();

    const { error: insertError } = await supabase.from("messages").insert({
      chat_id: chat.id,
      chat_session_id: session.id,
      response_id: (chatbotReply.aiResponse as { id?: string })?.id ?? null,
      wa_message_id: messageId,
      body: chatbotReply.replyText,
      type: "text",
      status: "sent",
      sent_at: nowIso,
      sender_name: "Bot",
    payload: {
      model: chatbotReply.model,
      conversation_id: session.conversation_id,
      organization: organization.name,
      response_message_id: chatbotReply.responseMessageId,
    },
      created_at: nowIso,
    });

    if (insertError) {
      console.error("Error saving bot reply:", insertError);
    }

    const { error: sessionUpdateError } = await supabase
      .from("chat_sessions")
      .update({
        last_response_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (sessionUpdateError) {
      console.error("Error updating chat session timestamps", sessionUpdateError);
    }

    const { error: chatUpdateError } = await supabase
      .from("chats")
      .update({
        active_session_id: session.id,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (chatUpdateError) {
      console.error("Error keeping chat linked to active session", chatUpdateError);
    }
  } catch (err) {
    console.error("Error handling AI response", err);
  }
};

async function handleStatusUpdates(value: WhatsAppValue) {
  const statuses = value.statuses;
  if (!statuses?.length) return;

  for (const status of statuses) {
    const messageId = status.id as string | undefined;
    if (!messageId) continue;

    const nextStatus = status.status as string | undefined;
    const statusTimestamp = status.timestamp
      ? new Date(parseInt(status.timestamp, 10) * 1000).toISOString()
      : new Date().toISOString();

    const updates: Record<string, unknown> = {
      status: nextStatus,
      payload: {
        status_detail: status,
      },
    };

    if (nextStatus === "sent") {
      updates.sent_at = statusTimestamp;
    }
    if (nextStatus === "delivered") {
      updates.delivered_at = statusTimestamp;
    }
    if (nextStatus === "read") {
      updates.read_at = statusTimestamp;
    }

    const { error } = await supabase
      .from("messages")
      .update(updates)
      .eq("wa_message_id", messageId);

    if (error) {
      console.error("Error updating message status:", error, { messageId, nextStatus });
    } else {
      console.log("Updated message status", { messageId, nextStatus, statusTimestamp });
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Webhook received:", JSON.stringify(body, null, 2));

    if (body.object !== "whatsapp_business_account") {
      return new NextResponse("Not a WhatsApp API event", { status: 404 });
    }

    const value = body.entry?.[0]?.changes?.[0]?.value as WhatsAppValue | undefined;

    if (value) {
      const message = value.messages?.[0];

      if (message) {
        const contact = value.contacts ? value.contacts[0] : null;

        const waId = contact?.wa_id ?? message.from ?? "";
        const name = contact?.profile?.name ?? waId;
        const phoneNumber = value.metadata.display_phone_number;
        const phoneNumberId = value.metadata.phone_number_id;

        if (!waId) {
          console.error("Missing waId in incoming message");
          return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        // 1. Find Organization
          const { data: orgData, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, bot_name, bot_instructions, bot_tone, bot_language, bot_model, bot_directory_enabled")
            .eq("phone_number_id", phoneNumberId)
            .single();

        if (orgError || !orgData) {
          console.error("Organization not found for phone_number_id:", phoneNumberId);
          // Acknowledge but log
          return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        // 2. Upsert Chat linked to Organization
        const { data: chatData, error: chatError } = await supabase
          .from("chats")
          .upsert(
            {
              wa_id: waId,
              name: name,
              phone_number: phoneNumber,
              organization_id: orgData.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "wa_id,organization_id" },
          )
          .select()
          .single();

        if (chatError || !chatData) {
          console.error("Error upserting chat:", chatError);
          return new NextResponse("Internal Server Error", { status: 500 });
        }

          const chatRecord: ChatRecord = {
            id: chatData.id,
            name: chatData.name ?? null,
            organization_id: chatData.organization_id ?? orgData.id,
            active_session_id: (chatData as { active_session_id?: string | null })?.active_session_id ?? null,
            requested_handoff: (chatData as { requested_handoff?: boolean | null })?.requested_handoff ?? false,
            phone_number: chatData.phone_number ?? null,
          };

        const session = await resolveChatSession({
          chat: chatRecord,
          organizationName: orgData.name,
        });

        let mediaUrl: string | undefined;
        let mediaPath: string | undefined;
        const isImage = message.type === "image" && message.image?.id;
        const isDocument = message.type === "document" && message.document?.id;
        const isAudio = message.type === "audio" && message.audio?.id;
        const mediaId = isImage
          ? message.image?.id
          : isDocument
          ? message.document?.id
          : isAudio
          ? message.audio?.id
          : undefined;
        const mediaMime = isImage
          ? message.image?.mime_type
          : isDocument
          ? message.document?.mime_type
          : isAudio
          ? message.audio?.mime_type
          : undefined;
        const mediaFileName = isDocument ? message.document?.filename : undefined;
        const mediaCaption = isImage ? message.image?.caption : undefined;

        // If it's media (image, document, audio), try to download and store in Supabase
        if (mediaId) {
          try {
            const metaResponse = await fetch(
              `https://graph.facebook.com/v21.0/${mediaId}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                },
              }
            );
            if (metaResponse.ok) {
              const meta = await metaResponse.json();
              const url = meta.url as string | undefined;
              const mimeType = meta.mime_type as string | undefined;

              if (url) {
                const mediaResponse = await fetch(url, {
                  headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                  },
                });
                if (mediaResponse.ok) {
                  const arrayBuffer = await mediaResponse.arrayBuffer();
                  const storagePath = `chats/${chatRecord.id}/${mediaId}-${mediaFileName || "file"}`;
                  const { path: storedPath, error: storageError } = await uploadToStorage({
                    file: Buffer.from(arrayBuffer),
                    path: storagePath,
                    contentType: mimeType,
                  });
                  if (storageError) {
                    console.error("Storage upload error (inbound media):", storageError);
                  } else {
                    mediaPath = storedPath ?? storagePath;
                    mediaUrl = `/api/storage/media?path=${encodeURIComponent(mediaPath)}`;
                  }
                }
              }
            }
          } catch (storageErr) {
            console.error("Error downloading/uploading inbound media:", storageErr);
          }
        }

        const messageBody =
          message.text?.body ||
          message.image?.caption ||
          message.document?.filename ||
          (message.audio ? "Mensaje de voz" : undefined) ||
          "[Media/Other]";

        const messageTimestampMs = message.timestamp
          ? parseInt(message.timestamp, 10) * 1000
          : Date.now();

        // 3. Insert Message
        const { error: messageError } = await supabase.from("messages").insert({
          chat_id: chatRecord.id,
          chat_session_id: session?.id,
          wa_message_id: message.id,
          body: messageBody,
          type: message.type,
          status: "received",
          payload: {
            ...message,
            media_id: mediaId,
            media_mime_type: mediaMime,
            media_file_name: mediaFileName,
            media_caption: mediaCaption,
            voice: message.audio?.voice,
            conversation_id: session?.conversation_id,
          },
          wa_timestamp: new Date(messageTimestampMs).toISOString(),
          sender_name: name,
          media_id: mediaId,
          media_path: mediaPath,
          media_url: mediaUrl,
          media_mime_type: mediaMime,
          created_at: new Date(messageTimestampMs).toISOString(),
        });

        if (messageError) {
          console.error("Error inserting message:", messageError);
        }

          if (message.type === "text" && message.text?.body) {
            const capabilities = await loadBotCapabilities(orgData.id);
            const directoryContacts = await loadDirectoryContacts(orgData.id);
            await handleAIResponse({
              chat: chatRecord,
              organization: {
                id: orgData.id,
                name: orgData.name,
                bot_name: orgData.bot_name,
                bot_instructions: orgData.bot_instructions,
                bot_tone: orgData.bot_tone,
                bot_language: orgData.bot_language,
                bot_model: orgData.bot_model,
                bot_directory_enabled: orgData.bot_directory_enabled,
              },
              session,
              waId,
              phoneNumberId,
              latestUserMessage: message.text.body,
              contactName: name,
              capabilities,
              directoryContacts,
              botDirectoryEnabled: Boolean(orgData.bot_directory_enabled),
            });
          }
      }

      // Handle status updates for outgoing messages
      await handleStatusUpdates(value);
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
