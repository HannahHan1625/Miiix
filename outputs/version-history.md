# Miiix Version History

## Versioning Rule

Miiix uses semantic product versioning:

- `MAJOR`: product positioning, platform, or architecture changes.
- `MINOR`: new user-facing workflow, page structure, or core interaction changes.
- `PATCH`: copy, bug fix, visual polish, and non-breaking refinement.

Each version gets a Chinese codename so product intent is memorable.

## v0.1.0 — 初始融合器

Date: 2026-06-27

Scope:

- Built the first React/Vite MVP.
- Implemented inventory, kitchen tool selection, recipe generation, favorites, cooked recipes, and shopping list flow.
- Added Capacitor iOS shell.
- Pushed initial version to GitHub.

Product judgment:

- Validated the basic inventory-to-recipe loop.
- Visual direction was still too prototype-like and lacked the desired fresh, realistic food feeling.

## v0.2.0 — 晨光冰箱

Date: 2026-06-29

Scope:

- Changed primary navigation to four tabs: Home, Warehouse, Recipes, Diary.
- Added home dashboard with username, product version, level badge, and data-driven persona logic.
- Added unified food upload entry with bottom sheet flow: photo, online screenshot, receipt, manual input.
- Added three-level food category picker and food information defaults.
- Added storage recommendations, shelf-life logic, freshness ratings, amount/weight slider, default price, and custom notes.
- Rebuilt warehouse visualization around a white retro fridge with open-door interaction and zone-based item placement.
- Added low-saturation blue/yellow visual language.
- Added recipe filters for all/favorites/cooked and cuisine.
- Added Today Eat What flow that produces shopping list output and diary record output.
- Added retro kitchen tool carousel.

Product judgment:

- This version moves Miiix from a feature demo toward an app-like daily cooking companion.
- The next quality gate is replacing MVP food photos with a licensed internal cutout asset library.

## v0.2.1 — 掌心仓库

Date: 2026-06-30

Scope:

- Forced the product shell into a mobile-first app width with a 430px max frame, safe-area-aware bottom navigation, and no horizontal overflow at a 390px viewport.
- Changed the warehouse tab from fridge-style visualization to direct ingredient management: summary metrics, storage zones, ingredient cards, freshness tags, amount, storage method, and price.
- Kept the home page focused on user identity, data visualization, upload entry, and a compact recent-ingredient preview.
- Verified the upload sheet at mobile width: four upload methods, category rows, ingredient image picker, editor controls, completion flip, and automatic navigation to Warehouse.
- Verified Recipes and Diary pages at mobile width with filters, recipe metadata, required ingredients, diary output, and no console errors.

Product judgment:

- v0.2.0 over-indexed on a visual metaphor. v0.2.1 corrects the MVP back to the core job: fast mobile inventory visibility and food decision support.
- The fridge concept can return later as a home visualization or personalization layer, but the Warehouse tab must remain operational and direct.
