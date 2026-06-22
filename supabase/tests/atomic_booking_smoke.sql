set request.jwt.claim.role = 'service_role';

do $$
declare
  v_org uuid := gen_random_uuid();
  v_lead_a uuid := gen_random_uuid();
  v_lead_b uuid := gen_random_uuid();
  v_contact_a uuid := gen_random_uuid();
  v_contact_b uuid := gen_random_uuid();
  v_slot uuid := gen_random_uuid();
  v_suffix text := replace(v_org::text, '-', '');
  v_result_a record;
  v_result_b record;
begin
  insert into public.organizations (id, name, slug, phone_number_id)
  values (v_org, 'Atomic Test Org', 'atomic-test-org-' || v_suffix, 'atomic-phone-' || v_suffix);

  insert into public.crm_contacts (
    id,
    organization_id,
    first_name,
    last_name_paternal,
    phone,
    source
  )
  values
    (v_contact_a, v_org, 'Tutor', 'Uno', '520000000001', 'whatsapp'),
    (v_contact_b, v_org, 'Tutor', 'Dos', '520000000002', 'whatsapp');

  insert into public.leads (
    id,
    organization_id,
    source,
    student_first_name,
    student_last_name_paternal,
    grade_interest,
    current_school,
    contact_id,
    contact_name,
    contact_phone
  )
  values
    (v_lead_a, v_org, 'whatsapp', 'Alumno', 'Uno', 'Kinder', 'Escuela A', v_contact_a, 'Tutor Uno', '520000000001'),
    (v_lead_b, v_org, 'whatsapp', 'Alumno', 'Dos', 'Kinder', 'Escuela B', v_contact_b, 'Tutor Dos', '520000000002');

  insert into public.availability_slots (
    id,
    organization_id,
    starts_at,
    ends_at,
    max_appointments,
    appointments_count,
    is_active,
    is_blocked
  )
  values (
    v_slot,
    v_org,
    now() + interval '7 days',
    now() + interval '7 days 1 hour',
    1,
    0,
    true,
    false
  );

  select *
    into v_result_a
  from public.book_admission_appointment(
    v_org,
    v_lead_a,
    v_slot,
    'Smoke A',
    'Campus visit',
    null
  );

  select *
    into v_result_b
  from public.book_admission_appointment(
    v_org,
    v_lead_b,
    v_slot,
    'Smoke B',
    'Campus visit',
    null
  );

  if not v_result_a.success then
    raise exception 'Expected first booking to succeed, got: %', v_result_a.message;
  end if;

  if v_result_b.success then
    raise exception 'Expected second booking to fail capacity check';
  end if;

  if (
    select appointments_count
    from public.availability_slots
    where id = v_slot
  ) <> 1 then
    raise exception 'Expected appointments_count to remain 1';
  end if;

  if (
    select count(*)
    from public.appointments
    where slot_id = v_slot
      and status = 'scheduled'
  ) <> 1 then
    raise exception 'Expected exactly one scheduled appointment';
  end if;

  perform public.cancel_admission_appointment(
    v_org,
    v_result_a.appointment_id,
    'Smoke cancel'
  );

  if (
    select appointments_count
    from public.availability_slots
    where id = v_slot
  ) <> 0 then
    raise exception 'Expected appointments_count to return to 0 after cancel';
  end if;
end $$;
