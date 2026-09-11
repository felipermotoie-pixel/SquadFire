# Earth balance measurement — v0.4.0

Primary seed 1337 (Profile B decides). Supplemental seeds 17/29/43/71/101 (Profile B, robustness only). Viewport 402×874, dt 1/60.

**BALANCE VERDICT: BALANCE REVIEW REQUIRED**
**Boss approach: within 8–12 s target**

## Earth results (Profile B, primary seed)

| Stage | Count | HP | Spawn window | Measured clear | Peak active | Deferred | Avg active | Power at clear |
|---|---|---|---|---|---|---|---|---|
| 1 | 36 | 20 | 60 s | 63.1 s | 4 | 0 | 1.0 | 9 |
| 2 | 44 | 30 | 65 s | 68.2 s | 5 | 0 | 1.4 | 13 |
| 3 | 52 | 40 | 70 s | 73.0 s | 6 | 0 | 1.7 | 13 |
| 4 | 60 | 50 | 75 s | 76.1 s | 5 | 0 | 1.3 | 13 |
| 5 | 60 | 50 | 75 s | 81.2 s | 8 | 0 | 1.3 | 13 |
| 6 | 72 | 60 | 75 s | 77.3 s | 10 | 0 | 1.8 | 13 |
| 7 | 84 | 70 | 80 s | 85.0 s | 12 | 0 | 2.4 | 13 |
| 8 | 96 | 80 | 85 s | 91.6 s | 7 | 0 | 2.1 | 13 |
| 9 | 108 | 100 | 90 s | 95.2 s | 10 | 0 | 3.8 | 13 |
| 10 | 120 | 120 | 90 s | 105.3 s | 12 | 0 | 1.8 | 13 |

Run outcome: **victory** in 832.0 s (13.9 min). Gates crossed: 68.

## Bosses (primary seed)

| Boss | HP | Profile | Power at entry (visible) | DMG × FR | Gates before | Approach | Hold reached | Combat TTK | Spawn→death | Killed in approach | Overkill |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sub (stage 5) | 4500 | A | 5 (5) | 3.00 × 2.50 | 30 | n/a s (target 10) | no | null | 7.29 s | YES | 0 |
| sub (stage 5) | 4500 | B | 13 (2) | 3.00 × 2.50 | 29 | n/a s (target 10) | no | null | 2.12 s | YES | 270 |
| sub (stage 5) | 4500 | C | 94 (10) | 3.00 × 2.44 | 30 | n/a s (target 10) | no | null | 0.13 s | YES | 240 |
| final (stage 10) | 18000 | A | 5 (5) | 3.00 × 2.50 | 67 | 9.99 s (target 10) | yes | 18.63 s | 28.62 s | no | 0 |
| final (stage 10) | 18000 | B | 13 (2) | 3.00 × 2.50 | 67 | n/a s (target 10) | no | null | 7.77 s | YES | 30 |
| final (stage 10) | 18000 | C | 242 (25) | 3.00 × 2.50 | 67 | n/a s (target 10) | no | null | 0.61 s | YES | 240 |

- Sub-Boss (HP 4500) Profile B: REVIEW REQUIRED — window 8–20 s (preferred 10–20 s); killed during approach (combatTTK = null)
- Final Boss (HP 18000) Profile B: REVIEW REQUIRED — window 12–30 s (preferred 18–30 s); killed during approach (combatTTK = null)

## Supplemental seeds (Profile B)

| Seed | Outcome | Run time | Sub TTK | Sub killed in approach | Final TTK | Final killed in approach | Final power |
|---|---|---|---|---|---|---|---|
| 17 | victory | 835.2 s | null | YES | null | YES | 15 |
| 29 | victory | 833.2 s | null | YES | null | YES | 17 |
| 43 | victory | 832.5 s | null | YES | null | YES | 14 |
| 71 | victory | 829.5 s | null | YES | null | YES | 13 |
| 101 | victory | 831.9 s | null | YES | null | YES | 18 |
- sub: combatTTK min/median/max = n/a / n/a / n/a s over 0 measurable runs; spawn→death min/median/max = 1.33 / 1.66 / 2.35 s
- final: combatTTK min/median/max = n/a / n/a / n/a s over 0 measurable runs; spawn→death min/median/max = 7.43 / 7.79 / 8.27 s

## Gate choices (primary seed)

- Profile A: 68 gates (0 squad / 48 damage / 20 fire-rate), final power 2 (visible 2), mods 3.00 × 2.50, outcome victory
  - S1@9s ×1.25 FR, S1@21s ×1.5 DMG, S1@33s ×1.25 FR, S1@45s ×1.5 DMG, S1@57s ×1.5 DMG, S2@69s ×2 DMG, S2@81s ×1.25 FR, S2@93s ×1.5 DMG, S2@105s ×1.5 DMG, S2@117s ×1.25 FR, S2@129s ×1.5 DMG, S3@141s ×2 DMG, S3@153s ×1.25 FR, S3@165s ×2 DMG, S3@177s ×1.25 FR, S3@189s ×2 DMG, S3@201s ×2 DMG, S4@213s ×1.25 FR, S4@225s ×1.25 FR, S4@237s ×2 DMG, S4@249s ×1.25 FR, S4@261s ×2 DMG, S4@273s ×1.5 DMG, S4@285s ×1.5 DMG, S5@297s ×1.5 DMG, S5@309s ×2 DMG, S5@321s ×1.5 DMG, S5@333s ×1.5 DMG, S5@345s ×2 DMG, S5@357s ×2 DMG, S5@369s ×2 DMG, S5@382s ×2 DMG, S6@394s ×1.25 FR, S6@406s ×2 DMG, S6@418s ×1.25 FR, S6@430s ×2 DMG, S6@442s ×2 DMG, S6@454s ×1.5 DMG, S7@466s ×1.25 FR, S7@478s ×1.25 FR, S7@490s ×2 DMG, S7@502s ×2 DMG, S7@514s ×2 DMG, S7@526s ×1.25 FR, S7@538s ×1.25 FR, S8@550s ×2 DMG, S8@562s ×1.25 FR, S8@574s ×1.25 FR, S8@586s ×2 DMG, S8@598s ×2 DMG, S8@610s ×1.25 FR, S8@622s ×1.5 DMG, S8@634s ×1.5 DMG, S9@646s ×1.5 DMG, S9@658s ×2 DMG, S9@670s ×2 DMG, S9@682s ×1.5 DMG, S9@694s ×2 DMG, S9@706s ×1.5 DMG, S9@718s ×2 DMG, S10@730s ×1.5 DMG, S10@742s ×2 DMG, S10@754s ×1.25 FR, S10@766s ×1.5 DMG, S10@778s ×1.5 DMG, S10@790s ×1.25 FR, S10@802s ×2 DMG, S10@814s ×2 DMG
- Profile B: 68 gates (2 squad / 39 damage / 27 fire-rate), final power 13 (visible 2), mods 3.00 × 2.50, outcome victory
  - S1@9s ×1.25 FR, S1@21s ×1.5 DMG, S1@33s ×1.25 FR, S1@45s +4 SQUAD, S1@57s +4 SQUAD, S2@69s ×1.25 FR, S2@81s ×1.5 DMG, S2@93s ×1.25 FR, S2@105s ×1.25 FR, S2@117s ×1.25 FR, S2@129s ×1.25 FR, S3@141s ×1.25 FR, S3@153s ×1.25 FR, S3@165s ×1.25 FR, S3@177s ×1.5 DMG, S3@189s ×1.25 FR, S3@201s ×1.5 DMG, S4@213s ×2 DMG, S4@225s ×1.5 DMG, S4@237s ×2 DMG, S4@249s ×1.25 FR, S4@261s ×1.25 FR, S4@273s ×2 DMG, S4@285s ×1.25 FR, S5@297s ×1.5 DMG, S5@309s ×1.5 DMG, S5@321s ×1.25 FR, S5@333s ×2 DMG, S5@345s ×1.25 FR, S5@357s ×1.25 FR, S5@369s ×1.5 DMG, S6@381s ×1.25 FR, S6@393s ×2 DMG, S6@405s ×1.5 DMG, S6@417s ×1.25 FR, S6@429s ×2 DMG, S6@441s ×2 DMG, S7@453s ×1.25 FR, S7@465s ×2 DMG, S7@477s ×2 DMG, S7@489s ×2 DMG, S7@501s ×2 DMG, S7@513s ×2 DMG, S7@525s ×1.5 DMG, S8@537s ×1.25 FR, S8@549s ×1.25 FR, S8@561s ×1.25 FR, S8@573s ×1.5 DMG, S8@585s ×2 DMG, S8@597s ×2 DMG, S8@609s ×2 DMG, S8@621s ×1.5 DMG, S9@633s ×1.25 FR, S9@645s ×1.5 DMG, S9@657s ×1.25 FR, S9@669s ×1.5 DMG, S9@681s ×1.25 FR, S9@693s ×2 DMG, S9@705s ×2 DMG, S9@717s ×2 DMG, S10@729s ×1.5 DMG, S10@742s ×1.25 FR, S10@754s ×1.5 DMG, S10@766s ×2 DMG, S10@778s ×2 DMG, S10@790s ×1.5 DMG, S10@802s ×2 DMG, S10@814s ×1.5 DMG
- Profile C: 67 gates (58 squad / 4 damage / 5 fire-rate), final power 242 (visible 25), mods 3.00 × 2.50, outcome victory
  - S1@9s +3 SQUAD, S1@21s +3 SQUAD, S1@33s ×1.5 DMG, S1@45s +3 SQUAD, S1@57s +3 SQUAD, S2@69s ×1.25 FR, S2@81s ×1.5 DMG, S2@93s ×1.25 FR, S2@105s ×1.5 DMG, S2@117s ×2 DMG, S2@129s +4 SQUAD, S3@141s +5 SQUAD, S3@153s +5 SQUAD, S3@165s +5 SQUAD, S3@177s +5 SQUAD, S3@189s ×1.25 FR, S3@201s +4 SQUAD, S4@213s +5 SQUAD, S4@225s ×1.25 FR, S4@237s +5 SQUAD, S4@249s +4 SQUAD, S4@261s +4 SQUAD, S4@273s +5 SQUAD, S4@285s +4 SQUAD, S5@297s +3 SQUAD, S5@309s +4 SQUAD, S5@321s +4 SQUAD, S5@333s +4 SQUAD, S5@345s +3 SQUAD, S5@357s +4 SQUAD, S5@369s +3 SQUAD, S6@381s +4 SQUAD, S6@393s +3 SQUAD, S6@405s +5 SQUAD, S6@417s +4 SQUAD, S6@429s +4 SQUAD, S6@441s +5 SQUAD, S6@453s +3 SQUAD, S7@465s +5 SQUAD, S7@477s +4 SQUAD, S7@489s +4 SQUAD, S7@501s +4 SQUAD, S7@513s +5 SQUAD, S7@525s +5 SQUAD, S7@537s +4 SQUAD, S8@549s +5 SQUAD, S8@561s +4 SQUAD, S8@573s +5 SQUAD, S8@585s ×1.25 FR, S8@597s +5 SQUAD, S8@609s +4 SQUAD, S8@621s +4 SQUAD, S9@633s +3 SQUAD, S9@645s +3 SQUAD, S9@657s +3 SQUAD, S9@669s +4 SQUAD, S9@681s +4 SQUAD, S9@693s +5 SQUAD, S9@705s +4 SQUAD, S9@717s +3 SQUAD, S10@729s +5 SQUAD, S10@742s +4 SQUAD, S10@754s +4 SQUAD, S10@766s +5 SQUAD, S10@778s +3 SQUAD, S10@790s +5 SQUAD, S10@802s +4 SQUAD

## Squad Power / overkill (primary seed, Profile B)

- 10 normals theoretical DPS: 200.0 · Power10 unit theoretical DPS: 200.0 (1 entity × 100 dmg × 2/s) — identical by construction; the difference is overkill granularity.
- damageDealt 75700 · overkillDamage 86378 (53.3 % of total output)
- peak visible soldiers 9 (≤ 50 required)

## Performance (headless)

- Profile A: sim avg 0.037 ms · peak 3.97 ms · peak projectiles 54 · pool exhausted 0 · peak visible 5
- Profile B: sim avg 0.031 ms · peak 2.61 ms · peak projectiles 61 · pool exhausted 0 · peak visible 9
- Profile C: sim avg 0.042 ms · peak 4.57 ms · peak projectiles 266 · pool exhausted 0 · peak visible 25
