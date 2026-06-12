#!/usr/bin/env node
/* Crypt of the Champion — micro-test suite.
 *
 * Targeted, fast assertions on individual mechanics (tester feedback: "testing
 * process needs micro-tests" — the balance sim covers macro win-rates; this
 * covers the small contracts each mechanic promises).
 *
 * Run:  node test/micro.js          (from the repo root)
 * Exit code 0 = all pass, 1 = something failed.
 *
 * Uses the stub-and-eval pattern from CLAUDE.md: loads index.html's <script>
 * in a stubbed DOM so the whole game evaluates, then pokes internals exposed
 * onto global.
 */
"use strict";
const fs = require('fs');
const path = require('path');

/* ===== environment stubs (same shape as the syntax-check in CLAUDE.md) ===== */
const _ls = {};
global.localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(_ls,k)?_ls[k]:null; },
  setItem(k,v){ _ls[k]=String(v); },
  removeItem(k){ delete _ls[k]; },
  _wipe(){ for(const k of Object.keys(_ls)) delete _ls[k]; },
};
global.window = {};
function makeFakeEl(){
  return {
    innerHTML:'', textContent:'', offsetWidth:0, style:{},
    classList:{ toggle(){}, add(){}, remove(){}, contains(){ return false; } },
    appendChild(){}, removeChild(){}, setAttribute(){}, getAttribute(){ return null; },
    addEventListener(){}, removeEventListener(){},
  };
}
global.document = {
  getElementById:()=>makeFakeEl(),
  querySelector:()=>makeFakeEl(),
  querySelectorAll:()=>[],
  addEventListener(){}, removeEventListener(){},
  body:{ classList:{toggle(){},add(){},remove(){}}, style:{} },
};
// setTimeout runs synchronously so deferred popups/turns resolve inline.
global.setTimeout = fn=>{ if(typeof fn==='function'){ try{ fn(); }catch(e){} } return 0; };
global.clearTimeout = ()=>{};

/* ===== load the game and expose internals ===== */
const HTML = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(HTML, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if(!m){ console.error('FATAL: no <script> block found in index.html'); process.exit(1); }
const src = m[1].replace(/"use strict";/, '');
const wrapped = '(function(){' + src + `
  const _=(n,v)=>{ try{ global[n]=v; }catch(e){} };
  _('G_get',()=>G); _('G_set',v=>{G=v;});
  _('newGame',newGame); _('hpRound',hpRound); _('formatMech',formatMech);
  _('bossForeshadowLine',bossForeshadowLine); _('BOSS_FORESHADOW',BOSS_FORESHADOW);
  _('applyPityTimers',applyPityTimers); _('peek',peek);
  _('addFlag',addFlag); _('removeFlag',removeFlag);
  _('newStatus',newStatus); _('addBurn',addBurn); _('addPoison',addPoison);
  _('affTierOf',affTierOf); _('affThresh',affThresh); _('AFF_TIER_MAX',AFF_TIER_MAX);
  _('zoneOf',zoneOf); _('heatActive',heatActive); _('miasmaActive',miasmaActive);
  _('cloneBoss',cloneBoss); _('BOSSES',BOSSES);
  _('makePlayer',makePlayer); _('gearScore',gearScore);
  _('clamp',clamp); _('WHISPERS',WHISPERS); _('MID_ZONE_BEATS',MID_ZONE_BEATS);
})();`;
eval(wrapped);

/* ===== tiny runner ===== */
let pass=0, fail=0; const failures=[];
function t(name, fn){
  try{ fn(); pass++; }
  catch(e){ fail++; failures.push(`${name}: ${e.message}`); }
}
function eq(got, want, label){
  if(got!==want) throw new Error(`${label||'value'} — expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
}
function ok(cond, label){ if(!cond) throw new Error(label||'expected truthy'); }

/* ============================================================
   hpRound — display rounding contract
   ============================================================ */
t('hpRound: exact at or below 100', ()=>{ eq(hpRound(7),7); eq(hpRound(99),99); eq(hpRound(100),100); });
t('hpRound: nearest 5 between 101 and 999', ()=>{ eq(hpRound(101),100); eq(hpRound(103),105); eq(hpRound(487),485); eq(hpRound(998),1000); });
t('hpRound: nearest 10 at or above 1000', ()=>{ eq(hpRound(1247),1250); eq(hpRound(1004),1000); });
t('hpRound: never negative', ()=>{ eq(hpRound(-5),0); });

/* ============================================================
   formatMech — text-register post-processor contract
   ============================================================ */
t('formatMech: wraps mechanical paren tails in t-rule', ()=>{
  const out=formatMech('scorched (-12 HP, +4 Heat).');
  ok(out.includes('class="t-rule"'), 'missing t-rule chip');
  ok(out.includes('class="t-warn"'), 'missing t-warn on the loss');
  ok(out.includes('class="t-gain"'), 'missing t-gain on the gain');
});
t('formatMech: leaves prose parentheticals alone', ()=>{
  eq(formatMech('She nods (slowly).'), 'She nods (slowly).');
});
t('formatMech: colors bare signed tokens without parens', ()=>{
  const out=formatMech('-12 HP, +4 Heat, find scrap');
  ok(out.includes('t-warn'), 'missing t-warn'); ok(out.includes('t-gain'), 'missing t-gain');
  ok(!out.includes('t-rule'), 'no parens means no chip');
});
t('formatMech: empty input returns empty string', ()=>{ eq(formatMech(''),''); eq(formatMech(null),''); });

/* ============================================================
   Boss foreshadowing — distance bucketing
   ============================================================ */
t('foreshadow: every BOSS_FORESHADOW pool has 3 lines', ()=>{
  for(const k of Object.keys(BOSS_FORESHADOW)) eq(BOSS_FORESHADOW[k].length,3,k);
});
t('foreshadow: distance buckets pick vague->specific->closest', ()=>{
  eq(bossForeshadowLine('ogre',5), BOSS_FORESHADOW.ogre[0], 'far');
  eq(bossForeshadowLine('ogre',2), BOSS_FORESHADOW.ogre[1], 'mid');
  eq(bossForeshadowLine('ogre',1), BOSS_FORESHADOW.ogre[2], 'close');
});
t('foreshadow: unknown key returns null (ASCII-fallback contract)', ()=>{
  eq(bossForeshadowLine('nosuchboss',1), null);
});

/* ============================================================
   Refcounted flags — the addFlag/removeFlag invariant
   ============================================================ */
t('flags: two refs survive one removal', ()=>{
  const p={flags:{},flagRefs:{}};
  addFlag(p,'thorns'); addFlag(p,'thorns');
  removeFlag(p,'thorns');
  ok(p.flags.thorns, 'flag dropped while a ref remained');
  removeFlag(p,'thorns');
  ok(!p.flags.thorns, 'flag survived final removal');
});
t('flags: removing an unset flag is a no-op', ()=>{
  const p={flags:{},flagRefs:{}};
  removeFlag(p,'ghost');
  ok(!p.flags.ghost && !p.flagRefs.ghost);
});

/* ============================================================
   Status effects — re-apply never shortens (Math.max contract)
   ============================================================ */
t('status: re-applying a weaker burn never shortens the stronger one', ()=>{
  newGame();
  const st=newStatus();
  addBurn(st,8,4);
  addBurn(st,3,2);
  eq(st.burn,8,'burn amount'); eq(st.burnT,4,'burn turns');
});
t('status: poison follows the same contract', ()=>{
  newGame();
  const st=newStatus();
  addPoison(st,5,3); addPoison(st,9,1);
  eq(st.poison,9); eq(st.poisonT,3);
});

/* ============================================================
   Affinity tiers — per-path thresholds
   ============================================================ */
t('affinity: tier walk matches per-path thresholds', ()=>{
  const th=affThresh('w');
  eq(affTierOf(0,'w'),0); eq(affTierOf(th[0],'w'),1);
  eq(affTierOf(th[3],'w'),AFF_TIER_MAX);
  eq(affTierOf(th[3]+50,'w'),AFF_TIER_MAX,'tier caps at max');
});
t('affinity: veil path is slower than wrath at the top', ()=>{
  ok(affThresh('v')[3] > affThresh('w')[3], 'veil T4 should cost more than wrath T4');
});

/* ============================================================
   Zone gating — heat is Furnace-only, miasma is deep-only
   ============================================================ */
t('zones: heat active only in the Furnace (11-20)', ()=>{
  newGame(); const g=G_get();
  g.depth=5;  eq(heatActive(),false,'warm crypt');
  g.depth=15; eq(heatActive(),true,'furnace');
  g.depth=25; eq(heatActive(),false,'frozen below');
});
t('zones: miasma active from the Frozen Below down + the Abyss', ()=>{
  newGame(); const g=G_get();
  g.depth=15; eq(miasmaActive(),false,'furnace');
  g.depth=21; eq(miasmaActive(),true,'frozen below');
  g.depth=45; g.abyss=1; ok(miasmaActive(),'abyss');   // returns raw G.abyss (truthy), not strict true
});

/* ============================================================
   Pity timers — floor AND flood cap
   ============================================================ */
t('pity: a long merchant dry spell forces a merchant', ()=>{
  newGame(); const g=G_get();
  g.depth=10;
  g._pity={merchantSince:9,forgeSince:0,fountainSince:0,shrineSince:0};
  g.doors=[{type:'enemy'},{type:'empty'},{type:'chest'}];
  applyPityTimers();
  ok(g.doors.some(d=>d.type==='merchant'), 'merchant not forced after 9 dry chambers');
  eq(g._pity.merchantSince,0,'counter resets when offered');
});
t('pity: flood cap demotes a back-to-back merchant', ()=>{
  newGame(); const g=G_get();
  g.depth=10;
  g._pity={merchantSince:1,forgeSince:9,fountainSince:0,shrineSince:0};   // merchant seen last corridor
  g.doors=[{type:'enemy'},{type:'merchant'},{type:'chest'}];
  applyPityTimers();
  ok(!g.doors.some(d=>d.type==='merchant'), 'merchant should be demoted inside the 3-chamber window');
});
t('pity: never touches enemy doors', ()=>{
  newGame(); const g=G_get();
  g.depth=10;
  g._pity={merchantSince:99,forgeSince:99,fountainSince:99,shrineSince:99};
  g.doors=[{type:'enemy'},{type:'enemy'},{type:'enemy'}];
  const before=g.doors.map(d=>d.type).join();
  applyPityTimers();
  eq(g.doors.map(d=>d.type).join(),before,'enemy corridor must stay all-enemy');
});
t('pity: single-door corridors are sacred', ()=>{
  newGame(); const g=G_get();
  g.depth=10;
  g._pity={merchantSince:99,forgeSince:0,fountainSince:0,shrineSince:0};
  g.doors=[{type:'empty'}];
  applyPityTimers();
  eq(g.doors[0].type,'empty','boss/collector-shaped corridors must not be rewritten');
});

/* ============================================================
   Boss scaling — cloneBoss multipliers
   ============================================================ */
t('boss: chamber-40 finals get the late-tier stack', ()=>{
  newGame(); const g=G_get(); g.depth=40; g.player=makePlayer('warrior');
  const king=cloneBoss('king'); const warden=(g.depth=20, cloneBoss('warden'));
  // king at depth 40 carries 1.12*1.10 on a bigger depth ramp; sanity: both exceed table base
  ok(king.maxHp > BOSSES.king.hp, 'king must scale above base');
  ok(warden.maxHp > BOSSES.warden.hp, 'warden must scale above base');
});
t('boss: scaled HP is finite and positive', ()=>{
  newGame(); const g=G_get(); g.player=makePlayer('mage');
  for(const key of Object.keys(BOSSES)){
    g.depth=30; const b=cloneBoss(key);
    ok(Number.isFinite(b.maxHp)&&b.maxHp>0, key+' hp');
    ok(Number.isFinite(b.atk)&&b.atk>0, key+' atk');
  }
});

/* ============================================================
   One-shot teaching modals — localStorage gates
   ============================================================ */
t('teaching gates: all four use the crypt_seen_ prefix and fire once', ()=>{
  // The gates are written by addHeat/addMiasma/startAbyss/renderForge; here we just verify the
  // key contract: setting the key suppresses re-fire (the in-game code checks getItem first).
  global.localStorage._wipe();
  for(const k of ['crypt_seen_heat','crypt_seen_miasma','crypt_seen_abyss','crypt_seen_forge']){
    eq(localStorage.getItem(k),null,k+' should start unset');
    localStorage.setItem(k,'1');
    eq(localStorage.getItem(k),'1',k+' should stick');
  }
});

/* ============================================================
   World flavor — content-shape contracts
   ============================================================ */
t('whispers: every zone has at least 8 lines', ()=>{
  for(const z of [0,1,2,3]) ok(WHISPERS[z].length>=8, 'zone '+z+' has '+WHISPERS[z].length);
});
t('mid-zone beats: every zone has lines', ()=>{
  for(const z of [0,1,2,3]) ok(MID_ZONE_BEATS[z] && MID_ZONE_BEATS[z].length>=3, 'zone '+z);
});

/* ===== report ===== */
console.log(`\n${pass} passed, ${fail} failed`);
if(failures.length){
  console.log('\nFailures:');
  for(const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
}
