# Verification

## September 18, 2026 — survivor relationships build

Verified on the recovered working copy, then committed and pushed as `be7a10b`.

- All 136 automated checks pass (`npm test`). They cover room transitions and prop reachability, the peaceful no-NPC route, worst-case ratman balance and death, turn control, defend, healing, fleeing, and invalid actions, then the full survivor matrix for Mara, Tobin and Vex: help, friendship, one-time rewards, remembered assistance, credible and exposed lies, pickpocketing, discovery on room exit, betrayal that helpful actions cannot erase, finite trade stock, payments entering the seller's wallet, nonlethal defeat, looting, waking, execution, and no duplicate rewards.
- The d20 rules checks pass for stealth, sleight of hand (including the worked example), persuasion, intimidation, perception, saving throws, advantage, disadvantage, and for ability scores surviving a save while old saves gain the defaults.
- Witness checks pass: a theft, an attack and a killing seen by an onlooker are remembered and change that onlooker's attitude, a witnessed helpful action warms them, an unwitnessed theft leaves no trace outside the victim, and witnessed knowledge survives a save round-trip.
- Cross-survivor checks pass: threats change attitudes and Vex fights back, open robbery is surrendered to by Mara and Tobin while Vex resists, Vex reacts to an earlier robbery or killing of Tobin, and exposed lies and failed thefts have lasting outcomes.
- Playthrough checks pass: a full helpful run ends with three allies, information rewards and stronger attacks; a manipulative run ends with successful thefts, exposed reputation and betrayal; a violent run ends with all three dead, empty inventories and a still-usable exit. The three completed saves produce noticeably different end states.
- Save integrity passes: version 1 saves migrate attitudes, deaths and inventories without reviving anyone, malformed saves fail safely, and unconscious and completed saves round-trip.
- Input checks pass: held direction repeats, release stops, a click does not double-step, cancelled touches and app pause stop movement, and only the active finger owns direction.
- The static build passes (`npm run build`) and every runtime file, including `src/npcs.mjs`, is served over HTTP with the expected contents by the local preview server.

Not verified in this pass: no browser click-through of the NPC tabs, relationship panel, or completion summary was performed, and no physical phone testing was done.

## September 16, 2026 — mobile interface

Recorded by the earlier session on the commit that introduced the following camera and in-game panels.

- 12 automated checks passed at that time, covering held direction timing, no duplicate click movement, pointer cancellation, stopping on pause, multi-touch ownership, and disabled controls.
- Inspected 390 × 844 and 320 × 568 portrait layouts plus 844 × 390 landscape. Confirmed the page dimensions match the viewport without page overflow, and all four combat actions fit at 320 × 568.
- In the browser, restored a save from the original interface, moved across rooms with the new controls and camera, opened pack and pause panels, inspected the recovery station, collected a key, and defeated the ratman using the combat dock. Potion use and the return to exploration worked.
- Home Screen manifest and icon included.

## Still unverified

- Physical iPhone Safari, OS-level Home Screen installation, and safe-area behavior on real hardware.
- Offline play has only been exercised against a simulated service worker, not on a phone with the network switched off.
- Screen-reader completeness of the canvas map, which is documented as a known limitation in the README.
