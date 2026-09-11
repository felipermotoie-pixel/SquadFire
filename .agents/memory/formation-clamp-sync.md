---
name: Formation width vs anchor clamp must change in the same frame
description: Any squad-size change (growth or a death that starts an animation) must reassign slots and clamp both anchor values immediately, or edge-parked squads step off the road.
---

Rule: whenever the number of soldiers counted by the anchor clamp changes (a gate adds soldiers, or `loseSoldier` starts a death animation), reassign survivor slots **and** clamp both the smoothed anchor and its target in that same call.

**Why:** two review rounds caught the same class of bug from opposite sides — growth left the smoothed anchor outside the new, narrower range; a death widened the clamp while survivors still held the old, wider slots until the 0.55 s animation ended. Both put the outermost soldier past the road margin when the squad was parked at the edge.

**How to apply:** if you add any new path that changes squad size (revive, merge, dev button), route it through the same slot-reassign + clamp helper; add a sim check that parks the squad at the edge, changes size, and asserts the outermost soldier stays inside `roadHalfWidth − formationRoadMargin` across the following frames.
