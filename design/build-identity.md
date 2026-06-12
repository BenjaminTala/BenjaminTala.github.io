# Build Identity — Design Proposal (no code)

## The problem, stated honestly

Current paths are stat packages. WRATH = damage multipliers. GUILE = crit/dodge +
status procs. VEIL = HP/regen/barrier. Even the tier-3/4 "behaviors" (cleave splash,
kill explosion, random status on hit) are **passive procs** — they happen *to* the
player. No path changes what the player *does* on their turn. A Wrath III warrior and
a Veil III warrior press the same buttons in the same order against the same enemy.

The test every design below must pass: **could a spectator watching only the player's
inputs (not the numbers) tell which path they committed to?**

---

## WRATH — the Avalanche  *(momentum / all-in)*

**Fantasy:** every swing feeds the next. Stopping is death. The avalanche does not turn.

**Mechanic — MOMENTUM:**
- Consecutive basic attacks against the **same target** stack +15% damage each (cap 5).
  Visible as pips under the player portrait.
- Using a skill, switching targets, drinking a potion, or guarding **resets momentum**.
- **T3:** held momentum cuts both ways — each stack adds +4% damage *taken*. The
  avalanche has no shield.
- **T4 — OVERKILL:** at 5 stacks your next attack is a guaranteed crit that cleaves
  full damage to every enemy, then momentum resets. (Replaces the current passive
  kill-explosion.)

**Decision loop change:** target-switching becomes *expensive* for the Wrath player
only. The healer starts casting, the boss starts a cataclysm — do you break rhythm and
lose your stacks, or trust the avalanche to finish first? Wrath turns are a held-breath
commitment, not a damage stat.

**Per class:** warrior — momentum also accelerates ult charge. mage — recasting the
*same spell* maintains momentum (their rhythm is the incantation). ranger — momentum
survives if the turn ends without taking damage (the perfect skirmisher streak).

---

## GUILE — the Trap-Setter  *(setup / detonation)*

**Fantasy:** the knife doesn't kill. The trap going off kills.

**Mechanic — EXPLOIT (new combat verb, unlocked at T2):**
- Statuses become ammunition. EXPLOIT consumes **all** statuses on the target and
  deals damage per status type and per remaining turn consumed (tune around ~7% of
  enemy maxHp per status-turn).
- **T3:** detonating spreads one consumed status to every other enemy.
- **T4:** consuming 3+ status types also STUNS the target. (Replaces the current
  passive all-four-statuses-on-hit.)

**Decision loop change:** Guile plays setup → payoff. Stack burn + poison + weak +
vuln, hold one more turn for duration, then cash in. The Guile player's kill turn looks
*completely different* — a detonation, not a big swing. They want longer fights; they
read status durations the way Wrath reads HP bars.

**Per class:** mage — burn skills are natural fuel. ranger — Aimed Shot's lingering
wound is fuel. warrior — Shield Wall's guaranteed-crit-next-strike becomes the premium
fuse (crit applies two statuses at T2+).

---

## VEIL — the Shore  *(absorb / answer)*

**Fantasy:** you don't avoid the storm. You are the shore it breaks against.

**Mechanic — RIPOSTE (new defensive verb BRACE, unlocked at T2):**
- BRACE (cheap/free, replaces your attack that turn): halve incoming damage this
  round, and your **next attack deals +100% of the damage your barrier/brace absorbed**.
- **T3:** when your barrier breaks, it detonates its absorbed total to all enemies.
  (Upgrades the current passive barrier into a payoff.)
- **T4:** barrier refresh on kill (kept) + while the barrier holds, 25% of absorbed
  damage reflects automatically.

**Decision loop change:** the Veil player *wants to be hit at the right moment*. They
read enemy intents hunting for the HEAVY/UNLEASH to brace into, then answer with the
stored force. Turn loop: absorb → answer. The one build where a boss cataclysm is an
*opportunity*.

**Per class:** mage — Mana Shield absorption counts toward riposte (the battery).
warrior — brace also grants the GRD stance free that round. ranger — *dodged* attacks
count as absorbed at 60% value (the matador: the answer comes from the miss).

---

## What the three loops ask

| Path | The question every turn |
|---|---|
| WRATH | "Can I afford to keep going?" |
| GUILE | "When do I cash in?" |
| VEIL | "When do I let them hit me?" |

## Cost discipline

- **No new currencies.** Momentum/Exploit/Riposte reuse statuses, barrier, targeting.
- **At most one new button per path** (Exploit, Brace; Wrath adds zero — it lives in
  the basic attack).
- T1 stays a stat tier (early progress should be simple); the transformation lands at
  T2 where the player has actually committed.
- The current passive T3/T4 procs are **replaced, not stacked on** — net complexity
  roughly flat.

## Known overlap to resolve

The VEIL Brace verb overlaps with the GRD stance (both are "take less damage this
round"). If Veil ships, GRD likely folds into it or stances get cut entirely —
screenshot review already flags the stance row as a probably-ignored feature
(three captioned panels, default BAL, buried mid-screen). Decide before implementing.

## Suggested implementation order

1. **GUILE first** — most self-contained (statuses already exist end-to-end), easiest
   to balance, and the new EXPLOIT button is the cheapest proof that a verb changes the
   feel. Playtest.
2. WRATH second (touches basic-attack flow + needs the momentum HUD pips).
3. VEIL last (depends on the stance-overlap decision).

Each path lands as its own commit with its own sim pass + micro-tests, so any one can
be reverted without touching the others.

---

# Design-Only Balance Review (pre-implementation)

## The seven questions

**1. Easiest to understand: WRATH.** "Hit the same thing repeatedly, get stronger" is
instantly graspable; pips make it legible at a glance. GUILE requires understanding
statuses first (one prerequisite system). VEIL requires understanding barrier AND
intent-reading (two prerequisites). Comprehension order: Wrath > Guile > Veil.

**2. Most fun (predicted):** GUILE has the highest ceiling — the detonation turn is a
designed climax, and the T3 spread is a screen-clearing payoff. WRATH has the best
moment-to-moment loop — every single turn carries the keep-or-break tension. VEIL is
the most novel but its fun is hostage to enemy intent variety: if enemies mostly throw
plain attacks, brace timing is shallow. Under the current enemy roster: WRATH ≥ GUILE >
VEIL. With more telegraphed-heavy enemies, VEIL rises.

**3. Dominance risk: GUILE, clearly.** Exploit scales with status sources, which the
game is full of (imbued weapons, gear procs, Trickster +1 turn). Percent-of-maxHp
detonation math vs 1000+ HP bosses is the classic roguelike breaker. WRATH's T4
OVERKILL is the secondary risk if 5 stacks are reliably reachable in every pack fight.

**4. Ignored risk: VEIL.** It asks the player to skip attack turns. Loss aversion makes
players systematically undervalue defensive verbs — the existing GRD stance proves this
in this exact game (see below). If the stored-riposte payoff isn't a visible coiled
spring (a meter that LOOKS like it wants to explode), players will default to
attack-attack-attack and the path plays like current Veil: passive stats.

**5. Overlap: VEIL heaviest.** Brace ≈ GRD stance ≈ Shield Wall (warrior) ≈ barrier
relics ≈ mage mana shield — five systems in the same design space. The proposal absorbs
two (mana shield counts as absorption; GRD folds in) but Shield Wall needs a decision:
for a Veil-committed warrior, Brace and Shield Wall are nearly the same button. GUILE
overlap is moderate but COMPOSITIONAL — Trickster/imbues are fuel for Exploit, not
duplicates of it. WRATH overlap: none. Cleanest of the three.

**6. Boss-fight breakage:**
- GUILE two ways: (a) %-maxHp detonation needs a boss coefficient (suggest 40-50%
  effectiveness vs bosses); (b) T4 stun-on-detonate can chain-stun a boss through its
  cataclysm window — stun is *designed* to interrupt cataclysms once, so repeatable
  exploit-stun needs boss diminishing returns on stun.
- WRATH breaks bosses inversely: a boss is a single target, so momentum's cost
  (target-switch reset) never applies. Mitigation already in the design: guarding and
  potions also reset, so cataclysm turns force the dilemma. Balance Wrath against the
  boss ramp, not pack fights.
- VEIL anti-breaks bosses — it's strongest exactly where bosses are scariest. Good.

**7. First implementation: GUILE** — confirmed, with a sharpened reason: it's the only
path needing a NEW VERB wired end-to-end (button, targeting, log, floats, bot policy,
micro-tests), so it derisks the implementation pattern for the other two; and since it
carries the highest dominance risk, it should get the longest playtest runway. WRATH
first is defensible if implementation risk matters more (zero new UI), but it touches
basicHit — the hottest code path in combat.

## Stance row — honest verdict

**The evidence it's ignored:** the balance-sim bot never calls setStance — zero stance
usage — and still wins 58% of runs. The system is provably optional at a competent
level of play. It defaults to BAL, nothing in the game ever prompts engagement, and
novices have no reason to touch it.

**Is there real depth?** Some. The intent system creates exactly two stance moments:
AGG on kill-secured turns, GRD into a telegraphed cataclysm. With the 2-turn lock,
that's a genuine decision — for the ~10% of turns where it matters. The other 90% of
the time, three captioned panels occupy permanent command-area real estate presenting
a choice nobody is making. It is depth, but mispriced UI.

**Recommendation: dissolve stances into the path redesign (option b).**
- AGG's identity (more out, more in) IS Wrath's momentum mechanic.
- GRD's identity (less out, less in) IS Veil's Brace verb.
- BAL is just "not committed yet."
The stance row's depth doesn't die — it re-emerges as build identity, attached to
choices the player has already made and therefore cares about. The row itself
disappears, returning a band of combat UI. Until the paths ship, leave stances alone
(removing them first would orphan the AGG/GRD tactical moments with nothing replacing
them).
