-- Miiix database migration 0004: Supabase row-level security
-- Global catalog data is read-only to clients. Private data is owner-scoped.

begin;

alter table public.data_sources enable row level security;
alter table public.units enable row level security;
alter table public.food_categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.ingredient_category_memberships enable row level security;
alter table public.storage_methods enable row level security;
alter table public.ingredient_storage_profiles enable row level security;
alter table public.ingredient_unit_conversions enable row level security;
alter table public.nutrition_profiles enable row level security;
alter table public.ingredient_assets enable row level security;
alter table public.kitchen_tools enable row level security;
alter table public.tool_capabilities enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_tools enable row level security;
alter table public.external_ingredient_mappings enable row level security;
alter table public.embedding_models enable row level security;
alter table public.ingredient_embeddings enable row level security;

create policy catalog_read_data_sources on public.data_sources
for select using (true);
create policy catalog_read_units on public.units
for select using (true);
create policy catalog_read_categories on public.food_categories
for select using (true);
create policy catalog_read_ingredients on public.ingredients
for select using (status = 'active');
create policy catalog_read_aliases on public.ingredient_aliases
for select using (
  review_status = 'approved'
  and exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_aliases.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_category_memberships on public.ingredient_category_memberships
for select using (
  exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_category_memberships.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_storage_methods on public.storage_methods
for select using (true);
create policy catalog_read_storage_profiles on public.ingredient_storage_profiles
for select using (
  review_status = 'approved'
  and exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_storage_profiles.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_unit_conversions on public.ingredient_unit_conversions
for select using (
  exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_unit_conversions.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_nutrition on public.nutrition_profiles
for select using (
  review_status = 'approved'
  and exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = nutrition_profiles.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_ingredient_assets on public.ingredient_assets
for select using (
  review_status = 'approved'
  and exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = ingredient_assets.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_tools on public.kitchen_tools
for select using (status = 'active');
create policy catalog_read_tool_capabilities on public.tool_capabilities
for select using (
  exists (
    select 1 from public.kitchen_tools tool
    where tool.id = tool_capabilities.tool_id and tool.status = 'active'
  )
);
create policy catalog_read_recipes on public.recipes
for select using (status = 'published');
create policy catalog_read_recipe_ingredients on public.recipe_ingredients
for select using (
  exists (
    select 1 from public.recipes recipe
    where recipe.id = recipe_ingredients.recipe_id and recipe.status = 'published'
  )
);
create policy catalog_read_recipe_steps on public.recipe_steps
for select using (
  exists (
    select 1 from public.recipes recipe
    where recipe.id = recipe_steps.recipe_id and recipe.status = 'published'
  )
);
create policy catalog_read_recipe_tools on public.recipe_tools
for select using (
  exists (
    select 1 from public.recipes recipe
    where recipe.id = recipe_tools.recipe_id and recipe.status = 'published'
  )
);
create policy catalog_read_external_mappings on public.external_ingredient_mappings
for select using (
  review_status = 'approved'
  and exists (
    select 1 from public.ingredients ingredient
    where ingredient.id = external_ingredient_mappings.ingredient_id and ingredient.status = 'active'
  )
);
create policy catalog_read_embedding_models on public.embedding_models
for select using (active);

alter table public.profiles enable row level security;
alter table public.recognition_jobs enable row level security;
alter table public.recognition_candidates enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.cooking_sessions enable row level security;
alter table public.recipe_favorites enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_events enable row level security;
alter table public.recommendation_runs enable row level security;
alter table public.recommendation_run_ingredients enable row level security;
alter table public.recommendation_run_tools enable row level security;
alter table public.recommendation_candidates enable row level security;
alter table public.recommendation_candidate_ingredients enable row level security;
alter table public.recommendation_feedback enable row level security;

create policy profiles_own_rows on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);
create policy recognition_jobs_own_rows on public.recognition_jobs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy inventory_lots_own_rows on public.inventory_lots
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    recognition_job_id is null
    or exists (
      select 1 from public.recognition_jobs job
      where job.id = inventory_lots.recognition_job_id and job.user_id = auth.uid()
    )
  )
);
create policy inventory_transactions_own_rows on public.inventory_transactions
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.inventory_lots lot
    where lot.id = inventory_transactions.inventory_lot_id and lot.user_id = auth.uid()
  )
  and (
    cooking_session_id is null
    or exists (
      select 1 from public.cooking_sessions session
      where session.id = inventory_transactions.cooking_session_id and session.user_id = auth.uid()
    )
  )
);
create policy meal_plans_own_rows on public.meal_plans
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shopping_lists_own_rows on public.shopping_lists
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    meal_plan_id is null
    or exists (
      select 1 from public.meal_plans plan
      where plan.id = shopping_lists.meal_plan_id and plan.user_id = auth.uid()
    )
  )
);
create policy cooking_sessions_own_rows on public.cooking_sessions
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    meal_plan_item_id is null
    or exists (
      select 1
      from public.meal_plan_items item
      join public.meal_plans plan on plan.id = item.meal_plan_id
      where item.id = cooking_sessions.meal_plan_item_id and plan.user_id = auth.uid()
    )
  )
);
create policy recipe_favorites_own_rows on public.recipe_favorites
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_preferences_own_rows on public.user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_events_own_rows on public.user_events
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recommendation_runs_own_rows on public.recommendation_runs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy recommendation_feedback_own_rows on public.recommendation_feedback
for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_feedback.run_id and run.user_id = auth.uid()
  )
  and (
    candidate_id is null
    or exists (
      select 1 from public.recommendation_candidates candidate
      where candidate.id = recommendation_feedback.candidate_id
        and candidate.run_id = recommendation_feedback.run_id
    )
  )
);

create policy recognition_candidates_through_job on public.recognition_candidates
for all
using (
  exists (
    select 1 from public.recognition_jobs job
    where job.id = recognition_candidates.job_id and job.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recognition_jobs job
    where job.id = recognition_candidates.job_id and job.user_id = auth.uid()
  )
);

create policy meal_plan_items_through_plan on public.meal_plan_items
for all
using (
  exists (
    select 1 from public.meal_plans plan
    where plan.id = meal_plan_items.meal_plan_id and plan.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.meal_plans plan
    where plan.id = meal_plan_items.meal_plan_id and plan.user_id = auth.uid()
  )
);

create policy shopping_items_through_list on public.shopping_list_items
for all
using (
  exists (
    select 1 from public.shopping_lists list
    where list.id = shopping_list_items.shopping_list_id and list.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.shopping_lists list
    where list.id = shopping_list_items.shopping_list_id and list.user_id = auth.uid()
  )
);

create policy recommendation_inputs_through_run on public.recommendation_run_ingredients
for all
using (
  exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_run_ingredients.run_id and run.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_run_ingredients.run_id and run.user_id = auth.uid()
  )
  and (
    inventory_lot_id is null
    or exists (
      select 1 from public.inventory_lots lot
      where lot.id = recommendation_run_ingredients.inventory_lot_id and lot.user_id = auth.uid()
    )
  )
);

create policy recommendation_tools_through_run on public.recommendation_run_tools
for all
using (
  exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_run_tools.run_id and run.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_run_tools.run_id and run.user_id = auth.uid()
  )
);

create policy recommendation_candidates_through_run on public.recommendation_candidates
for all
using (
  exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_candidates.run_id and run.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.recommendation_runs run
    where run.id = recommendation_candidates.run_id and run.user_id = auth.uid()
  )
);

create policy recommendation_candidate_items_through_run
on public.recommendation_candidate_ingredients
for all
using (
  exists (
    select 1
    from public.recommendation_candidates candidate
    join public.recommendation_runs run on run.id = candidate.run_id
    where candidate.id = recommendation_candidate_ingredients.candidate_id
      and run.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.recommendation_candidates candidate
    join public.recommendation_runs run on run.id = candidate.run_id
    where candidate.id = recommendation_candidate_ingredients.candidate_id
      and run.user_id = auth.uid()
  )
);

revoke execute on function public.initialize_inventory_lot_balance() from public;
revoke execute on function public.record_initial_inventory_purchase() from public;
revoke execute on function public.apply_inventory_transaction(
  uuid,
  text,
  numeric,
  uuid,
  text,
  timestamptz,
  uuid,
  text,
  jsonb
) from public, anon;
grant execute on function public.apply_inventory_transaction(
  uuid,
  text,
  numeric,
  uuid,
  text,
  timestamptz,
  uuid,
  text,
  jsonb
) to authenticated;

revoke update, delete on public.inventory_lots from anon, authenticated;
grant update (
  storage_method_id,
  storage_location,
  opened_at,
  expires_at,
  price_amount,
  note,
  custom_tags
) on public.inventory_lots to authenticated;

revoke insert, update, delete on public.inventory_transactions from anon, authenticated;

commit;
