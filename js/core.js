// Base game: heat gain, buyables, tickspeed, heat loss (softcaps), automation registry.

const Automation = {
  list: [],
  map: {},
  // def: { id, name, group, unlocked(), run(), amount: bool (has a threshold input) }
  register(def) { this.list.push(def); this.map[def.id] = def; },
  ids() { return this.list.map((a) => a.id); },
  isOn(id) { const a = this.map[id]; return a.unlocked() && player.auto[id] && player.auto[id].on; },
  amount(id) {
    try { const v = D(player.auto[id].amount); return Number.isNaN(v.mag) ? D(1) : v; } catch (e) { return D(1); }
  },
  run() { for (const a of this.list) if (this.isOn(a.id)) a.run(); },
};

// ---------- Buyables ----------

// Cost scaling: past `start` levels the effective level grows as n^1.5 / sqrt(start).
function scaleLevel(n, start) { return n.lte(start) ? n : n.pow(1.5).div(Math.sqrt(start)); }
function unscaleLevel(x, start) { return x.lte(start) ? x : x.mul(Math.sqrt(start)).pow(2 / 3); }

const Buyables = {
  order: ['kindling', 'bellows', 'furnace', 'tickspeed'],
  defs: {
    kindling: {
      name: 'Kindling',
      desc: 'Adds to your base heat gain.',
      unlocked: () => true,
      base: () => D(5),
      ratio: () => D(1.25),
      exp: () => 1,
      scaleStart: () => 100 + (rankReward('degree', 25) ? 25 : 0) + (hasUpg('vaporize', 7) ? 50 : 0),
      costDiv: () => (Layers.ms('ignition', 10) ? D(2) : D(1)),
      effectText: () => `+${format(kindlingPower())} K/s base each`,
    },
    bellows: {
      name: 'Bellows',
      desc: 'Multiplies Kindling output.',
      unlocked: () => player.ranks.degree.gte(1) || player.ranks.grade.gte(1) || player.ranks.order.gte(1) || anyLayerReset(),
      base: () => D(50),
      ratio: () => D(2.4),
      exp: () => 1,
      scaleStart: () => 100 + (hasUpg('vaporize', 7) ? 50 : 0),
      costDiv: () => (rankReward('degree', 10) ? D(10) : D(1)),
      effectText: () => `${formatMult(bellowsPower(), 3)} each (total ${formatMult(bellowsMult())})`,
    },
    furnace: {
      name: 'Furnace',
      desc: 'Raises the power of each Bellows.',
      unlocked: () => player.ranks.degree.gte(3) || player.ranks.grade.gte(1) || player.ranks.order.gte(1) || anyLayerReset(),
      base: () => D(5e3),
      ratio: () => D(6),
      exp: () => 1.1,
      scaleStart: () => 25,
      costDiv: () => D(1),
      effectText: () => `+${format(furnacePerLevel(), 3)} Bellows power each`,
    },
    tickspeed: {
      name: 'Tickspeed',
      desc: 'Multiplies all heat gain.',
      unlocked: () => player.ranks.degree.gte(2) || player.ranks.grade.gte(1) || player.ranks.order.gte(1) || anyLayerReset(),
      base: () => D(500),
      ratio: () => D(3),
      exp: () => 1,
      scaleStart: () => 50,
      costDiv: () => D(1),
      effectText: () => `${formatMult(tickPower(), 3)} each (total ${formatMult(tickMult())})`,
    },
  },
  level(id) { return player.buyables[id]; },
  cost(id, n) {
    const b = this.defs[id];
    if (n === undefined) n = player.buyables[id];
    const x = scaleLevel(D(n), b.scaleStart()).pow(b.exp());
    return b.base().mul(b.ratio().pow(x)).div(b.costDiv());
  },
  isScaled(id) { return player.buyables[id].gte(this.defs[id].scaleStart()); },
  // Total level count reachable with `amt` (so cost(result - 1) <= amt).
  maxAffordable(id, amt) {
    const b = this.defs[id];
    const x = amt.mul(b.costDiv()).div(b.base());
    if (x.lt(1)) return D(0);
    let lvl = unscaleLevel(x.log(b.ratio()).pow(1 / b.exp()), b.scaleStart()).floor().add(1);
    while (lvl.gt(0) && this.cost(id, lvl.sub(1)).gt(amt)) lvl = lvl.sub(1);
    return lvl;
  },
  spends() { return !hasUpg('vaporize', 9); },
  canBuy(id) { return this.defs[id].unlocked() && player.T.gte(this.cost(id)); },
  buy(id) {
    if (!this.canBuy(id)) return false;
    const c = this.cost(id);
    if (this.spends()) player.T = player.T.sub(c).max(0);
    player.buyables[id] = player.buyables[id].add(1);
    return true;
  },
  buyMax(id) {
    if (!this.canBuy(id)) return false;
    const target = this.maxAffordable(id, player.T);
    if (target.lte(player.buyables[id])) return this.buy(id);
    const c = this.cost(id, target.sub(1));
    if (this.spends()) player.T = player.T.sub(c).max(0);
    player.buyables[id] = target;
    return true;
  },
  reset(keep = {}) {
    for (const id of this.order) if (!keep[id]) player.buyables[id] = D(0);
  },
};

for (const id of Buyables.order) {
  Automation.register({
    id: 'buy_' + id,
    name: Buyables.defs[id].name,
    group: 'buyables',
    unlocked: () => ({
      kindling: hasUpg('ignition', 2) || rankReward('grade', 3),
      bellows: hasUpg('ignition', 5),
      furnace: hasUpg('ignition', 8),
      tickspeed: hasUpg('ignition', 8),
    })[id],
    run: () => Buyables.buyMax(id),
  });
}

// ---------- Heat gain ----------

function kindlingPower() {
  let p = D(1);
  if (hasUpg('ignition', 4)) p = p.add(1);
  if (rankReward('degree', 4)) p = p.mul(2);
  p = p.mul(Challenges.reward(1));
  return p;
}

function heatBase() {
  if (inChal(1)) return D(1).add(player.buyables.bellows);
  return D(1).add(player.buyables.kindling.mul(kindlingPower()));
}

function furnacePerLevel() {
  let p = D(0.012);
  if (hasUpg('meltdown', 3)) p = p.add(0.006);
  if (rankReward('grade', 12)) p = p.mul(1.25);
  return p;
}

function bellowsPower() {
  let p = D(1.4).add(furnacePerLevel().mul(player.buyables.furnace));
  if (rankReward('order', 6)) p = p.add(0.05);
  return p;
}
function bellowsMult() { return bellowsPower().pow(player.buyables.bellows); }

function tickPower() {
  let p = D(1.15);
  if (rankReward('degree', 15)) p = p.add(0.01);
  if (rankReward('grade', 5)) p = p.add(0.02);
  if (hasUpg('ignition', 7)) p = p.add(0.02);
  if (hasUpg('meltdown', 4)) p = p.add(upgEff('meltdown', 4));
  p = p.add(Challenges.reward(3));
  p = p.add(Layers.map.vaporize.effect().tick);
  return p;
}
function tickMult() {
  if (inChal(3)) return D(1);
  return tickPower().pow(player.buyables.tickspeed);
}

// Every multiplier on heat gain, named, for the Stats breakdown.
function heatMultipliers() {
  const m = [];
  m.push(['Bellows', bellowsMult()]);
  m.push(['Tickspeed', tickMult()]);
  m.push(['Ranks', Ranks.heatMult()]);
  for (const def of Layers.list) {
    if (def.heatMult) m.push([def.currency, def.heatMult()]);
  }
  m.push(['Achievements', Achievements.mult()]);
  return m;
}

function rawHeatGain() {
  let g = heatBase();
  for (const [, v] of heatMultipliers()) g = g.mul(v);
  return g;
}

// ---------- Heat Loss (softcaps on gain per second) ----------

const HeatLoss = [
  {
    name: 'Heat Loss I',
    start: () => {
      if (inChal(2)) return D(1e6);
      let s = D(1e12);
      if (hasUpg('ignition', 11)) s = s.mul(1e3);
      if (hasUpg('vaporize', 4)) s = s.mul(upgEff('vaporize', 4));
      return s;
    },
    power: () => {
      let p = 0.5 + Challenges.reward(2);
      if (hasUpg('meltdown', 5)) p += 0.05;
      return Math.min(p, 1);
    },
  },
  { name: 'Heat Loss II', start: () => D(1e60), power: () => 0.4 },
  { name: 'Heat Loss III', start: () => D('1e400'), power: () => 0.2 },
];

function applyHeatLoss(x) {
  for (const hl of HeatLoss) {
    const s = hl.start();
    if (x.gt(s)) x = s.mul(x.div(s).pow(hl.power()));
  }
  return x;
}

function heatGain() {
  return applyHeatLoss(rawHeatGain());
}

function resetCore(keepBuyables = {}) {
  player.T = D(0);
  Buyables.reset(keepBuyables);
  if (Layers.ms('ignition', 3)) player.buyables.kindling = player.buyables.kindling.max(5);
}

function anyLayerReset() {
  for (const def of Layers.list) if (player.layers[def.id].resets > 0) return true;
  return false;
}
