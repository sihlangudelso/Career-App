-- Adds a "My Profile" page letting a learner update their own name,
-- email, cell number, and password.
--
-- Found while designing this: profiles.email/"displayName" are written
-- exactly once, at signup (handle_new_user()'s AFTER INSERT trigger),
-- and never updated again -- profiles_update_admin_only RLS means a
-- learner can't even update their own profiles row directly. Two
-- existing features already depend on profiles.email staying current:
-- App.assignClassAdmin's email lookup and the Classes & Licences
-- class-admin display (loadClassAdmins()). Letting a learner change
-- their auth email without fixing this would silently break "assign
-- class admin by email" for that exact person going forward.
--
-- Fixed with a new trigger, the same AFTER-INSERT pattern
-- handle_new_user() already uses, just extended to UPDATE -- not by
-- loosening RLS to let learners write their own profiles row (which
-- would need its own careful with-check to avoid also opening a
-- self-role-change path).
--
-- Safe to run on an existing database -- purely additive.

-- New, plain learner field -- not auth metadata, since (unlike name/
-- email) nothing anywhere needs to look a learner up by cell number.
alter table public.learners add column if not exists "cellNumber" text;

-- Keeps profiles.email/"displayName" AND learners.email/"displayName"
-- in sync with the canonical source (auth.users) whenever either
-- changes, not just at signup. An UPDATE against learners with no
-- matching row (e.g. an admin/class_admin account, which has no
-- learners row at all) is a no-op, not an error.
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

-- The WHEN clause means this trigger doesn't even fire -- let alone run
-- two UPDATEs -- for an auth.users touch unrelated to email/metadata
-- (e.g. a token refresh touching last_sign_in_at).
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row
  when (old.email is distinct from new.email or old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.handle_user_updated();
