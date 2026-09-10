# SquadFire — Balance

All numbers live in `game/balance.ts`.

## Damage model
```
squad DPS ≈ soldiers × damage(10) × damageMult × fireRate(2/s) × fireRateMult × hitEfficiency
```
Squad size enters exactly once (number of shooters). Fire-rate and damage multipliers come only from gates and are capped (×2.5, ×3).

## Reference numbers
| Soldiers | Shots/s | DPS (no mods) | Grunt kills/s (30 HP) |
| --- | --- | --- | --- |
| 1 | 2 | 20 | 0.67 |
| 5 | 10 | 100 | 3.3 |
| 10 | 20 | 200 | 6.7 |
| 25 | 50 | 500 | 16.7 |
| 50 | 100 | 1000 | 33 |

Boss (2600 HP): 20 soldiers ≈ 6.5 s time-to-kill at base mods; 10 soldiers ≈ 13 s. Boss slams every 6.5 s (4.5 s in phase 2) so a 10-soldier squad eats ~2 slams.

## Pacing (seed-independent targets)
- Wave advance: 22 kills per wave. Spawn interval 2.4 s at wave 1 shrinking to 0.9 s; group size 5 + 2/wave, max 18.
- Boss enters at 70 kills (~40–50 s with an average squad).
- Gates: first at 9 s, then every 12 s → typically 3 pairs before the boss.

## Overkill control
Each target tracks `reserved` damage counter (damage already in flight). A soldier skips targets whose HP is fully reserved, unless nothing else is in its cone. This keeps 25+ soldiers from wasting volleys on one grunt.

## Tuning knobs worth touching first
1. `BOSS.killsToSpawn` — stage length.
2. `ENEMIES.groupSizePerWave` / `spawnIntervalMin` — pressure curve.
3. `GATES.interval` — growth rate.
4. `WEAPONS.rifle.fireRate` — global cadence (changes every soldier's period, not their phase).
