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
const SESSION_TIMEOUT_MS = 15 * 60_000;
const MESSAGE_AGGREGATION_WINDOW_MS = 5_000;
const SUGGESTED_SLOTS_TTL_MS = 15 * 60_000;

type ChatRecord = {
  id: string;
  name: string | null;
  organization_id: string | null;
  active_session_id?: string | null;
  requested_handoff?: boolean | null;
  phone_number?: string | null;
  state?: string | null;
  state_context?: Record<string, any> | null;
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

type LeadSnapshot = {
  id: string;
  status: string;
  contact_id: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_first_name?: string | null;
  contact_last_name_paternal?: string | null;
  student_first_name?: string | null;
  student_last_name_paternal?: string | null;
  grade_interest?: string | null;
  school_year?: string | null;
  current_school?: string | null;
};

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

const getLastSessionActivity = (session: ChatSessionRecord) => {
  const timestamps = [
    session.last_response_at,
    session.updated_at,
    session.created_at,
  ]
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime());
  return timestamps.length ? Math.max(...timestamps) : null;
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

const setChatState = async ({
  chatId,
  state,
  context,
}: {
  chatId: string;
  state: string;
  context?: Record<string, unknown> | null;
}) => {
  const { error } = await supabase
    .from("chats")
    .update({
      state,
      state_context: context || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId);

  if (error) {
    console.error("Error updating chat state", error);
  }
};

const clearChatState = async (chatId: string) => {
  const { error } = await supabase
    .from("chats")
    .update({
      state: null,
      state_context: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId);

  if (error) {
    console.error("Error clearing chat state", error);
  }
};

const updateChatContext = async ({
  chatId,
  currentContext,
  patch,
}: {
  chatId: string;
  currentContext?: Record<string, any> | null;
  patch: Record<string, unknown>;
}) => {
  const nextContext = { ...(currentContext || {}), ...patch };
  const { error } = await supabase
    .from("chats")
    .update({
      state_context: nextContext,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chatId);

  if (error) {
    console.error("Error updating chat context", error);
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
  const { first, lastPaternal } = splitName(args.contact_name);
  const leadPayload = {
    organization_id: organizationId,
    status: "new",
    source: args.source || "whatsapp",
    student_first_name: args.student_first_name,
    student_last_name_paternal: args.student_last_name_paternal,
    grade_interest: args.grade_interest,
    current_school: args.current_school,
    contact_first_name: first || args.contact_name || "Contacto",
    contact_last_name_paternal: lastPaternal,
    contact_email: null,
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

const ACTIVE_LEAD_STATUSES = new Set([
  "new",
  "contacted",
  "qualified",
  "visit_scheduled",
  "visited",
  "application_started",
  "application_submitted",
  "admitted",
]);

const loadLatestLeadByWaId = async (
  organizationId: string,
  waId: string
): Promise<LeadSnapshot | null> => {
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, contact_id, contact_phone, contact_email, contact_first_name, contact_last_name_paternal, student_first_name, student_last_name_paternal, grade_interest, school_year, current_school"
    )
    .eq("organization_id", organizationId)
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data || null) as LeadSnapshot | null;
};

const parsePreferredTime = (preferredTime: string) => {
  const lower = preferredTime.toLowerCase();
  if (lower.includes("mañana")) return { start: 8, end: 12 };
  if (lower.includes("tarde")) return { start: 12, end: 18 };
  const match = preferredTime.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = Number(match[1]);
    return { start: hour, end: hour + 1 };
  }
  const meridiemMatch = preferredTime
    .toLowerCase()
    .match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/);
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]);
    const minutes = meridiemMatch[2] ? Number(meridiemMatch[2]) : 0;
    const isPm = meridiemMatch[3].startsWith("p");
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    if (!Number.isNaN(hour) && !Number.isNaN(minutes)) {
      return { start: hour, end: hour + 1 };
    }
  }
  return null;
};

const toIsoDate = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
};

const parsePreferredDate = (preferredDate?: string | null) => {
  if (!preferredDate) return null;
  const value = preferredDate.trim().toLowerCase();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const slashMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const yearRaw = slashMatch[3];
    const year = yearRaw ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw) : new Date().getFullYear();
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) {
      return toIsoDate(parsed);
    }
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (value.includes("pasado") && (value.includes("mañana") || value.includes("manana"))) {
    const next = new Date(today);
    next.setDate(today.getDate() + 2);
    return toIsoDate(next);
  }

  if (value.includes("mañana") || value.includes("manana")) {
    const next = new Date(today);
    next.setDate(today.getDate() + 1);
    return toIsoDate(next);
  }

  if (value.includes("hoy")) {
    return toIsoDate(today);
  }

  const weekdayMap: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
  };

  const weekdayKey = Object.keys(weekdayMap).find((day) => value.includes(day));
  if (weekdayKey) {
    const target = weekdayMap[weekdayKey];
    const current = today.getDay();
    const delta = (target - current + 7) % 7;
    const next = new Date(today);
    next.setDate(today.getDate() + delta);
    return toIsoDate(next);
  }

  return null;
};

const formatAppointmentDate = (isoDate: string) =>
  new Date(isoDate).toLocaleString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const findAvailableSlot = async ({
  organizationId,
  preferredDate,
  preferredTime,
}: {
  organizationId: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
}) => {
  const nowIso = new Date().toISOString();
  const normalizedDate = parsePreferredDate(preferredDate) || preferredDate || null;
  const query = supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, max_appointments, appointments_count")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("is_blocked", false)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (normalizedDate) {
    const start = new Date(`${normalizedDate}T00:00:00`).toISOString();
    const end = new Date(`${normalizedDate}T23:59:59`).toISOString();
    query.gte("starts_at", start).lte("starts_at", end);
  }

  const { data } = await query;
  const slots = (data || []).filter(
    (slot) => slot.appointments_count < slot.max_appointments
  );

  if (!slots.length) return null;

  if (preferredTime) {
    const timeWindow = parsePreferredTime(preferredTime);
    if (timeWindow) {
      const match = slots.find((slot) => {
        const hour = new Date(slot.starts_at).getHours();
        return hour >= timeWindow.start && hour < timeWindow.end;
      });
      if (match) return match;
    }
  }

  return slots[0];
};

const loadAvailableSlots = async ({
  organizationId,
  preferredDate,
  limit = 3,
}: {
  organizationId: string;
  preferredDate?: string | null;
  limit?: number;
}) => {
  const nowIso = new Date().toISOString();
  const normalizedDate = parsePreferredDate(preferredDate) || preferredDate || null;
  const query = supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, max_appointments, appointments_count")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("is_blocked", false)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(50);

  if (normalizedDate) {
    const start = new Date(`${normalizedDate}T00:00:00`).toISOString();
    const end = new Date(`${normalizedDate}T23:59:59`).toISOString();
    query.gte("starts_at", start).lte("starts_at", end);
  }

  const { data } = await query;
  const slots = (data || []).filter(
    (slot) => slot.appointments_count < slot.max_appointments
  );

  return slots.slice(0, limit);
};

const hasAvailableSlots = async (organizationId: string) => {
  const { data } = await supabase
    .from("availability_slots")
    .select("id, max_appointments, appointments_count")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("is_blocked", false)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);

  return (data || []).some(
    (slot) => slot.appointments_count < slot.max_appointments
  );
};

const loadUpcomingAppointment = async (leadId: string) => {
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, slot_id, notes")
    .eq("lead_id", leadId)
    .in("status", ["scheduled", "rescheduled"])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data || null;
};

const loadLatestAppointment = async (leadId: string) => {
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, slot_id, notes")
    .eq("lead_id", leadId)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
};

const decrementSlotCount = async (slotId?: string | null) => {
  if (!slotId) return;
  const { data } = await supabase
    .from("availability_slots")
    .select("appointments_count")
    .eq("id", slotId)
    .single();
  if (data) {
    await supabase
      .from("availability_slots")
      .update({
        appointments_count: Math.max(0, data.appointments_count - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("id", slotId);
  }
};

const parseOptionSelection = (message: string) => {
  const normalized = message.toLowerCase();
  if (/(primera|primer|1ra|1a|opcion 1|opción 1|\b1\b)/.test(normalized)) {
    return 0;
  }
  if (/(segunda|segundo|2da|2a|opcion 2|opción 2|\b2\b)/.test(normalized)) {
    return 1;
  }
  if (/(tercera|tercer|3ra|3a|opcion 3|opción 3|\b3\b)/.test(normalized)) {
    return 2;
  }
  return null;
};

const loadLatestSuggestedSlots = async (chatId: string) => {
  const { data } = await supabase
    .from("messages")
    .select("payload, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(8);

  for (const row of data || []) {
    const payload = row.payload as
      | { tool?: string; slots?: string[]; alternative_slots?: string[] }
      | null
      | undefined;
    if (!payload) continue;
    if (payload.tool === "appointment_availability" && Array.isArray(payload.slots)) {
      return payload.slots;
    }
    if (payload.tool === "schedule_visit" && Array.isArray(payload.alternative_slots)) {
      return payload.alternative_slots;
    }
  }

  return [];
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
  lead,
  leadActive,
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
  lead: LeadSnapshot | null;
  leadActive: boolean;
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
    const chatState = chat.state || null;
    const chatStateContext = (chat.state_context || {}) as Record<string, any>;

    const activeCapabilities = leadActive
      ? capabilities.filter((cap) => cap.type !== "finance")
      : capabilities;
    const capabilityContext = activeCapabilities.map((cap) => ({
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

    const appointmentsEnabled = await hasAvailableSlots(organization.id);

    const normalizedMessage = latestUserMessage.toLowerCase();
    const leadProfile = leadActive && lead
      ? {
          contact_name: [lead.contact_first_name, lead.contact_last_name_paternal]
            .filter(Boolean)
            .join(" ")
            .trim() || null,
          contact_phone: lead.contact_phone || null,
          contact_email: lead.contact_email || null,
          student_first_name: lead.student_first_name || null,
          student_last_name_paternal: lead.student_last_name_paternal || null,
          grade_interest: lead.grade_interest || null,
          school_year: lead.school_year || null,
          current_school: lead.current_school || null,
        }
      : null;

    const appointmentIntent = /(cita|visita|agendar|agenda|reagend|reprogram|cancel|posponer|cambiar)/i.test(
      latestUserMessage
    );
    const availabilityIntent = /(disponible|disponibles|horario|horarios|fecha|fechas)/i.test(
      latestUserMessage
    );
    const cancelIntent = /(cancel|anular)/i.test(latestUserMessage);
    const rescheduleIntent = /(reprogram|reagendar|posponer|cambiar)/i.test(latestUserMessage);
    const suggestedAt = chatStateContext.last_suggested_at as string | undefined;
    const suggestedAtMs = suggestedAt ? new Date(suggestedAt).getTime() : null;
    const hasRecentSuggestions =
      suggestedAtMs !== null && Date.now() - suggestedAtMs <= SUGGESTED_SLOTS_TTL_MS;
    const optionSelection = hasRecentSuggestions ? parseOptionSelection(latestUserMessage) : null;
    const appointmentStatusIntent = /(cuando era mi cita|cu[aá]ndo era mi cita|cu[aá]ndo es mi cita|mi cita|cancelad|cancelaste)/i.test(
      latestUserMessage
    );
    const whoIsAppointmentForIntent = /(cita para quien|para quien|para quién)/i.test(
      latestUserMessage
    );

    if (chatState === "awaiting_cancel_reason") {
      const reason = latestUserMessage.trim();
      const appointmentId = chatStateContext.appointment_id as string | undefined;
      const { data: appointment } = appointmentId
        ? await supabase
            .from("appointments")
            .select("id, slot_id, notes")
            .eq("id", appointmentId)
            .maybeSingle()
        : { data: null };

      if (appointment?.id) {
        const nextNotes = appointment.notes
          ? `${appointment.notes}\nCancelación: ${reason}`
          : `Cancelación: ${reason}`;
        await supabase
          .from("appointments")
          .update({ status: "cancelled", notes: nextNotes, updated_at: new Date().toISOString() })
          .eq("id", appointment.id);
        await decrementSlotCount(appointment.slot_id);
      }

      await clearChatState(chat.id);

      const replyText =
        "Gracias por contármelo. Ya cancelé tu cita. Si quieres, puedo proponerte otra fecha para la visita.";
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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_cancel_reason",
            conversation_id: session?.conversation_id,
            appointment_id: appointment?.id ?? appointmentId ?? null,
            reason,
          },
          created_at: nowIso,
        });
      }
      return;
    }

    if (chatState === "awaiting_reschedule_reason") {
      const reason = latestUserMessage.trim();
      await setChatState({
        chatId: chat.id,
        state: "awaiting_reschedule_date",
        context: {
          appointment_id: chatStateContext.appointment_id ?? null,
          reason,
        },
      });

      const slots = await loadAvailableSlots({ organizationId: organization.id, limit: 3 });
      const replyText = slots.length
        ? `Gracias por compartirlo. Tengo estos horarios disponibles: ${slots
            .map((slot) => formatAppointmentDate(slot.starts_at))
            .join(" · ")}. ¿Cuál te funciona?`
        : "Gracias por compartirlo. ¿Qué fecha y hora prefieres para reprogramar?";

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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_reschedule_reason",
            conversation_id: session?.conversation_id,
            reason,
            slots: slots.map((slot) => slot.id),
          },
          created_at: nowIso,
        });
      }
      return;
    }

    const costInquiryIntent = /(colegiatur|colegiatura|costos?|precio|cuota|mensualidad|cuesta)/i.test(
      latestUserMessage
    );
    const costInquiryCount = Number(chatStateContext.cost_inquiry_count || 0);

    if (leadActive && costInquiryIntent) {
      const nextCount = costInquiryCount + 1;
      await updateChatContext({
        chatId: chat.id,
        currentContext: chatStateContext,
        patch: { cost_inquiry_count: nextCount },
      });

      if (nextCount >= 2) {
        await handleHandoff();
        return;
      }

      const replyText =
        "Las colegiaturas y costos se comparten durante la visita para darte toda la información completa. ¿Te gustaría agendar una visita?";
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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "cost_deflection",
            conversation_id: session?.conversation_id,
            cost_inquiry_count: nextCount,
          },
          created_at: nowIso,
        });
      }
      return;
    }

    if (leadActive && costInquiryCount > 0) {
      await updateChatContext({
        chatId: chat.id,
        currentContext: chatStateContext,
        patch: { cost_inquiry_count: 0 },
      });
    }

    if (!leadActive && costInquiryCount > 0) {
      await updateChatContext({
        chatId: chat.id,
        currentContext: chatStateContext,
        patch: { cost_inquiry_count: 0 },
      });
    }

    if (whoIsAppointmentForIntent && leadActive) {
      const upcoming = lead?.id ? await loadUpcomingAppointment(lead.id) : null;
      const studentName = [lead?.student_first_name, lead?.student_last_name_paternal]
        .filter(Boolean)
        .join(" ")
        .trim();
      const replyText = upcoming
        ? `La cita es para ${studentName || "el estudiante"} y está programada para ${formatAppointmentDate(
            upcoming.starts_at
          )}. ¿Quieres reprogramarla o cancelarla?`
        : `La visita sería para ${studentName || "el estudiante"}. ¿Qué fecha y hora prefieres?`;

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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_subject",
            conversation_id: session?.conversation_id,
            appointment_id: upcoming?.id ?? null,
          },
          created_at: nowIso,
        });
      }
      return;
    }

    if (appointmentStatusIntent && lead?.id) {
      const latestAppointment = await loadLatestAppointment(lead.id);
      const replyText = latestAppointment
        ? `Tu última cita fue para ${formatAppointmentDate(
            latestAppointment.starts_at
          )} y quedó ${latestAppointment.status}. ¿Quieres agendar una nueva visita?`
        : "No tengo una cita registrada. ¿Quieres que agendemos una visita?";

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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_status",
            conversation_id: session?.conversation_id,
            appointment_id: latestAppointment?.id ?? null,
          },
          created_at: nowIso,
        });
      }
      return;
    }

    if (leadActive && appointmentIntent) {
      const upcoming = lead?.id ? await loadUpcomingAppointment(lead.id) : null;
      let replyText = "";

      if (cancelIntent && upcoming?.id) {
        await setChatState({
          chatId: chat.id,
          state: "awaiting_cancel_reason",
          context: { appointment_id: upcoming.id, slot_id: upcoming.slot_id },
        });
        replyText = "Entiendo. ¿Podrías compartir el motivo de la cancelación?";
      } else if (rescheduleIntent && upcoming?.id) {
        await setChatState({
          chatId: chat.id,
          state: "awaiting_reschedule_reason",
          context: { appointment_id: upcoming.id, slot_id: upcoming.slot_id },
        });
        replyText = "Claro. ¿Podrías contarme el motivo para reprogramarla?";
      } else if (!appointmentsEnabled && !upcoming) {
        replyText =
          "Por ahora no tengo horarios disponibles. ¿Quieres que un asesor te contacte?";
      } else if (rescheduleIntent) {
        replyText = upcoming
          ? "Claro, ¿qué fecha y hora prefieres para reprogramarla?"
          : "No tengo una cita agendada. ¿Qué fecha y hora prefieres para agendar una visita?";
      } else if (cancelIntent) {
        replyText = "No tengo una cita agendada. ¿Quieres que agendemos una visita?";
      } else {
        replyText = upcoming
          ? `Tu visita está programada para ${formatAppointmentDate(
              upcoming.starts_at
            )}. ¿Quieres reprogramarla o cancelarla?`
          : "No tengo una cita agendada. ¿Qué fecha y hora prefieres para agendar una visita?";
      }

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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_followup",
            conversation_id: session?.conversation_id,
            appointment_id: upcoming?.id ?? null,
            query: latestUserMessage,
          },
          created_at: nowIso,
        });
      }
      return;
    }

    if (optionSelection !== null) {
      if (!lead?.id) {
        const replyText =
          "Para agendar necesito tu nombre y teléfono de contacto. ¿Me los compartes?";
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
            response_id: null,
            wa_message_id: messageId,
            body: replyText,
            type: "text",
            status: "sent",
            sent_at: nowIso,
            sender_name: "Bot",
            payload: {
              tool: "appointment_selection",
              conversation_id: session?.conversation_id,
              status: "missing_lead",
            },
            created_at: nowIso,
          });
        }
        return;
      }

      const contextSuggestedSlots = Array.isArray(chatStateContext.last_suggested_slots)
        ? (chatStateContext.last_suggested_slots as string[])
        : [];
      const suggestedAt = chatStateContext.last_suggested_at as string | undefined;
      const suggestedAtMs = suggestedAt ? new Date(suggestedAt).getTime() : null;
      const contextSlotsFresh =
        suggestedAtMs !== null && Date.now() - suggestedAtMs <= SUGGESTED_SLOTS_TTL_MS;
      const suggestedSlots = contextSlotsFresh && contextSuggestedSlots.length
        ? contextSuggestedSlots
        : await loadLatestSuggestedSlots(chat.id);
      const slotId = suggestedSlots[optionSelection];
      if (slotId) {
        const { data: slot } = await supabase
          .from("availability_slots")
          .select(
            "id, starts_at, ends_at, max_appointments, appointments_count, is_active, is_blocked"
          )
          .eq("id", slotId)
          .single();

        if (
          slot &&
          slot.is_active &&
          !slot.is_blocked &&
          slot.appointments_count < slot.max_appointments
        ) {
          const existingAppointment = await loadUpcomingAppointment(lead.id);
          const rescheduleReason =
            chatState === "awaiting_reschedule_date"
              ? (chatStateContext.reason as string | undefined)
              : undefined;
          const { data: appointment, error: appointmentError } = await supabase
            .from("appointments")
            .insert({
              organization_id: organization.id,
              lead_id: lead.id,
              slot_id: slot.id,
              starts_at: slot.starts_at,
              ends_at: slot.ends_at,
              status: "scheduled",
              type: "visit",
              notes: [
                "Agendada desde sugerencias de disponibilidad.",
                rescheduleReason ? `Reprogramación: ${rescheduleReason}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            })
            .select("id")
            .single();

          if (!appointmentError) {
            await supabase
              .from("availability_slots")
              .update({
                appointments_count: slot.appointments_count + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", slot.id);
          }

          if (!appointmentError && existingAppointment?.id) {
            const rescheduleNotes = rescheduleReason
              ? `${existingAppointment.notes ? `${existingAppointment.notes}\n` : ""}Reprogramación: ${rescheduleReason}`
              : existingAppointment.notes;
            await supabase
              .from("appointments")
              .update({
                status: "rescheduled",
                notes: rescheduleNotes,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingAppointment.id);
            await decrementSlotCount(existingAppointment.slot_id);
          }

          await supabase
            .from("leads")
            .update({ status: "visit_scheduled", updated_at: new Date().toISOString() })
            .eq("id", lead.id);

          const replyText = appointmentError
            ? "Tuve un problema al agendar ese horario. ¿Quieres que te comparta otras opciones?"
            : `Listo, agendé tu visita para ${formatAppointmentDate(
                slot.starts_at
              )}. Te enviaré un recordatorio con la información para llegar. ¿Me compartes un correo para enviarte los detalles?`;

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
              response_id: null,
              wa_message_id: messageId,
              body: replyText,
              type: "text",
              status: "sent",
              sent_at: nowIso,
              sender_name: "Bot",
              payload: {
                tool: "appointment_selection",
                conversation_id: session?.conversation_id,
                appointment_id: appointment?.id ?? null,
                slot_id: slot.id,
              },
              created_at: nowIso,
            });
          }
          if (chatState === "awaiting_reschedule_date") {
            await clearChatState(chat.id);
          }
          await updateChatContext({
            chatId: chat.id,
            currentContext: chatStateContext,
            patch: { last_suggested_slots: null, last_suggested_at: null },
          });
          return;
        }
      }

      const fallbackSlots = await loadAvailableSlots({
        organizationId: organization.id,
        limit: 3,
      });
      const replyText = fallbackSlots.length
        ? `Ese horario ya no está disponible. Tengo estos horarios: ${fallbackSlots
            .map((item) => formatAppointmentDate(item.starts_at))
            .join(" · ")}. ¿Cuál te funciona?`
        : "Ese horario ya no está disponible. ¿Qué otra fecha u horario te funciona?";

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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_selection",
            conversation_id: session?.conversation_id,
            fallback_slots: fallbackSlots.map((item) => item.id),
          },
          created_at: nowIso,
        });
        await updateChatContext({
          chatId: chat.id,
          currentContext: chatStateContext,
          patch: {
            last_suggested_slots: fallbackSlots.map((item) => item.id),
            last_suggested_at: nowIso,
          },
        });
      }
      return;
    }

    if ((leadActive || appointmentIntent) && availabilityIntent) {
      const slots = await loadAvailableSlots({ organizationId: organization.id, limit: 3 });
      const replyText = slots.length
        ? `Tengo estos horarios disponibles: ${slots
            .map((slot) => formatAppointmentDate(slot.starts_at))
            .join(" · ")}. ¿Cuál te funciona mejor?`
        : "Por ahora no tengo horarios disponibles. ¿Quieres que un asesor te contacte?";

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
          response_id: null,
          wa_message_id: messageId,
          body: replyText,
          type: "text",
          status: "sent",
          sent_at: nowIso,
          sender_name: "Bot",
          payload: {
            tool: "appointment_availability",
            conversation_id: session?.conversation_id,
            slots: slots.map((slot) => slot.id),
            query: latestUserMessage,
          },
          created_at: nowIso,
        });
        await updateChatContext({
          chatId: chat.id,
          currentContext: chatStateContext,
          patch: {
            last_suggested_slots: slots.map((slot) => slot.id),
            last_suggested_at: nowIso,
          },
        });
      }
      return;
    }

    const contactRequestIntent =
      /(contacto|p[aá]same|p[aá]salo|p[aá]samelo|comp[aá]rteme|dame|me puedes|podr[ií]as|quiero hablar con|quiero comunicarme con)/i.test(
        latestUserMessage
      ) ||
      /(tel[eé]fono de|correo de|email de|extensi[oó]n de|m[oó]vil de|celular de|n[uú]mero de)/i.test(
        latestUserMessage
      );
    const roleMentioned = /(caja|cajero|admisiones|direcci[oó]n|coordinaci[oó]n|recepci[oó]n|soporte)/i.test(
      latestUserMessage
    );
    const isProvidingPhone =
      /\b\d{7,}\b/.test(latestUserMessage) ||
      /(mi tel[eé]fono|mi n[uú]mero|tel[eé]fono es|telefono es|tel es|tel[eé]fono est[aá] bien|telefono est[aá] bien)/i.test(
        latestUserMessage
      );
    const shouldHandleDirectory =
      botDirectoryEnabled && (contactRequestIntent || roleMentioned) && !isProvidingPhone;

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
          leadActive,
          leadId: lead?.id || null,
          leadStatus: lead?.status || null,
          leadProfile,
          appointmentsEnabled,
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
      const userContactIntent =
        /(contacto|p[aá]same|p[aá]salo|p[aá]samelo|comp[aá]rteme|dame|me puedes|podr[ií]as|quiero hablar con|quiero comunicarme con)/i.test(
          latestUserMessage
        ) ||
        /(tel[eé]fono de|correo de|email de|extensi[oó]n de|m[oó]vil de|celular de|n[uú]mero de)/i.test(
          latestUserMessage
        );
      const userRoleMentioned = /(caja|cajero|admisiones|direcci[oó]n|coordinaci[oó]n|recepci[oó]n|soporte)/i.test(
        latestUserMessage
      );
      const isProvidingPhone =
        /\b\d{7,}\b/.test(latestUserMessage) ||
        /(mi tel[eé]fono|mi n[uú]mero|tel[eé]fono es|telefono es|tel es|tel[eé]fono est[aá] bien|telefono est[aá] bien)/i.test(
          latestUserMessage
        );
      const hasContactIntent = userContactIntent || userRoleMentioned;
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

      if (!hasContactIntent || isProvidingPhone) {
        if (session?.conversation_id) {
          await submitToolOutputs({
            conversationId: session.conversation_id,
            toolCalls: chatbotReply.functionCalls.filter(
              (call) => call.name === "get_directory_contact"
            ),
            output: JSON.stringify({ status: "ignored" }),
            model: organization.bot_model,
          });
        }
        return;
      }

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

    const scheduleCall = chatbotReply.functionCalls.find((call) => call.name === "schedule_visit");
    if (scheduleCall) {
      const args = parseFunctionArgs(scheduleCall.arguments) as {
        contact_name?: string;
        contact_phone?: string;
        student_first_name?: string;
        student_last_name_paternal?: string;
        grade_interest?: string;
        current_school?: string;
        preferred_date?: string;
        preferred_time?: string;
        notes?: string;
      };

      const rescheduleReason =
        chatState === "awaiting_reschedule_date"
          ? (chatStateContext.reason as string | undefined)
          : undefined;

      const normalizedArgs = {
        contact_name:
          args.contact_name?.trim() ||
          leadProfile?.contact_name ||
          contactName ||
          null,
        contact_phone:
          args.contact_phone?.trim() ||
          lead?.contact_phone ||
          chat.phone_number ||
          waId,
        student_first_name:
          args.student_first_name?.trim() ||
          lead?.student_first_name ||
          null,
        student_last_name_paternal:
          args.student_last_name_paternal?.trim() ||
          lead?.student_last_name_paternal ||
          null,
        grade_interest:
          args.grade_interest?.trim() ||
          lead?.grade_interest ||
          null,
        current_school:
          args.current_school?.trim() ||
          lead?.current_school ||
          null,
        preferred_date: args.preferred_date?.trim() || null,
        preferred_time: args.preferred_time?.trim() || null,
        notes: args.notes?.trim() || null,
      };

      const requiredFields = [
        normalizedArgs.contact_name,
        normalizedArgs.contact_phone,
        normalizedArgs.student_first_name,
        normalizedArgs.student_last_name_paternal,
        normalizedArgs.grade_interest,
        normalizedArgs.current_school,
        normalizedArgs.preferred_date,
        normalizedArgs.preferred_time,
      ];

      if (requiredFields.some((value) => !value || String(value).trim().length === 0)) {
        const reply =
          "Para agendar la visita necesito: nombre del contacto, teléfono, nombre del estudiante, grado, escuela actual y fecha/hora preferida. ¿Me compartes esos datos?";
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
              tool: "schedule_visit",
              conversation_id: session?.conversation_id,
              status: "missing_fields",
            },
            created_at: nowIso,
          });
        }
        return;
      }

      const resolvedContactName = normalizedArgs.contact_name || "Contacto";
      const { first, lastPaternal } = splitName(resolvedContactName);

      const contactId = await ensureContact({
        organizationId: organization.id,
        waId,
        phone: normalizedArgs.contact_phone || waId,
        name: resolvedContactName,
        email: lead?.contact_email || null,
      });

      let leadId = lead?.id || null;
      let existingAppointment = leadId ? await loadUpcomingAppointment(leadId) : null;
      if (!leadId) {
        const leadArgs: CreateLeadArgs = {
          contact_name: resolvedContactName,
          contact_phone: normalizedArgs.contact_phone || waId,
          student_first_name: normalizedArgs.student_first_name || "",
          student_last_name_paternal: normalizedArgs.student_last_name_paternal || "",
          grade_interest: normalizedArgs.grade_interest || "",
          current_school: normalizedArgs.current_school || null,
          summary: normalizedArgs.notes || "Solicitud de visita de admisiones.",
          source: "whatsapp",
        };

        leadId = await createLeadRecord({
          organizationId: organization.id,
          chatId: chat.id,
          waId,
          contactId,
          args: leadArgs,
        });
      } else {
        await supabase
          .from("leads")
          .update({
            contact_first_name: first || resolvedContactName,
            contact_last_name_paternal: lastPaternal || null,
            contact_email: lead?.contact_email || null,
            contact_phone: normalizedArgs.contact_phone || null,
            student_first_name: normalizedArgs.student_first_name || null,
            student_last_name_paternal: normalizedArgs.student_last_name_paternal || null,
            grade_interest: normalizedArgs.grade_interest || null,
            school_year: lead?.school_year || null,
            current_school: normalizedArgs.current_school || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", leadId);
      }

      const slot = await findAvailableSlot({
        organizationId: organization.id,
        preferredDate: normalizedArgs.preferred_date,
        preferredTime: normalizedArgs.preferred_time,
      });

      if (!slot) {
        const alternatives = await loadAvailableSlots({
          organizationId: organization.id,
          preferredDate: normalizedArgs.preferred_date,
          limit: 3,
        });
        const reply = alternatives.length
          ? `No encontré un horario disponible en esa fecha. Tengo estos horarios disponibles: ${alternatives
              .map((alt) => formatAppointmentDate(alt.starts_at))
              .join(" · ")}. ¿Cuál te funciona?`
          : "No encontré un horario disponible en esa fecha. ¿Qué otra fecha u horario te funciona?";
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
              tool: "schedule_visit",
              conversation_id: session?.conversation_id,
              status: "no_slots",
              alternative_slots: alternatives.map((alt) => alt.id),
            },
            created_at: nowIso,
          });
          await updateChatContext({
            chatId: chat.id,
            currentContext: chatStateContext,
            patch: {
              last_suggested_slots: alternatives.map((alt) => alt.id),
              last_suggested_at: nowIso,
            },
          });
        }
        return;
      }

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          organization_id: organization.id,
          lead_id: leadId,
          slot_id: slot.id,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          status: "scheduled",
          type: "visit",
          notes: [normalizedArgs.notes, rescheduleReason ? `Reprogramación: ${rescheduleReason}` : null]
            .filter(Boolean)
            .join("\n") || null,
        })
        .select("id")
        .single();

      if (!appointmentError) {
        await supabase
          .from("availability_slots")
          .update({
            appointments_count: slot.appointments_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", slot.id);
      }

      if (!appointmentError && existingAppointment?.id) {
        const rescheduleNotes = rescheduleReason
          ? `${existingAppointment.notes ? `${existingAppointment.notes}\n` : ""}Reprogramación: ${rescheduleReason}`
          : existingAppointment.notes;
        await supabase
          .from("appointments")
          .update({
            status: "rescheduled",
            notes: rescheduleNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingAppointment.id);
        await decrementSlotCount(existingAppointment.slot_id);
      }

      await supabase
        .from("leads")
        .update({ status: "visit_scheduled", updated_at: new Date().toISOString() })
        .eq("id", leadId);

      const readable = formatAppointmentDate(slot.starts_at);
      const reply = existingAppointment?.id
        ? `Listo, reprogramé tu visita para ${readable}. Te enviaré un recordatorio con la información para llegar. ¿Me compartes un correo para enviarte los detalles?`
        : `Listo, agendé tu visita para ${readable}. Te enviaré un recordatorio con la información para llegar. ¿Me compartes un correo para enviarte los detalles?`;

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
            tool: "schedule_visit",
            conversation_id: session?.conversation_id,
            appointment_id: appointment?.id,
          },
          created_at: nowIso,
        });
      }

      if (session?.conversation_id) {
        await submitToolOutputs({
          conversationId: session.conversation_id,
          toolCalls: chatbotReply.functionCalls.filter((call) => call.name === "schedule_visit"),
          output: JSON.stringify({
            status: appointmentError ? "failed" : "scheduled",
            appointment_id: appointment?.id,
            slot_id: slot.id,
          }),
          model: organization.bot_model,
        });
      }

      if (chatState === "awaiting_reschedule_date") {
        await clearChatState(chat.id);
      }

      return;
    }

    const leadCall = chatbotReply.functionCalls.find((call) => call.name === "create_lead");
    if (leadCall) {
      const parsedArgs = parseFunctionArgs(leadCall.arguments) as Partial<CreateLeadArgs>;
      const contactPhone =
        (parsedArgs.contact_phone as string | undefined) || chat.phone_number || waId;
      const contactName = parsedArgs.contact_name?.trim();

      if (
        !contactPhone ||
        !contactName ||
        !parsedArgs.student_first_name ||
        !parsedArgs.student_last_name_paternal ||
        !parsedArgs.grade_interest ||
        !parsedArgs.current_school
      ) {
        const missing: string[] = [];
        if (!contactPhone) missing.push("teléfono");
        if (!contactName) missing.push("nombre del contacto");
        if (!parsedArgs.student_first_name) missing.push("nombre del estudiante");
        if (!parsedArgs.student_last_name_paternal) missing.push("apellido del estudiante");
        if (!parsedArgs.grade_interest) missing.push("grado de interés");
        if (!parsedArgs.current_school) missing.push("escuela actual");

        const reply = `Para registrar tu solicitud necesito ${missing.join(
          ", "
        )}. ¿Me compartes esos datos?`;

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
              tool: "create_lead",
              conversation_id: session?.conversation_id,
              status: "missing_fields",
              missing_fields: missing,
            },
            created_at: nowIso,
          });
        }

        if (session?.conversation_id) {
          await submitToolOutputs({
            conversationId: session.conversation_id,
            toolCalls: chatbotReply.functionCalls.filter((call) => call.name === "create_lead"),
            output: JSON.stringify({ status: "missing_fields", missing_fields: missing }),
            model: organization.bot_model,
          });
        }
        return;
      }

      const leadArgs: CreateLeadArgs = {
        contact_phone: contactPhone,
        contact_name: contactName,
        student_first_name: parsedArgs.student_first_name,
        student_last_name_paternal: parsedArgs.student_last_name_paternal,
        grade_interest: parsedArgs.grade_interest,
        current_school: parsedArgs.current_school || null,
        summary:
          parsedArgs.summary ||
          `Solicitud de inscripción para ${parsedArgs.student_first_name} ${parsedArgs.student_last_name_paternal} (${parsedArgs.grade_interest}), escuela actual ${parsedArgs.current_school}.`,
        source: parsedArgs.source || "whatsapp",
      };

      try {
        const contactId = await ensureContact({
          organizationId: organization.id,
          waId,
          phone: leadArgs.contact_phone,
          name: contactName,
          email: null,
        });

        const leadId = await createLeadRecord({
          organizationId: organization.id,
          chatId: chat.id,
          waId,
          contactId,
          args: leadArgs,
        });

        const { first: contactFirstName } = splitName(contactName);
        const displayName = contactFirstName || contactName;
        const leadReply = appointmentsEnabled
          ? `Gracias${displayName ? `, ${displayName}` : ""}. ¿Te gustaría agendar una visita? Dime qué fecha y hora prefieres.`
          : `Gracias${displayName ? `, ${displayName}` : ""}. Ya registré tu solicitud. ¿Hay algún horario que prefieras para contactarte?`;

        const { messageId, error } = await sendWhatsAppText({
          phoneNumberId,
          accessToken,
          to: waId,
          body: leadReply,
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
          body: leadReply,
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
            appointments_enabled: appointmentsEnabled,
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
      const messages = Array.isArray(value.messages) ? [...value.messages] : [];

      if (messages.length) {
        const contact = value.contacts ? value.contacts[0] : null;
        const phoneNumber = value.metadata.display_phone_number;
        const phoneNumberId = value.metadata.phone_number_id;
        const orderedMessages = messages.sort((a, b) => {
          const aTime = a.timestamp ? parseInt(a.timestamp, 10) : 0;
          const bTime = b.timestamp ? parseInt(b.timestamp, 10) : 0;
          return aTime - bTime;
        });

        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, bot_name, bot_instructions, bot_tone, bot_language, bot_model, bot_directory_enabled")
          .eq("phone_number_id", phoneNumberId)
          .single();

        if (orgError || !orgData) {
          console.error("Organization not found for phone_number_id:", phoneNumberId);
          return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        const lastMessageIdInBatch =
          orderedMessages[orderedMessages.length - 1]?.id ?? null;

        for (const message of orderedMessages) {
          const waId = contact?.wa_id ?? message.from ?? "";
          const name = contact?.profile?.name ?? waId;

          if (!waId) {
            console.error("Missing waId in incoming message");
            continue;
          }

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
            continue;
          }

          const chatRecord: ChatRecord = {
            id: chatData.id,
            name: chatData.name ?? null,
            organization_id: chatData.organization_id ?? orgData.id,
            active_session_id: (chatData as { active_session_id?: string | null })?.active_session_id ?? null,
            requested_handoff: (chatData as { requested_handoff?: boolean | null })?.requested_handoff ?? false,
            phone_number: chatData.phone_number ?? null,
            state: (chatData as { state?: string | null })?.state ?? null,
            state_context: (chatData as { state_context?: Record<string, any> | null })?.state_context ?? null,
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
          const messageTimestampIso = new Date(messageTimestampMs).toISOString();

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
            wa_timestamp: messageTimestampIso,
            sender_name: name,
            media_id: mediaId,
            media_path: mediaPath,
            media_url: mediaUrl,
            media_mime_type: mediaMime,
            created_at: messageTimestampIso,
          });

          if (messageError) {
            console.error("Error inserting message:", messageError);
          }

          if (session?.id) {
            const { error: sessionActivityError } = await supabase
              .from("chat_sessions")
              .update({ updated_at: messageTimestampIso })
              .eq("id", session.id);

            if (sessionActivityError) {
              console.error("Error updating chat session activity:", sessionActivityError);
            }
          }

          if (
            message.type === "text" &&
            message.text?.body &&
            message.id === lastMessageIdInBatch
          ) {
            const windowStartIso = new Date(
              messageTimestampMs - MESSAGE_AGGREGATION_WINDOW_MS
            ).toISOString();
            const { data: recentMessages } = await supabase
              .from("messages")
              .select("wa_message_id, body, wa_timestamp, created_at")
              .eq("chat_id", chatRecord.id)
              .eq("status", "received")
              .eq("type", "text")
              .gte("wa_timestamp", windowStartIso)
              .order("wa_timestamp", { ascending: true, nullsFirst: false })
              .order("created_at", { ascending: true })
              .limit(10);

            const sortedMessages = recentMessages || [];
            const aggregatedInput = sortedMessages
              .map((item) => (item.body || "").trim())
              .filter(Boolean)
              .reduce<string[]>((acc, item) => {
                const last = acc[acc.length - 1];
                if (last?.toLowerCase() !== item.toLowerCase()) {
                  acc.push(item);
                }
                return acc;
              }, [])
              .join("\n");

            if (aggregatedInput) {
              const capabilities = await loadBotCapabilities(orgData.id);
              const directoryContacts = await loadDirectoryContacts(orgData.id);
              const lead = await loadLatestLeadByWaId(orgData.id, waId);
              const leadActive = Boolean(lead && ACTIVE_LEAD_STATUSES.has(lead.status));
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
                latestUserMessage: aggregatedInput,
                contactName: name,
                capabilities,
                directoryContacts,
                botDirectoryEnabled: Boolean(orgData.bot_directory_enabled),
                lead,
                leadActive,
              });
            }
          }
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
