-- Adds a second, narrower admin tier: "class_admin" (a teacher/manager who
-- should only ever see the learners in the class(es) they personally run),
-- alongside the existing "admin" role which becomes the "super admin" tier
-- (creates classes, sets seat limits, assigns class admins). Safe to run on
-- an existing database -- purely additive, existing 'admin' accounts are
-- completely unaffected.

-- Widen the role enum. Looks up the check constraint's actual name
-- dynamically rather than hardcoding "profiles_role_check", since a
-- constraint hand-edited via the Supabase Table Editor UI at some point
-- could have been given a different name.
do $$
declare cname text;
begin
  select conname into cname from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'c';
  if cname is not null then
    execute format('alter table public.profiles drop constraint %I', cname);
  end if;
end $$;
alter table public.profiles add constraint profiles_role_check
  check (role in ('learner','admin','class_admin'));

-- Which class admin manages this class. Nullable: a pre-existing or
-- newly-created class is simply invisible to every class admin (only
-- super admins see it) until explicitly assigned -- safe by default.
alter table public.classes add column if not exists "classAdminId" uuid references auth.users(id);

-- A class admin's access is live, not a cached pointer: it requires BOTH
-- classAdminId = them AND their role still being class_admin right now, so
-- a manual demotion (Table Editor) revokes access immediately even if
-- nobody remembers to also clear classAdminId on their old class.
create or replace function public.owns_class(class_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    join public.profiles p on p.id = auth.uid()
    where c.id = class_id and c."classAdminId" = auth.uid() and p.role = 'class_admin'
  );
$$;

-- The one and only policy text change: learners SELECT gains an additive
-- OR-branch for class admins. is_admin() itself is untouched, so every
-- other existing policy (profiles, classes, dashboard_snapshots, and
-- learners INSERT/UPDATE/DELETE) keeps today's behaviour exactly.
drop policy if exists "learners_select_own_or_admin" on public.learners;
create policy "learners_select_own_or_admin"
  on public.learners for select
  using (auth.uid() = id or public.is_admin() or public.owns_class("classId"));
