-- Fix: infinite recursion in user_profiles RLS policies (42P17)
--
-- The "Org admins update profiles" policy used a raw subquery:
--   organization_id in (select organization_id from user_profiles where id = auth.uid())
-- which triggered the SELECT policies on user_profiles, which themselves
-- reference user_profiles → infinite recursion.
--
-- Fix: use get_my_org_id() (SECURITY DEFINER, bypasses RLS) instead.

drop policy if exists "Org admins update profiles" on public.user_profiles;

create policy "Org admins update profiles" on public.user_profiles
  for update to authenticated
  using (
    public.check_permission((select auth.uid()), 'settings', 'manage_team')
    and organization_id = public.get_my_org_id()
  );

-- Also fix the insert policy which has the same pattern
drop policy if exists "Org admins insert profiles" on public.user_profiles;

create policy "Org admins insert profiles" on public.user_profiles
  for insert to authenticated
  with check (
    public.check_permission((select auth.uid()), 'settings', 'manage_team')
    and organization_id = public.get_my_org_id()
  );
