# Verification

Verified September 16, 2026.

- All 9 automated gameplay checks pass (`npm test`). They cover room transitions, collision, a complete peaceful route, worst-case ratman balance, turn order, defend, healing, fleeing, death, NPC choices, key recovery, reward duplication, and malformed/round-trip saves.
- Static build passes (`npm run build`); browser module syntax checks pass.
- Inspected desktop and 390 × 844 mobile layouts in a real browser.
- Used on-screen movement to traverse all five rooms, collected the chest and free exit key, fought and defeated the ratman, healed, and unlocked the exit. The completion dialog appeared.
- Verified live combat: 30 starting HP, three attacks, exactly two ratman responses, 25 HP after victory; no retaliation on the killing blow.
- Reloaded the browser and used Continue. Location, opened chest, six coins, and three potions restored correctly.

Not tested on a physical iPhone/Safari. UI death/restart and all NPC dialogue branches are covered in rules tests where applicable but not exhaustively exercised through browser clicks. No public hosting was configured.

## Mobile interface update

- 12 automated checks pass, including held direction timing, no duplicate click movement, pointer cancellation, stopping on pause, multi-touch ownership, and disabled controls.
- Inspected 390 × 844 and 320 × 568 portrait layouts plus 844 × 390 landscape. Confirmed the page dimensions match the viewport without page overflow, and all four combat actions fit at 320 × 568.
- In the browser, restored a save from the original interface, moved across rooms with the new controls/camera, opened pack/pause panels, inspected the recovery station, collected a key, and defeated the ratman using the combat dock. Potion use and the return to exploration worked.
- Home Screen manifest and icon included. Physical iPhone Safari, OS-level installation, and safe-area behavior on real hardware remain unverified. No offline service worker is included.
