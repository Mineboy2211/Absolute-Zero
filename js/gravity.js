// Chapter 2 rule: Gravity grows with Temperature and pulls heat gain down, until you learn to use it.

const Gravity = {
  active() { return player.chapters.unlocked >= 2; },
  amount() {
    if (!this.active()) return D(0);
    const L = player.T.max(1).log10();
    if (L.lte(450)) return D(0);
    let g = L.sub(450).div(50).pow(0.8);
    if (inChal(9)) g = g.mul(3);
    return g;
  },
  // How strongly each point of Gravity bends heat gain.
  weight() {
    let w = 0.05;
    if (hasUpg('supernova', 6)) w *= 0.75;
    if (hasUpg('supernova', 8)) w *= 0.75;
    if (hasUpg('singularity', 7)) w *= 0.8;
    if (hasUpg('quasar', 8)) w *= 0.8;
    if (hasUpg('planck', 6)) w *= 0.7;
    w *= Math.max(0, 1 - Challenges.reward(9));
    if (typeof Compressors !== 'undefined') w /= Compressors.gravityDiv();
    return w;
  },
  isBonus() { return hasUpg('supernova', 10); },
  // Exponent applied to heat gain before Heat Loss.
  exponent() {
    const gw = this.amount().toNumber() * this.weight();
    if (!(gw > 0)) return 1;
    // Slingshot is capped: an exponent that grew with Temperature would run away.
    return this.isBonus() ? 1 + Math.min(gw / 2, 0.15) : 1 / (1 + gw);
  },
  describe() {
    const e = this.exponent();
    if (!this.active()) return '';
    if (this.amount().lte(0)) return 'Gravity awakens above 1e450 K.';
    return this.isBonus()
      ? `Gravity ${format(this.amount())} is slinging your heat: gain ^${e.toFixed(3)}.`
      : `Gravity ${format(this.amount())} is pulling your heat down: gain ^${e.toFixed(3)}.`;
  },
};

// Every exponent applied to raw heat gain, multiplied together.
function heatExponent() {
  let e = Gravity.exponent();
  if (hasUpg('fusion', 26)) e *= 1.05;
  if (hasUpg('supernova', 1)) e *= 1.02;
  if (hasUpg('supernova', 5)) e *= 1.03;
  if (hasUpg('collapse', 9)) e *= 1.02;
  if (hasUpg('quasar', 10)) e *= 1.02;
  if (inChal(12)) e *= 0.75;
  e *= 1 + Challenges.reward(12);
  if (typeof Planck !== 'undefined') e *= Planck.heatExp();
  return e;
}
