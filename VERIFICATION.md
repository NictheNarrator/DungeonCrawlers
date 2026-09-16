# Verification

Verified September 16, 2026.

- All 9 automated gameplay checks pass (`npm test`). They cover room transitions, collision, a complete peaceful route, worst-case ratman balance, turn order, defend, healing, fleeing, death, NPC choices, key recovery, reward duplication, and malformed/round-trip saves.
- Static build passes (`npm run build`); browser module syntax checks pass.
- Inspected desktop and 390 × 844 mobile layouts in a real browser.
- Used on-screen movement to traverse all five rooms, collected the chest and free exit key, fought and defeated the ratman, healed, and unlocked the exit. The completion dialog appeared.
- Verified live combat: 30 starting HP, three attacks, exactly two ratman responses, 25 HP after victory; no retaliation on the killing blow.
- Reloaded the browser and used Continue. Location, opened chest, six coins, and three potions restored correctly.

Not tested on a physical iPhone/Safari. UI death/restart and all NPC dialogue branches are covered in rules tests where applicable but not exhaustively exercised through browser clicks. No public hosting was configured.
