do $$
declare
  v_org uuid;
  v_day date;
  v_start timestamptz;
begin
  select id
    into v_org
  from public.organizations
  where slug = 'nexus-core'
  limit 1;

  if v_org is null then
    raise exception 'Expected seed organization nexus-core';
  end if;

  for i in 1..30 loop
    v_day := (current_date + i);
    if extract(isodow from v_day) between 1 and 5 then
      for h in 8..14 loop
        v_start := (v_day::timestamp + make_interval(hours => h)) at time zone 'America/Monterrey';
        insert into public.availability_slots (
          organization_id,
          starts_at,
          ends_at,
          max_appointments,
          appointments_count,
          is_active,
          is_blocked
        )
        values (
          v_org,
          v_start,
          v_start + interval '1 hour',
          1,
          0,
          true,
          false
        )
        on conflict (organization_id, starts_at, ends_at) do nothing;
      end loop;
    end if;
  end loop;
end $$;
