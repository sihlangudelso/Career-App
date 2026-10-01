-- Closes a gap found in the pre-launch audit: learners_update_own_or_admin
-- lets a learner set their own classId to ANY class's id directly (e.g.
-- via saveLearner({classId:'<any-uuid>'}) from devtools), skipping the
-- "must actually know the code" step entirely -- classes_select_authenticated
-- already hands every signed-in user the full classes table (by design,
-- so the old client-side code-matching in App.joinClass() could work),
-- so any learner could pick any class's id, including another school's,
-- and become visible to a class admin they have no relationship to.
--
-- Fix: classId changes to a NEW non-null value are now blocked for a
-- plain self-update (a BEFORE UPDATE trigger, the same pattern already
-- used for licenseStatus -- RLS alone can't express "this column, but
-- only via this one code path"), except through the new
-- join_class_by_code() RPC below, which looks the class up server-side
-- by its actual code and updates the CALLING learner's own row --
-- auth.uid() inside a SECURITY DEFINER function is still the real caller,
-- so this can never be used to move a different learner into a class.
-- Leaving a class (classId -> null) is unaffected; so is any admin
-- action (is_admin() is still unconditionally allowed).
-- Safe to run on an existing database -- purely additive.

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

-- set_config(..., true) scopes the bypass flag to this one transaction
-- only (never the session), so it can't leak into some later, unrelated
-- query on a pooled connection.
create or replace function public.join_class_by_code(p_code text)
returns table(class_id uuid, class_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  found_class public.classes;
begin
  select * into found_class from public.classes where upper(code) = upper(trim(p_code));
  if found_class.id is null then
    raise exception 'No class found with that code';
  end if;
  perform set_config('app.allow_class_join', 'true', true);
  update public.learners set "classId" = found_class.id, "updatedAt" = now() where id = auth.uid();
  return query select found_class.id, found_class.name;
end;
$$;
