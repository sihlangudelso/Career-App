create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  "displayName" text,
  role text not null default 'learner' check (role in ('learner','admin')),
  "createdAt" timestamptz not null default now()
);

-- ---------- classes ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  "seatLimit" int,
  "createdBy" uuid references auth.users(id),
  "createdAt" timestamptz not null default now()
);

-- ---------- learners ----------
-- One row per learner, keyed by their auth user id. displayName/email
-- are mirrored here from auth at save-time purely so the admin cohort
-- table and CSV export don't need an extra query per learner.
create table if not exists public.learners (
  id uuid primary key references auth.users(id) on delete cascade,
  grade smallint,
  school text,
  "mathType" text,
  subjects text[] default '{}',
  "subjectGuidance" jsonb,
  riasec jsonb,
  strengths jsonb,
  "riasecRaw" jsonb,
  "strengthsRaw" jsonb,
  "assessmentCompletedAt" timestamptz,
  "viewedMatches" boolean default false,
  favourites text[] default '{}',
  compare text[] default '{}',
  "classId" uuid references public.classes(id) on delete set null,
  "licenseStatus" text not null default 'trial' check ("licenseStatus" in ('trial','active')),
  "apsLast" jsonb,
  "displayName" text,
  email text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — this is what actually makes the app safe.
-- Without these, either nobody can read/write anything (RLS on with
-- no policies) or, if you left RLS off, EVERYONE can read and write
-- EVERYTHING regardless of who they are. Do not skip this section.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.classes  enable row level security;
alter table public.learners enable row level security;

-- Helper: is the currently authenticated person an admin? SECURITY
-- DEFINER lets this function read the profiles table even though the
-- calling user's own RLS policy might not otherwise allow it — this
-- is the standard, documented Supabase pattern for role checks.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- profiles policies ----------
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

-- Only an admin can change a role (including promoting someone else).
-- Regular users get no update/insert/delete policy at all: their row
-- is created only by the trigger below, and role changes must go
-- through an admin (Phase 2) or later a proper invite flow (Phase 5).
create policy "profiles_update_admin_only"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- classes policies ----------
create policy "classes_select_authenticated"
  on public.classes for select
  using (auth.role() = 'authenticated');

create policy "classes_insert_admin"
  on public.classes for insert
  with check (public.is_admin());

create policy "classes_update_admin"
  on public.classes for update
  using (public.is_admin());

create policy "classes_delete_admin"
  on public.classes for delete
  using (public.is_admin());

-- ---------- learners policies ----------
create policy "learners_select_own_or_admin"
  on public.learners for select
  using (auth.uid() = id or public.is_admin());

create policy "learners_insert_own"
  on public.learners for insert
  with check (auth.uid() = id);

create policy "learners_update_own_or_admin"
  on public.learners for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "learners_delete_admin"
  on public.learners for delete
  using (public.is_admin());

-- ============================================================
-- Auto-create a profile row the moment someone signs up, always as
-- role = 'learner'. This runs as the Postgres superuser (SECURITY
-- DEFINER), bypassing RLS on purpose — it's the only way a profile
-- row is ever created, which is what stops a learner from simply
-- inserting their own row with role = 'admin'.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, "displayName", role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'learner'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
