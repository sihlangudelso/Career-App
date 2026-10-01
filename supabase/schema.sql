create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  "displayName" text,
  -- 'admin' is the "super admin" tier (creates classes, assigns class
  -- admins); 'class_admin' is a narrower tier scoped to the class(es)
  -- they're assigned via classes.classAdminId -- see owns_class() below.
  role text not null default 'learner' check (role in ('learner','admin','class_admin')),
  "createdAt" timestamptz not null default now()
);

-- ---------- classes ----------
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  "seatLimit" int,
  "createdBy" uuid references auth.users(id),
  -- The class_admin who manages this class (nullable -- an unassigned
  -- class is visible only to super admins, which is safe-by-default for
  -- both pre-existing and newly-created classes). Set only by a super
  -- admin, via App.assignClassAdmin().
  "classAdminId" uuid references auth.users(id),
  "createdAt" timestamptz not null default now()
);

-- ---------- dashboard_snapshots ----------
-- A point-in-time copy of the Grade 9 Dashboard's aggregate numbers,
-- saved only when an admin deliberately clicks "Save Snapshot" (e.g. at
-- the end of a term) -- mirrors how apsLast/subjectGuidance on `learners`
-- are deliberate user-triggered snapshots, never a silent background
-- cache. `data` holds only cohort-level aggregates (overview counts,
-- pathway distribution, subject demand) -- never per-learner records, so
-- this table carries no additional learner PII beyond what `learners`
-- itself already has. snake_case, unquoted, matching profiles/classes/
-- learners' own table-naming style (Postgres folds an unquoted camelCase
-- name to all-lowercase, which would silently break a JS sb.from() call
-- expecting the camelCase spelling back).
create table if not exists public.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  label text,
  data jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
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
  "subjectMarks" jsonb,
  "grade9Report" jsonb,
  "workStyle" jsonb,
  "miniAssessment" jsonb,
  "intendedSubjects" text[] default '{}',
  "intendedMathType" text,
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
alter table public.dashboard_snapshots enable row level security;

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

-- ---------- dashboard_snapshots policies ----------
-- Admin-only in every direction (unlike classes, which any authenticated
-- user can read) -- this is aggregate cohort data with no reason for a
-- learner account to ever see it.
create policy "dashboard_snapshots_select_admin"
  on public.dashboard_snapshots for select
  using (public.is_admin());

create policy "dashboard_snapshots_insert_admin"
  on public.dashboard_snapshots for insert
  with check (public.is_admin());

create policy "dashboard_snapshots_delete_admin"
  on public.dashboard_snapshots for delete
  using (public.is_admin());

-- ---------- learners policies ----------
create policy "learners_select_own_or_admin"
  on public.learners for select
  using (auth.uid() = id or public.is_admin() or public.owns_class("classId"));

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

-- RLS above is row-scoped only (auth.uid()=id), not column-scoped --
-- Postgres has no per-column RLS, so without this trigger a learner
-- could self-grant licenseStatus='active' on their own row via a direct
-- Supabase call. A non-admin update silently keeps the old value instead
-- of erroring, so every other legitimate self-update (favourites,
-- subjects, assessment results, joining a class) is unaffected.
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
