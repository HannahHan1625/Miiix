-- Miiix database migration 0005: repository adapter support
-- Adds portable metadata and idempotency fields used by local and cloud adapters.

begin;

alter table public.recipes
  add column metadata jsonb not null default '{}'::jsonb;

alter table public.meal_plans
  add column metadata jsonb not null default '{}'::jsonb;

alter table public.cooking_sessions
  add column idempotency_key text;

update public.cooking_sessions
set idempotency_key = 'legacy:' || id::text
where idempotency_key is null;

alter table public.cooking_sessions
  alter column idempotency_key set not null;

create unique index cooking_sessions_user_idempotency_idx
  on public.cooking_sessions(user_id, idempotency_key);

commit;
