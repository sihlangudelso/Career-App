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
-- the end of a term) -- mirrors how apsLast on `learners` is a
-- deliberate user-triggered snapshot, never a silent background
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
  -- Retired: written by the old 2-step Subject Guidance tool, which the
  -- Subject Choice Assessment ("subjectChoice" below) replaced. Nothing
  -- reads or writes it any more; the column is kept only so existing rows
  -- keep their data (dropping it would be destructive).
  "subjectGuidance" jsonb,
  -- Grade 9 Subject Choice Assessment answers only:
  -- { answers:{questionId:1-5}, completedAt, bankVersion }. The report is
  -- computed in the browser from these + current marks + personality
  -- results (see js/subject_choice_*.js). Added by
  -- supabase/add_subject_choice_assessment.sql.
  "subjectChoice" jsonb,
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
  -- How licenseStatus='active' was granted -- 'admin' (super admin
  -- activated this learner directly, persists regardless of class
  -- changes) or 'class' (granted by occupying a paid class seat, reverts
  -- automatically if that seat is given up -- see protect_license_status
  -- below). NULL for grandfathered/legacy rows with no real provenance.
  "licenseSource" text check ("licenseSource" in ('admin','class')),
  "apsLast" jsonb,
  "subjectMarks" jsonb,
  "grade9Report" jsonb,
  "workStyle" jsonb,
  "miniAssessment" jsonb,
  "intendedSubjects" text[] default '{}',
  "intendedMathType" text,
  "cellNumber" text,
  "displayName" text,
  email text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- ---------- courseRequirements / careerCourseLinks ----------
-- Reference data for js/course-links.js's "real degree programmes &
-- entry requirements" card -- loaded separately from a national course-
-- requirements dataset (see supabase/add_humanities_course_links.sql),
-- not hand-authored here. Column shape is a best-effort reconstruction
-- (see supabase/add_course_links_rls.sql for the full reasoning); only
-- matters for a brand-new install, since IF NOT EXISTS makes this a
-- no-op against an already-populated project.
create table if not exists public."courseRequirements" (
  id serial primary key,
  institution text,
  "courseName" text,
  faculty text,
  "apsScore" integer,
  "closingDate" text,
  "subjectRequirements" jsonb
);

create table if not exists public."careerCourseLinks" (
  id serial primary key,
  "careerId" text not null,
  "courseRequirementId" integer not null references public."courseRequirements"(id),
  "matchType" text,
  "matchedKeywords" text
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
alter table public."courseRequirements" enable row level security;
alter table public."careerCourseLinks"  enable row level security;
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

-- ---------- courseRequirements / careerCourseLinks policies ----------
-- Read-only reference data: every learner-facing route that reads it
-- already requires a real signed-in session, so authenticated-only is
-- the correct scope. No insert/update/delete policy for anyone -- new
-- course-link data is added by running a migration directly in the
-- Supabase SQL Editor as the project owner (bypasses RLS entirely),
-- never through the app.
create policy "course_requirements_select_authenticated"
  on public."courseRequirements" for select
  using (auth.role() = 'authenticated');

create policy "career_course_links_select_authenticated"
  on public."careerCourseLinks" for select
  using (auth.role() = 'authenticated');

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

-- licenseStatus must start 'trial' even on a learner's very first write --
-- protect_license_status (below) only fires on UPDATE, never INSERT, so
-- without this a learner's first-ever save could set 'active' directly.
create policy "learners_insert_own"
  on public.learners for insert
  with check (auth.uid() = id and "licenseStatus" = 'trial');

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
-- subjects, assessment results, joining a class) is unaffected. Two
-- responsibilities in one function (not two separate triggers) to avoid
-- a BEFORE-UPDATE multi-trigger ordering hazard, where whichever trigger
-- ran second could silently undo what the first one just decided.
create or replace function public.protect_license_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A class-granted licence tracks current class membership: if classId
  -- is changing (leaving, switching classes, or a class deletion
  -- cascading via ON DELETE SET NULL -- which fires this same trigger
  -- too) and the licence came from occupying that seat, revert it.
  -- Unconditional, including an admin-driven class change, since "no
  -- longer in a paid seat" should always mean "no longer licensed
  -- through that seat" regardless of who changed classId. Without this,
  -- join-then-leave would permanently bank a seat's worth of access
  -- while freeing the slot for someone else to repeat.
  if old."licenseSource" = 'class' and new."classId" is distinct from old."classId" then
    new."licenseStatus" := 'trial';
    new."licenseSource" := null;
    return new;
  end if;
  -- Otherwise, only an admin or the privileged class-join path (via its
  -- own escape hatch, kept separate from protect_class_id's
  -- app.allow_class_join so a future change to either privileged path
  -- can't silently widen the other's blast radius) may change this.
  if not public.is_admin()
     and coalesce(current_setting('app.allow_license_activation', true), 'false') <> 'true'
  then
    new."licenseStatus" := old."licenseStatus";
    new."licenseSource" := old."licenseSource";
  end if;
  return new;
end;
$$;

drop trigger if exists protect_license_status_trigger on public.learners;
create trigger protect_license_status_trigger
  before update on public.learners
  for each row execute function public.protect_license_status();

-- Same column-level-protection problem as licenseStatus above, for
-- classId: classes_select_authenticated hands every signed-in user the
-- full classes table (by design, so the learner-facing join-by-code flow
-- can match a typed code client-side), so without this a learner could
-- set their own classId to ANY class's id directly, skipping the "must
-- know the code" step and becoming visible to a class admin they have no
-- relationship to. A plain self-update can no longer change classId to a
-- new non-null value; only join_class_by_code() below (or an admin) can.
create or replace function public.protect_class_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin()
     and new."classId" is distinct from old."classId"
     and new."classId" is not null
     and coalesce(current_setting('app.allow_class_join', true), 'false') <> 'true'
  then
    new."classId" := old."classId";
  end if;
  return new;
end;
$$;

drop trigger if exists protect_class_id_trigger on public.learners;
create trigger protect_class_id_trigger
  before update on public.learners
  for each row execute function public.protect_class_id();

-- Looks a class up by its real code server-side and joins the CALLING
-- learner (auth.uid(), never a client-supplied id) to it -- the only way
-- to set a new classId now that the trigger above blocks a plain
-- self-update from doing it directly. Also enforces the seat limit and
-- activates the learner (licenseStatus/licenseSource) in the same
-- transaction -- joining with a valid code IS the payment proof, since
-- codes are only ever handed out after a school has paid for N seats.
create or replace function public.join_class_by_code(p_code text)
returns table(class_id uuid, class_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_class public.classes;
  active_count int;
begin
  -- `for update` locks this class row for the rest of the transaction,
  -- so a second learner racing for the same class's last seat blocks
  -- here until the first caller commits, then re-reads a fresh seat
  -- count that correctly includes that now-committed join -- this is
  -- what actually prevents overselling seats under concurrent joins.
  -- Different class codes lock different rows and never contend.
  select * into found_class from public.classes where upper(code) = upper(trim(p_code)) for update;
  if found_class.id is null then
    raise exception 'No class found with that code';
  end if;
  -- Both NULL and 0 mean "unlimited" -- matching the admin UI's own
  -- existing display convention (seatLimit||'∞'), which already treats a
  -- falsy value this way. Without matching it here, any class whose seat
  -- count was ever left blank would become a hard 0-seat class the
  -- instant this ships, indistinguishable from a genuinely full one.
  if found_class."seatLimit" is not null and found_class."seatLimit" > 0 then
    -- Excludes the caller's own row so a learner already active in this
    -- exact class, re-submitting the same code, is never blocked by
    -- their own existing seat.
    select count(*) into active_count from public.learners
      where "classId" = found_class.id and "licenseStatus" = 'active' and id <> auth.uid();
    if active_count >= found_class."seatLimit" then
      raise exception 'This class has reached its seat limit';
    end if;
  end if;
  -- set_config(...,true) scopes both bypass flags to this one
  -- transaction, never the session, so neither can leak into a later,
  -- unrelated query on a pooled connection.
  perform set_config('app.allow_class_join', 'true', true);
  perform set_config('app.allow_license_activation', 'true', true);
  update public.learners set "classId" = found_class.id, "licenseStatus" = 'active', "licenseSource" = 'class', "updatedAt" = now()
    where id = auth.uid();
  return query select found_class.id, found_class.name;
end;
$$;

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

-- ============================================================
-- Keeps profiles.email/"displayName" AND learners.email/"displayName"
-- in sync with auth.users whenever either changes -- not just at
-- signup. Without this, a learner changing their own name/email from
-- the My Profile page (which can only ever write auth.users --
-- profiles_update_admin_only blocks a learner from updating their own
-- profiles row directly) would leave profiles.email permanently stale,
-- silently breaking App.assignClassAdmin's email lookup and the
-- Classes & Licences class-admin display for that person. An UPDATE
-- against learners with no matching row (an admin/class_admin account
-- has none) is a no-op, not an error.
-- ============================================================
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    email = new.email,
    "displayName" = coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  where id = new.id;
  update public.learners set
    email = new.email,
    "displayName" = coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  where id = new.id;
  return new;
end;
$$;

-- The WHEN clause means this doesn't even fire for an auth.users touch
-- unrelated to email/metadata (e.g. a token refresh).
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.email is distinct from new.email or old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.handle_user_updated();
