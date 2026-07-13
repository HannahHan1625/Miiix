-- Miiix database migration 0003: model mappings and recommendation evidence
-- The vector column supports Epicure now and other embedding models later.

begin;

create extension if not exists vector;

create table public.external_ingredient_mappings (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  provider text not null,
  external_key text not null,
  external_version text not null,
  match_type text not null check (match_type in ('exact', 'alias', 'broader', 'narrower', 'manual')),
  confidence numeric(5, 4) not null check (confidence between 0 and 1),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_version, external_key, ingredient_id)
);

create index external_ingredient_mapping_lookup_idx
  on public.external_ingredient_mappings(provider, external_version, external_key, review_status);

create table public.embedding_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_name text not null,
  model_version text not null,
  dimensions integer not null check (dimensions > 0),
  relation_semantics text not null,
  license text,
  source_url text,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, model_name, model_version)
);

create table public.ingredient_embeddings (
  model_id uuid not null references public.embedding_models(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  embedding vector not null,
  created_at timestamptz not null default now(),
  primary key (model_id, ingredient_id)
);

create or replace function public.validate_ingredient_embedding_dimensions()
returns trigger
language plpgsql
as $$
declare
  expected_dimensions integer;
begin
  select dimensions into expected_dimensions
  from public.embedding_models
  where id = new.model_id;

  if expected_dimensions is null then
    raise exception 'Embedding model not found: %', new.model_id;
  end if;
  if vector_dims(new.embedding) <> expected_dimensions then
    raise exception 'Embedding dimension mismatch: expected %, got %',
      expected_dimensions,
      vector_dims(new.embedding);
  end if;
  return new;
end;
$$;

create trigger ingredient_embeddings_validate_dimensions
before insert or update on public.ingredient_embeddings
for each row execute function public.validate_ingredient_embedding_dimensions();

create table public.recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('reliable', 'creative', 'substitute')),
  status text not null default 'started' check (
    status in ('started', 'completed', 'failed')
  ),
  preference_snapshot jsonb not null default '{}'::jsonb,
  model_snapshot jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (completed_at is null or completed_at >= created_at)
);

create index recommendation_runs_user_time_idx
  on public.recommendation_runs(user_id, created_at desc);

create table public.recommendation_run_ingredients (
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  inventory_lot_id uuid references public.inventory_lots(id) on delete set null,
  input_role text not null default 'selected' check (
    input_role in ('selected', 'available', 'excluded')
  ),
  freshness_score numeric(5, 4) check (freshness_score is null or freshness_score between 0 and 1),
  primary key (run_id, ingredient_id, input_role)
);

create table public.recommendation_run_tools (
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  tool_id uuid not null references public.kitchen_tools(id) on delete restrict,
  primary key (run_id, tool_id)
);

create table public.recommendation_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  rank integer not null check (rank > 0),
  recipe_id uuid references public.recipes(id) on delete set null,
  total_score numeric(8, 6) not null check (total_score between 0 and 1),
  score_breakdown jsonb not null,
  explanation text not null,
  selected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, rank)
);

create table public.recommendation_candidate_ingredients (
  candidate_id uuid not null references public.recommendation_candidates(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  candidate_role text not null check (candidate_role in ('selected', 'suggested', 'substitute')),
  relation_score numeric(8, 6) check (relation_score is null or relation_score between -1 and 1),
  relation_type text check (
    relation_type is null
    or relation_type in ('co_occurs', 'flavour_similar', 'blended', 'rule')
  ),
  primary key (candidate_id, ingredient_id, candidate_role)
);

create table public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid not null references public.recommendation_runs(id) on delete cascade,
  candidate_id uuid references public.recommendation_candidates(id) on delete set null,
  action text not null check (
    action in ('viewed', 'dismissed', 'favorite', 'planned', 'cooked', 'rated')
  ),
  rating smallint check (rating is null or rating between 1 and 5),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index recommendation_feedback_user_time_idx
  on public.recommendation_feedback(user_id, created_at desc);

create trigger external_mappings_set_updated_at
before update on public.external_ingredient_mappings
for each row execute function public.set_updated_at();

commit;
