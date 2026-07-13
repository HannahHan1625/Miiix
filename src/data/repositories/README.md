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
