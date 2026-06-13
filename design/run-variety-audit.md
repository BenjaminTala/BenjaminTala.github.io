# Run Variety Audit — does run 5 feel different from run 1?

*Measurement: 1176-run bal_sim harness, instrumented for events fired, NPCs met,
relics offered, bosses fought, Devour final forms. Bot policy is "competent
player" — a real player who deliberately seeks events will see more, but the
ratios surface the structural problem regardless.*

## Headline finding

**The game's most unique feature — recurring anchor NPCs with persistent memory
across runs — is statistically invisible to new players.**

| Anchor NPC | Met in N of 1176 runs | % of runs |
|---|---:|---:|
| Lantern Keeper | 13 | **1.1%** |
| Cartographer | 7 | 0.6% |
| Cardinal | 4 | 0.3% |
| Watcher | 4 | 0.3% |
| Weeping Smith | 3 | 0.3% |
| Frozen Scholar | 2 | 0.2% |

A player would average **80–90 runs before meeting the Lantern Keeper**. The
cross-run NPC memory system — the "things you do not, they remember" feature —
fires for an audience that does not exist yet by the time they could see it.

The on-screen `RECURRING` chip exists for these events, but the events do not
in fact recur, because they barely appear in the first place.

## Why (mechanical)

Event rooms are ~8% of doors. When an event room rolls, `pickEvent()` picks
**uniformly** from a 56-event catalog, with a zone-bias on `e.zone`. NPCs are
mixed in with the 50 one-shots — no NPC-specific bias. The math:
- ~8% × 2.5 doors × 40 chambers × player event-greed = ~2–4 events per run
- 6 anchor NPCs ÷ 56 events = anchor probability of ~10% per event roll
- Expected anchor-NPC meetings per run: **~0.2–0.4**.

The system is doing exactly what it was coded to do. It was just never tuned
for visibility.

## Other variety findings

**13 events never fired in 1176 runs:**
`imp, mirror2, campfire, spring, library, goblin, beggar, shrine2, pit,
soulwell, prisoner, fishbowl, inkpool`

A few are zone-3/Abyss-gated; most are simply lost in the catalog noise. The
prisoner is supposed to be an anchor NPC and fired **zero** times.

**Boss variety: actually fine.** Chamber-10 pool (ogre/gobking/spider) splits
~31% each. Chamber-30 pool (demon/lich/flameknight) splits ~26–28% each. The
boss roster is delivering variety.

**Devour final-form distribution: heavily concentrated.**
Soul Winter dominates at 16% of runs. Next 5 forms ~5–8% each. The skill
designed to be the run-identity slot is itself converging on a small handful
of common outcomes.

**Relic keystones (kwhirl, ksplit, kbeam): offered ~2% of runs.** These are
the class-defining late-game artifacts. A player who plays warrior 20 times
will see Eternal Cyclone roughly 0.4 times. The build-defining moment is
behind a wall that's invisible at typical play volume.

## The actual answer to the friend's question

**Does run 5 feel different from run 1?**

Mechanically yes — different omen, different drops, different boss. But the
*memorable* differentiators — meeting a recurring face, seeing a unique event,
hitting a keystone relic — are coin-flips spread thin across hundreds of runs.

Run-to-run variety in this game is currently *combat variety* (which builds
won, which bosses showed) plus *RNG variety* (which mid-tier relics dropped).
The narrative variety the design promises is mostly absent at typical play
volume.

## Proposals (no code yet — design only)

These are roughly ordered by impact-per-cost. The directive says "remove,
simplify, highlight, dramatize, transform" before adding — these all sit in
*highlight* and *transform*, not *add*.

### A. Anchor NPCs become guaranteed beats, not rolled events

The biggest single move. Anchor NPCs leave the 56-event pool and become
**scheduled appearances**:
- First-ever Lantern Keeper: chamber 2–4 of run 1, guaranteed.
- Each subsequent NPC gets a guaranteed first-appearance window over runs 1–6.
- After first meeting, an NPC has a ~25% chance per zone of returning (the
  "recurring" promise becomes real).
- The 6 anchors stop competing with 50 one-shot events for the same RNG.

**Cost:** medium. Add a small scheduler in `pickEvent` that overrides on
specific (run, chamber) windows. No data changes. No content adds.

**Risk:** scripted feel if heavy-handed; mitigate by keeping the windows wide
(a 3-chamber window, not a fixed chamber).

### B. Trim or merge one-shots so each surfaces more often

56 events / 8% door rate ≈ each one-shot fires once every ~14 runs on
average. The catalog is wide; the per-event surface area is shallow.
- 13 are invisible. Audit them: can they be cut, or do they need triggers
  beyond "the dice land here"?
- Several one-shots are flavor-only with no mechanical consequence — those
  are candidates for merging into a single multi-flavor frame, or for cut.

**Cost:** low — content audit + deletions/merges.

**Risk:** lose flavor breadth. Trade-off: ten events seen twice each beats
twenty seen once.

### C. Keystone relics — guaranteed appearance window per class

Class keystones (Eternal Cyclone for warrior, Singularity Beam for mage,
Thousand Arrows for ranger) currently offered ~2% of runs. They are the
**defining late-game artifact** of each class. A player who never sees their
keystone never sees the top of their build.
- After clearing the chamber-20 boss, the next reward bundle guarantees the
  player's class keystone as one of three options if not yet owned. (Or:
  guaranteed in the post-chamber-20 reward, on a one-time-ever flag per run.)

**Cost:** small — one branch in `pickRelic`/`buildRewards`.

**Risk:** mage's keystone is the strongest (Singularity Beam was the
Phoenix-Feather-level outlier in earlier sims); guaranteed access changes
the late-game power curve. Sim before shipping.

### D. Devour evolution distribution

Soul Winter is 3× the next form. The skill *designed* to be the run-identity
slot has its own dominant strategy. This is the *Build Identity* problem in
miniature — the verb is there but the variety isn't.
- Compare to the proposed Guile EXPLOIT verb (build-identity proposal):
  Devour is what build identity already looks like. Same fix shape: the
  evolutions should change *behavior*, not stack stats; and the dominant one
  needs trimming or its niche redefined.

**Cost:** medium — needs a separate Devour audit. Likely fold into the
Build Identity work later, not now.

## Recommended next move

**Implement A (NPC scheduler) — small, focused, high-impact, no balance
change.** The cross-run NPC memory is the game's most distinctive feature
per the friend's earlier note ("the strongest feature is hidden"). It is
literally invisible at typical play volume. Fixing the surfacing makes
existing content land instead of inventing new content — which is exactly
the autopilot mandate.

Then **playtest** to see if run 5 actually feels different from run 1 once
the recurring faces start recurring.

B (one-shot audit), C (keystone guarantee), D (Devour) wait until after A
has shipped and been observed.
