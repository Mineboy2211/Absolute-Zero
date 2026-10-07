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
  if (typeof Gravity !== 'undefined' && player.chapters.unlocked >= 2) parts.push('G=' + format(Gravity.amount()) + ' gexp=' + Gravity.exponent().toFixed(3));
  console.log(parts.join(' '));
}

function buyAllUpgrades() {
  for (const def of Layers.list) {
    if (!player.layers[def.id].unlocked) continue;
    let bought = true;
    while (bought) {
      bought = false;
      const opts = def.upgrades.filter((u) => Layers.canBuyUpg(def.id, u.id)).sort((a, b) => a.cost.cmp(b.cost));
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
    if (def.passive && def.passive() > 0) continue;
    if (Layers.passiveRate && Layers.passiveRate(def) > 0) continue;
    const g = Layers.gain(def.id);
    const have = def.id === 'ionize' ? Layers.map.ionize.totalPlasma() : d.points;
    if (g.gte(have.max(1)) || (d.time > 600 && g.gte(have.mul(0.1)))) {
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
