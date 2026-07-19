-- Miiix database migration 0006: governed ingredient master data
-- Extends the catalog without mixing public defaults with user inventory facts.

begin;

alter table public.data_sources
  add column retrieved_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by text;

alter table public.ingredients
  add column scientific_name text,
  add column default_amount_mode text,
  add column default_purchase_quantity numeric(12, 3)
    check (default_purchase_quantity is null or default_purchase_quantity > 0),
  add column data_version text not null default 'legacy',
  add column reviewed_by text,
  add column reviewed_at timestamptz;

update public.ingredients ingredient
set default_amount_mode = coalesce(
  (
    select unit.dimension
    from public.units unit
    where unit.id = ingredient.default_unit_id
  ),
  'mass'
);

alter table public.ingredients
  alter column default_amount_mode set default 'mass',
  alter column default_amount_mode set not null,
  add constraint ingredients_default_amount_mode_check check (
    default_amount_mode in ('count', 'mass', 'volume', 'package')
  );

create or replace function public.validate_ingredient_default_amount_mode()
returns trigger
language plpgsql
as $$
declare
  expected_dimension text;
begin
  if new.default_unit_id is null then
    return new;
  end if;

  select dimension into expected_dimension
  from public.units
  where id = new.default_unit_id;

  if expected_dimension is null or new.default_amount_mode <> expected_dimension then
    raise exception 'ingredient default amount mode must match the default unit dimension';
  end if;
  return new;
end;
$$;

create trigger ingredients_validate_default_amount_mode
before insert or update of default_unit_id, default_amount_mode on public.ingredients
for each row execute function public.validate_ingredient_default_amount_mode();

create unique index ingredients_active_name_zh_unique_idx
  on public.ingredients(lower(canonical_name_zh))
  where status = 'active';

alter table public.ingredient_aliases
  drop constraint if exists ingredient_aliases_alias_type_check;

alter table public.ingredient_aliases
  add constraint ingredient_aliases_alias_type_check check (
    alias_type in ('common', 'regional', 'retail', 'ocr', 'translation', 'external_model', 'recipe_phrase')
  ),
  add column region_code text,
  add column reviewed_by text,
  add column reviewed_at timestamptz;

create unique index ingredient_alias_approved_unique_idx
  on public.ingredient_aliases(locale, normalized_alias)
  where review_status = 'approved';

alter table public.ingredient_storage_profiles
  drop constraint if exists ingredient_storage_profiles_shelf_life_days_check,
  drop constraint if exists ingredient_storage_profiles_freshness_warning_days_check,
  drop constraint if exists ingredient_storage_profiles_ingredient_id_storage_method_id_key,
  alter column shelf_life_days drop not null,
  add column recommended_min_days integer,
  add column recommended_max_days integer,
  add column region_code text not null default 'CN',
  add column environment_tags text[] not null default '{}'::text[],
  add column food_state text not null default 'unspecified',
  add column packaging_state text not null default 'unpackaged',
  add column endpoint text not null default 'quality'
    check (endpoint in ('safety', 'quality', 'package_label')),
  add column evidence_key text,
  add column is_default boolean not null default false,
  add column reviewed_by text,
  add column reviewed_at timestamptz,
  add constraint ingredient_storage_shelf_life_positive check (
    shelf_life_days is null or shelf_life_days > 0
  ),
  add constraint ingredient_storage_min_days_positive check (
    recommended_min_days is null or recommended_min_days > 0
  ),
  add constraint ingredient_storage_max_days_positive check (
    recommended_max_days is null or recommended_max_days > 0
  ),
  add constraint ingredient_storage_day_range check (
    recommended_min_days is null
    or recommended_max_days is null
    or recommended_min_days <= recommended_max_days
  ),
  add constraint ingredient_storage_warning_range check (
    freshness_warning_days is null
    or freshness_warning_days >= 0
    and (
      coalesce(shelf_life_days, recommended_max_days) is null
      or freshness_warning_days <= coalesce(shelf_life_days, recommended_max_days)
    )
  ),
  add constraint ingredient_storage_context_unique unique (
    ingredient_id,
    storage_method_id,
    region_code,
    food_state,
    packaging_state
  );

create unique index ingredient_one_default_storage_idx
  on public.ingredient_storage_profiles(ingredient_id)
  where is_default;

create table public.ingredient_supported_units (
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (ingredient_id, unit_id)
);

insert into public.ingredient_supported_units(ingredient_id, unit_id)
select id, default_unit_id
from public.ingredients
where default_unit_id is not null
on conflict do nothing;

alter table public.ingredient_supported_units enable row level security;

create policy catalog_read_supported_units on public.ingredient_supported_units
for select using (
  exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_supported_units.ingredient_id
      and ingredient.status = 'active'
  )
);

alter table public.nutrition_profiles
  add column data_classification text not null default 'not_measured'
    check (data_classification in ('analytical', 'calculated', 'borrowed', 'estimated', 'not_measured')),
  add column food_state text not null default 'unspecified',
  add column source_record_id text,
  add column source_release text,
  add column external_mapping_id uuid references public.external_ingredient_mappings(id) on delete set null,
  add column match_type text not null default 'none'
    check (match_type in ('exact', 'representative', 'none')),
  add column reviewed_by text,
  add column reviewed_at timestamptz,
  add constraint nutrition_approved_source_required check (
    review_status <> 'approved'
    or (
      source_id is not null
      and source_record_id is not null
      and source_release is not null
      and external_mapping_id is not null
      and match_type = 'exact'
      and data_classification <> 'not_measured'
    )
  );

alter table public.ingredient_assets
  add column provider_asset_id text,
  add column alt_text text,
  add column original_url text,
  add column processed_url text,
  add column license_code text not null default 'UNKNOWN',
  add column license_url text,
  add column license_status text not null default 'pending'
    check (license_status in ('approved', 'approved_for_prototype', 'pending', 'rejected')),
  add column rights_status text not null default 'unknown'
    check (rights_status in ('unknown', 'research_only', 'verified', 'restricted')),
  add column processing_status text not null default 'pending'
    check (processing_status in ('original', 'pending', 'processed', 'failed', 'placeholder')),
  add column source_sha256 text,
  add column processed_sha256 text,
  add column transform_log text[] not null default '{}'::text[],
  add column style_consistency text not null default 'needs_review'
    check (style_consistency in ('prototype_placeholder', 'consistent', 'needs_review')),
  add column ai_generation jsonb,
  add column subject_match_reviewed boolean not null default false,
  add column rights_reviewed boolean not null default false,
  add column reviewed_by text,
  add column reviewed_at timestamptz,
  add column updated_at timestamptz not null default now();

drop policy if exists catalog_read_ingredient_assets on public.ingredient_assets;

create policy catalog_read_ingredient_assets on public.ingredient_assets
for select using (
  review_status = 'approved'
  and license_status = 'approved'
  and rights_status = 'verified'
  and rights_reviewed
  and subject_match_reviewed
  and nullif(btrim(alt_text), '') is not null
  and exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_assets.ingredient_id and ingredient.status = 'active'
  )
);

alter table public.external_ingredient_mappings
  drop constraint if exists external_ingredient_mappings_match_type_check;

alter table public.external_ingredient_mappings
  add constraint external_ingredient_mappings_match_type_check check (
    match_type in ('exact', 'alias', 'representative', 'broader', 'narrower', 'manual', 'related')
  ),
  add column source_id uuid references public.data_sources(id) on delete set null,
  add column reviewed_by text,
  add column reviewed_at timestamptz,
  add constraint external_mapping_approved_source_required check (
    review_status <> 'approved' or source_id is not null
  );

create or replace function public.validate_approved_nutrition_mapping()
returns trigger
language plpgsql
as $$
begin
  if new.review_status <> 'approved' then
    return new;
  end if;

  if not exists (
    select 1
    from public.external_ingredient_mappings mapping
    where mapping.id = new.external_mapping_id
      and mapping.ingredient_id = new.ingredient_id
      and mapping.source_id = new.source_id
      and mapping.review_status = 'approved'
      and mapping.match_type = 'exact'
  ) then
    raise exception 'approved nutrition requires an approved exact mapping for the same ingredient and source';
  end if;
  return new;
end;
$$;

create trigger nutrition_profiles_validate_approved_mapping
before insert or update of ingredient_id, source_id, external_mapping_id, review_status, match_type
on public.nutrition_profiles
for each row execute function public.validate_approved_nutrition_mapping();

create trigger ingredient_assets_set_updated_at
before update on public.ingredient_assets
for each row execute function public.set_updated_at();

commit;
