import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_MEDIA_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || "CAT";
const orgSlug = process.env.ORG_SLUG || "nexus-core";

const divisions = [
  ["prenursery", "Prenursery"],
  ["early_child", "Early Childhood"],
  ["elementary", "Elementary"],
  ["middle_school", "Middle School"],
  ["high_school", "High School"],
];

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function pdfEscape(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function buildPdf({ title, division }) {
  const lines = [
    "Documento generico de requisitos de admision",
    title,
    "",
    "Este PDF temporal valida el flujo de documentos del chatbot.",
    "Reemplazar por el documento oficial antes de publicar informacion final.",
    "",
    "Requisitos generales:",
    "1. Acta de nacimiento.",
    "2. CURP.",
    "3. Boletas o reporte academico reciente.",
    "4. Carta de conducta o recomendacion.",
    "5. Identificacion y datos de contacto del tutor.",
    "",
    `Division: ${division}`,
  ];

  const textOps = lines
    .map((line, index) => {
      const y = 760 - index * 22;
      return `BT /F1 12 Tf 54 ${y} Td (${pdfEscape(line)}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(textOps, "utf8")} >>\nstream\n${textOps}\nendstream`,
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, "utf8");
}

async function main() {
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", orgSlug)
    .single();
  if (orgError || !org) {
    throw new Error(`Organization not found for slug ${orgSlug}: ${orgError?.message || "missing"}`);
  }

  const bucketResult = await supabase.storage.createBucket(bucket, { public: false });
  if (bucketResult.error && !/already exists/i.test(bucketResult.error.message)) {
    throw new Error(`Create bucket failed: ${bucketResult.error.message}`);
  }

  const results = [];
  for (const [division, label] of divisions) {
    const title = `Requisitos Genericos - ${label}`;
    const fileName = `requisitos-genericos-${division}.pdf`;
    const filePath = `admissions/requirements/${org.id}/${division}/${fileName}`;
    const pdf = buildPdf({ title, division });

    const upload = await supabase.storage.from(bucket).upload(filePath, pdf, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: true,
    });
    if (upload.error) {
      throw new Error(`Upload failed for ${division}: ${upload.error.message}`);
    }

    const payload = {
      organization_id: org.id,
      division,
      title,
      file_path: filePath,
      file_name: fileName,
      mime_type: "application/pdf",
      storage_bucket: bucket,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("admission_requirement_documents")
      .select("id")
      .eq("organization_id", org.id)
      .eq("division", division)
      .eq("file_name", fileName)
      .maybeSingle();
    if (existingError) {
      throw new Error(`Lookup failed for ${division}: ${existingError.message}`);
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("admission_requirement_documents")
        .update(payload)
        .eq("id", existing.id);
      if (updateError) {
        throw new Error(`Update failed for ${division}: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from("admission_requirement_documents")
        .insert({ ...payload, created_at: new Date().toISOString() });
      if (insertError) {
        throw new Error(`Insert failed for ${division}: ${insertError.message}`);
      }
    }

    results.push({ division, fileName, filePath, bytes: pdf.length });
  }

  console.log(JSON.stringify({ organization: org, bucket, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
