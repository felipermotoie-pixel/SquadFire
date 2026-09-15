# Earth balance measurement — v0.4.0

Primary seed 1337 (Profile B decides). Supplemental seeds 17/29/43/71/101 (Profile B, robustness only). Viewport 402×874, dt 1/60.

**BALANCE VERDICT: BALANCE REVIEW REQUIRED**
**Boss approach: within 8–12 s target**

## Earth results (Profile B, primary seed)

| Stage | Count | HP | Spawn window | Measured clear | Peak active | Deferred | Avg active | Power at clear |
|---|---|---|---|---|---|---|---|---|
| 1 | 36 | 20 | 60 s | 63.1 s | 6 | 0 | 1.7 | 5 |
| 2 | 44 | 45 | 65 s | 70.2 s | 6 | 0 | 1.4 | 11 |
| 3 | 52 | 75 | 70 s | 74.1 s | 6 | 0 | 2.0 | 11 |
| 4 | 60 | 95 | 75 s | 77.7 s | 7 | 0 | 1.1 | 19 |
| 5 | 60 | 110 | 75 s | 82.5 s | 5 | 0 | 0.9 | 27 |
| 6 | 72 | 130 | 75 s | 80.9 s | 8 | 0 | 1.5 | 36 |
| 7 | 84 | 150 | 80 s | 83.2 s | 6 | 0 | 1.2 | 45 |
| 8 | 96 | 175 | 85 s | 86.2 s | 7 | 0 | 1.1 | 52 |
| 9 | 108 | 200 | 90 s | 91.4 s | 7 | 0 | 1.4 | 60 |
| 10 | 120 | 230 | 90 s | 97.3 s | 6 | 0 | 1.2 | 73 |

Run outcome: **victory** in 822.6 s (13.7 min). Gates crossed: 45.

## Bosses (primary seed)

| Boss | HP | Profile | Power at entry (visible) | DMG × FR | Gates before | Approach | Hold reached | Combat TTK | Spawn→death | Killed in approach | Overkill |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sub (stage 5) | 4500 | A | 1 (1) | 3.00 × 2.50 | 22 | 9.99 s (target 10) | yes | null | n/a s | no | 0 |
| sub (stage 5) | 4500 | B | 27 (9) | 2.92 × 1.32 | 20 | n/a s (target 10) | no | null | 2.54 s | YES | 26 |
| sub (stage 5) | 4500 | C | 27 (9) | 2.92 × 1.32 | 20 | n/a s (target 10) | no | null | 2.54 s | YES | 26 |
| final | — | A | not reached (defeat) | | | | | | | | |
| final (stage 10) | 18000 | B | 73 (10) | 2.92 × 2.50 | 45 | n/a s (target 10) | no | null | 1.33 s | YES | 18 |
| final (stage 10) | 18000 | C | 73 (10) | 2.92 × 2.50 | 45 | n/a s (target 10) | no | null | 1.33 s | YES | 18 |

- Sub-Boss (HP 4500) Profile B: REVIEW REQUIRED — window 8–20 s (preferred 10–20 s); killed during approach (combatTTK = null)
- Final Boss (HP 18000) Profile B: REVIEW REQUIRED — window 12–30 s (preferred 18–30 s); killed during approach (combatTTK = null)

## Supplemental seeds (Profile B)

| Seed | Outcome | Run time | Sub TTK | Sub killed in approach | Final TTK | Final killed in approach | Final power |
|---|---|---|---|---|---|---|---|
| 17 | victory | 823.0 s | null | YES | null | YES | 75 |
| 29 | victory | 823.1 s | null | YES | null | YES | 78 |
| 43 | victory | 813.3 s | null | YES | null | YES | 76 |
| 71 | victory | 819.5 s | null | YES | null | YES | 58 |
| 101 | victory | 825.6 s | null | YES | null | YES | 71 |
- sub: combatTTK min/median/max = n/a / n/a / n/a s over 0 measurable runs; spawn→death min/median/max = 0.99 / 1.23 / 2.93 s
- final: combatTTK min/median/max = n/a / n/a / n/a s over 0 measurable runs; spawn→death min/median/max = 1.49 / 1.75 / 4.11 s

## Gate choices (primary seed)

- Profile A: 22 gates (0 squad / 15 damage / 7 fire-rate), final power 0 (visible 0), mods 3.00 × 2.50, outcome defeat
  - S1@9s ×1.2 DMG, S1@27s ×1.2 DMG, S1@45s ×1.15 FR, S1@63s ×1.3 DMG, S2@81s ×1.15 FR, S2@99s ×1.3 DMG, S2@117s ×1.2 DMG, S2@135s ×1.3 DMG, S3@153s ×1.2 DMG, S3@171s ×1.2 DMG, S3@189s ×1.15 FR, S3@207s ×1.15 FR, S4@225s ×1.15 FR, S4@243s ×1.2 DMG, S4@261s ×1.3 DMG, S4@279s ×1.3 DMG, S4@297s ×1.2 DMG, S4@315s ×1.15 FR, S5@333s ×1.3 DMG, S5@351s ×1.3 DMG, S5@369s ×1.15 FR, S5@387s ×1.2 DMG
- Profile B: 45 gates (33 squad / 5 damage / 7 fire-rate), final power 73 (visible 10), mods 2.92 × 2.50, outcome victory
  - S1@9s +2 SQUAD, S1@27s +1 SQUAD, S1@45s +1 SQUAD, S1@63s +1 SQUAD, S2@81s +1 SQUAD, S2@99s +2 SQUAD, S2@117s +2 SQUAD, S2@135s ×1.3 DMG, S3@153s ×1.3 DMG, S3@171s ×1.2 DMG, S3@189s ×1.2 DMG, S3@207s ×1.2 DMG, S4@225s +3 SQUAD, S4@243s +2 SQUAD, S4@261s +3 SQUAD, S4@279s ×1.15 FR, S5@297s ×1.15 FR, S5@315s +3 SQUAD, S5@333s +3 SQUAD, S5@351s +2 SQUAD, S5@369s ×1.15 FR, S6@387s +2 SQUAD, S6@405s +2 SQUAD, S6@423s +3 SQUAD, S6@441s +2 SQUAD, S7@459s +3 SQUAD, S7@477s ×1.15 FR, S7@495s +3 SQUAD, S7@513s +3 SQUAD, S7@531s ×1.15 FR, S8@549s +3 SQUAD, S8@567s +2 SQUAD, S8@585s +2 SQUAD, S8@603s ×1.15 FR, S8@621s ×1.15 FR, S9@639s +1 SQUAD, S9@657s +2 SQUAD, S9@675s +3 SQUAD, S9@693s +2 SQUAD, S9@711s +2 SQUAD, S10@729s +2 SQUAD, S10@747s +2 SQUAD, S10@765s +3 SQUAD, S10@783s +2 SQUAD, S10@801s +2 SQUAD
- Profile C: 45 gates (33 squad / 5 damage / 7 fire-rate), final power 73 (visible 10), mods 2.92 × 2.50, outcome victory
  - S1@9s +2 SQUAD, S1@27s +1 SQUAD, S1@45s +1 SQUAD, S1@63s +1 SQUAD, S2@81s +1 SQUAD, S2@99s +2 SQUAD, S2@117s +2 SQUAD, S2@135s ×1.3 DMG, S3@153s ×1.3 DMG, S3@171s ×1.2 DMG, S3@189s ×1.2 DMG, S3@207s ×1.2 DMG, S4@225s +3 SQUAD, S4@243s +2 SQUAD, S4@261s +3 SQUAD, S4@279s ×1.15 FR, S5@297s ×1.15 FR, S5@315s +3 SQUAD, S5@333s +3 SQUAD, S5@351s +2 SQUAD, S5@369s ×1.15 FR, S6@387s +2 SQUAD, S6@405s +2 SQUAD, S6@423s +3 SQUAD, S6@441s +2 SQUAD, S7@459s +3 SQUAD, S7@477s ×1.15 FR, S7@495s +3 SQUAD, S7@513s +3 SQUAD, S7@531s ×1.15 FR, S8@549s +3 SQUAD, S8@567s +2 SQUAD, S8@585s +2 SQUAD, S8@603s ×1.15 FR, S8@621s ×1.15 FR, S9@639s +1 SQUAD, S9@657s +2 SQUAD, S9@675s +3 SQUAD, S9@693s +2 SQUAD, S9@711s +2 SQUAD, S10@729s +2 SQUAD, S10@747s +2 SQUAD, S10@765s +3 SQUAD, S10@783s +2 SQUAD, S10@801s +2 SQUAD

## Squad Power / overkill (primary seed, Profile B)

- 10 normals theoretical DPS: 200.0 · Power10 unit theoretical DPS: 200.0 (1 entity × 100 dmg × 2/s) — identical by construction; the difference is overkill granularity.
- damageDealt 129360 · overkillDamage 6533 (4.8 % of total output)
- peak visible soldiers 15 (≤ 50 required)

## Performance (headless)

- Profile A: sim avg 0.082 ms · peak 13.01 ms · peak projectiles 11 · pool exhausted 0 · peak visible 1
- Profile B: sim avg 0.112 ms · peak 11.87 ms · peak projectiles 769 · pool exhausted 0 · peak visible 15
- Profile C: sim avg 0.111 ms · peak 2.19 ms · peak projectiles 769 · pool exhausted 0 · peak visible 15
