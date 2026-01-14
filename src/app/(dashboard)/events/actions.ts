"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function getUserOrg() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  if (!profile?.organization_id) {
    throw new Error("Missing organization context.");
  }

  return { supabase, userId: user.id, organizationId: profile.organization_id };
}

export async function createEvent(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const divisions = Array.from(
    new Set(
      formData
        .getAll("divisions")
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
  const startsAt = String(formData.get("starts_at") || "").trim();
  const endsAt = String(formData.get("ends_at") || "").trim();
  const requiresRegistration = formData.get("requires_registration") === "on";

  if (!name || divisions.length === 0 || !startsAt) {
    throw new Error("Missing required fields.");
  }

  const { supabase, userId, organizationId } = await getUserOrg();

  const { error } = await supabase.from("events").insert({
    organization_id: organizationId,
    name,
    description: description || null,
    divisions,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    requires_registration: requiresRegistration,
    created_by_profile_id: userId,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/events");
}

export async function uploadEventDocument(formData: FormData) {
  const eventId = String(formData.get("event_id") || "").trim();
  const documentType = String(formData.get("document_type") || "").trim();
  const file = formData.get("file");

  if (!eventId || !documentType || !file || !(file instanceof File)) {
    throw new Error("Missing document details.");
  }

  const { supabase, userId, organizationId } = await getUserOrg();

  const { data: eventRecord } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organization_id", organizationId)
    .single();

  if (!eventRecord) {
    throw new Error("Event not found.");
  }

  const safeName = sanitizeFileName(file.name || "document");
  const filePath = `events/${organizationId}/${eventId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("events-documents")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { error: insertError } = await supabase.from("event_documents").insert({
    organization_id: organizationId,
    event_id: eventId,
    document_type: documentType,
    file_path: filePath,
    file_name: safeName,
    mime_type: file.type || "application/octet-stream",
    created_by_profile_id: userId,
  });

  if (insertError) {
    throw insertError;
  }

  revalidatePath("/events");
}

export async function registerEventAttendance(formData: FormData) {
  const eventId = String(formData.get("event_id") || "").trim();
  const leadId = String(formData.get("lead_id") || "").trim();

  if (!eventId || !leadId) {
    throw new Error("Missing attendance details.");
  }

  const { supabase, organizationId } = await getUserOrg();

  const { error } = await supabase.from("event_attendance").insert({
    organization_id: organizationId,
    event_id: eventId,
    lead_id: leadId,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/events");
}
