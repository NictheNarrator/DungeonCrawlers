# DungeonCrawlers — Floor One

A complete small browser dungeon: five connected rooms, original pixel-style canvas art, touch and keyboard controls, turn-based combat, dialogue choices, inventory, achievements, loot boxes, and browser saves.

## Run

Requires Node.js 16 or later. There are no package dependencies to install.

```sh
npm test
npm run build
npm run dev
```

Open `http://localhost:4173` on the computer running the server. A localhost address will not open this computer’s game on a remote phone. To play on an iPhone, host the contents of `dist/` with a static hosting provider, or use the computer’s LAN address while both devices are on the same network. The server is for local development, not production hosting.

`npm run build` copies the four runtime files into `dist/`. All asset links are relative so subdirectory hosting works. No backend, paid service, gameplay API, or build dependency is needed. Google Fonts are optional; system fallback fonts work offline. The game uses native browser canvas and JavaScript modules instead of Phaser/TypeScript to keep this initial version portable and installation-free.

## Play

- Move with WASD, arrow keys, the on-screen direction buttons, or by tapping an adjacent empty tile.
- Doorways are centered on the west/east walls. Walk through to the next room.
- Stand beside a prop or character. Choose an action in Nearby / Actions; use E or Interact to focus the nearby object. All placed props support Inspect.
- Intake’s recovery station heals you completely. Lost Property contains coins, a potion, cheese, and a memo.
- Talk to Mara and befriend her, trade, threaten, steal, fight, or take a free spare key from her emergency locker. Hostility begins combat immediately; after fleeing, re-engagement is manual. Essential keys remain available after Mara dies.
- Offer the ratman cheese, sneak past, walk around, or fight. Search the loose pipe for a secret.
- Use an exit key on the stairs in Departures to finish.

Combat: 30 player HP, attacks deal 5–7 damage. Ratman has 12 HP and deals 2–3. Mara has 20 HP and deals 4–6. Every successful action permits one enemy response, except killing blows. Defend halves the next hit, rounded down. A potion heals 10 HP and consumes a turn; an invalid potion attempt does not. Flee always succeeds after one enemy hit, unless that hit kills you. The UI prevents rapid duplicate activation. Opening menus never advances combat.

Achievements award one loot box each. Boxes contain a potion and open only outside combat. Rewards, opened containers, inventory, NPC state, health, location, and progression are all saved together, preventing reward duplication on reload.

## Saves and death

Autosaves occur after movement and successful interactions outside combat; manual Save is also available. Saves use versioned localStorage and stay in this browser on this device and site. Private browsing or browser settings may disable saving. Missing or malformed saves are rejected. Combat and death never overwrite the last living checkpoint. Load Save and New Game remain available after death and completion. New Game requires confirmation before replacing a save.

## Files

- `src/engine.mjs`: rules, inventory, NPC interactions, combat, save validation.
- `src/app.mjs`: UI, original canvas sprites, controls, persistence.
- `style.css`, `index.html`: responsive presentation and accessible HTML controls.
- `tests.mjs`: deterministic gameplay and save-integrity checks.
- `server.mjs`: dependency-free local preview server.
- `build.mjs`: static distribution build.

## Scope

This is a compact first floor, not an open-ended RPG. Dialogue is authored; arbitrary typed actions are not supported. Enemies do not patrol or automatically pursue. Sneaking is an authored peaceful choice. There is no cross-device save sync or audio. The canvas map has keyboard controls and an accessible text action panel, but is not a fully screen-reader-accessible game. Phone-sized browser testing does not replace testing on physical iPhone Safari.
