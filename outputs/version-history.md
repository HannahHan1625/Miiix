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

## v0.2.2 — 滑动仓库账本

Date: 2026-07-05

Scope:

- Fixed Warehouse mobile overflow by constraining every warehouse layer to the app frame width.
- Changed Warehouse storage zones into horizontal image rails, so long rows such as seasonings can be swiped inside their own row without widening the page.
- Added ingredient selection inside the rails and a dedicated selected-ingredient detail panel.
- Rebuilt Diary as a calendar ledger inspired by bank income/expense pages: food storage is income, cooked dishes are expense.
- Calendar cells show daily `+` ingredient income and `-` dish expense counts; tapping a date updates the daily detail panel.

Product judgment:

- Inventory browsing should use local horizontal scrolling for dense categories, not vertical card sprawl.
- Diary is no longer a passive list; it becomes a behavioral ledger that can later support preference mining, waste tracking, and cooking frequency analysis.

## v0.2.3 — 识别入口

Date: 2026-07-05

Scope:

- Added real upload entry points for photo, online shopping screenshot, and receipt methods inside the unified ingredient upload sheet.
- Replaced the single `AI prefilled` text line with a recognized ingredient image grid.
- Each recognized ingredient now has a processing status badge, confidence, selectable image card, and ignore/restore control before saving.
- Completion now saves all non-ignored recognized ingredients, while keeping the currently selected item editable.
- Added photo and voice/text reverse-recipe entry in Recipes so users can infer a cooking method from dish image or sensory description.
- Added a recipe inference result card with confidence, clues, flavor direction, and step summary.

Product judgment:

- v0.2.3 closes an important interaction gap: upload methods must look actionable before real AI/OCR is connected.
- The current recognition is still mocked; the next quality gate is replacing presets with a real OCR/vision pipeline and persisting user corrections as training feedback.

## v0.3.0 — 融合工作台

Date: 2026-07-05

Scope:

- Reframed Warehouse from an inventory browsing page into Miiix's core fusion workbench.
- Added the core chain inside Warehouse: select ingredients, select kitchen tool, select food preference, then fuse.
- Rebuilt Warehouse layout around a calm canvas with high whitespace and a bottom material tray inspired by flower-arranging apps.
- Added bottom tray tabs for ingredients, tools, and preferences; each row uses local horizontal scrolling without widening the mobile page.
- Fusion now produces an immediate result in the main action strip; after fusing, the action changes from `Fuse` to `Add to Today`.
- Kept the downstream link to Diary and shopping-list generation through the existing `planToday` flow.

Product judgment:

- This is the first version where Warehouse behaves like the product's main creative engine instead of a storage utility.
- Recipes should remain the library and reverse-inference surface; Warehouse should be the active decision surface.
- The next quality gate is making fusion results more explainable and connecting them to real inventory deduction.

## v0.3.1 — 底部融合按钮

Date: 2026-07-05

Scope:

- Added a full-width fusion action button directly below the bottom material tray.
- Reused the same action state as the main strip: disabled before ingredient selection, `融合` after selecting ingredients, and `加入今天` after fusion.
- Extracted shared fusion action handling so the top result strip and bottom button cannot drift into different behavior.

Product judgment:

- The next action must live near the user's last action. After choosing ingredients/tools/preferences in the bottom tray, the user should not hunt upward for the fusion command.

## v0.3.2 — 融合推荐卡

Date: 2026-07-05

Scope:

- Checked and corrected kitchen-tool image/name matching: wok, steamer, oven, induction cooker, juicer, soy milk maker, and coffee machine now use matching visual assets and alt text.
- Replaced the fusion result status strip with a pop-up recommendation card anchored in the lower canvas area.
- Added a surprise pop animation and sparkle burst when the recommended dish appears.
- Styled the recommended dish image as a cutout-like card image with outline and drop shadow.
- Added recipe details to the generated dish card: time, difficulty, required ingredients, seasonings, cuisine, calories, and recommendation reason.
- Added card actions for `收藏` and `制作`.
- Changed `制作` into a flip-card interaction: the back side shows the cooking tutorial, tool, preference, cuisine, calories, and a final `加入今天` action.
- Changed the tray action after fusion from `加入今天` to `再融合`, so planning/cooking happens inside the dish card instead of the bottom tray.
- Aligned the warehouse fusion tray with the bottom navigation width at mobile viewport.
- Fixed the flip card hit-testing issue by raising the result popup above the sticky material tray and increasing card height so buttons are not clipped.

Product judgment:

- Fusion output must feel like a product reward, not a plain status update. The generated dish card turns the moment of recommendation into a clear decision point.
- The bottom tray should only control the creative input loop: select, fuse, regenerate. The dish card owns recipe-level actions: favorite, make, and add to today's diary.
- The next quality gate is persistence: generated favorites and diary/cooking records should survive reload and become usable preference-learning data.

## v0.3.3 — 贴底工作台

Date: 2026-07-06

Scope:

- Added a Warehouse-only screen class so the fusion workbench no longer inherits ordinary page padding and scrolling.
- Removed sticky positioning from the material tray.
- Changed Warehouse into a fixed-height workbench: the fusion canvas takes two thirds of the available screen area and the material tray takes the bottom third.
- Ensured the fusion canvas itself does not scroll; it stays a calm white-space work area.
- Reduced material tray card, image, tab, and button sizes so the tray no longer becomes a heavy half-screen panel.
- Made the material tray touch the bottom navigation directly, with matching left and right edges.
- Verified the fused recipe card remains inside the canvas and does not push the page into scrolling.

Product judgment:

- Warehouse is not a normal document page. It is the product's core creation surface, so its layout must be spatially controlled like a mobile tool.
- The canvas and the material tray have different responsibilities: the canvas is for composition and feedback; the tray is for choosing inputs and triggering fusion.
- The next quality gate is explaining the recommendation logic without reducing the white-space quality of the workbench.

## v0.3.4 — 居中推荐弹窗

Date: 2026-07-06

Scope:

- Changed the fusion recommendation card from a canvas-contained overlay to a page-level centered result layer.
- Added a soft full-page overlay so the recommendation reads as a result moment for the whole Warehouse page.
- Kept the card width constrained to mobile app width instead of spanning the full desktop viewport.
- Added a close button to the recommendation card so users can return to the workbench and keep their current ingredient selection.
- Verified the card center aligns with the viewport center, not the fusion canvas center.
- Verified `制作` still flips the card to the tutorial side.
- Verified `加入今天` still navigates to Diary and generates the shopping-list output.

Product judgment:

- The Warehouse canvas is for composing ingredients and tools; the generated recommendation is a page-level decision moment.
- A centered result layer makes the recommendation feel intentional and prevents the user from reading it as another object inside the canvas.
- The next quality gate is adding recommendation explanation inside or adjacent to this result layer without making the card feel crowded.

## v0.3.5 — 完整推荐卡

Date: 2026-07-06

Scope:

- Fixed the recommendation card height problem where the tutorial side clipped its bottom action buttons.
- Split both recommendation card faces into a scrollable content body and a persistent action area.
- Increased the centered modal card's usable mobile height while keeping it constrained inside the viewport.
- Kept the page-level centered popup behavior from v0.3.4.
- Verified at a 390 x 844 mobile viewport that the flipped tutorial card is centered, fully contained, and has no page overflow.
- Verified `加入今天` remains a valid click target after the card flips.

Product judgment:

- A recipe card is a decision surface, so its primary actions cannot depend on content length.
- The tutorial side needs a fixed interaction floor: instructions may grow, but `返回卡片` and `加入今天` must remain visible and clickable.
- The next quality gate is recommendation explanation and persistence, not more visual tuning on this card.

## v0.3.6 — 菜谱生命周期

Date: 2026-07-10

Scope:

- Reworked the fusion result flow from a two-action card into a recipe lifecycle.
- Split the generated dish meaning into candidate recipe, saved recipe, today's meal plan, and cooked diary record.
- Changed the fusion recommendation card primary action to `今天做`.
- Changed `制作` into `看做法`, so viewing the tutorial no longer implies the user already cooked the dish.
- Added `再融合` directly on the recommendation card.
- Made favoriting a generated fusion recipe save the full recipe object so it can appear in Recipes.
- Changed `planToday` so it creates today's plan and shopping list only; it no longer writes a cooked diary record.
- Added a Today Plan panel in Diary with `开始制作`, step expansion, and `完成制作`.
- Changed the diary write to happen only after `完成制作`.

Product judgment:

- The previous flow overloaded one `Recipe` object with four meanings: generated candidate, favorite, plan, and cooked record.
- The corrected lifecycle makes the user's commitment explicit: first decide, then plan, then cook, then record.
- The next quality gate is persistence, because this lifecycle now creates more meaningful state that must survive refresh.

## v0.3.7 — 领域模型拆分

Date: 2026-07-12

Scope:

- Split the 2,244-line `App.tsx` into app orchestration, shared UI, static catalog data, and five feature modules.
- Added four explicit domain models: inventory, recipe, meal plan, and diary.
- Moved freshness, ingredient formatting, recipe ingredient classification, shopping-list generation, calendar logic, and diary-entry creation into pure domain functions.
- Reduced `App.tsx` to the global state and page-composition layer.
- Removed inactive warehouse-management components left behind by the fusion-workbench redesign.
- Preserved the existing user-facing workflow and visual behavior.

Product judgment:

- This is a PATCH release because it changes internal structure without adding a user-facing workflow.
- The split creates a controlled boundary for persistence: v0.4.0 can store and restore domain state without coupling storage code to page components.
- New visual features remain paused until inventory, favorites, plans, and diary records survive refresh.
