"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { uploadToStorage } from "@/src/lib/storage";

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB

const sanitizeFileName = (value: string) =>
  value.replace(/[^A-Za-z0-9_.-]/g, "_");

export async function uploadRequirementPdf(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const division = String(formData.get("division") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const file = formData.get("file") as File | null;

  if (!division) {
    return;
  }

  if (!file) {
    return;
  }

  if (file.type !== "application/pdf") {
    return;
  }

  if (file.size > MAX_PDF_BYTES) {
    return;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return;
  }

  const bucket = process.env.SUPABASE_MEDIA_BUCKET || "whatsapp-media";
  const safeName = sanitizeFileName(file.name || "requisitos.pdf");
  const storagePath = `admissions/requirements/${profile.organization_id}/${division}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { path, error: storageError } = await uploadToStorage({
    file: buffer,
    path: storagePath,
    contentType: "application/pdf",
    bucket,
  });

  if (storageError || !path) {
    return;
  }

  const { error: insertError } = await supabase
    .from("admission_requirement_documents")
    .insert({
      organization_id: profile.organization_id,
      division,
      title: title || null,
      file_path: path,
      file_name: file.name || safeName,
      mime_type: "application/pdf",
      storage_bucket: bucket,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error("Error inserting requirements document", insertError);
    return;
  }

  revalidatePath("/admissions/documents");
}
