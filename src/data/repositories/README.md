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

v0.4.2 ships an IndexedDB v2 adapter in `indexeddb/`:

- `schema.ts` owns browser stores, indexes, and the local database version.
- `catalogSeed.ts` imports one versioned catalog snapshot atomically, stores its digest, and migrates known legacy ingredient references without touching user quantities, prices, dates, or balances.
- `catalogRepository.ts` reads the persisted catalog and supports ID, canonical-name, approved-alias, category, storage-method, kind, and status queries.
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

The catalog seed version is intentionally separate from the local kitchen demo seed. Re-importing the same version and digest is a no-op. Replacing a snapshot and updating legacy references share one transaction, so a failed import keeps both the previous catalog and user references intact.

Run the catalog gates with:

```bash
pnpm run validate:catalog
pnpm run test
```
