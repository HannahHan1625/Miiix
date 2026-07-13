-- Miiix database migration 0002: private user operations
-- Target: Supabase PostgreSQL. User ids are Supabase Auth user ids.

begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'zh-CN',
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table public.recognition_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_type text not null check (input_type in ('photo', 'online_screenshot', 'receipt', 'manual')),
  input_asset_uri text,
  provider text,
  model_version text,
  status text not null default 'queued' check (
    status in ('queued', 'processing', 'needs_review', 'completed', 'failed')
  ),
  raw_output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recognition_jobs_user_created_idx
  on public.recognition_jobs(user_id, created_at desc);

create table public.recognition_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.recognition_jobs(id) on delete cascade,
  raw_label text not null,
  ingredient_id uuid references public.ingredients(id) on delete set null,
  corrected_ingredient_id uuid references public.ingredients(id) on delete set null,
  confidence numeric(5, 4) check (confidence is null or confidence between 0 and 1),
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'corrected', 'ignored')
  ),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index recognition_candidates_job_idx
  on public.recognition_candidates(job_id, sort_order);

create table public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity_initial numeric(12, 3) not null check (quantity_initial > 0),
  quantity_remaining numeric(12, 3) not null check (quantity_remaining >= 0),
  unit_id uuid not null references public.units(id) on delete restrict,
  storage_method_id uuid references public.storage_methods(id) on delete restrict,
  storage_location text,
  purchased_at timestamptz,
  opened_at timestamptz,
  expires_at timestamptz,
  price_amount numeric(12, 2) check (price_amount is null or price_amount >= 0),
  currency char(3) not null default 'CNY',
  recognition_job_id uuid references public.recognition_jobs(id) on delete set null,
  source_type text not null default 'manual' check (
    source_type in ('manual', 'photo', 'online_screenshot', 'receipt', 'import')
  ),
  note text,
  custom_tags text[] not null default '{}',
  status text not null default 'available' check (
    status in ('available', 'consumed', 'wasted', 'discarded')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (opened_at is null or purchased_at is null or opened_at >= purchased_at)
);

create index inventory_lots_user_status_idx
  on public.inventory_lots(user_id, status, expires_at);
create index inventory_lots_ingredient_idx
  on public.inventory_lots(user_id, ingredient_id, status);

create or replace function public.initialize_inventory_lot_balance()
returns trigger
language plpgsql
as $$
begin
  new.quantity_remaining = new.quantity_initial;
  new.status = 'available';
  return new;
end;
$$;

create trigger inventory_lots_initialize_balance
before insert on public.inventory_lots
for each row execute function public.initialize_inventory_lot_balance();

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  planned_date date not null,
  source text not null,
  status text not null default 'planned' check (
    status in ('planned', 'cooking', 'completed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_plans_user_date_idx
  on public.meal_plans(user_id, planned_date desc);

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  servings numeric(6, 2) not null default 1 check (servings > 0),
  sort_order integer not null default 0,
  unique (meal_plan_id, recipe_id)
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  title text not null,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  required_quantity numeric(12, 3) not null check (required_quantity > 0),
  owned_quantity numeric(12, 3) not null default 0 check (owned_quantity >= 0),
  unit_id uuid not null references public.units(id) on delete restrict,
  reason text,
  status text not null default 'needed' check (
    status in ('needed', 'in_cart', 'purchased', 'skipped')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shopping_list_id, ingredient_id, unit_id)
);

create table public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete restrict,
  meal_plan_item_id uuid references public.meal_plan_items(id) on delete set null,
  status text not null default 'started' check (
    status in ('started', 'completed', 'abandoned')
  ),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  rating smallint check (rating is null or rating between 1 and 5),
  photo_asset_uri text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (completed_at is null or completed_at >= started_at)
);

create index cooking_sessions_user_completed_idx
  on public.cooking_sessions(user_id, completed_at desc);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  inventory_lot_id uuid not null references public.inventory_lots(id) on delete restrict,
  cooking_session_id uuid references public.cooking_sessions(id) on delete set null,
  transaction_type text not null check (
    transaction_type in ('purchase', 'consume', 'waste', 'adjust_in', 'adjust_out')
  ),
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_id uuid not null references public.units(id) on delete restrict,
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, idempotency_key)
);

create index inventory_transactions_lot_time_idx
  on public.inventory_transactions(inventory_lot_id, occurred_at desc);

create or replace function public.record_initial_inventory_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.inventory_transactions (
    user_id,
    inventory_lot_id,
    transaction_type,
    quantity,
    unit_id,
    idempotency_key,
    occurred_at,
    note
  )
  values (
    new.user_id,
    new.id,
    'purchase',
    new.quantity_initial,
    new.unit_id,
    'initial:' || new.id::text,
    coalesce(new.purchased_at, new.created_at),
    'Initial inventory lot balance'
  );
  return new;
end;
$$;

create trigger inventory_lots_record_initial_purchase
after insert on public.inventory_lots
for each row execute function public.record_initial_inventory_purchase();

create or replace function public.apply_inventory_transaction(
  p_inventory_lot_id uuid,
  p_transaction_type text,
  p_quantity numeric,
  p_unit_id uuid,
  p_idempotency_key text,
  p_occurred_at timestamptz default now(),
  p_cooking_session_id uuid default null,
  p_note text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.inventory_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  lot public.inventory_lots%rowtype;
  existing_transaction public.inventory_transactions%rowtype;
  created_transaction public.inventory_transactions%rowtype;
  signed_quantity numeric;
  next_quantity numeric;
  next_status text;
begin
  if p_transaction_type not in ('consume', 'waste', 'adjust_in', 'adjust_out') then
    raise exception 'Unsupported inventory transaction type: %', p_transaction_type;
  end if;
  if p_quantity <= 0 then
    raise exception 'Inventory transaction quantity must be positive';
  end if;
  if nullif(trim(p_idempotency_key), '') is null then
    raise exception 'Inventory transaction idempotency key is required';
  end if;
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  select * into lot
  from public.inventory_lots
  where id = p_inventory_lot_id
  for update;

  if not found then
    raise exception 'Inventory lot not found: %', p_inventory_lot_id;
  end if;
  if lot.user_id <> auth.uid() then
    raise exception 'Inventory lot does not belong to the current user';
  end if;

  select * into existing_transaction
  from public.inventory_transactions
  where user_id = lot.user_id and idempotency_key = p_idempotency_key;

  if found then
    return existing_transaction;
  end if;

  if lot.unit_id <> p_unit_id then
    raise exception 'Transaction unit must match the inventory lot unit';
  end if;

  signed_quantity := case
    when p_transaction_type = 'adjust_in' then p_quantity
    else -p_quantity
  end;
  next_quantity := lot.quantity_remaining + signed_quantity;

  if next_quantity < 0 then
    raise exception 'Inventory transaction would make the lot balance negative';
  end if;

  next_status := case
    when next_quantity > 0 then 'available'
    when p_transaction_type = 'waste' then 'wasted'
    when p_transaction_type = 'consume' then 'consumed'
    else 'discarded'
  end;

  update public.inventory_lots
  set quantity_remaining = next_quantity,
      status = next_status
  where id = lot.id;

  insert into public.inventory_transactions (
    user_id,
    inventory_lot_id,
    cooking_session_id,
    transaction_type,
    quantity,
    unit_id,
    idempotency_key,
    occurred_at,
    note,
    metadata
  )
  values (
    lot.user_id,
    lot.id,
    p_cooking_session_id,
    p_transaction_type,
    p_quantity,
    p_unit_id,
    p_idempotency_key,
    p_occurred_at,
    p_note,
    p_metadata
  )
  returning * into created_transaction;

  return created_transaction;
end;
$$;

create table public.recipe_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null,
  source text not null default 'explicit' check (source in ('explicit', 'learned', 'system')),
  confidence numeric(5, 4) not null default 1 check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, preference_key)
);

create table public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  target_type text not null,
  target_id uuid,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index user_events_user_time_idx
  on public.user_events(user_id, occurred_at desc);
create index user_events_target_idx
  on public.user_events(target_type, target_id, occurred_at desc);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger recognition_jobs_set_updated_at
before update on public.recognition_jobs
for each row execute function public.set_updated_at();

create trigger inventory_lots_set_updated_at
before update on public.inventory_lots
for each row execute function public.set_updated_at();

create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row execute function public.set_updated_at();

create trigger shopping_lists_set_updated_at
before update on public.shopping_lists
for each row execute function public.set_updated_at();

create trigger shopping_list_items_set_updated_at
before update on public.shopping_list_items
for each row execute function public.set_updated_at();

create trigger cooking_sessions_set_updated_at
before update on public.cooking_sessions
for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

commit;
