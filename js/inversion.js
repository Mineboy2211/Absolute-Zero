// Chapter 4 rule: Inversion. A population inversion has a negative absolute temperature, which is hotter than
// any positive one. From Chapter 4 on, your heat pumps a second track, the Inverted Temperature (shown as −K).
// It pushes Heat Loss IV further away, and Chapter 4 layers feed it or spend it.

const Inversion = {
  active() { return player.chapters.unlocked >= 4; },
  value() { return player.inv.T; },
  // Inverted Temperature per second: polynomial in log10(T), so it can never run away.
  baseGain() {
    if (!this.active()) return D(0);
    const L = player.T.max(1).log10();
    if (L.lt(50000)) return D(0);
    return L.sub(50000).div(5000).add(1).pow(3);
  },
  mult() {
    let m = D(1);
    for (const def of Layers.list) if (def.invMult) m = m.mul(def.invMult());
    if (typeof Achievements.inversionMult === 'function') m = m.mul(Achievements.inversionMult());
    if (Layers.ms('negkelvin', 3)) m = m.mul(10);
    if (hasUpg('beyond', 5)) m = m.mul(1000);
    return m;
  },
  gain() { return this.baseGain().mul(this.mult()); },
  // How strongly Inverted Temperature delays Heat Loss IV.
  strength() {
    let k = 0.05;
    if (Layers.map.negkelvin) k += Layers.map.negkelvin.strengthBonus();
    if (hasUpg('spin', 9)) k += 0.01;
    if (hasUpg('beyond', 9)) k += 0.05;
    return k;
  },
  // Grows with the square root of its orders of magnitude, so a huge Inverted Temperature stays a fair bonus.
  hl4StartMult() {
    if (!this.active()) return 1;
    return 1 + this.strength() * Math.sqrt(this.value().add(1).log10().toNumber());
  },
  tick(dt) {
    if (!this.active()) return;
    const inv = player.inv;
    inv.T = inv.T.add(this.gain().mul(dt));
    inv.best = inv.best.max(inv.T);
  },
  format(x = this.value()) { return '−' + formatK(x); },
};

// Upgrade costs can also be paid in Inverted Temperature: the pseudo layer id 'inv'.
function extraPts(lid) { return lid === 'inv' ? player.inv.T : layerPts(lid); }
function extraSub(lid, amt) {
  if (lid === 'inv') player.inv.T = player.inv.T.sub(amt).max(0);
  else player.layers[lid].points = player.layers[lid].points.sub(amt);
}
function extraName(lid) { return lid === 'inv' ? 'Inverted Temperature' : Layers.map[lid].currency; }
