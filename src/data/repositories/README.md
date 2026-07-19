# Repository Boundary

Product features must depend on the interfaces in `contracts.ts`, not on Supabase, localStorage, or IndexedDB APIs.

For example, the Warehouse feature should call:

```ts
const lots = await repositories.inventory.listAvailableLots(userId);
```

It should not call:

```ts
supabase.from("inventory_lots").select("*");
```

This boundary provides three controls:

1. Storage can move from the current React memory state to IndexedDB and then Supabase without rewriting product screens.
2. Tests can use an in-memory implementation without a network connection.
3. Authorization, retries, mapping, and database column names stay outside UI components.

`contracts.ts` is the stable product-facing contract. A future `supabase/` adapter will implement it and translate snake_case database rows into camelCase domain records.

## Current Adapter

v0.4.2.1 ships an IndexedDB v3 adapter in `indexeddb/`:

- `schema.ts` owns browser stores, indexes, and the local database version.
- `catalogSeed.ts` imports one versioned catalog snapshot atomically, stores its digest, persists source/import/form governance, and migrates only known Miiix legacy-reference fields plus missing ingredient specs without touching external provider IDs, explicit user forms, quantities, prices, dates, or balances.
- `catalogRepository.ts` reads the persisted catalog and supports ID, canonical-name, approved-alias, category, storage-method, concept, record-role, form, kind and status queries. It also exposes sources/import batches/forms; business mapping queries return only approved evidence, and concept mappings reach a form projection only through an explicit inheritance policy.
- `operationalRepositories.ts` implements inventory, recipe, planning, cooking, recognition, and recommendation contracts.
- `provider.ts` assembles the repositories and provides an atomic transaction boundary.
- `application/kitchenPersistence.ts` coordinates the product workflow while depending on `RepositoryProvider`, not IndexedDB APIs.

The distinction is deliberate:

- A **Repository** states what the product can ask for, such as `createLot` or `completeSession`.
- An **Adapter** translates those requests into one storage technology, currently IndexedDB and later Supabase.
- A **Provider** assembles all repository adapters and exposes one transaction boundary to the application.

Inventory deduction and cooking completion run in one transaction. Cooking sessions and inventory transactions carry idempotency keys, so retrying the same completion returns the existing records instead of deducting stock again.

## Catalog Read Boundary

The JSON golden set is an import artifact, not a second runtime repository. On provider startup it is validated by tests, seeded into IndexedDB, and exposed through `CatalogRepository`. Application code builds a display projection from that contract; feature modules do not query object stores or infer ingredient identity from Chinese strings.

The catalog seed version is intentionally separate from the local kitchen demo seed. Re-importing the same version and digest is a no-op; changed content under an existing version is rejected, so a replacement must bump `catalogVersion`. Importing that new snapshot and updating legacy references share one transaction, so a failed import keeps both the previous catalog and user references intact.

Normal labels and historical technical IDs use different APIs. `resolveIngredientAlias()` may be used by user input adapters; `resolveLegacyIngredientId(id, "miiix-v0.4.1")` exists only for compatibility migration. This prevents the historical ID `pork` from overriding the ordinary English meaning of pork.

An inventory record carries both the selected Catalog `ingredientId` and its effective `conceptId / variantId / formCode / processState`. A lot bought as pork mince is a normal `purchased` ground-form lot. A lot produced by the user is not accepted by generic `createLot`: the future transformation use case must consume the source lot and create the derived lot in one transaction.

Recipe and shopping projections retain the same effective spec after persistence. Availability compares concept identity first, treats `unspecified` requirement axes as wildcards, and never claims that an unspecified lot already satisfies an explicitly ground requirement. Recognition corrections resolve the selected Catalog record and update identity/form/process in the same IndexedDB transaction.

Run the catalog gates with:

```bash
pnpm run validate:catalog
pnpm run test
```
