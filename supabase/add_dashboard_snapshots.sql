-- Adds a small table for the Grade 9 Dashboard's "Save Snapshot" feature:
-- a point-in-time copy of the dashboard's aggregate numbers (overview
-- counts, pathway distribution, subject demand), saved only when an
-- admin deliberately clicks the button -- never a silent background
-- cache, the same pattern learners.apsLast/subjectGuidance already use.
-- Holds cohort-level aggregates only, never per-learner records.
-- snake_case, unquoted, matching profiles/classes/learners' own
-- table-naming style (an unquoted camelCase name would be silently
-- folded to all-lowercase by Postgres, breaking a JS sb.from() call
-- expecting the camelCase spelling back).
-- Safe to run on an existing database -- purely additive.

create table if not exists public.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  label text,
  data jsonb not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.dashboard_snapshots enable row level security;

drop policy if exists "dashboard_snapshots_select_admin" on public.dashboard_snapshots;
create policy "dashboard_snapshots_select_admin"
  on public.dashboard_snapshots for select
  using (public.is_admin());

drop policy if exists "dashboard_snapshots_insert_admin" on public.dashboard_snapshots;
create policy "dashboard_snapshots_insert_admin"
  on public.dashboard_snapshots for insert
  with check (public.is_admin());

drop policy if exists "dashboard_snapshots_delete_admin" on public.dashboard_snapshots;
create policy "dashboard_snapshots_delete_admin"
  on public.dashboard_snapshots for delete
  using (public.is_admin());
