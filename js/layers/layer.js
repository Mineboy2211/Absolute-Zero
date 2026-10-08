// Generic reset-layer engine. Each layer file calls Layers.register({...}).
//
// Layer definition fields:
//   id, chapter, order, name, currency, verb ('Ignite'), color
//   unlocked()         when the tab first appears (sticky once true)
//   req, reqText()     Temperature needed to reset
//   gain()             raw currency gain on reset (floored by the engine)
//   onReset(gain)      extra effects when this layer resets
//   keep(byDef)        what survives when a higher layer of the SAME chapter resets this one: { upgrades: true | [ids], points: bool }
//                      (a later chapter ignores it and asks Chapters.crossKeep instead, like IMR's big resets)
//   onResetBy(byDef, keep)  extra cleanup when reset by a higher layer (keep = the keep object that applied)
//   heatMult()         multiplier on heat gain (listed in Stats)
//   effectText()       short description of the currency's effect
//   passive()          fraction of pending gain earned per second
//   tick(dt)           per-tick logic
//   upgrades[]         { cost, extra?: [[layerId, amount]], desc, effect?, effectText?, unlocked? }
//   milestones[]       { req (number of resets), desc }
//   autoReset()        when the "auto reset" automation is unlocked
//   panel(el)          optional custom UI block for the layer tab

const Layers = {
  list: [],
  map: {},

  register(def) {
    def.upgrades = def.upgrades || [];
    def.milestones = def.milestones || [];
    def.upgMap = {};
    def.upgrades.forEach((u, i) => { u.id = i + 1; def.upgMap[u.id] = u; });
    this.list.push(def);
    this.list.sort((a, b) => a.chapter - b.chapter || a.order - b.order);
    this.map[def.id] = def;
    if (def.autoReset) {
      Automation.register({
        id: 'reset_' + def.id,
        name: def.name,
        chapter: def.chapter,
        group: def.id,
        amount: true,
        unlocked: def.autoReset,
        run: () => {
          if (this.canReset(def.id) && this.gain(def.id).gte(Automation.amount('reset_' + def.id))) this.doReset(def.id);
        },
      });
    }
  },

  defaultData(def) {
    return Object.assign(
      { unlocked: false, points: D(0), best: D(0), total: D(0), resets: 0, upgrades: [], time: 0 },
      def.extraData ? def.extraData() : {},
    );
  },

  isUnlocked(id) { return player.layers[id].unlocked; },

  gain(id) {
    const def = this.map[id];
    if (player.T.lt(def.req())) return D(0);
    let g = def.gain();
    if (def.chapter === 1) g = this.chapter1Boost(g);
    if (typeof Jets !== 'undefined') g = g.mul(Jets.layerMult(id));
    if (typeof Cosmos !== 'undefined') g = Cosmos.gainMod(def, g);
    return Number.isNaN(g.mag) ? D(0) : g.floor();
  },

  // Chapter 2 effects on every Chapter 1 currency gain.
  chapter1Boost(g) {
    if (!Chapters.passed(1)) return g;
    if (Layers.ms('supernova', 1)) g = g.mul(10);
    if (hasUpg('supernova', 11)) g = g.mul(10);
    if (Layers.map.collapse) g = g.mul(Layers.map.collapse.chapter1Mult());
    if (inChal(10)) g = g.pow(0.5);
    return g;
  },

  // Fraction of pending gain earned per second.
  passiveRate(def) { return def.passive ? def.passive() : 0; },

  canReset(id) {
    const def = this.map[id];
    // Manual layers have their own buttons; nothing else resets during a Heat Death.
    if (def.manual || (typeof HeatDeath !== 'undefined' && HeatDeath.running())) return false;
    return this.isUnlocked(id) && player.T.gte(def.req()) && this.gain(id).gte(1);
  },

  addPoints(id, amt) {
    const d = player.layers[id];
    d.points = d.points.add(amt);
    d.total = d.total.add(amt);
    d.best = d.best.max(d.points);
  },

  // force: reset even without meeting the requirement; noGain: grant nothing (challenge entry/exit).
  doReset(id, { force = false, noGain = false } = {}) {
    const def = this.map[id];
    if (!force && !this.canReset(id)) return false;
    const d = player.layers[id];
    if (!noGain) {
      const g = this.gain(id);
      this.addPoints(id, g);
      d.resets += 1;
      if (def.onReset) def.onReset(g);
    }
    d.time = 0;
    // Entering or leaving a challenge (noGain) never touches challenge completions.
    this.resetBelow(def, !noGain);
    return true;
  },

  // Layers reset every lower layer of their chapter, and every layer of earlier chapters.
  resetBelow(byDef, resetChallenges = true) {
    const lower = this.list.filter((l) => l.chapter < byDef.chapter || (l.chapter === byDef.chapter && l.order < byDef.order));
    for (let i = lower.length - 1; i >= 0; i--) this.resetLayer(lower[i], byDef);
    if (resetChallenges) Challenges.resetBy(byDef);
    Ranks.reset(byDef);
    resetCore();
  },

  resetLayer(def, byDef) {
    const d = player.layers[def.id];
    // A later chapter wipes everything of an earlier one, except what its own milestones keep.
    const crossChapter = byDef.chapter > def.chapter;
    const keep = Object.assign({}, crossChapter ? Chapters.crossKeep(def, byDef) : (def.keep ? def.keep(byDef) : {}));
    if (crossChapter && def.chapter === 1 && byDef.chapter === 2 && hasUpg('supernova', 13)) d.points = d.points.mul(0.01);
    else if (!keep.points) d.points = D(0);
    if (keep.upgrades !== true) {
      const kept = keep.upgrades || [];
      d.upgrades = d.upgrades.filter((u) => kept.includes(u));
    }
    d.time = 0;
    if (def.onResetBy) def.onResetBy(byDef, keep);
  },

  // ----- milestones & upgrades -----
  ms(id, req) { const d = player.layers[id]; return !!d && d.resets >= req; },

  canBuyUpg(id, uid) {
    const u = this.map[id].upgMap[uid];
    if (!this.isUnlocked(id) || (u.unlocked && !u.unlocked()) || hasUpg(id, uid)) return false;
    if (!player.layers[id].points.gte(u.cost)) return false;
    return !u.extra || u.extra.every(([lid, amt]) => player.layers[lid].points.gte(amt));
  },
  buyUpg(id, uid) {
    if (!this.canBuyUpg(id, uid)) return false;
    const d = player.layers[id];
    const u = this.map[id].upgMap[uid];
    d.points = d.points.sub(u.cost);
    if (u.extra) for (const [lid, amt] of u.extra) player.layers[lid].points = player.layers[lid].points.sub(amt);
    d.upgrades.push(uid);
    return true;
  },
  // Buy every affordable upgrade of a layer, cheapest first.
  buyAllUpgs(id) {
    const def = this.map[id];
    for (const u of [...def.upgrades].sort((a, b) => a.cost.cmp(b.cost))) this.buyUpg(id, u.id);
  },

  tick(dt) {
    for (const def of this.list) {
      const d = player.layers[def.id];
      if (!d.unlocked && def.unlocked()) {
        d.unlocked = true;
        notify(`New layer unlocked: ${def.name}!`);
      }
      if (!d.unlocked) continue;
      d.time += dt;
      const rate = this.passiveRate(def);
      if (rate > 0) {
        const g = this.gain(def.id);
        if (g.gt(0)) this.addPoints(def.id, g.mul(rate * dt));
      }
      if (def.tick) def.tick(dt);
    }
  },
};

function hasUpg(layer, uid) {
  const d = player.layers[layer];
  return !!d && d.upgrades.includes(uid);
}
function upgEff(layer, uid) { return Layers.map[layer].upgMap[uid].effect(); }
function layerPts(id) { return player.layers[id].points; }
