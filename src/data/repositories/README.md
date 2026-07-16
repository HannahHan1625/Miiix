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

v0.4.1 ships an IndexedDB adapter in `indexeddb/`:

- `schema.ts` owns browser stores, indexes, and the local database version.
- `operationalRepositories.ts` implements inventory, recipe, planning, cooking, recognition, and recommendation contracts.
- `provider.ts` assembles the repositories and provides an atomic transaction boundary.
- `application/kitchenPersistence.ts` coordinates the product workflow while depending on `RepositoryProvider`, not IndexedDB APIs.

The distinction is deliberate:

- A **Repository** states what the product can ask for, such as `createLot` or `completeSession`.
- An **Adapter** translates those requests into one storage technology, currently IndexedDB and later Supabase.
- A **Provider** assembles all repository adapters and exposes one transaction boundary to the application.

Inventory deduction and cooking completion run in one transaction. Cooking sessions and inventory transactions carry idempotency keys, so retrying the same completion returns the existing records instead of deducting stock again.
