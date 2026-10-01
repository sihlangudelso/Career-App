-- Closes a real privilege-escalation gap found in the pre-launch audit:
-- learners_update_own_or_admin (schema.sql) is ROW-scoped (auth.uid()=id),
-- not column-scoped -- Postgres RLS has no way to restrict individual
-- columns within one policy -- so any learner could already write
-- licenseStatus='active' on their own row via a direct Supabase call,
-- self-granting a paid seat with no technical barrier at all.
--
-- Fix: a BEFORE UPDATE trigger, the standard Postgres pattern for
-- column-level protection RLS can't express on its own. Non-admin
-- updates silently keep the old licenseStatus (no error, since a learner
-- updating other real fields on their own row -- favourites, subjects,
-- assessment results -- must keep working unaffected); only is_admin()
-- can actually change it, exactly matching App.toggleLicense's intent.
-- Safe to run on an existing database -- purely additive.

create or replace function public.protect_license_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new."licenseStatus" := old."licenseStatus";
  end if;
  return new;
end;
$$;

drop trigger if exists protect_license_status_trigger on public.learners;
create trigger protect_license_status_trigger
  before update on public.learners
  for each row execute function public.protect_license_status();
