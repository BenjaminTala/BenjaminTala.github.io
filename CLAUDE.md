# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A single-file 8-bit text roguelike, **Crypt of the Champion**, deployed via GitHub Pages on the custom domain **entregaflights.me** (see `CNAME`). The entire game — game logic, audio engine, sprite mapping, render code, CSS — lives in **`index.html`** (~1640 lines, no build step, no JS dependencies). Only external load is the "Press Start 2P" Google Font.

`assets/` holds the only other deployed artifacts: monster/player sprites, item-icon sheets, and the Kenney panel border. `Music/` (gitignored) is Dead Cells sheet-music reference for music design — never reference it from `index.html`.

## Commands

```bash
# Syntax-check the game script (extract <script> and run it in a stubbed env)
node -e "const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const m=html.match(/<script>([\s\S]*?)<\/script>/);const src=m[1].replace(/\"use strict\";/,'');global.localStorage={_:{},getItem(k){return this._[k]||null;},setItem(k,v){this._[k]=String(v);}};global.window={};const fakeEl={innerHTML:'',classList:{toggle:()=>{},add:()=>{},remove:()=>{}},textContent:'',offsetWidth:0};global.document={getElementById:()=>fakeEl,querySelector:()=>fakeEl,querySelectorAll:()=>[],addEventListener:()=>{},removeEventListener:()=>{}};global.setTimeout=()=>0;global.clearTimeout=()=>{};eval('(function(){'+src+'})();');console.log('OK');"

# Local preview (any static server works; pick one):
python -m http.server 8000      # then open http://localhost:8000
# or:  npx serve .

# Deploy = push to main. GitHub Pages serves index.html within ~60s.
git push origin main
```

There is no test framework, lint, or build. "Tests" historically were ad-hoc Node sim harnesses (e.g. `/tmp/v4.js`) that stubbed `document`/`setTimeout`, evaluated the script, and auto-played 300 runs/class to measure win rates (target was Mage 61% / Warrior 75% / Ranger 76% pre-difficulty-pass; current is harder). The stub-and-eval pattern shown above is the supported way to write new harnesses — match it so AudioContext absence and `localStorage`/`document` stubs work.

## Architecture

Everything lives in one `<script>` block. Read it top-to-bottom in this order:

1. **`SFX` IIFE** — WebAudio engine. Two sub-systems:
   - **SFX path**: chiptune `tone()` (square/triangle/sine + envelope) + `noise()` for percussion. 22 named effects in `DEFS`. Bone-dry (no reverb), punchy. Defer-inited on first user gesture.
   - **Music path**: `piano()` builds layered triangle+sine harmonics with low-pass + piano envelope (sharp attack, exponential tail). Music bus feeds a synthesized convolver reverb. `M` holds tracks shaped as `{bpm, melody:[[freq,beats],...], bass:[[freq,beats],...], kick:beats-between}`. `setMusic(name)` loops via a lookahead scheduler (`setTimeout` polled every 80ms). Helpers `arp1(chord)`/`arp2(chord)` build rolling 16th-note arps so tracks are written as `[...arp2([root,5th,oct]), ...]`. Mute state persists in `localStorage` (`crypt_muted`, `crypt_music_muted`).

2. **`SPRITES` block** — maps game entities to PNG files in `assets/`:
   - `ENEMY_SPRITE`/`BOSS_SPRITE`: enemy name → file key (strip elite affixes via `stripAffix`).
   - `CLASS_SPRITE_CLASS`: warrior/mage/ranger → CSS class on a `<div class="sprite-player ...">`. Sprites are loaded as CSS `background-image` so they animate via `idleBob` keyframes.
   - `enemySpriteHtml(e, depth)` returns `<img class="sprite-enemy spr-<key> tier-N">` with zone-tier classes (`tier-1`/`2`/`3` by `zoneOf(depth)`) that apply colored drop-shadow glows — escalating menace as the player descends.
   - `iconClassesFor(item)` picks a 16×16 cell from `assets/items/wpns.png` or `armr.png` for inventory/reward icons.

3. **Data tables** — `CLASSES`, `ENEMIES`, `AFFIXES`, `BOSSES` (+ `BOSS_POOL` for randomized per-zone boss picks), `RARITY`, `WEAPON_BASES`/`ARMOR_BASES`/`TRINKET_BASES`, `PASSIVES`, `SETS`/`SET_ITEMS`, `UPGRADES`, `RELICS`, `SYNERGIES`, `OMENS`, `EVENTS`. **Events can optionally carry `sprite:{src, tint}`** — `renderEvent` swaps the ASCII art for the sprite with a CSS hue-rotate tint (`tint-grey/gold/green/purple/blue/red/amber/shadow`).

4. **Global state `G`** — single mutable object created by `newGame()`. Holds `{screen, player, depth, doors, room, battle, pending, log, omen, mods, omenChoices, seenEvents}`. Screen transitions go through `go(name)` or by setting `G.screen` directly and calling `render()`.

5. **`render()` is a screen router** — dispatches to `renderTitle`/`renderClassSelect`/`renderOmen`/`renderCorridor`/`renderRoom`/`renderEvent`/`renderBattle`/`renderReward`/`renderMerchant`/`renderInventory`/`renderEnd`. **Always calls `setMusicForScreen()` first** so music transitions automatically between title → explore → battle/boss → victory.

6. **Combat loop** — `startBattle` → `playerAttack`/`playerSkill`/`useItem`/`fleeBattle` → `afterPlayer` → DoT tick → `setTimeout(enemyTurn, 560)` → enemy attacks → DoT/regen tick → either `winBattle` or repeat. Damage flows through `dealToEnemy(idx, dmg, label, crit)` which applies `playerDamageMult(e)` (zone mods, affinity tier bonuses, glass-cannon/stone-skin/berserker/executioner, vulnerable status).

## Key invariants and patterns

- **Refcounted flags**: relics + gear passives + set bonuses share a flag bag. Always go through `addFlag(p,f)` / `removeFlag(p,f)` — `p.flags[f]` is the cached truthy check, `p.flagRefs[f]` is the counter. Direct `p.flags.x = 1` will break unequip.
- **Affinity bookkeeping**: when adding/removing anything with an `aff` field, call `addAffinity(p, aff)` so `recomputeAffinity` rolls up base + currently-equipped gear and triggers `checkAffinityTiers` (which awards path capstones at 3/6/9). Equipping/unequipping items: use `equipItem` only — it handles old-item stat subtraction, set re-roll via `recomputeSets`, and affinity recompute.
- **Status effects**: add only via `addBurn/addPoison/addWeak/addVuln/addStun`. They respect the Trickster (Guile T2) `statusBonusTurns` lengthening and take a Math.max so re-applying never shortens.
- **Audio init defers to first gesture**: `pointerdown`/`touchstart`/`keydown` triggers `_audioGo` once. Toggle buttons (`toggleSfx`/`toggleMusic`) also call `SFX.init()` so they work as the first interaction. Anything calling `SFX.play()` before init is a no-op.
- **Sprite ASCII fallback is intentional**: `enemySpriteHtml` returns `null` when no mapping exists, and call sites use `|| \`<pre class="sprite red">${e.sprite}</pre>\``. Don't remove the ASCII `sprite:` fields on `ENEMIES`/`BOSSES`/event entries; new entities without art still need to render.

## Conventions

- Edit `index.html` directly. Don't introduce a build step, bundler, or framework — the whole point is "open the file in a browser." Don't extract into separate JS/CSS files unless explicitly asked.
- New monster sprites go in `assets/monsters/<key>.png` and need an entry in `ENEMY_SPRITE` or `BOSS_SPRITE`. New per-monster CSS sizing is `.sprite-enemy.spr-<key>{max-height:...}`.
- For new events, prefer adding `sprite:{src, tint}` rather than crafting more ASCII art. The tints exist in CSS as `.ev-sprite.tint-*` classes — reuse, don't add new ones unless the palette gap is real.
- The chiptune SFX timbre and the piano music timbre are deliberate counterparts — keep SFX dry/square-wave and music layered/reverbed. Don't unify them.
- Commit messages follow the existing style (subject + bulleted body grouped by area). Use the Claude `Co-Authored-By` trailer.

## Progression systems (the "get OP" loop)

Added in the `claude/grand-revamp` revamp; these are what make fighting rewarding:

- **Soul Essence** (`p.essence`, glyph `ESS`): a kill currency granted in `onEnemyDeath` (scales with enemy xp; +5 elite, +34 boss, `G.mods.essMul`). Spent only at **The Forge** room (`renderForge`/`forgeUpgrade`/`forgeReforge`/`forgeImbue`; core upgrade is `upgradeGear(p,slot)`, reused by the Abandoned Forge event). Forge = a sub-render under `screen:'room'`, `room.type:'forge'` (same pattern as merchant).
- **Slayer / Bestiary** (`p.slayer={family:count}`): `FAMILY[stripAffix(name)]` maps every enemy to a family; `slayerMult(e)` multiplies player damage by family-kill tier (5/12/22 → +6/14/26%, halved thresholds under the Hunter's Instinct omen via `slThreshArr`). Shown in the inventory BESTIARY tab.
- **Ultimate** (`b.charge` 0–100): `gainCharge` from attacking/casting/being hit; `useUltimate()` fires a per-class super (`ultMeta`). Charge bar + glowing button in `renderBattle`.
- **The Abyss** (`G.abyss`, depth keeps rising past `RUN_LENGTH`): beating the chamber-20 boss routes to `renderTriumph` (retire via `claimVictory` or `startAbyss`). `nextCorridor` has an abyss branch (boss every 4th floor, incl. `devourer`); `isFinal` and the `proceed`/zone-intro logic are guarded with `!G.abyss`.
- **Run modifiers** live in `OMENS` (mods on `G.mods`); new flags `essMul/slayFast/ultFast`. Add new ones to `defaultMods` so they're always defined.

UI/juice: tabbed inventory (`G._invTab`, `setInvTab`), reward stat-deltas (`gearCompareHtml`), floating damage numbers (`b.floats`, rendered then cleared each `renderBattle`), and a `#vignette` overlay toggled in `render()` at low HP.

A reusable balance harness pattern lives in chat history (`/tmp/bal.js`): a *competent* bot that retires at Triumph and reports throne-reach %. Target ~45% across classes.
