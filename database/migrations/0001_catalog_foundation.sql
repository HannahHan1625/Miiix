-- Miiix database migration 0001: canonical catalog foundation
-- Target: Supabase PostgreSQL

begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  dataset_name text not null,
  version text not null,
  source_url text,
  license text,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (provider, dataset_name, version)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_zh text not null,
  name_en text,
  dimension text not null check (dimension in ('count', 'mass', 'volume', 'package')),
  base_factor numeric(14, 6) check (base_factor is null or base_factor > 0),
  created_at timestamptz not null default now()
);

create table public.food_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.food_categories(id) on delete restrict,
  slug text not null unique,
  name_zh text not null,
  name_en text,
  level smallint not null check (level between 1 and 3),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_categories_parent_idx on public.food_categories(parent_id, sort_order);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  canonical_name_zh text not null,
  canonical_name_en text,
  ingredient_kind text not null check (
    ingredient_kind in ('raw', 'processed', 'condiment', 'beverage', 'dish_component')
  ),
  default_unit_id uuid references public.units(id) on delete restrict,
  parent_ingredient_id uuid references public.ingredients(id) on delete set null,
  source_id uuid references public.data_sources(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ingredients_name_zh_idx on public.ingredients(canonical_name_zh);
create index ingredients_name_en_idx on public.ingredients(canonical_name_en);
create index ingredients_status_idx on public.ingredients(status);

create table public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  locale text not null default 'zh-CN',
  alias text not null,
  normalized_alias text not null,
  alias_type text not null default 'common' check (
    alias_type in ('common', 'regional', 'retail', 'ocr', 'translation')
  ),
  confidence numeric(5, 4) not null default 1 check (confidence between 0 and 1),
  source_id uuid references public.data_sources(id) on delete set null,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  unique (locale, normalized_alias, ingredient_id)
);

create index ingredient_alias_lookup_idx
  on public.ingredient_aliases(locale, normalized_alias, review_status);

create table public.ingredient_category_memberships (
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  category_id uuid not null references public.food_categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (ingredient_id, category_id)
);

create unique index ingredient_one_primary_category_idx
  on public.ingredient_category_memberships(ingredient_id)
  where is_primary;

create table public.storage_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_zh text not null,
  name_en text,
  temperature_min_c numeric(5, 2),
  temperature_max_c numeric(5, 2),
  requires_dark boolean not null default false,
  requires_dry boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    temperature_min_c is null
    or temperature_max_c is null
    or temperature_min_c <= temperature_max_c
  )
);

create table public.ingredient_storage_profiles (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  storage_method_id uuid not null references public.storage_methods(id) on delete restrict,
  shelf_life_days integer not null check (shelf_life_days > 0),
  after_opening_days integer check (after_opening_days is null or after_opening_days > 0),
  freshness_warning_days integer check (
    freshness_warning_days is null
    or freshness_warning_days between 0 and shelf_life_days
  ),
  instructions text,
  source_id uuid references public.data_sources(id) on delete set null,
  confidence numeric(5, 4) not null default 1 check (confidence between 0 and 1),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ingredient_id, storage_method_id)
);

create table public.ingredient_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  from_unit_id uuid not null references public.units(id) on delete restrict,
  to_unit_id uuid not null references public.units(id) on delete restrict,
  factor numeric(14, 6) not null check (factor > 0),
  source_id uuid references public.data_sources(id) on delete set null,
  confidence numeric(5, 4) not null default 1 check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (ingredient_id, from_unit_id, to_unit_id),
  check (from_unit_id <> to_unit_id)
);

create table public.nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  basis_quantity numeric(12, 3) not null default 100 check (basis_quantity > 0),
  basis_unit_id uuid not null references public.units(id) on delete restrict,
  calories_kcal numeric(10, 2) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(10, 2) check (protein_g is null or protein_g >= 0),
  fat_g numeric(10, 2) check (fat_g is null or fat_g >= 0),
  carbohydrate_g numeric(10, 2) check (carbohydrate_g is null or carbohydrate_g >= 0),
  fiber_g numeric(10, 2) check (fiber_g is null or fiber_g >= 0),
  source_id uuid references public.data_sources(id) on delete set null,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  created_at timestamptz not null default now(),
  unique (ingredient_id, source_id)
);

create table public.ingredient_assets (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  asset_uri text not null,
  asset_type text not null default 'cutout' check (
    asset_type in ('source_photo', 'cutout', 'thumbnail')
  ),
  background_removed boolean not null default false,
  outline_applied boolean not null default false,
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  source_url text,
  license text,
  attribution text,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index ingredient_one_primary_asset_idx
  on public.ingredient_assets(ingredient_id)
  where is_primary and review_status = 'approved';

create table public.kitchen_tools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_zh text not null,
  name_en text,
  description text,
  asset_uri text,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tool_capabilities (
  id uuid primary key default gen_random_uuid(),
  tool_id uuid not null references public.kitchen_tools(id) on delete cascade,
  method_code text not null,
  method_name_zh text not null,
  min_minutes integer check (min_minutes is null or min_minutes >= 0),
  max_minutes integer check (max_minutes is null or max_minutes >= min_minutes),
  metadata jsonb not null default '{}'::jsonb,
  unique (tool_id, method_code)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  cuisine_code text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  minutes integer not null check (minutes > 0),
  servings numeric(6, 2) not null default 1 check (servings > 0),
  calories_kcal numeric(10, 2) check (calories_kcal is null or calories_kcal >= 0),
  image_uri text,
  source_type text not null default 'curated' check (
    source_type in ('curated', 'generated', 'imported')
  ),
  source_id uuid references public.data_sources(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  role text not null check (role in ('main', 'seasoning', 'optional', 'garnish')),
  quantity numeric(12, 3) check (quantity is null or quantity > 0),
  unit_id uuid references public.units(id) on delete restrict,
  preparation text,
  substitution_group text,
  sort_order integer not null default 0,
  unique (recipe_id, ingredient_id, role, sort_order)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  instruction text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  media_uri text,
  unique (recipe_id, step_number)
);

create table public.recipe_tools (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  tool_id uuid not null references public.kitchen_tools(id) on delete restrict,
  is_required boolean not null default true,
  primary key (recipe_id, tool_id)
);

create trigger food_categories_set_updated_at
before update on public.food_categories
for each row execute function public.set_updated_at();

create trigger ingredients_set_updated_at
before update on public.ingredients
for each row execute function public.set_updated_at();

create trigger storage_profiles_set_updated_at
before update on public.ingredient_storage_profiles
for each row execute function public.set_updated_at();

create trigger kitchen_tools_set_updated_at
before update on public.kitchen_tools
for each row execute function public.set_updated_at();

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

insert into public.units (code, name_zh, name_en, dimension, base_factor)
values
  ('g', '克', 'gram', 'mass', 1),
  ('kg', '千克', 'kilogram', 'mass', 1000),
  ('ml', '毫升', 'milliliter', 'volume', 1),
  ('l', '升', 'liter', 'volume', 1000),
  ('piece', '个', 'piece', 'count', 1),
  ('portion', '份', 'portion', 'package', 1),
  ('pack', '包', 'pack', 'package', 1),
  ('bottle', '瓶', 'bottle', 'package', 1)
on conflict (code) do nothing;

insert into public.storage_methods (
  code,
  name_zh,
  name_en,
  temperature_min_c,
  temperature_max_c,
  requires_dark,
  requires_dry
)
values
  ('refrigerated', '冷藏', 'refrigerated', 0, 4, false, false),
  ('frozen', '冷冻', 'frozen', -24, -18, false, false),
  ('room_temperature', '室温', 'room temperature', 10, 30, false, false),
  ('cool_dark', '阴凉避光', 'cool and dark', 5, 25, true, false),
  ('dry_dark', '避光防潮', 'dry and dark', 5, 25, true, true)
on conflict (code) do nothing;

commit;
