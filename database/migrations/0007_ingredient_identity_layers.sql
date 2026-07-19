-- Miiix database migration 0007: ingredient identity layers
-- Separates material concepts, stable variants, physical forms, and user-owned lots
-- without replacing the v0.4.2 ingredient UUIDs or compatibility columns.

begin;

create table public.ingredient_forms (
  code text primary key,
  name_zh text not null,
  name_en text not null,
  description text not null,
  sort_order integer not null default 0,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  data_version text not null default '0.4.2.1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredient_forms_code_check check (
    code = lower(btrim(code))
    and code ~ '^[a-z][a-z0-9_]*$'
  ),
  constraint ingredient_forms_name_zh_check check (nullif(btrim(name_zh), '') is not null),
  constraint ingredient_forms_name_en_check check (nullif(btrim(name_en), '') is not null),
  constraint ingredient_forms_description_check check (nullif(btrim(description), '') is not null),
  constraint ingredient_forms_data_version_check check (nullif(btrim(data_version), '') is not null)
);

insert into public.ingredient_forms (code, name_zh, name_en, description, sort_order)
values
  ('unspecified', '形态未指定', 'Unspecified form', 'No physical preparation form is asserted for this catalog record.', 0),
  ('whole_piece', '整块或整只', 'Whole piece', 'The ingredient remains a whole item or a whole retail piece.', 10),
  ('sliced', '切片', 'Sliced', 'The ingredient has been cut into slices without asserting a cooking state.', 20),
  ('diced', '切丁', 'Diced', 'The ingredient has been cut into small cubes or dice.', 30),
  ('shredded', '切丝', 'Shredded', 'The ingredient has been cut or torn into thin strips.', 40),
  ('ground', '绞碎', 'Ground', 'The ingredient has been minced or mechanically ground; its source concept remains explicit.', 50);

create trigger ingredient_forms_set_updated_at
before update on public.ingredient_forms
for each row execute function public.set_updated_at();

alter table public.ingredient_forms enable row level security;

create policy catalog_read_ingredient_forms on public.ingredient_forms
for select using (true);

alter table public.data_sources
  add column license_code text,
  add column license_url text,
  add column source_type text,
  add column source_revision text,
  add column usage_scopes text[],
  add column rights_review_status text,
  add column redistribution_status text,
  add column attribution_required boolean,
  add column snapshot_sha256 text,
  add column importer_version text,
  add column review_status text;

update public.data_sources
set
  license_code = coalesce(
    nullif(btrim(metadata ->> 'licenseCode'), ''),
    nullif(btrim(license), ''),
    'UNKNOWN'
  ),
  license_url = nullif(btrim(metadata ->> 'licenseUrl'), ''),
  source_type = 'dataset',
  source_revision = coalesce(nullif(btrim(metadata ->> 'sourceRevision'), ''), version),
  usage_scopes = array['identity']::text[],
  rights_review_status = 'review_required',
  redistribution_status = 'prohibited',
  attribution_required = (
    metadata ->> 'attributionRequired' = 'true'
    and nullif(btrim(metadata ->> 'licenseUrl'), '') is not null
  ),
  snapshot_sha256 = null,
  importer_version = nullif(btrim(metadata ->> 'importerVersion'), ''),
  review_status = case
    when metadata ->> 'reviewStatus' in ('pending', 'approved', 'rejected')
      then metadata ->> 'reviewStatus'
    when reviewed_at is not null then 'approved'
    else 'pending'
  end;

update public.data_sources
set review_status = 'pending'
where review_status = 'approved'
  and (
    nullif(btrim(source_url), '') is null
    or nullif(btrim(license), '') is null
    or nullif(btrim(license_code), '') is null
    or nullif(btrim(source_revision), '') is null
  );

update public.data_sources
set
  reviewed_at = coalesce(reviewed_at, retrieved_at, imported_at),
  reviewed_by = coalesce(
    nullif(btrim(reviewed_by), ''),
    nullif(btrim(metadata ->> 'reviewedBy'), ''),
    'legacy:migration-0007'
  )
where review_status = 'approved';

alter table public.data_sources
  alter column license_code set default 'UNKNOWN',
  alter column license_code set not null,
  alter column source_type set default 'dataset',
  alter column source_type set not null,
  alter column source_revision set not null,
  alter column usage_scopes set default array['identity']::text[],
  alter column usage_scopes set not null,
  alter column rights_review_status set default 'review_required',
  alter column rights_review_status set not null,
  alter column redistribution_status set default 'prohibited',
  alter column redistribution_status set not null,
  alter column attribution_required set default false,
  alter column attribution_required set not null,
  alter column review_status set default 'pending',
  alter column review_status set not null,
  add constraint data_sources_license_code_check check (
    nullif(btrim(license_code), '') is not null
  ),
  add constraint data_sources_license_url_check check (
    license_url is null or nullif(btrim(license_url), '') is not null
  ),
  add constraint data_sources_source_type_check check (
    source_type in ('curated', 'standard', 'guidance', 'dataset', 'model')
  ),
  add constraint data_sources_source_revision_check check (
    nullif(btrim(source_revision), '') is not null
  ),
  add constraint data_sources_usage_scopes_check check (
    cardinality(usage_scopes) > 0
    and array_position(usage_scopes, null) is null
    and usage_scopes <@ array[
      'identity',
      'nutrition',
      'storage',
      'recommendation',
      'image'
    ]::text[]
  ),
  add constraint data_sources_rights_review_status_check check (
    rights_review_status in ('approved', 'citation_only', 'review_required', 'restricted')
  ),
  add constraint data_sources_redistribution_status_check check (
    redistribution_status in ('allowed', 'attribution_required', 'metadata_only', 'prohibited')
  ),
  add constraint data_sources_snapshot_sha256_check check (
    snapshot_sha256 is null or snapshot_sha256 ~ '^[0-9a-f]{64}$'
  ),
  add constraint data_sources_attribution_license_url_check check (
    (
      not attribution_required
      or nullif(btrim(license_url), '') is not null
    )
    and (
      redistribution_status <> 'attribution_required'
      or (
        attribution_required
        and nullif(btrim(license_url), '') is not null
      )
    )
  ),
  add constraint data_sources_importer_version_check check (
    importer_version is null or nullif(btrim(importer_version), '') is not null
  ),
  add constraint data_sources_review_status_check check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  add constraint data_sources_approved_review_check check (
    review_status <> 'approved'
    or (
      reviewed_at is not null
      and nullif(btrim(reviewed_by), '') is not null
      and nullif(btrim(source_url), '') is not null
      and nullif(btrim(license), '') is not null
      and nullif(btrim(license_code), '') is not null
      and nullif(btrim(source_revision), '') is not null
    )
  ),
  add constraint data_sources_identity_revision_key unique (id, source_revision);

create index data_sources_review_revision_idx
  on public.data_sources(review_status, source_type, source_revision);

create index data_sources_usage_scopes_idx
  on public.data_sources using gin(usage_scopes);

create or replace function public.prepare_data_source_governance()
returns trigger
language plpgsql
as $$
begin
  new.license_code := coalesce(nullif(btrim(new.license_code), ''), 'UNKNOWN');
  new.source_type := coalesce(new.source_type, 'dataset');
  new.source_revision := coalesce(nullif(btrim(new.source_revision), ''), new.version);
  new.usage_scopes := coalesce(new.usage_scopes, array['identity']::text[]);
  new.rights_review_status := coalesce(new.rights_review_status, 'review_required');
  new.redistribution_status := coalesce(new.redistribution_status, 'prohibited');
  new.attribution_required := coalesce(new.attribution_required, false);
  new.review_status := coalesce(new.review_status, 'pending');
  return new;
end;
$$;

create trigger data_sources_prepare_governance
before insert or update of version, license_code, source_type, source_revision, usage_scopes,
  rights_review_status, redistribution_status, attribution_required, review_status
on public.data_sources
for each row execute function public.prepare_data_source_governance();

alter policy catalog_read_data_sources on public.data_sources
using (review_status = 'approved');

create table public.catalog_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  source_revision text not null,
  importer_version text not null,
  imported_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  input_record_count integer not null check (input_record_count >= 0),
  accepted_mapping_count integer not null check (accepted_mapping_count >= 0),
  pending_mapping_count integer not null check (pending_mapping_count >= 0),
  rejected_record_count integer not null check (rejected_record_count >= 0),
  records_sha256 text not null,
  status text not null default 'staged'
    check (status in ('staged', 'published', 'rejected')),
  notes text,
  constraint catalog_import_batches_source_revision_check check (
    nullif(btrim(source_revision), '') is not null
  ),
  constraint catalog_import_batches_importer_version_check check (
    nullif(btrim(importer_version), '') is not null
  ),
  constraint catalog_import_batches_records_sha256_check check (
    records_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint catalog_import_batches_published_check check (
    status <> 'published'
    or (
      reviewed_at is not null
      and nullif(btrim(reviewed_by), '') is not null
      and nullif(btrim(notes), '') is not null
      and nullif(btrim(records_sha256), '') is not null
      and accepted_mapping_count + pending_mapping_count + rejected_record_count
        = input_record_count
    )
  ),
  constraint catalog_import_batches_source_fk
    foreign key (source_id, source_revision)
    references public.data_sources(id, source_revision) on delete restrict,
  constraint catalog_import_batches_source_revision_key unique (source_id, source_revision),
  constraint catalog_import_batches_identity_source_revision_key
    unique (id, source_id, source_revision)
);

create index catalog_import_batches_status_time_idx
  on public.catalog_import_batches(status, imported_at desc);

alter table public.catalog_import_batches enable row level security;

create policy catalog_read_import_batches on public.catalog_import_batches
for select using (status = 'published');

create or replace function public.validate_catalog_import_batch_publication()
returns trigger
language plpgsql
as $$
declare
  source_review_status text;
  source_importer_version text;
begin
  if tg_op = 'UPDATE' then
    if old.status = 'published' and (
      new.source_id is distinct from old.source_id
      or new.source_revision is distinct from old.source_revision
      or new.importer_version is distinct from old.importer_version
      or new.imported_at is distinct from old.imported_at
      or new.reviewed_at is distinct from old.reviewed_at
      or new.reviewed_by is distinct from old.reviewed_by
      or new.input_record_count is distinct from old.input_record_count
      or new.accepted_mapping_count is distinct from old.accepted_mapping_count
      or new.pending_mapping_count is distinct from old.pending_mapping_count
      or new.rejected_record_count is distinct from old.rejected_record_count
      or new.records_sha256 is distinct from old.records_sha256
      or new.status is distinct from old.status
    ) then
      raise exception 'Published catalog import batches are immutable';
    end if;
  end if;

  if new.status = 'published' then
    select source.review_status, source.importer_version
    into source_review_status, source_importer_version
    from public.data_sources source
    where source.id = new.source_id;

    if source_review_status is distinct from 'approved' then
      raise exception 'Published catalog import batches require an approved data source';
    end if;

    if new.importer_version is distinct from source_importer_version then
      raise exception 'Import batch importer_version must match its data source';
    end if;
  end if;

  return new;
end;
$$;

create trigger catalog_import_batches_validate_publication
before insert or update of source_id, source_revision, importer_version, imported_at,
  reviewed_at, reviewed_by, input_record_count, accepted_mapping_count,
  pending_mapping_count, rejected_record_count, records_sha256, status
on public.catalog_import_batches
for each row execute function public.validate_catalog_import_batch_publication();

create or replace function public.protect_published_import_batch_source()
returns trigger
language plpgsql
as $$
begin
  if old.review_status = 'approved'
    and new.review_status <> 'approved'
    and (
      exists (
        select 1
        from public.catalog_import_batches batch
        where batch.source_id = old.id and batch.status = 'published'
      )
      or exists (
        select 1
        from public.external_ingredient_mappings mapping
        where mapping.source_id = old.id and mapping.review_status = 'approved'
      )
    )
  then
    raise exception 'Cannot unapprove a data source used by published catalog evidence';
  end if;

  return new;
end;
$$;

create trigger data_sources_protect_published_batches
before update of review_status on public.data_sources
for each row execute function public.protect_published_import_batch_source();

alter table public.ingredients
  add column record_role text,
  add column concept_id uuid,
  add column variant_id uuid,
  add column form_code text,
  add column process_state text,
  add column is_selectable boolean;

do $$
begin
  if exists (
    select 1
    from public.ingredients
    where id = '50000000-0000-4000-8000-000000000007'::uuid
  ) and not exists (
    select 1
    from public.ingredients
    where id = '50000000-0000-4000-8000-000000000006'::uuid
  ) then
    raise exception 'Pork mince ingredient requires pork concept 50000000-0000-4000-8000-000000000006';
  end if;
end;
$$;

update public.ingredients
set
  record_role = case
    when id = '50000000-0000-4000-8000-000000000007'::uuid then 'form_projection'
    else 'concept'
  end,
  concept_id = case
    when id = '50000000-0000-4000-8000-000000000007'::uuid
      then '50000000-0000-4000-8000-000000000006'::uuid
    else id
  end,
  variant_id = null,
  form_code = case
    when id = '50000000-0000-4000-8000-000000000007'::uuid then 'ground'
    else 'unspecified'
  end,
  process_state = case
    when id = '50000000-0000-4000-8000-000000000025'::uuid then 'cooked'
    when id in (
      '50000000-0000-4000-8000-000000000020'::uuid,
      '50000000-0000-4000-8000-000000000021'::uuid,
      '50000000-0000-4000-8000-000000000026'::uuid,
      '50000000-0000-4000-8000-000000000027'::uuid,
      '50000000-0000-4000-8000-000000000028'::uuid,
      '50000000-0000-4000-8000-000000000029'::uuid,
      '50000000-0000-4000-8000-000000000030'::uuid
    ) then 'processed'
    when id in (
      '50000000-0000-4000-8000-000000000001'::uuid,
      '50000000-0000-4000-8000-000000000002'::uuid,
      '50000000-0000-4000-8000-000000000003'::uuid,
      '50000000-0000-4000-8000-000000000004'::uuid,
      '50000000-0000-4000-8000-000000000005'::uuid,
      '50000000-0000-4000-8000-000000000006'::uuid,
      '50000000-0000-4000-8000-000000000007'::uuid,
      '50000000-0000-4000-8000-000000000008'::uuid,
      '50000000-0000-4000-8000-000000000009'::uuid,
      '50000000-0000-4000-8000-000000000010'::uuid,
      '50000000-0000-4000-8000-000000000011'::uuid,
      '50000000-0000-4000-8000-000000000012'::uuid,
      '50000000-0000-4000-8000-000000000013'::uuid,
      '50000000-0000-4000-8000-000000000014'::uuid,
      '50000000-0000-4000-8000-000000000015'::uuid,
      '50000000-0000-4000-8000-000000000016'::uuid,
      '50000000-0000-4000-8000-000000000017'::uuid,
      '50000000-0000-4000-8000-000000000018'::uuid,
      '50000000-0000-4000-8000-000000000019'::uuid,
      '50000000-0000-4000-8000-000000000022'::uuid,
      '50000000-0000-4000-8000-000000000023'::uuid,
      '50000000-0000-4000-8000-000000000024'::uuid
    ) then 'raw'
    else 'unspecified'
  end,
  is_selectable = true;

alter table public.ingredients
  alter column record_role set default 'concept',
  alter column record_role set not null,
  alter column concept_id set not null,
  alter column form_code set default 'unspecified',
  alter column form_code set not null,
  alter column process_state set not null,
  alter column is_selectable set default true,
  alter column is_selectable set not null,
  add constraint ingredients_record_role_check check (
    record_role in ('concept', 'variant', 'form_projection')
  ),
  add constraint ingredients_process_state_check check (
    process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint ingredients_pork_ground_process_check check (
    id <> '50000000-0000-4000-8000-000000000007'::uuid
    or process_state = 'raw'
  ),
  add constraint ingredients_identity_shape_check check (
    (
      record_role = 'concept'
      and concept_id = id
      and variant_id is null
      and form_code = 'unspecified'
    )
    or (
      record_role = 'variant'
      and concept_id <> id
      and variant_id = id
      and form_code = 'unspecified'
    )
    or (
      record_role = 'form_projection'
      and concept_id <> id
      and (variant_id is null or variant_id <> id)
      and form_code <> 'unspecified'
    )
  ),
  add constraint ingredients_identity_pair_key unique (id, concept_id),
  add constraint ingredients_concept_fk foreign key (concept_id)
    references public.ingredients(id) on delete restrict,
  add constraint ingredients_variant_concept_fk foreign key (variant_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint ingredients_form_fk foreign key (form_code)
    references public.ingredient_forms(code) on delete restrict;

create index ingredients_concept_role_idx
  on public.ingredients(concept_id, record_role, is_selectable, status);

create index ingredients_identity_spec_idx
  on public.ingredients(concept_id, variant_id, form_code, process_state);

create or replace function public.prepare_ingredient_identity()
returns trigger
language plpgsql
as $$
declare
  concept_role text;
  variant_role text;
  variant_concept_id uuid;
begin
  new.record_role := coalesce(new.record_role, 'concept');
  new.form_code := coalesce(new.form_code, 'unspecified');
  new.is_selectable := coalesce(new.is_selectable, true);

  if new.process_state is null then
    new.process_state := case
      when new.id = '50000000-0000-4000-8000-000000000025'::uuid then 'cooked'
      when new.id in (
        '50000000-0000-4000-8000-000000000020'::uuid,
        '50000000-0000-4000-8000-000000000021'::uuid,
        '50000000-0000-4000-8000-000000000026'::uuid,
        '50000000-0000-4000-8000-000000000027'::uuid,
        '50000000-0000-4000-8000-000000000028'::uuid,
        '50000000-0000-4000-8000-000000000029'::uuid,
        '50000000-0000-4000-8000-000000000030'::uuid
      ) then 'processed'
      when new.id between
        '50000000-0000-4000-8000-000000000001'::uuid
        and '50000000-0000-4000-8000-000000000030'::uuid
        then 'raw'
      else 'unspecified'
    end;
  end if;

  if new.id = '50000000-0000-4000-8000-000000000007'::uuid then
    new.record_role := 'form_projection';
    new.concept_id := '50000000-0000-4000-8000-000000000006'::uuid;
    new.variant_id := null;
    new.form_code := 'ground';
  end if;

  if new.record_role = 'concept' and new.concept_id is null then
    new.concept_id := new.id;
  elsif new.record_role = 'variant' and new.variant_id is null then
    new.variant_id := new.id;
  end if;

  if new.record_role <> 'concept' then
    select ingredient.record_role into concept_role
    from public.ingredients ingredient
    where ingredient.id = new.concept_id;

    if concept_role is distinct from 'concept' then
      raise exception 'ingredient concept_id must reference a concept record';
    end if;
  end if;

  if new.record_role = 'form_projection' and new.variant_id is not null then
    select ingredient.record_role, ingredient.concept_id
    into variant_role, variant_concept_id
    from public.ingredients ingredient
    where ingredient.id = new.variant_id;

    if variant_role is distinct from 'variant' or variant_concept_id <> new.concept_id then
      raise exception 'ingredient variant_id must reference a variant of the same concept';
    end if;
  end if;

  return new;
end;
$$;

create trigger ingredients_prepare_identity
before insert or update of record_role, concept_id, variant_id, form_code, process_state, is_selectable
on public.ingredients
for each row execute function public.prepare_ingredient_identity();

-- Compatibility helper: callers that only write ingredient_id continue to work.
-- Explicit structured values are retained, while omitted values inherit the catalog record.
create or replace function public.populate_ingredient_spec()
returns trigger
language plpgsql
as $$
declare
  catalog_ingredient public.ingredients%rowtype;
  selected_variant public.ingredients%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.ingredient_id is distinct from old.ingredient_id
      and new.concept_id is not distinct from old.concept_id
      and new.variant_id is not distinct from old.variant_id
      and new.form_code is not distinct from old.form_code
      and new.process_state is not distinct from old.process_state
    then
      new.concept_id := null;
      new.variant_id := null;
      new.form_code := null;
      new.process_state := null;
    end if;
  end if;

  if new.ingredient_id is null then
    return new;
  end if;

  select ingredient.* into catalog_ingredient
  from public.ingredients ingredient
  where ingredient.id = new.ingredient_id;

  if not found then
    raise exception 'ingredient not found: %', new.ingredient_id;
  end if;

  new.concept_id := coalesce(new.concept_id, catalog_ingredient.concept_id);
  new.variant_id := coalesce(new.variant_id, catalog_ingredient.variant_id);
  new.form_code := coalesce(new.form_code, catalog_ingredient.form_code);
  new.process_state := coalesce(new.process_state, catalog_ingredient.process_state);

  if new.concept_id <> catalog_ingredient.concept_id then
    raise exception 'ingredient spec concept_id must match ingredient_id';
  end if;

  if catalog_ingredient.record_role in ('variant', 'form_projection')
    and new.variant_id is distinct from catalog_ingredient.variant_id
  then
    raise exception 'ingredient spec variant_id must match the selected projection';
  end if;

  if catalog_ingredient.record_role = 'form_projection'
    and new.form_code <> catalog_ingredient.form_code
  then
    raise exception 'ingredient spec form_code must match the selected form projection';
  end if;

  if catalog_ingredient.process_state <> 'unspecified'
    and new.process_state <> catalog_ingredient.process_state
  then
    raise exception 'ingredient spec process_state must match the selected projection';
  end if;

  if new.variant_id is not null then
    select ingredient.* into selected_variant
    from public.ingredients ingredient
    where ingredient.id = new.variant_id;

    if not found
      or selected_variant.record_role <> 'variant'
      or selected_variant.concept_id <> new.concept_id
    then
      raise exception 'ingredient spec variant_id must reference a variant of the same concept';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.populate_required_ingredient_spec()
returns trigger
language plpgsql
as $$
declare
  catalog_ingredient public.ingredients%rowtype;
  selected_variant public.ingredients%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.ingredient_id is distinct from old.ingredient_id
      and new.concept_id is not distinct from old.concept_id
      and new.variant_id is not distinct from old.variant_id
      and new.required_form_code is not distinct from old.required_form_code
      and new.required_process_state is not distinct from old.required_process_state
    then
      new.concept_id := null;
      new.variant_id := null;
      new.required_form_code := null;
      new.required_process_state := null;
    end if;
  end if;

  select ingredient.* into catalog_ingredient
  from public.ingredients ingredient
  where ingredient.id = new.ingredient_id;

  if not found then
    raise exception 'ingredient not found: %', new.ingredient_id;
  end if;

  new.concept_id := coalesce(new.concept_id, catalog_ingredient.concept_id);
  new.variant_id := coalesce(new.variant_id, catalog_ingredient.variant_id);
  new.required_form_code := coalesce(new.required_form_code, catalog_ingredient.form_code);
  new.required_process_state := coalesce(new.required_process_state, catalog_ingredient.process_state);

  if new.concept_id <> catalog_ingredient.concept_id then
    raise exception 'required ingredient concept_id must match ingredient_id';
  end if;

  if catalog_ingredient.record_role in ('variant', 'form_projection')
    and new.variant_id is distinct from catalog_ingredient.variant_id
  then
    raise exception 'required ingredient variant_id must match the selected projection';
  end if;

  if catalog_ingredient.record_role = 'form_projection'
    and new.required_form_code <> catalog_ingredient.form_code
  then
    raise exception 'required form_code must match the selected form projection';
  end if;

  if catalog_ingredient.process_state <> 'unspecified'
    and new.required_process_state <> catalog_ingredient.process_state
  then
    raise exception 'required process_state must match the selected projection';
  end if;

  if new.variant_id is not null then
    select ingredient.* into selected_variant
    from public.ingredients ingredient
    where ingredient.id = new.variant_id;

    if not found
      or selected_variant.record_role <> 'variant'
      or selected_variant.concept_id <> new.concept_id
    then
      raise exception 'required variant_id must reference a variant of the same concept';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.populate_requested_ingredient_spec()
returns trigger
language plpgsql
as $$
declare
  catalog_ingredient public.ingredients%rowtype;
  selected_variant public.ingredients%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.ingredient_id is distinct from old.ingredient_id
      and new.concept_id is not distinct from old.concept_id
      and new.variant_id is not distinct from old.variant_id
      and new.requested_form_code is not distinct from old.requested_form_code
      and new.requested_process_state is not distinct from old.requested_process_state
    then
      new.concept_id := null;
      new.variant_id := null;
      new.requested_form_code := null;
      new.requested_process_state := null;
    end if;
  end if;

  select ingredient.* into catalog_ingredient
  from public.ingredients ingredient
  where ingredient.id = new.ingredient_id;

  if not found then
    raise exception 'ingredient not found: %', new.ingredient_id;
  end if;

  new.concept_id := coalesce(new.concept_id, catalog_ingredient.concept_id);
  new.variant_id := coalesce(new.variant_id, catalog_ingredient.variant_id);
  new.requested_form_code := coalesce(new.requested_form_code, catalog_ingredient.form_code);
  new.requested_process_state := coalesce(new.requested_process_state, catalog_ingredient.process_state);

  if new.concept_id <> catalog_ingredient.concept_id then
    raise exception 'requested ingredient concept_id must match ingredient_id';
  end if;

  if catalog_ingredient.record_role in ('variant', 'form_projection')
    and new.variant_id is distinct from catalog_ingredient.variant_id
  then
    raise exception 'requested ingredient variant_id must match the selected projection';
  end if;

  if catalog_ingredient.record_role = 'form_projection'
    and new.requested_form_code <> catalog_ingredient.form_code
  then
    raise exception 'requested form_code must match the selected form projection';
  end if;

  if catalog_ingredient.process_state <> 'unspecified'
    and new.requested_process_state <> catalog_ingredient.process_state
  then
    raise exception 'requested process_state must match the selected projection';
  end if;

  if new.variant_id is not null then
    select ingredient.* into selected_variant
    from public.ingredients ingredient
    where ingredient.id = new.variant_id;

    if not found
      or selected_variant.record_role <> 'variant'
      or selected_variant.concept_id <> new.concept_id
    then
      raise exception 'requested variant_id must reference a variant of the same concept';
    end if;
  end if;

  return new;
end;
$$;

alter table public.inventory_lots
  add column concept_id uuid,
  add column variant_id uuid,
  add column form_code text,
  add column process_state text,
  add column origin_type text,
  add column derived_from_lot_id uuid;

update public.inventory_lots lot
set
  concept_id = ingredient.concept_id,
  variant_id = ingredient.variant_id,
  form_code = ingredient.form_code,
  process_state = ingredient.process_state,
  origin_type = 'unknown'
from public.ingredients ingredient
where ingredient.id = lot.ingredient_id;

alter table public.inventory_lots
  alter column concept_id set not null,
  alter column form_code set not null,
  alter column process_state set not null,
  alter column origin_type set default 'unknown',
  alter column origin_type set not null,
  add constraint inventory_lots_origin_type_check check (
    origin_type in ('unknown', 'purchased', 'user_transformed', 'imported')
  ),
  add constraint inventory_lots_origin_link_check check (
    (origin_type = 'user_transformed' and derived_from_lot_id is not null)
    or (origin_type <> 'user_transformed' and derived_from_lot_id is null)
  ),
  add constraint inventory_lots_not_self_derived_check check (
    derived_from_lot_id is null or derived_from_lot_id <> id
  ),
  add constraint inventory_lots_process_state_check check (
    process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint inventory_lots_id_user_concept_key unique (id, user_id, concept_id),
  add constraint inventory_lots_ingredient_concept_fk foreign key (ingredient_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint inventory_lots_variant_concept_fk foreign key (variant_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint inventory_lots_form_fk foreign key (form_code)
    references public.ingredient_forms(code) on delete restrict,
  add constraint inventory_lots_derived_identity_fk
    foreign key (derived_from_lot_id, user_id, concept_id)
    references public.inventory_lots(id, user_id, concept_id) on delete restrict;

create trigger inventory_lots_populate_ingredient_spec
before insert or update of ingredient_id, concept_id, variant_id, form_code, process_state
on public.inventory_lots
for each row execute function public.populate_ingredient_spec();

create index inventory_lots_user_identity_idx
  on public.inventory_lots(user_id, concept_id, variant_id, form_code, process_state, status);

create index inventory_lots_derived_from_idx
  on public.inventory_lots(derived_from_lot_id)
  where derived_from_lot_id is not null;

alter table public.recipe_ingredients
  add column concept_id uuid,
  add column variant_id uuid,
  add column required_form_code text,
  add column required_process_state text;

update public.recipe_ingredients line
set
  concept_id = ingredient.concept_id,
  variant_id = ingredient.variant_id,
  required_form_code = ingredient.form_code,
  required_process_state = ingredient.process_state
from public.ingredients ingredient
where ingredient.id = line.ingredient_id;

alter table public.recipe_ingredients
  alter column concept_id set not null,
  alter column required_form_code set not null,
  alter column required_process_state set not null,
  add constraint recipe_ingredients_process_state_check check (
    required_process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint recipe_ingredients_ingredient_concept_fk foreign key (ingredient_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint recipe_ingredients_variant_concept_fk foreign key (variant_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint recipe_ingredients_form_fk foreign key (required_form_code)
    references public.ingredient_forms(code) on delete restrict;

create trigger recipe_ingredients_populate_required_spec
before insert or update of ingredient_id, concept_id, variant_id, required_form_code, required_process_state
on public.recipe_ingredients
for each row execute function public.populate_required_ingredient_spec();

create index recipe_ingredients_identity_idx
  on public.recipe_ingredients(concept_id, variant_id, required_form_code, required_process_state);

alter table public.shopping_list_items
  add column concept_id uuid,
  add column variant_id uuid,
  add column requested_form_code text,
  add column requested_process_state text;

update public.shopping_list_items item
set
  concept_id = ingredient.concept_id,
  variant_id = ingredient.variant_id,
  requested_form_code = ingredient.form_code,
  requested_process_state = ingredient.process_state
from public.ingredients ingredient
where ingredient.id = item.ingredient_id;

alter table public.shopping_list_items
  alter column concept_id set not null,
  alter column requested_form_code set not null,
  alter column requested_process_state set not null,
  add constraint shopping_items_process_state_check check (
    requested_process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint shopping_items_ingredient_concept_fk foreign key (ingredient_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint shopping_items_variant_concept_fk foreign key (variant_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint shopping_items_form_fk foreign key (requested_form_code)
    references public.ingredient_forms(code) on delete restrict;

create trigger shopping_items_populate_requested_spec
before insert or update of ingredient_id, concept_id, variant_id, requested_form_code, requested_process_state
on public.shopping_list_items
for each row execute function public.populate_requested_ingredient_spec();

create index shopping_items_identity_idx
  on public.shopping_list_items(concept_id, variant_id, requested_form_code, requested_process_state);

create or replace function public.populate_profile_form_process()
returns trigger
language plpgsql
as $$
declare
  catalog_ingredient public.ingredients%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.ingredient_id is distinct from old.ingredient_id
      and new.form_code is not distinct from old.form_code
      and new.process_state is not distinct from old.process_state
    then
      new.form_code := null;
      new.process_state := null;
    end if;
  end if;

  select ingredient.* into catalog_ingredient
  from public.ingredients ingredient
  where ingredient.id = new.ingredient_id;

  if not found then
    raise exception 'ingredient not found: %', new.ingredient_id;
  end if;

  new.form_code := coalesce(new.form_code, catalog_ingredient.form_code);
  new.process_state := coalesce(new.process_state, catalog_ingredient.process_state);

  if catalog_ingredient.record_role = 'form_projection'
    and new.form_code <> catalog_ingredient.form_code
  then
    raise exception 'profile form_code must match the selected form projection';
  end if;

  if catalog_ingredient.process_state <> 'unspecified'
    and new.process_state <> catalog_ingredient.process_state
  then
    raise exception 'profile process_state must match the selected projection';
  end if;

  return new;
end;
$$;

alter table public.ingredient_storage_profiles
  add column form_code text,
  add column process_state text;

update public.ingredient_storage_profiles profile
set
  form_code = ingredient.form_code,
  process_state = ingredient.process_state
from public.ingredients ingredient
where ingredient.id = profile.ingredient_id;

alter table public.ingredient_storage_profiles
  alter column form_code set not null,
  alter column process_state set not null,
  add constraint storage_profiles_process_state_check check (
    process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint storage_profiles_form_fk foreign key (form_code)
    references public.ingredient_forms(code) on delete restrict;

create trigger storage_profiles_populate_ingredient_spec
before insert or update of ingredient_id, form_code, process_state
on public.ingredient_storage_profiles
for each row execute function public.populate_profile_form_process();

create index storage_profiles_identity_idx
  on public.ingredient_storage_profiles(ingredient_id, form_code, process_state);

alter table public.nutrition_profiles
  add column form_code text,
  add column process_state text;

update public.nutrition_profiles profile
set
  form_code = ingredient.form_code,
  process_state = ingredient.process_state
from public.ingredients ingredient
where ingredient.id = profile.ingredient_id;

alter table public.nutrition_profiles
  alter column form_code set not null,
  alter column process_state set not null,
  add constraint nutrition_profiles_process_state_check check (
    process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint nutrition_profiles_form_fk foreign key (form_code)
    references public.ingredient_forms(code) on delete restrict;

create trigger nutrition_profiles_populate_ingredient_spec
before insert or update of ingredient_id, form_code, process_state
on public.nutrition_profiles
for each row execute function public.populate_profile_form_process();

create index nutrition_profiles_identity_idx
  on public.nutrition_profiles(ingredient_id, form_code, process_state);

alter table public.recognition_candidates
  add column concept_id uuid,
  add column variant_id uuid,
  add column form_code text,
  add column process_state text;

update public.recognition_candidates candidate
set
  concept_id = ingredient.concept_id,
  variant_id = ingredient.variant_id,
  form_code = ingredient.form_code,
  process_state = ingredient.process_state
from public.ingredients ingredient
where ingredient.id = coalesce(candidate.corrected_ingredient_id, candidate.ingredient_id);

update public.recognition_candidates
set
  form_code = 'unspecified',
  process_state = 'unspecified'
where form_code is null or process_state is null;

alter table public.recognition_candidates
  alter column form_code set not null,
  alter column process_state set not null,
  add constraint recognition_candidate_spec_presence_check check (
    (
      ingredient_id is null
      and corrected_ingredient_id is null
      and concept_id is null
      and variant_id is null
    )
    or (
      coalesce(corrected_ingredient_id, ingredient_id) is not null
      and concept_id is not null
    )
  ),
  add constraint recognition_candidate_variant_presence_check check (
    variant_id is null or concept_id is not null
  ),
  add constraint recognition_process_state_check check (
    process_state in ('unspecified', 'raw', 'cooked', 'processed')
  ),
  add constraint recognition_concept_fk foreign key (concept_id)
    references public.ingredients(id) on delete restrict,
  add constraint recognition_variant_concept_fk foreign key (variant_id, concept_id)
    references public.ingredients(id, concept_id) on delete restrict,
  add constraint recognition_form_fk foreign key (form_code)
    references public.ingredient_forms(code) on delete restrict;

create or replace function public.populate_recognition_candidate_spec()
returns trigger
language plpgsql
as $$
declare
  selected_ingredient_id uuid;
  catalog_ingredient public.ingredients%rowtype;
  selected_variant public.ingredients%rowtype;
begin
  if tg_op = 'UPDATE' then
    if coalesce(new.corrected_ingredient_id, new.ingredient_id)
        is distinct from coalesce(old.corrected_ingredient_id, old.ingredient_id)
      and new.concept_id is not distinct from old.concept_id
      and new.variant_id is not distinct from old.variant_id
      and new.form_code is not distinct from old.form_code
      and new.process_state is not distinct from old.process_state
    then
      new.concept_id := null;
      new.variant_id := null;
      new.form_code := null;
      new.process_state := null;
    end if;
  end if;

  selected_ingredient_id := coalesce(new.corrected_ingredient_id, new.ingredient_id);

  if selected_ingredient_id is null then
    new.concept_id := null;
    new.variant_id := null;
    new.form_code := coalesce(new.form_code, 'unspecified');
    new.process_state := coalesce(new.process_state, 'unspecified');
    return new;
  end if;

  select ingredient.* into catalog_ingredient
  from public.ingredients ingredient
  where ingredient.id = selected_ingredient_id;

  if not found then
    raise exception 'recognition ingredient not found: %', selected_ingredient_id;
  end if;

  new.concept_id := coalesce(new.concept_id, catalog_ingredient.concept_id);
  new.variant_id := coalesce(new.variant_id, catalog_ingredient.variant_id);
  new.form_code := coalesce(new.form_code, catalog_ingredient.form_code);
  new.process_state := coalesce(new.process_state, catalog_ingredient.process_state);

  if new.concept_id <> catalog_ingredient.concept_id then
    raise exception 'recognition concept_id must match the effective ingredient';
  end if;

  if catalog_ingredient.record_role in ('variant', 'form_projection')
    and new.variant_id is distinct from catalog_ingredient.variant_id
  then
    raise exception 'recognition variant_id must match the selected projection';
  end if;

  if catalog_ingredient.record_role = 'form_projection'
    and new.form_code <> catalog_ingredient.form_code
  then
    raise exception 'recognition form_code must match the selected form projection';
  end if;

  if catalog_ingredient.process_state <> 'unspecified'
    and new.process_state <> catalog_ingredient.process_state
  then
    raise exception 'recognition process_state must match the selected projection';
  end if;

  if new.variant_id is not null then
    select ingredient.* into selected_variant
    from public.ingredients ingredient
    where ingredient.id = new.variant_id;

    if not found
      or selected_variant.record_role <> 'variant'
      or selected_variant.concept_id <> new.concept_id
    then
      raise exception 'recognition variant_id must reference a variant of the same concept';
    end if;
  end if;

  return new;
end;
$$;

create trigger recognition_candidates_populate_spec
before insert or update of ingredient_id, corrected_ingredient_id, concept_id, variant_id, form_code, process_state
on public.recognition_candidates
for each row execute function public.populate_recognition_candidate_spec();

create index recognition_candidates_identity_idx
  on public.recognition_candidates(job_id, concept_id, variant_id, form_code, process_state);

alter table public.external_ingredient_mappings
  add column mapping_level text,
  add column usage_scopes text[],
  add column lossiness text[],
  add column import_batch_id uuid;

update public.external_ingredient_mappings mapping
set
  mapping_level = 'record',
  usage_scopes = case
    when exists (
      select 1
      from public.nutrition_profiles profile
      where profile.external_mapping_id = mapping.id
    ) then array['nutrition']::text[]
    else array['recommendation']::text[]
  end,
  lossiness = case
    when mapping.match_type in ('exact', 'alias') then array[]::text[]
    else array['product_type']::text[]
  end
where mapping.mapping_level is null;

alter table public.external_ingredient_mappings
  alter column mapping_level set default 'record',
  alter column mapping_level set not null,
  alter column usage_scopes set default array['recommendation']::text[],
  alter column usage_scopes set not null,
  alter column lossiness set default array[]::text[],
  alter column lossiness set not null,
  add constraint external_mapping_level_check check (
    mapping_level in ('record', 'concept')
  ),
  add constraint external_mapping_usage_scopes_check check (
    cardinality(usage_scopes) > 0
    and array_position(usage_scopes, null) is null
    and usage_scopes <@ array[
      'identity',
      'nutrition',
      'storage',
      'recommendation',
      'image'
    ]::text[]
  ),
  add constraint external_mapping_lossiness_check check (
    array_position(lossiness, null) is null
    and lossiness <@ array[
      'form',
      'variant',
      'process_state',
      'species',
      'product_type'
    ]::text[]
  ),
  add constraint external_mapping_lossiness_match_check check (
    (match_type in ('exact', 'alias') and cardinality(lossiness) = 0)
    or (match_type in ('broader', 'narrower', 'representative', 'related') and cardinality(lossiness) > 0)
    or match_type = 'manual'
  ),
  add constraint external_mapping_batch_source_check check (
    import_batch_id is null or source_id is not null
  ),
  add constraint external_mapping_source_revision_fk
    foreign key (source_id, external_version)
    references public.data_sources(id, source_revision) on delete restrict,
  add constraint external_mapping_import_batch_fk foreign key (import_batch_id)
    references public.catalog_import_batches(id) on delete restrict,
  add constraint external_mapping_batch_revision_fk
    foreign key (import_batch_id, source_id, external_version)
    references public.catalog_import_batches(id, source_id, source_revision) on delete restrict;

create or replace function public.validate_external_mapping_integrity()
returns trigger
language plpgsql
as $$
declare
  ingredient_role text;
  import_batch_status text;
  source_review_status text;
  source_rights_review_status text;
  source_usage_scopes text[];
  normalized_provider text;
begin
  normalized_provider := regexp_replace(lower(btrim(new.provider)), '[^a-z0-9]+', '', 'g');

  select ingredient.record_role into ingredient_role
  from public.ingredients ingredient
  where ingredient.id = new.ingredient_id;

  if ingredient_role is null then
    raise exception 'external mapping ingredient not found: %', new.ingredient_id;
  end if;

  if new.mapping_level = 'concept' and ingredient_role <> 'concept' then
    raise exception 'concept-level external mappings must reference a concept record';
  end if;

  if new.source_id is not null then
    select source.review_status, source.rights_review_status, source.usage_scopes
      into source_review_status, source_rights_review_status, source_usage_scopes
    from public.data_sources source
    where source.id = new.source_id;

    if new.review_status = 'approved' and source_review_status is distinct from 'approved' then
      raise exception 'approved external mappings require an approved data source';
    end if;

    if not coalesce(new.usage_scopes <@ source_usage_scopes, false) then
      raise exception 'external mapping usage scopes must be permitted by its data source';
    end if;
  end if;

  if new.import_batch_id is not null then
    select batch.status into import_batch_status
    from public.catalog_import_batches batch
    where batch.id = new.import_batch_id;

    if new.review_status = 'approved' and import_batch_status is distinct from 'published' then
      raise exception 'approved external mappings require a published import batch';
    end if;
  end if;

  if new.review_status = 'approved'
    and normalized_provider in ('epicure', 'epicurecooc', 'kaikakuepicure')
  then
    if new.source_id is null then
      raise exception 'approved Epicure mappings require an approved data source';
    end if;

    if new.import_batch_id is null then
      raise exception 'approved Epicure mappings require a published import batch';
    end if;

    if new.match_type <> 'exact' or cardinality(new.lossiness) <> 0 then
      raise exception 'approved Epicure mappings must be exact and lossless';
    end if;

    if new.mapping_level <> 'concept' then
      raise exception 'approved Epicure mappings must attach at concept level';
    end if;

    if not ('recommendation' = any(new.usage_scopes))
      or not coalesce('recommendation' = any(source_usage_scopes), false)
    then
      raise exception 'approved Epicure mappings require recommendation usage on mapping and source';
    end if;

    if source_rights_review_status is not distinct from 'approved' then
      raise exception 'Epicure corpus rights must remain review-scoped';
    end if;
  end if;

  return new;
end;
$$;

create trigger external_mappings_validate_integrity
before insert or update of ingredient_id, mapping_level, provider, external_version, source_id,
  review_status, import_batch_id, match_type, usage_scopes, lossiness
on public.external_ingredient_mappings
for each row execute function public.validate_external_mapping_integrity();

create index external_mapping_level_idx
  on public.external_ingredient_mappings(ingredient_id, mapping_level, review_status);

create index external_mapping_usage_scopes_idx
  on public.external_ingredient_mappings using gin(usage_scopes);

create index external_mapping_lossiness_idx
  on public.external_ingredient_mappings using gin(lossiness);

create index external_mapping_import_batch_idx
  on public.external_ingredient_mappings(import_batch_id)
  where import_batch_id is not null;

create table public.ingredient_legacy_ids (
  namespace text not null,
  legacy_id text not null,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (namespace, legacy_id),
  constraint ingredient_legacy_namespace_check check (
    namespace = btrim(namespace) and nullif(namespace, '') is not null
  ),
  constraint ingredient_legacy_id_check check (
    legacy_id = btrim(legacy_id) and nullif(legacy_id, '') is not null
  )
);

create index ingredient_legacy_ids_ingredient_idx
  on public.ingredient_legacy_ids(ingredient_id);

create or replace function public.prevent_legacy_ingredient_id_reassignment()
returns trigger
language plpgsql
as $$
begin
  if new.namespace is distinct from old.namespace
    or new.legacy_id is distinct from old.legacy_id
    or new.ingredient_id is distinct from old.ingredient_id
  then
    raise exception 'Published namespaced legacy ingredient ids are immutable';
  end if;

  return new;
end;
$$;

create trigger ingredient_legacy_ids_prevent_reassignment
before update of namespace, legacy_id, ingredient_id
on public.ingredient_legacy_ids
for each row execute function public.prevent_legacy_ingredient_id_reassignment();

-- Catalog rows are imported separately from schema migrations. Insert the published
-- compatibility mapping when its immutable target is already present; the trigger
-- below registers it when a fresh database imports that target later.
insert into public.ingredient_legacy_ids (namespace, legacy_id, ingredient_id, metadata)
select
  'miiix-v0.4.1',
  'pork',
  ingredient.id,
  jsonb_build_object(
    'historicalMeaningZh', '肉沫',
    'note', 'Compatibility identifier only; not an English lexical alias.'
  )
from public.ingredients ingredient
where ingredient.id = '50000000-0000-4000-8000-000000000007'::uuid;

create or replace function public.register_v041_pork_legacy_id()
returns trigger
language plpgsql
as $$
begin
  if new.id = '50000000-0000-4000-8000-000000000007'::uuid then
    if exists (
      select 1
      from public.ingredient_legacy_ids legacy
      where legacy.namespace = 'miiix-v0.4.1'
        and legacy.legacy_id = 'pork'
        and legacy.ingredient_id <> new.id
    ) then
      raise exception 'Published legacy id miiix-v0.4.1:pork cannot be reassigned';
    end if;

    insert into public.ingredient_legacy_ids (namespace, legacy_id, ingredient_id, metadata)
    values (
      'miiix-v0.4.1',
      'pork',
      new.id,
      jsonb_build_object(
        'historicalMeaningZh', '肉沫',
        'note', 'Compatibility identifier only; not an English lexical alias.'
      )
    )
    on conflict (namespace, legacy_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger ingredients_register_v041_pork_legacy_id
after insert on public.ingredients
for each row execute function public.register_v041_pork_legacy_id();

alter table public.ingredient_legacy_ids enable row level security;

create policy catalog_read_ingredient_legacy_ids on public.ingredient_legacy_ids
for select using (
  exists (
    select 1
    from public.ingredients ingredient
    where ingredient.id = ingredient_legacy_ids.ingredient_id
      and ingredient.status = 'active'
  )
);

commit;
