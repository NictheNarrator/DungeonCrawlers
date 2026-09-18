# DungeonCrawlers — Floor One

A complete small browser dungeon: five connected rooms, three rival survivors who remember how you treat them, original pixel-style canvas art, touch and keyboard controls, turn-based combat with lethal and nonlethal intent, dialogue choices, inventory, achievements, loot boxes, and browser saves.

## Play on your phone

Open [DungeonCrawlers](https://nicthenarrator.github.io/DungeonCrawlers/) in Safari. The game uses one full-height screen with a following camera, hold-to-move direction pad, contextual interaction/combat dock, and in-game pack, notes, and pause panels. No page scrolling is needed to play. Portrait is the primary layout; phone landscape puts the controls beside the dungeon.

For a standalone window, use Safari's Share menu to add the game to your Home Screen. A manifest, app icon, and iOS standalone metadata are included. After one online visit the game is cached and playable with no connection. Existing saves are compatible.

## Run

Requires Node.js 16 or later. There are no package dependencies to install.

```sh
npm test
npm run build
npm run dev
```

Open `http://localhost:4173` on the computer running the server. A localhost address will not open this computer's game on a remote phone. To play on an iPhone, host the contents of `dist/` with a static hosting provider, or use the computer's LAN address while both devices are on the same network. The server is for local development, not production hosting.

`npm run build` copies the runtime files and Home Screen assets into `dist/`. All asset links are relative so subdirectory hosting works. No backend, paid service, gameplay API, or build dependency is needed. Google Fonts are optional; system fallback fonts work offline. The game uses native browser canvas and JavaScript modules instead of Phaser/TypeScript to keep this version portable and installation-free.

## Play

- Move with WASD, arrow keys, the on-screen direction buttons, or by tapping an adjacent empty tile.
- Doorways are centered on the west and east walls and work in both directions. Walk through to change rooms.
- Stand beside a prop or character. Choose an action in Nearby / Actions; tap Interact to open its action dock. All placed props support Inspect.
- Intake's recovery station heals you completely. The welcome terminal explains who else is in the building.
- Lost Property holds a chest (6 coins, a potion, a repair kit), a crate of pungent cheese, a sponsor memo, and Tobin. Cheese pays the ratman's toll in Pest Control.
- The Holdout holds Mara and an emergency locker with a free spare exit key. That key is available even if every other survivor dies.
- Pest Control holds the ratman custodian and a loose pipe with a hidden cache. Pay the cheese toll, sneak past, walk around, or fight.
- Departures holds Vex, a departure plaque, and the stairs. Use any exit key on the stairs to finish.

## Survivors

Mara, Tobin, and Vex each want something, and each keeps a permanent record of how you treat them. Attitudes are friendly, neutral, suspicious, or hostile; conditions are conscious, unconscious, or dead. Both persist in the save, along with injuries, inventories, and memories.

| Survivor | Wants | Sells | Befriend reward |
| --- | --- | --- | --- |
| Mara, cautious survivor (20 HP, 4–6 damage) | a bandage, or a potion | potions, 3 coins | her exit key and advice on the healing station |
| Tobin, suspicious scavenger (16 HP, 2–4 damage) | a repair kit, or 2 coins | smoke bombs, 4 coins | coins behind the loose pipe, plus a smoke bomb |
| Vex, dangerous rival (28 HP, 5–7 damage) | the maintenance memo read aloud, or a potion | whetstones, 4 coins | permanent +1 attack damage |

Approaches are grouped into Social, Supplies, and Conflict tabs: Talk, Help, Befriend, Lie, Trade, Pickpocket, Rob openly, Threaten, Attack, Knock unconscious, and Kill, filtered by reach and by the survivor's condition.

- A lie is only credible once you have read the sponsor memo. It buys one pickpocket window and a 1-coin trade discount; speaking to them again exposes it.
- Theft is noticed as you leave the room. A detected thief turns hostile and is permanently refused trade and friendship.
- Vex reacts to what happened to Tobin: robbery makes Vex suspicious and unbefriendable, and killing Tobin makes Vex hostile.
- Helping does not erase betrayal. Robbing, threatening, attacking, or lying leaves a memory that blocks friendship permanently.
- Nonlethal victory leaves someone alive and unconscious. You can loot, wake, or kill them from there. Waking restores a quarter of their health, none of their inventory, and none of their trust.
- Beaten survivors can be looted once. Possessions do not respawn, and payments enter the seller's own wallet.
- Field notes list each survivor's attitude, condition, and shared history.

## Combat

You start with 30 HP and deal 5–7 damage, plus a permanent point for each whetstone used and one more for Vex's training. The ratman custodian has 12 HP and deals 2–3; Mara has 20 HP and deals 4–6; Tobin has 16 HP and deals 2–4; Vex has 28 HP and deals 5–7.

Nonlethal strikes deal 1 less damage and knock out instead of killing. Switching intent is free and does not consume a turn. Every successful action permits one enemy response, except a killing blow, and a smoke bomb escapes with no retaliation at all. Defend halves the next hit, rounded down. A potion heals 10 HP and consumes a turn; an invalid potion attempt does not. Flee always succeeds after one enemy hit, unless that hit kills you. The UI prevents rapid duplicate activation, and opening menus never advances combat.

## Saves and death

Autosaves occur after movement and successful interactions outside combat; manual Save is also available. Saves use versioned localStorage (version 2) and stay in this browser on this device and site. Version 1 saves migrate by filling in attitudes, conditions, inventories, and migration defaults without reviving anyone who died, and a save can never be written while dead or mid-combat. Private browsing or browser settings may disable saving. Missing or malformed saves are rejected. Combat and death never overwrite the last living checkpoint. Load Save and New Game remain available after death and completion, and New Game requires confirmation.

Achievements award one loot box each: Cheese diplomacy, Quiet quitting, Pipe dream, People person, Mutual inventory, and Worthy rival. Boxes contain a potion and open only outside combat. The completion screen reports how each survivor ended up, including everything they remember about you.

## Files

- `src/engine.mjs`: rules, room geometry, props, inventory, combat, save validation and migration.
- `src/npcs.mjs`: the four characters, attitudes, memories, trade pricing, theft and rumour rules.
- `src/app.mjs`: mobile UI, following camera, original canvas sprites, persistence, relationship panel.
- `src/controls.mjs`: pointer ownership, held movement, release/cancel handling.
- `style.css`, `index.html`: responsive presentation and accessible HTML controls.
- `tests.mjs`: deterministic gameplay, NPC, save-integrity and input checks.
- `server.mjs`: dependency-free local preview server.
- `build.mjs`: static distribution build.

## Scope

This is a compact first floor, not an open-ended RPG. Dialogue is authored; arbitrary typed actions are not supported. Survivors stay where they are placed and never patrol or pursue. Sneaking is an authored peaceful choice. The three survivors and the ratman are the only characters, and there is no audio, cross-device save sync, or offline caching. The canvas map has keyboard controls and an accessible text action panel, but is not a fully screen-reader-accessible game. Phone-sized browser testing does not replace testing on physical iPhone Safari.
