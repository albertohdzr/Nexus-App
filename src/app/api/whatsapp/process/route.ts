import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  extractResponseText,
  generateChatbotReply,
  HANDOFF_RESPONSE_TEXT,
} from "@/src/lib/ai/chatbot";
import { openAIService } from "@/src/lib/ai/open";
import {
  sendWhatsAppDocument,
  sendWhatsAppRead,
  sendWhatsAppText,
  uploadWhatsAppMedia,
} from "@/src/lib/whatsapp";

type ProcessRequest = {
  chat_id?: string;
  final_message?: string;
  message?: string;
  text?: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const whatsappAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;

const ACTIVE_STATUSES = new Set(["active"]);
const INACTIVE_LEAD_STATUSES = new Set(["lost", "enrolled"]);

const parseToolArguments = (
  value: string | Record<string, unknown> | undefined,
) => {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value;
};

const UUID_V4_REGEX =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const sanitizeReplyText = (text: string) =>
  text.replace(UUID_V4_REGEX, "[confirmacion]");

const splitName = (fullName: string | null | undefined) => {
  if (!fullName) {
    return { firstName: null, lastNamePaternal: null };
  }
  const parts = fullName.trim().split(/\s+/);
  if (!parts.length) {
    return { firstName: null, lastNamePaternal: null };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastNamePaternal: null };
  }
  return {
    firstName: parts[0],
    lastNamePaternal: parts.slice(1).join(" "),
  };
};

const getResponseMessageId = (response: unknown) => {
  const responseAny = response as { output?: unknown[] } | null | undefined;
  const firstOutput =
    Array.isArray(responseAny?.output) && responseAny?.output.length
      ? responseAny?.output[0]
      : undefined;
  if (firstOutput && typeof firstOutput === "object" && "id" in firstOutput) {
    const idValue = (firstOutput as { id?: unknown }).id;
    return typeof idValue === "string" ? idValue : null;
  }
  return null;
};

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return new NextResponse("Supabase env missing", { status: 500 });
  }

  if (!whatsappAccessToken) {
    return new NextResponse("WHATSAPP_ACCESS_TOKEN missing", { status: 500 });
  }

  let payload: ProcessRequest;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const chatId = payload.chat_id;
  const input =
    payload.final_message || payload.message || payload.text || "";

  if (!chatId || !input.trim()) {
    return new NextResponse("Missing chat_id or message", { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select(
      "id, wa_id, phone_number, organization_id, active_session_id, requested_handoff"
    )
    .eq("id", chatId)
    .single();

  if (chatError || !chat) {
    console.error("Chat not found", chatError);
    return new NextResponse("Chat not found", { status: 404 });
  }

  if (chat.requested_handoff) {
    return new NextResponse("Handoff active", { status: 200 });
  }

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select(
      "id, name, phone_number_id, bot_name, bot_instructions, bot_tone, bot_language, bot_model, bot_directory_enabled"
    )
    .eq("id", chat.organization_id)
    .single();

  if (orgError || !organization) {
    console.error("Organization not found", orgError);
    return new NextResponse("Organization not found", { status: 404 });
  }

  try {
    const { data: latestInbound } = await supabase
      .from("messages")
      .select("wa_message_id")
      .eq("chat_id", chat.id)
      .eq("status", "received")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestInbound?.wa_message_id && organization.phone_number_id) {
      const { error: readError } = await sendWhatsAppRead({
        phoneNumberId: organization.phone_number_id,
        accessToken: whatsappAccessToken,
        messageId: latestInbound.wa_message_id,
      });

      if (readError) {
        console.error("WhatsApp read receipt error:", readError);
      }
    }
  } catch (error) {
    console.error("Failed to send WhatsApp read indicator:", error);
  }

  if (!organization.phone_number_id) {
    return new NextResponse("Organization missing phone_number_id", { status: 500 });
  }

  let session = null as
    | {
        id: string;
        status: string | null;
        ai_enabled: boolean | null;
        conversation_id: string | null;
      }
    | null;

  if (chat.active_session_id) {
    const { data: existingSession, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id, status, ai_enabled, conversation_id")
      .eq("id", chat.active_session_id)
      .maybeSingle();

    if (sessionError) {
      console.error("Error loading chat session", sessionError);
    }

    session = existingSession || null;
  }

  const nowIso = new Date().toISOString();

  const logAiEvent = async (
    eventType: string,
    payload: Record<string, unknown>,
  ) => {
    try {
      await supabase.from("ai_logs").insert({
        organization_id: organization.id,
        chat_id: chat.id,
        conversation_id: session?.conversation_id ?? null,
        event_type: eventType,
        payload,
      });
    } catch (error) {
      console.error("Error inserting AI log", error);
    }
  };

  if (!session || !ACTIVE_STATUSES.has(session.status || "")) {
    const conversation = await openAIService.createConversation({
      organizationId: organization.id,
      topic: "whatsapp",
      chatId: chat.id,
    });

    const { data: newSession, error: createSessionError } = await supabase
      .from("chat_sessions")
      .insert({
        organization_id: organization.id,
        chat_id: chat.id,
        status: "active",
        ai_enabled: true,
        conversation_id: conversation.id,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id, status, ai_enabled, conversation_id")
      .single();

    if (createSessionError || !newSession) {
      console.error("Error creating chat session", createSessionError);
      return new NextResponse("Failed to create session", { status: 500 });
    }

    const { error: updateChatError } = await supabase
      .from("chats")
      .update({
        active_session_id: newSession.id,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (updateChatError) {
      console.error("Failed to update chat active session", updateChatError);
    }

    session = newSession;
  }

  if (!session?.ai_enabled) {
    return new NextResponse("AI disabled", { status: 200 });
  }

  if (!session.conversation_id) {
    const conversation = await openAIService.createConversation({
      organizationId: organization.id,
      topic: "whatsapp",
      chatId: chat.id,
    });

    const { error: updateSessionError } = await supabase
      .from("chat_sessions")
      .update({
        conversation_id: conversation.id,
        updated_at: nowIso,
      })
      .eq("id", session.id);

    if (updateSessionError) {
      console.error("Failed to attach conversation to session", updateSessionError);
    }

    session = {
      ...session,
      conversation_id: conversation.id,
    };
  }

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, status, contact_name, contact_full_name, contact_first_name, contact_last_name_paternal, contact_email, contact_phone, student_first_name, student_last_name_paternal, grade_interest, school_year, current_school"
    )
    .eq("wa_chat_id", chat.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: appointmentSettings } = await supabase
    .from("appointment_settings")
    .select("id")
    .eq("organization_id", organization.id)
    .maybeSingle();

  const { data: directoryContacts } = await supabase
    .from("directory_contacts")
    .select(
      "role_slug, display_role, name, email, phone, extension, mobile, allow_bot_share, share_email, share_phone, share_extension, share_mobile"
    )
    .eq("organization_id", organization.id)
    .eq("is_active", true);

  const leadStatus = lead?.status ?? null;
  const leadActive = lead
    ? !INACTIVE_LEAD_STATUSES.has(String(leadStatus || "").toLowerCase())
    : false;

  const leadProfile = lead
    ? {
        contact_name:
          lead.contact_full_name ||
          lead.contact_name ||
          [lead.contact_first_name, lead.contact_last_name_paternal]
            .filter(Boolean)
            .join(" ") ||
          null,
        contact_phone: lead.contact_phone || null,
        contact_email: lead.contact_email || null,
        student_first_name: lead.student_first_name || null,
        student_last_name_paternal: lead.student_last_name_paternal || null,
        grade_interest: lead.grade_interest || null,
        school_year: lead.school_year || null,
        current_school: lead.current_school || null,
      }
    : null;

  const chatbotReply = await generateChatbotReply({
    input,
    conversationId: session.conversation_id || "",
    context: {
      organizationId: organization.id,
      organizationName: organization.name,
      botName: organization.bot_name,
      botTone: organization.bot_tone,
      botLanguage: organization.bot_language,
      botInstructions: organization.bot_instructions,
      botModel: organization.bot_model,
      waId: chat.wa_id,
      chatId: chat.id,
      phoneNumber: chat.phone_number,
      botDirectoryEnabled: organization.bot_directory_enabled,
      directoryContacts: directoryContacts || [],
      leadActive,
      leadId: lead?.id ?? null,
      leadStatus: leadStatus ?? null,
      leadProfile,
      appointmentsEnabled: Boolean(appointmentSettings),
    },
    logger: async (event) => {
      await logAiEvent(event.eventType, event.payload);
    },
  });

  let replyText = chatbotReply.replyText;
  let handoffRequested = chatbotReply.handoffRequested;
  let responseMessageId = chatbotReply.responseMessageId;
  let aiResponse = chatbotReply.aiResponse;

  const ensureLeadForArgs = async (
    args: Record<string, unknown>,
  ): Promise<{ leadId: string | null; contactId: string | null }> => {
    const contactName = String(args.contact_name || "").trim();
    const contactPhone = String(args.contact_phone || "").trim();
    const contactEmailRaw = String(args.contact_email || "").trim();
    const contactEmail = (() => {
      if (!contactEmailRaw) return null;
      const normalized = contactEmailRaw.toLowerCase();
      if (
        normalized.includes("sin correo") ||
        normalized.includes("no tengo") ||
        normalized.includes("no cuento") ||
        normalized === "na" ||
        normalized === "n/a"
      ) {
        return null;
      }
      return contactEmailRaw;
    })();
    const studentFirstName = String(args.student_first_name || "").trim();
    const studentLastNamePaternal = String(
      args.student_last_name_paternal || "",
    ).trim();
    const gradeInterest = String(args.grade_interest || "").trim();
    const currentSchool = String(args.current_school || "").trim() || null;
    const summary = String(args.summary || "").trim() || "Solicitud de admisiones";
    const source = String(args.source || "whatsapp").trim();

    if (
      !contactName ||
      !contactPhone ||
      !studentFirstName ||
      !studentLastNamePaternal ||
      !gradeInterest
    ) {
      return { leadId: null, contactId: null };
    }

    const { firstName, lastNamePaternal } = splitName(contactName);

    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("organization_id", organization.id)
      .or(`whatsapp_wa_id.eq.${chat.wa_id},phone.eq.${contactPhone}`)
      .maybeSingle();

    if (existingContact?.id) {
      contactId = existingContact.id;
      await supabase
        .from("crm_contacts")
        .update({
          first_name: firstName || null,
          last_name_paternal: lastNamePaternal || null,
          phone: contactPhone,
          ...(contactEmail ? { email: contactEmail } : {}),
          whatsapp_wa_id: chat.wa_id,
          updated_at: nowIso,
        })
        .eq("id", contactId);
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from("crm_contacts")
        .insert({
          organization_id: organization.id,
          first_name: firstName || null,
          last_name_paternal: lastNamePaternal || null,
          phone: contactPhone,
          email: contactEmail,
          whatsapp_wa_id: chat.wa_id,
          source,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("id")
        .single();

      if (contactError) {
        console.error("Error creating crm contact", contactError);
        return { leadId: null, contactId: null };
      }

      contactId = newContact?.id ?? null;
    }

    if (!contactId) {
      return { leadId: null, contactId: null };
    }

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("wa_chat_id", chat.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLead?.id) {
      const { error: updateError } = await supabase
        .from("leads")
      .update({
        contact_id: contactId,
        contact_name: contactName,
        contact_first_name: firstName || null,
        contact_last_name_paternal: lastNamePaternal || null,
        ...(contactEmail ? { contact_email: contactEmail } : {}),
        contact_phone: contactPhone,
        student_first_name: studentFirstName,
        student_last_name_paternal: studentLastNamePaternal,
        grade_interest: gradeInterest,
          current_school: currentSchool,
          source,
          wa_chat_id: chat.id,
          wa_id: chat.wa_id,
          ai_summary: summary,
          updated_at: nowIso,
        })
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("Error updating lead", updateError);
      }

      return { leadId: existingLead.id, contactId };
    }

    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        organization_id: organization.id,
        contact_id: contactId,
        contact_name: contactName,
        contact_first_name: firstName || null,
        contact_last_name_paternal: lastNamePaternal || null,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        student_first_name: studentFirstName,
        student_last_name_paternal: studentLastNamePaternal,
        grade_interest: gradeInterest,
        current_school: currentSchool,
        source,
        wa_chat_id: chat.id,
        wa_id: chat.wa_id,
        ai_summary: summary,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Error creating lead", leadError);
      return { leadId: null, contactId };
    }

    return { leadId: newLead?.id ?? null, contactId };
  };

  if (chatbotReply.functionCalls.length) {
    const toolOutputs: Array<{ tool_call_id: string; output: string }> = [];

    for (const call of chatbotReply.functionCalls) {
      const callId = call.call_id || call.id;
      if (!callId) continue;

      const args = parseToolArguments(call.arguments);

      await logAiEvent("tool_call", {
        name: call.name ?? null,
        call_id: callId,
        args,
      });

      if (call.name === "request_handoff") {
        handoffRequested = true;
        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify({ status: "ok" }),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: { status: "ok" },
        });
        continue;
      }

      if (call.name === "create_lead") {
        const result = await ensureLeadForArgs(args);
        const outputPayload = {
          status: result.leadId ? "created" : "failed",
        };
        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify(outputPayload),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: outputPayload,
        });
        continue;
      }

      if (call.name === "send_requirements_pdf") {
        const divisionRaw = String(args.division || "").trim().toLowerCase();
        const normalizedDivision = divisionRaw
          .replace(/\s+/g, "_")
          .replace(/-/g, "_");
        const allowedDivisions = new Set([
          "prenursery",
          "early_child",
          "elementary",
          "middle_school",
          "high_school",
        ]);

        if (!allowedDivisions.has(normalizedDivision)) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({
              status: "failed",
              error: "invalid_division",
            }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed", error: "invalid_division" },
          });
          continue;
        }

        const { data: document, error: documentError } = await supabase
          .from("admission_requirement_documents")
          .select("id, file_path, file_name, mime_type, storage_bucket, title")
          .eq("organization_id", organization.id)
          .eq("division", normalizedDivision)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (documentError) {
          console.error("Error fetching requirements document", documentError);
        }

        if (!document?.file_path) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "not_found" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "not_found" },
          });
          continue;
        }

        const bucket =
          document.storage_bucket ||
          process.env.SUPABASE_MEDIA_BUCKET ||
          "whatsapp-media";

        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(document.file_path);

        if (downloadError || !fileBlob) {
          console.error("Error downloading requirements PDF", downloadError);
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "failed" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed" },
          });
          continue;
        }

        const mimeType = document.mime_type || "application/pdf";
        const fileName =
          document.file_name ||
          `requisitos-${normalizedDivision}.pdf`;

        const { mediaId, error: uploadError } = await uploadWhatsAppMedia({
          phoneNumberId: organization.phone_number_id,
          accessToken: whatsappAccessToken,
          file: fileBlob,
          mimeType,
          fileName,
        });

        if (uploadError || !mediaId) {
          console.error("WhatsApp media upload error:", uploadError);
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "failed" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed" },
          });
          continue;
        }

        const { messageId, error: sendError } = await sendWhatsAppDocument({
          phoneNumberId: organization.phone_number_id,
          accessToken: whatsappAccessToken,
          to: chat.wa_id,
          mediaId,
          fileName,
          caption: document.title || undefined,
        });

        if (sendError) {
          console.error("WhatsApp document send error:", sendError);
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "failed" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed" },
          });
          continue;
        }

        if (messageId) {
          const payloadData = {
            media_id: mediaId,
            media_mime_type: mimeType,
            media_file_name: fileName,
            caption: document.title || null,
          };

          const { error: insertError } = await supabase.from("messages").insert({
            chat_id: chat.id,
            chat_session_id: session.id,
            wa_message_id: messageId,
            body: document.title || fileName,
            type: "document",
            status: "sent",
            sent_at: nowIso,
            sender_name: organization.bot_name || "Bot",
            payload: payloadData,
            response_id: null,
            created_at: nowIso,
          });

          if (insertError) {
            console.error("Error inserting requirements document message:", insertError);
          }
        }

        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify({
            status: "sent",
            division: normalizedDivision,
          }),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: { status: "sent", division: normalizedDivision },
        });
        continue;
      }

      if (call.name === "list_available_appointments") {
        const startDateStr = String(args.start_date || "").trim();
        const endDateStr = String(args.end_date || "").trim();
        const limitValue = (() => {
          if (typeof args.limit === "number") {
            return args.limit;
          }
          if (typeof args.limit === "string") {
            const parsed = Number.parseInt(args.limit, 10);
            return Number.isNaN(parsed) ? null : parsed;
          }
          return null;
        })();
        const effectiveLimit = limitValue ?? 20;
        const normalizedLimit = Number.isFinite(effectiveLimit)
          ? Math.floor(effectiveLimit)
          : 20;
        const clampedLimit = Math.min(50, Math.max(1, normalizedLimit));

        const startDate = new Date(`${startDateStr}T00:00:00`);
        const endDate = new Date(`${endDateStr}T00:00:00`);

        if (
          !startDateStr ||
          !endDateStr ||
          Number.isNaN(startDate.getTime()) ||
          Number.isNaN(endDate.getTime()) ||
          endDate < startDate
        ) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({
              status: "failed",
              error: "invalid_date_range",
            }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed", error: "invalid_date_range" },
          });
          continue;
        }

        const endExclusive = new Date(endDate);
        endExclusive.setDate(endExclusive.getDate() + 1);

        const { data: slots, error: slotsError } = await supabase
          .from("availability_slots")
          .select(
            "starts_at, ends_at, campus, max_appointments, appointments_count, is_active, is_blocked",
          )
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .eq("is_blocked", false)
          .gte("starts_at", startDate.toISOString())
          .lt("starts_at", endExclusive.toISOString())
          .order("starts_at", { ascending: true })
          .limit(clampedLimit);

        if (slotsError) {
          console.error("Error listing availability slots", slotsError);
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "failed" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed" },
          });
          continue;
        }

        const availableSlots = (slots || [])
          .filter(
            (slot) =>
              typeof slot.appointments_count === "number" &&
              typeof slot.max_appointments === "number" &&
              slot.appointments_count < slot.max_appointments,
          )
          .map((slot) => ({
            starts_at: slot.starts_at,
            ends_at: slot.ends_at,
            campus: slot.campus,
            remaining_capacity:
              typeof slot.max_appointments === "number" &&
              typeof slot.appointments_count === "number"
                ? slot.max_appointments - slot.appointments_count
                : null,
          }));

        const outputSlots = availableSlots.slice(0, Math.min(5, availableSlots.length));

        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify({
            status: outputSlots.length ? "ok" : "empty",
            slots: outputSlots,
          }),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: {
            status: outputSlots.length ? "ok" : "empty",
            slots: outputSlots,
          },
        });
        continue;
      }

      if (call.name === "schedule_visit") {
        const slotStartsAt = String(args.slot_starts_at || "").trim();
        const notes = String(args.notes || "").trim();

        let leadId = lead?.id ?? null;
        if (!leadId) {
          const contactName = String(args.contact_name || "").trim();
          const contactPhone = String(args.contact_phone || "").trim();
          const studentFirstName = String(args.student_first_name || "").trim();
          const studentLastNamePaternal = String(
            args.student_last_name_paternal || "",
          ).trim();
          const gradeInterest = String(args.grade_interest || "").trim();

          if (
            !contactName ||
            !contactPhone ||
            !studentFirstName ||
            !studentLastNamePaternal ||
            !gradeInterest
          ) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({
              status: "failed",
              error: "missing_lead_fields",
            }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed", error: "missing_lead_fields" },
          });
          continue;
        }

          const leadResult = await ensureLeadForArgs({
            ...args,
            summary: notes || "Solicitud de visita",
            source: "whatsapp",
          });

          leadId = leadResult.leadId;

          if (!leadId) {
            toolOutputs.push({
              tool_call_id: callId,
              output: JSON.stringify({
                status: "failed",
                error: "missing_lead_fields",
              }),
            });
            await logAiEvent("tool_output", {
              name: call.name ?? null,
              call_id: callId,
              output: { status: "failed", error: "missing_lead_fields" },
            });
            continue;
          }
        }

        const startDate = new Date(slotStartsAt);
        if (Number.isNaN(startDate.getTime())) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({
              status: "failed",
              error: "invalid_datetime",
            }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed", error: "invalid_datetime" },
          });
          continue;
        }

        const { data: slot, error: slotError } = await supabase
          .from("availability_slots")
          .select(
            "id, starts_at, ends_at, campus, max_appointments, appointments_count, is_active, is_blocked",
          )
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .eq("is_blocked", false)
          .eq("starts_at", startDate.toISOString())
          .maybeSingle();

        if (slotError) {
          console.error("Error fetching availability slot", slotError);
        }

        const slotUnavailable =
          !slot ||
          typeof slot.appointments_count !== "number" ||
          typeof slot.max_appointments !== "number" ||
          slot.appointments_count >= slot.max_appointments;

        if (slotUnavailable) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({
              status: "unavailable",
              error: "slot_unavailable",
            }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "unavailable", error: "slot_unavailable" },
          });
          continue;
        }

        const { data: appointment, error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            organization_id: organization.id,
            lead_id: leadId,
            slot_id: slot.id,
            starts_at: slot.starts_at,
            ends_at: slot.ends_at,
            campus: slot.campus || null,
            type: "visit",
            status: "scheduled",
            notes: notes || null,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select("id, starts_at")
          .single();

        if (appointmentError) {
          console.error("Error creating appointment", appointmentError);
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "failed" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "failed" },
          });
          continue;
        }

        const { error: leadUpdateError } = await supabase
          .from("leads")
          .update({
            status: "visit_scheduled",
            updated_at: nowIso,
          })
          .eq("id", leadId)
          .eq("organization_id", organization.id);

        if (leadUpdateError) {
          console.error("Error updating lead status", leadUpdateError);
        }

        const { error: slotUpdateError } = await supabase
          .from("availability_slots")
          .update({
            appointments_count: slot.appointments_count + 1,
            updated_at: nowIso,
          })
          .eq("id", slot.id)
          .eq("organization_id", organization.id);

        if (slotUpdateError) {
          console.error("Error updating slot capacity", slotUpdateError);
        }

        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify({
            status: "scheduled",
            starts_at: appointment?.starts_at ?? null,
          }),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: {
            status: "scheduled",
            starts_at: appointment?.starts_at ?? null,
          },
        });
        continue;
      }

      if (call.name === "get_directory_contact") {
        const query = String(args.query || "").toLowerCase();
        const candidates = (directoryContacts || []).filter(
          (contact) => contact.allow_bot_share,
        );
        const match = candidates.find((contact) => {
          const role = (contact.display_role || contact.role_slug || "").toLowerCase();
          const name = (contact.name || "").toLowerCase();
          return role.includes(query) || name.includes(query);
        });

        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify(
            match
              ? {
                  status: "ok",
                  name: match.name,
                  role: match.display_role,
                  email: match.share_email ? match.email : null,
                  phone: match.share_phone ? match.phone : null,
                  extension: match.share_extension ? match.extension : null,
                  mobile: match.share_mobile ? match.mobile : null,
                }
              : { status: "not_found" },
          ),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: match
            ? {
                status: "ok",
                name: match.name,
                role: match.display_role,
                email: match.share_email ? match.email : null,
                phone: match.share_phone ? match.phone : null,
                extension: match.share_extension ? match.extension : null,
                mobile: match.share_mobile ? match.mobile : null,
              }
            : { status: "not_found" },
        });
        continue;
      }

      if (call.name === "get_finance_info") {
        const capabilitySlug = String(args.capability_slug || "").trim();
        const item = String(args.item || "").trim();

        const { data: capability } = await supabase
          .from("bot_capabilities")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("slug", capabilitySlug)
          .eq("enabled", true)
          .maybeSingle();

        if (!capability?.id) {
          toolOutputs.push({
            tool_call_id: callId,
            output: JSON.stringify({ status: "not_found" }),
          });
          await logAiEvent("tool_output", {
            name: call.name ?? null,
            call_id: callId,
            output: { status: "not_found" },
          });
          continue;
        }

        const { data: finance } = await supabase
          .from("bot_capability_finance")
          .select("item, value, notes, valid_from, valid_to")
          .eq("organization_id", organization.id)
          .eq("capability_id", capability.id)
          .eq("item", item)
          .eq("is_active", true)
          .maybeSingle();

        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify(
            finance
              ? {
                  status: "ok",
                  item: finance.item,
                  value: finance.value,
                  notes: finance.notes,
                  valid_from: finance.valid_from,
                  valid_to: finance.valid_to,
                }
              : { status: "not_found" },
          ),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: finance
            ? {
                status: "ok",
                item: finance.item,
                value: finance.value,
                notes: finance.notes,
                valid_from: finance.valid_from,
                valid_to: finance.valid_to,
              }
            : { status: "not_found" },
        });
        continue;
      }

      if (call.name === "create_complaint") {
        const capabilitySlug = String(args.capability_slug || "").trim();
        const summary = String(args.summary || "").trim();
        const channel = String(args.channel || "whatsapp").trim();
        const customerName = String(args.customer_name || "").trim();
        const customerContact = String(args.customer_contact || "").trim();

        const { data: capability } = await supabase
          .from("bot_capabilities")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("slug", capabilitySlug)
          .eq("enabled", true)
          .maybeSingle();

        const { data: complaint, error: complaintError } = await supabase
          .from("bot_complaints")
          .insert({
            organization_id: organization.id,
            capability_id: capability?.id ?? null,
            channel,
            customer_name: customerName,
            customer_contact: customerContact,
            summary,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select("id")
          .single();

        if (complaintError) {
          console.error("Error creating complaint", complaintError);
        }

        toolOutputs.push({
          tool_call_id: callId,
          output: JSON.stringify({
            status: complaint?.id ? "created" : "failed",
          }),
        });
        await logAiEvent("tool_output", {
          name: call.name ?? null,
          call_id: callId,
          output: { status: complaint?.id ? "created" : "failed" },
        });
        continue;
      }

      toolOutputs.push({
        tool_call_id: callId,
        output: JSON.stringify({ status: "unhandled_tool" }),
      });
      await logAiEvent("tool_output", {
        name: call.name ?? null,
        call_id: callId,
        output: { status: "unhandled_tool" },
      });
    }

    if (toolOutputs.length && session.conversation_id) {
      aiResponse = await openAIService.submitToolOutputs({
        conversationId: session.conversation_id,
        toolOutputs,
        model: organization.bot_model || undefined,
      });
      replyText = handoffRequested
        ? HANDOFF_RESPONSE_TEXT
        : extractResponseText(aiResponse);
      responseMessageId = getResponseMessageId(aiResponse);
    }
  }

  if (!replyText || !replyText.trim()) {
    return new NextResponse("No response", { status: 200 });
  }

  const sanitizedReplyText = sanitizeReplyText(replyText);

  const { messageId, error: sendError } = await sendWhatsAppText({
    phoneNumberId: organization.phone_number_id,
    accessToken: whatsappAccessToken,
    to: chat.wa_id,
    body: sanitizedReplyText,
  });

  if (sendError) {
    console.error("WhatsApp send error:", sendError);
    return new NextResponse("Failed to send message", { status: 502 });
  }

  const payloadData = handoffRequested ? { handover: true } : null;

  const { error: insertError } = await supabase.from("messages").insert({
    chat_id: chat.id,
    chat_session_id: session.id,
    wa_message_id: messageId,
    body: sanitizedReplyText,
    type: "text",
    status: "sent",
    sent_at: nowIso,
    sender_name: organization.bot_name || "Bot",
    payload: payloadData,
    response_id: responseMessageId,
    created_at: nowIso,
  });

  if (insertError) {
    console.error("Error inserting bot message:", insertError);
  }

  const { error: updateSessionError } = await supabase
    .from("chat_sessions")
    .update({
      last_response_at: nowIso,
      updated_at: nowIso,
      ...(handoffRequested
        ? { ai_enabled: false, status: "handover" }
        : null),
    })
    .eq("id", session.id);

  if (updateSessionError) {
    console.error("Error updating chat session:", updateSessionError);
  }

  if (handoffRequested) {
    const { error: updateChatError } = await supabase
      .from("chats")
      .update({
        requested_handoff: true,
        updated_at: nowIso,
      })
      .eq("id", chat.id);

    if (updateChatError) {
      console.error("Error updating chat handoff flag:", updateChatError);
    }
  }

  return new NextResponse("Processed", { status: 200 });
}
