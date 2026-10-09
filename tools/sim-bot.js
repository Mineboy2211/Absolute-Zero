// Greedy "active player" used by tools/sim.js. Runs inside the game's own context.

var events = {};
var botState = { fails: {}, started: 0, lastComps: {} };

function mark(name) {
  if (name in events) return;
  events[name] = player.stats.timePlayed;
  console.log(formatTime(player.stats.timePlayed).padStart(12) + '  ' + name + '   (T=' + format(player.T) + ', gain=' + format(heatGain()) + '/s)');
}

function report() {
  const parts = ['--- ' + formatTime(player.stats.timePlayed) + ': T=' + format(player.T) + ' best=' + format(player.bestT)];
  for (const def of Layers.list) if (player.layers[def.id].unlocked) parts.push(def.currency + '=' + format(def.id === 'ionize' ? Layers.map.ionize.totalPlasma() : layerPts(def.id)));
  parts.push('El=' + Elements.count(), 'comps=' + Challenges.totalComps(), 'ranks ' + player.ranks.degree + '/' + player.ranks.grade + '/' + player.ranks.order);
  if (typeof Thermo !== 'undefined' && Thermo.active()) parts.push('Dis=' + format(Thermo.disorder()) + ' Work=' + format(Thermo.work()) + ' eng=' + Thermo.engines());
  if (typeof HeatDeath !== 'undefined' && HeatDeath.data() && Layers.isUnlocked('heatdeath')) parts.push('HD=' + (HeatDeath.running() ? 'run depth ' + format(player.layers.heatdeath.depth) : 'off') + ' coolers=' + player.layers.heatdeath.coolers + ' low=' + format(player.layers.heatdeath.bestLow));
  if (typeof Stretch !== 'undefined' && Stretch.data()) parts.push('str=' + JSON.stringify(Stretch.data().stretch));
  if (typeof Gravity !== 'undefined' && player.chapters.unlocked >= 2) parts.push('G=' + format(Gravity.amount()) + ' gexp=' + Gravity.exponent().toFixed(3));
  console.log(parts.join(' '));
  if (typeof DEBUG_REPORT === 'function') DEBUG_REPORT();
}

function buyAllUpgrades() {
  for (const def of Layers.list) {
    if (!player.layers[def.id].unlocked) continue;
    let bought = true;
    while (bought) {
      bought = false;
      const opts = [...def.upgrades, ...def.qol].filter((u) => Layers.canBuyUpg(def.id, u.id)).sort((a, b) => a.cost.cmp(b.cost));
      if (opts.length) { Layers.buyUpg(def.id, opts[0].id); bought = true; }
    }
  }
}

function splitPlasma() {
  if (!player.layers.ionize.unlocked || layerPts('ionize').lte(0)) return;
  const next = Layers.map.ionize.upgrades.find((u) => !hasUpg('ionize', u.id));
  if (next && next.cost.lte(layerPts('ionize').mul(20))) return;
  const d = player.layers.ionize, amt = d.points;
  d.alloc.e = d.alloc.e.add(amt.mul(0.4)); d.alloc.i = d.alloc.i.add(amt.mul(0.3)); d.alloc.p = d.alloc.p.add(amt.mul(0.3));
  d.points = D(0);
}

// Reset a layer when its pending gain at least matches what we already have.
function doLayerResets() {
  for (const def of [...Layers.list].reverse()) {
    const d = player.layers[def.id];
    if (!Layers.canReset(def.id)) continue;
    const g = Layers.gain(def.id);
    const have = def.id === 'ionize' ? Layers.map.ionize.totalPlasma() : d.points;
    // Layers with passive gain are still reset now and then, when it would multiply the currency tenfold.
    if (Layers.passiveRate(def) > 0) {
      if (g.gte(have.max(1).mul(10))) { Layers.doReset(def.id); mark('first ' + def.name); return; }
      continue;
    }
    // Chapter 2+ layers wipe a lot, so only reset them when it at least doubles the currency.
    // Chapter 3 currencies grow slowly (polynomial), so stack them: reset after an hour if it adds 20%.
    if (g.gte(have.max(1)) || (def.chapter === 1 && d.time > 600 && g.gte(have.mul(0.1))) || (def.chapter >= 2 && d.time > 3600 && g.gte(have.mul(0.2)))) {
      Layers.doReset(def.id);
      mark('first ' + def.name);
      return;
    }
  }
}

function doChallenges() {
  const now = player.stats.timePlayed;
  if (!player.challenges.active) {
    for (const c of Challenges.list) {
      const goal = Challenges.goal(c.id);
      const fails = botState.fails[c.id] || 0;
      if (c.unlocked() && goal && player.T.gte(goal.pow(1.1 + 0.15 * fails))) {
        Challenges.enter(c.id);
        botState.started = now;
        return;
      }
    }
  } else if (now - botState.started > 1800) {
    const id = player.challenges.active;
    botState.fails[id] = (botState.fails[id] || 0) + 1;
    Challenges.exit();
  } else {
    const id = player.challenges.active;
    if ((botState.lastComps[id] || 0) < chalComps(id)) {
      botState.lastComps[id] = chalComps(id);
      mark('chal ' + id + ' tier ' + chalComps(id));
      Challenges.exit();
    }
  }
}

// Extra per-layer strategies registered by later chapters.
var botHooks = [];
botHooks.push(() => { if (typeof Planck !== 'undefined') Planck.buyMax(); });
// Fire Jets at Heat whenever possible.
botHooks.push(() => { if (typeof Jets !== 'undefined' && Jets.canFire()) { Jets.fire('heat'); mark('first Jet'); } });
// Feed the black hole every 30 seconds of play.
botHooks.push(() => {
  if (typeof BlackHole === 'undefined' || !Layers.isUnlocked('singularity')) return;
  const d = player.layers.singularity;
  if (d.feedTimer >= 30 && BlackHole.feed()) d.feedTimer = 0;
});
// Compress whenever a record would grow tenfold.
botHooks.push(() => {
  if (typeof Compressors === 'undefined' || !Layers.isUnlocked('collapse')) return;
  for (const k of Object.keys(COMPRESSORS)) if (Compressors.pending(k).gte(Compressors.record(k).add(1))) Compressors.compress(k);
});

function botStep(dt) {
  gameTick(dt);
  buyAllUpgrades();
  splitPlasma();
  for (const id of ['tickspeed', 'furnace', 'bellows', 'kindling']) Buyables.buyMax(id);
  for (const hook of botHooks) hook();
  doLayerResets();
  for (const id of ['order', 'grade']) Ranks.rankUp(id);
  doChallenges();
  for (const ch of Chapters.list) {
    if (ch.id > player.chapters.unlocked) continue;
    ch.goals.forEach((g, i) => { if (g.check()) mark('chapter ' + ch.id + ' goal ' + (i + 1)); });
  }
  if (Elements.count() > 0 && Elements.count() % 5 === 0) mark('elements ' + Elements.count());
  const L = player.bestT.max(1).log10().toNumber();
  for (const e of [6, 20, 48, 84, 125, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000, 3000, 5000, 1e4, 2e4, 5e4, 1e5, 1e6]) if (L >= e) mark('T >= 1e' + e);
}
// Arm cosmic constants before each Big Bang (BOT_CONSTS=comma list, default: the ones that do not touch heat).
botHooks.push(() => {
  if (typeof Cosmos === 'undefined' || !player.layers.bigbang || !Layers.isUnlocked('bigbang')) return;
  const want = (typeof BOT_CONSTS !== 'undefined' ? BOT_CONSTS : 'frozen,dim,short,heavy,decay').split(',');
  for (const c of COSMIC_CONSTANTS) if (want.includes(c.id) && Cosmos.isUnlocked(c) && !Cosmos.armed(c.id)) Cosmos.toggle(c.id);
});
// Buy Stretch levels, cheapest first.
botHooks.push(() => {
  if (typeof Stretch === 'undefined' || !Layers.isUnlocked('inflation')) return;
  for (let i = 0; i < 100; i++) {
    const ks = Object.keys(STRETCH_GROUPS).filter((k) => Stretch.canBuy(k)).sort((a, b) => Stretch.cost(a).cmp(Stretch.cost(b)));
    if (!ks.length) break;
    Stretch.buy(ks[0]);
  }
});
// Buy Heat Engines whenever affordable.
botHooks.push(() => { if (typeof Thermo !== 'undefined' && Layers.isUnlocked('entropy')) Thermo.buyMaxEngines(); });
// Heat Death: start whenever possible, end after HD_HOURS (default 2) or when cooling has nearly stopped.
botHooks.push(() => {
  if (typeof HeatDeath === 'undefined' || !Layers.isUnlocked('heatdeath')) return;
  HeatDeath.buyMaxCoolers();
  const d = player.layers.heatdeath;
  const hours = typeof HD_HOURS !== 'undefined' ? HD_HOURS : 2;
  if (HeatDeath.running()) {
    if (d.time > hours * 3600) { mark('first Heat Death ended (depth ' + format(d.depth) + ')'); HeatDeath.end(); }
  } else if (HeatDeath.canStart() && (botState.hdNext || 0) <= player.stats.timePlayed) {
    HeatDeath.start();
    botState.hdNext = player.stats.timePlayed + (player.chapters.unlocked >= 4 ? 12 : 3) * 3600;
  }
});
// Start a new universe whenever the armed constants differ from the active ones.
botHooks.push(() => {
  if (typeof Cosmos === 'undefined' || !player.layers.bigbang || !Layers.canReset('bigbang')) return;
  const d = player.layers.bigbang;
  const armed = d.armed.filter((id) => COSMIC_CONSTANTS.some((c) => c.id === id && Cosmos.isUnlocked(c)));
  if (armed.length !== d.active.length) Layers.doReset('bigbang');
});
// Chapter 4: aim beams, relax the lattice, buy Pumps and Cavities, warp when the bank is full.
var BOT_BEAMS = [['ignition', 'bigbang'], ['supernova', 'inflation'], ['meltdown', 'entropy'], ['collapse', 'absolute'], ['singularity', 'heatdeath']];
botHooks.push(() => {
  if (typeof Beams === 'undefined' || !player.layers.laser || !Layers.isUnlocked('laser')) return;
  BOT_BEAMS.forEach(([a, b], i) => {
    if (i < Beams.slots() && Layers.isUnlocked(a) && Layers.isUnlocked(b)) { Beams.set(i, 'from', a); Beams.set(i, 'to', b); }
  });
  if (Layers.isUnlocked('spin') && (botState.annealAt || 0) <= player.stats.timePlayed) { Lattice.anneal(); botState.annealAt = player.stats.timePlayed + 600; }
  if (Layers.isUnlocked('negkelvin')) { NegKelvin.buyMax('cavity'); NegKelvin.buyMax('pump'); }
  if (Layers.isUnlocked('tachyon') && player.layers.tachyon.bank >= Tachyons.cap()) { Tachyons.warp(); mark('first Warp'); }
});
