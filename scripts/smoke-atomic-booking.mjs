import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const attempts = Number.parseInt(process.env.ATTEMPTS || "8", 10);

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function randomPhone(index) {
  return `52000${Date.now()}${index}`.slice(0, 15);
}

async function insertOne(table, payload) {
  const { data, error } = await supabase.from(table).insert(payload).select("*").single();
  if (error) {
    throw new Error(`Insert ${table} failed: ${error.message}`);
  }
  return data;
}

async function main() {
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const org = await insertOne("organizations", {
    name: "Atomic Concurrent Test Org",
    slug: `atomic-concurrent-${suffix}`,
    phone_number_id: `atomic-concurrent-${suffix}`,
  });

  const slot = await insertOne("availability_slots", {
    organization_id: org.id,
    starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    max_appointments: 1,
    appointments_count: 0,
    is_active: true,
    is_blocked: false,
  });

  const rescheduleSlot = await insertOne("availability_slots", {
    organization_id: org.id,
    starts_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    max_appointments: 1,
    appointments_count: 0,
    is_active: true,
    is_blocked: false,
  });

  const leads = [];
  for (let index = 0; index < attempts; index += 1) {
    const contact = await insertOne("crm_contacts", {
      organization_id: org.id,
      first_name: `Tutor${index}`,
      last_name_paternal: "Concurrente",
      phone: randomPhone(index),
      source: "whatsapp",
    });
    const lead = await insertOne("leads", {
      organization_id: org.id,
      source: "whatsapp",
      student_first_name: `Alumno${index}`,
      student_last_name_paternal: "Concurrente",
      grade_interest: "Kinder",
      current_school: "Escuela de prueba",
      contact_id: contact.id,
      contact_name: `Tutor${index} Concurrente`,
      contact_phone: contact.phone,
    });
    leads.push(lead);
  }

  const results = await Promise.all(
    leads.map((lead, index) =>
      supabase.rpc("book_admission_appointment", {
        p_org_id: org.id,
        p_lead_id: lead.id,
        p_slot_id: slot.id,
        p_notes: `Concurrent smoke ${index}`,
        p_type: "Campus visit",
        p_created_by_profile_id: null,
      }),
    ),
  );

  const rows = results.map((result, index) => {
    if (result.error) {
      throw new Error(`RPC ${index} failed: ${result.error.message}`);
    }
    return Array.isArray(result.data) ? result.data[0] : result.data;
  });

  const successRows = rows.filter((row) => row?.success);
  const failedRows = rows.filter((row) => row && !row.success);

  const { data: finalSlot, error: slotError } = await supabase
    .from("availability_slots")
    .select("appointments_count")
    .eq("id", slot.id)
    .single();
  if (slotError) {
    throw new Error(`Reload slot failed: ${slotError.message}`);
  }

  const { count: scheduledCount, error: countError } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slot.id)
    .eq("status", "scheduled");
  if (countError) {
    throw new Error(`Count appointments failed: ${countError.message}`);
  }

  const rowsDebug = JSON.stringify(rows, null, 2);
  assert(successRows.length === 1, `Expected exactly 1 success, got ${successRows.length}. Rows: ${rowsDebug}`);
  assert(failedRows.length === attempts - 1, `Expected ${attempts - 1} capacity failures, got ${failedRows.length}. Rows: ${rowsDebug}`);
  assert(finalSlot.appointments_count === 1, `Expected slot count 1, got ${finalSlot.appointments_count}`);
  assert(scheduledCount === 1, `Expected 1 scheduled appointment, got ${scheduledCount}`);

  const successfulAppointmentId = successRows[0].appointment_id;
  const { data: rescheduleData, error: rescheduleError } = await supabase.rpc("reschedule_admission_appointment", {
    p_org_id: org.id,
    p_appointment_id: successfulAppointmentId,
    p_new_slot_id: rescheduleSlot.id,
    p_notes: "Concurrent smoke reschedule",
    p_type: "Campus visit",
  });
  if (rescheduleError) {
    throw new Error(`Reschedule RPC failed: ${rescheduleError.message}`);
  }
  const rescheduleRow = Array.isArray(rescheduleData) ? rescheduleData[0] : rescheduleData;
  assert(rescheduleRow?.success, `Expected reschedule success, got ${JSON.stringify(rescheduleRow)}`);

  const { data: oldSlotAfterReschedule, error: oldSlotError } = await supabase
    .from("availability_slots")
    .select("appointments_count")
    .eq("id", slot.id)
    .single();
  if (oldSlotError) {
    throw new Error(`Reload old slot after reschedule failed: ${oldSlotError.message}`);
  }

  const { data: newSlotAfterReschedule, error: newSlotError } = await supabase
    .from("availability_slots")
    .select("appointments_count")
    .eq("id", rescheduleSlot.id)
    .single();
  if (newSlotError) {
    throw new Error(`Reload new slot after reschedule failed: ${newSlotError.message}`);
  }

  assert(
    oldSlotAfterReschedule.appointments_count === 0,
    `Expected old slot count 0 after reschedule, got ${oldSlotAfterReschedule.appointments_count}`,
  );
  assert(
    newSlotAfterReschedule.appointments_count === 1,
    `Expected new slot count 1 after reschedule, got ${newSlotAfterReschedule.appointments_count}`,
  );

  const { data: cancelData, error: cancelError } = await supabase.rpc("cancel_admission_appointment", {
    p_org_id: org.id,
    p_appointment_id: successfulAppointmentId,
    p_reason: "Concurrent smoke cleanup",
  });
  if (cancelError) {
    throw new Error(`Cancel RPC failed: ${cancelError.message}`);
  }
  const cancelRow = Array.isArray(cancelData) ? cancelData[0] : cancelData;
  assert(cancelRow?.success, `Expected cancel success, got ${JSON.stringify(cancelRow)}`);

  const { data: cancelledSlot, error: cancelledSlotError } = await supabase
    .from("availability_slots")
    .select("appointments_count")
    .eq("id", rescheduleSlot.id)
    .single();
  if (cancelledSlotError) {
    throw new Error(`Reload cancelled slot failed: ${cancelledSlotError.message}`);
  }
  assert(cancelledSlot.appointments_count === 0, `Expected slot count 0 after cancel, got ${cancelledSlot.appointments_count}`);

  console.log(JSON.stringify({
    attempts,
    successes: successRows.length,
    failures: failedRows.length,
    finalSlotCount: finalSlot.appointments_count,
    oldSlotCountAfterReschedule: oldSlotAfterReschedule.appointments_count,
    newSlotCountAfterReschedule: newSlotAfterReschedule.appointments_count,
    finalSlotCountAfterCancel: cancelledSlot.appointments_count,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
