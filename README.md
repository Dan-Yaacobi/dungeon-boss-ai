# Dungeon Realms — The Shattered Crown

An original single-player browser RPG built with Three.js, TypeScript, Vite, HTML/CSS, and synthesized Web Audio. Collect twenty heroes, assemble a four-person party, restore six regions, and raid enemy strongholds. No server, accounts, energy timers, purchases, or external game assets.

## Run

Requires Node.js 22.12+ (validated on Node 24).

```sh
npm install
npm run dev
```

```sh
npm run build       # Type-check and build dist/
npm test            # Engine and progression tests
npm run simulate    # Seeded balance and fresh-save campaign simulations
npm run test:e2e    # Chromium browser journey tests
```

Browser tests use `/usr/bin/chromium` in this cloud machine. Set `CHROMIUM_PATH` to another installed Chromium executable on other systems. Vite serves on port 5173 unless occupied. `dist/` is a static-site build; serve it over HTTP. No runtime network access is required: fonts, models, audio synthesis, and content are included locally.

If npm's default cache is unwritable in a restricted machine, use `npm install --cache /workspace/.npm-cache`.

## Play

Begin a new adventure, dismiss the introduction, and enter the campaign through the gate or navigation. Choose a stage, inspect your party, then enter each room. Select an ability and click a character or its health label. All-target and self abilities execute immediately. Keys **1–5** select actions, **Enter** uses the selected action on the first valid target, and **Escape** pauses. Use the speed control or optional tactical auto-combat at any point.

Basic attacks and Guard replenish focus. Active abilities unlock at levels 1, 3, and 5. Poison, Burn, and Bleed reward sustained pressure; healing and protection make long expeditions safer. Recruit Sylwen early through the Portal for a dedicated healer: the initial gems can fund her final five shards. Edit the party in the Hero Hall.

Chests grant resources immediately. Shrines heal and revive. Dungeon/raid completion grants gold, gems, materials, equipment, shards, and party XP. Spend gold at Training, equip and enhance loot in the Armory, and claim completed quests. Replays always grant progression resources. Every hero is obtainable through targeted shards, without random summons.

## Saves

Progress is stored in browser LocalStorage under `dungeon-realms-v1`. Autosave follows meaningful progression changes. Settings provides Export and Import with validation and overwrite confirmation. Keep exported backups before clearing browser data. Active expeditions are intentionally transient; chest rewards and completed-battle objectives are retained, but return to town after completion before closing the browser to retain full expedition rewards.

## Architecture

- `src/content.ts`: heroes, abilities, enemies, regions, campaign, raids, equipment, objectives, elemental rules.
- `src/combat.ts`: deterministic turn engine, AI, damage, effects, summons, boss phases.
- `src/state.ts`: persistent progression, economy, validation, rewards, equipment.
- `src/geometry.ts`: batching of rigid mesh components while preserving animated rigs and picking.
- `src/scene.ts`: procedural original character models, town, arenas, animation, effects, Three.js lifecycle.
- `src/audio.ts`: synthesized score and effects with separate music/SFX controls.
- `src/main.ts`: screen rendering, input, expedition orchestration, presentation scheduling.
- `src/style.css`: responsive fantasy UI.
- `tests/`: unit/integration and browser tests.
- `scripts/simulate.ts`: reproducible seeded encounter, raid, and campaign progression checks.

See [game design](docs/GAME_DESIGN.md), [hero roster](docs/HEROES.md), [combat and balance](docs/COMBAT.md), [progress and test evidence](docs/PROGRESS.md), and [feature completion report](docs/COMPLETION.md).

## Original assets and licenses

All game characters, geometry, animations, symbols composed into the game, environments, and procedural audio are original project code. No Dungeon Boss proprietary assets are included. The game draws inspiration from collectible figurine parties and compact angled arenas; it is not an official remake or affiliated product. Cinzel and Inter are bundled from Fontsource under the SIL Open Font License; license files are included in `docs/licenses/`. Third-party packages retain their own licenses.

## Graphics and performance diagnostics

Use `?quality=low` for cloud software rendering: it reduces pixel density and disables shadows. The normal mode retains shadows and full detail. Both use the same content, controls, and combat rules. Hardware performance varies; see `docs/performance-results.json` for measured cloud renderer results.

To repeat the production benchmark, start `npm exec vite preview -- --port 4173` after building, then run `npm exec tsx scripts/benchmark.ts` in another terminal. `CHROMIUM_PATH` can select a different installed Chromium. The script records frame timing, runtime errors, and diagnostic JS heap values around repeated scene transitions. GPU resource disposal has regression tests.
