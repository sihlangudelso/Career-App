-- Makes learners.licenseStatus actually gate access, instead of being
-- purely cosmetic (confirmed before this migration: zero code paths
-- anywhere blocked anything based on it). Two activation paths: a super
-- admin manually activates an individual learner after they pay
-- (App.toggleLicense, already built, already super-admin-only), or a
-- learner joins a class with a valid code (the code is only ever handed
-- out after a school has paid for N seats, so joining IS the payment
-- proof -- which means the seat limit must now actually be enforced).
--
-- Adversarially reviewed before being written: two real defects in the
-- obvious version of this are already fixed below, not left as
-- follow-ups -- see the comments at the grandfather migration (bottom)
-- and at protect_license_status() (the class-leave revert).
--
-- Safe to run on an existing database -- purely additive except for the
-- one policy replacement and the one-time grandfather UPDATE, both
-- clearly marked below.

-- Tracks HOW a learner became active, so an admin-granted licence
-- (persists regardless of class changes) can be told apart from a
-- class-seat-granted one (must revert if that seat is given up). NULL
-- for grandfathered rows -- never auto-reverted, the safest default for
-- an account with no real provenance to track.
alter table public.learners add column if not exists "licenseSource" text check ("licenseSource" in ('admin','class'));

-- Replaces protect_license_status() and (re)creates the trigger that
-- calls it -- written defensively to not assume an earlier migration
-- (add_license_status_protection.sql) already created either one, since
-- `alter table ... disable trigger <name>` errors outright (SQLSTATE
-- 42704) if that exact trigger doesn't already exist, unlike `drop
-- trigger if exists`. Two responsibilities in one function, deliberately
-- not two separate triggers, to avoid a BEFORE-UPDATE multi-trigger
-- ordering hazard: if the revert rule and the protection rule lived in
-- separate triggers, whichever ran second could undo what the first one
-- just decided, depending purely on trigger-name alphabetical order.
create or replace function public.protect_license_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A class-granted licence tracks current class membership. If this
  -- learner's classId is changing (an explicit leaveClass, switching
  -- classes, or a class being deleted -- Postgres fires this same
  -- BEFORE UPDATE trigger for an ON DELETE SET NULL cascade too, so this
  -- one rule covers both paths with no separate client-side logic
  -- needed) and their licence came from occupying that seat, revert it.
  -- Unconditional -- including an admin-driven class change -- because
  -- "no longer in a paid seat" should always mean "no longer licensed
  -- through that seat," regardless of who changed classId. Without this,
  -- join-then-leave would let a learner permanently bank a seat's worth
  -- of access while freeing the slot for someone else to repeat.
  if old."licenseSource" = 'class' and new."classId" is distinct from old."classId" then
    new."licenseStatus" := 'trial';
    new."licenseSource" := null;
    return new;
  end if;
  -- Otherwise, only an admin or the privileged class-join path (via its
  -- own distinctly-named escape hatch -- kept separate from
  -- protect_class_id's app.allow_class_join so a future change to either
  -- privileged path can't silently widen the other's blast radius) may
  -- change this column at all.
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

-- Replaces the existing join_class_by_code(): now enforces the seat
-- limit and activates the learner in the same transaction.
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
  -- what actually prevents overselling seats under concurrent joins
  -- (e.g. a whole class submitting a code around the same moment).
  -- Different class codes lock different rows and never contend.
  select * into found_class from public.classes where upper(code) = upper(trim(p_code)) for update;
  if found_class.id is null then
    raise exception 'No class found with that code';
  end if;
  -- Both NULL and 0 mean "unlimited" -- matching the admin UI's own
  -- pre-existing display convention (seatLimit||'∞'), which already
  -- treats a falsy value this way. Without matching it here, any class
  -- whose seat count was ever left blank would become a hard 0-seat
  -- class the instant this ships, indistinguishable from genuinely full.
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
  perform set_config('app.allow_class_join', 'true', true);
  perform set_config('app.allow_license_activation', 'true', true);
  update public.learners set "classId" = found_class.id, "licenseStatus" = 'active', "licenseSource" = 'class', "updatedAt" = now()
    where id = auth.uid();
  return query select found_class.id, found_class.name;
end;
$$;

-- Closes a separate gap: protect_license_status only fires on UPDATE,
-- never INSERT, so a learner's very first write (before any row exists)
-- could set licenseStatus='active' directly via a crafted upsert -- the
-- column's own CHECK permits 'active' as a value and nothing else ever
-- blocked it on that path. Confirmed safe against every real usage: the
-- only code that ever creates a learner's first row always explicitly
-- sends licenseStatus:'trial', and an upsert that hits the existing-row
-- conflict path is governed by the UPDATE policy instead, so this never
-- affects a later save for an already-active learner.
drop policy if exists "learners_insert_own" on public.learners;
create policy "learners_insert_own"
  on public.learners for insert
  with check (auth.uid() = id and "licenseStatus" = 'trial');

-- ============================================================
-- Run ONCE. Grandfathers every learner who already exists as of today to
-- 'active', so nobody currently using the app is locked out by this
-- change -- only accounts created from this point forward start 'trial'
-- and are subject to the new gate.
--
-- The trigger is explicitly disabled for this one statement on purpose:
-- auth.uid() is NULL in the Supabase SQL Editor (there is no PostgREST
-- request/JWT to read it from), so protect_license_status's is_admin()
-- check would evaluate false here too, just as it would for any other
-- non-admin caller -- without disabling it, this UPDATE would report
-- success while silently changing nothing, reverted by the very trigger
-- it was meant to run alongside.
-- ============================================================
alter table public.learners disable trigger protect_license_status_trigger;
update public.learners set "licenseStatus" = 'active' where "licenseStatus" = 'trial';
alter table public.learners enable trigger protect_license_status_trigger;
