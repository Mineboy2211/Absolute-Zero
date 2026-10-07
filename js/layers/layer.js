// Generic reset-layer engine. Each layer file calls Layers.register({...}).
//
// Layer definition fields:
//   id, chapter, order, name, currency, verb ('Ignite'), color
//   unlocked()         when the tab first appears (sticky once true)
//   req, reqText()     Temperature needed to reset
//   gain()             raw currency gain on reset (floored by the engine)
//   onReset(gain)      extra effects when this layer resets
//   keep(byDef)        what survives when a higher layer resets this one: { upgrades: true | [ids], points: bool }
//   onResetBy(byDef)   extra cleanup when reset by a higher layer
//   heatMult()         multiplier on heat gain (listed in Stats)
//   effectText()       short description of the currency's effect
//   passive()          fraction of pending gain earned per second
//   tick(dt)           per-tick logic
//   upgrades[]         { cost, desc, effect?, effectText?, unlocked? }
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
    const g = def.gain();
    return Number.isNaN(g.mag) ? D(0) : g.floor();
  },

  canReset(id) {
    const def = this.map[id];
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
    this.resetBelow(def);
    return true;
  },

  // Layers reset every lower layer of their chapter, and every layer of earlier chapters.
  resetBelow(byDef) {
    const lower = this.list.filter((l) => l.chapter < byDef.chapter || (l.chapter === byDef.chapter && l.order < byDef.order));
    for (let i = lower.length - 1; i >= 0; i--) this.resetLayer(lower[i], byDef);
    Ranks.reset();
    resetCore();
  },

  resetLayer(def, byDef) {
    const d = player.layers[def.id];
    const keep = def.keep ? def.keep(byDef) : {};
    if (!keep.points) d.points = D(0);
    if (keep.upgrades !== true) {
      const kept = keep.upgrades || [];
      d.upgrades = d.upgrades.filter((u) => kept.includes(u));
    }
    d.time = 0;
    if (def.onResetBy) def.onResetBy(byDef);
  },

  // ----- milestones & upgrades -----
  ms(id, req) { return player.layers[id].resets >= req; },

  canBuyUpg(id, uid) {
    const u = this.map[id].upgMap[uid];
    return this.isUnlocked(id) && (!u.unlocked || u.unlocked()) && !hasUpg(id, uid) && player.layers[id].points.gte(u.cost);
  },
  buyUpg(id, uid) {
    if (!this.canBuyUpg(id, uid)) return false;
    const d = player.layers[id];
    d.points = d.points.sub(this.map[id].upgMap[uid].cost);
    d.upgrades.push(uid);
    return true;
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
      if (def.passive) {
        const rate = def.passive();
        if (rate > 0) {
          const g = this.gain(def.id);
          if (g.gt(0)) this.addPoints(def.id, g.mul(rate * dt));
        }
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
