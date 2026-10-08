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
  slingCap() { return 0.15 + (typeof Cosmos !== 'undefined' ? Cosmos.slingCap() : 0) + (hasUpg('inflation', 8) ? 0.03 : 0) + (hasUpg('absolute', 7) ? 0.05 : 0); },
  // Exponent applied to heat gain before Heat Loss.
  exponent() {
    const gw = this.amount().toNumber() * this.weight();
    if (!(gw > 0)) return 1;
    // Slingshot is capped: an exponent that grew with Temperature would run away.
    return this.isBonus() ? 1 + Math.min(gw / 2, this.slingCap()) : 1 / (1 + gw);
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
  if (typeof Cosmos !== 'undefined') e *= Cosmos.heatExp();
  if (hasUpg('inflation', 4)) e *= 1.03;
  if (hasUpg('inflation', 10)) e *= 1.04;
  if (typeof Thermo !== 'undefined') e *= Thermo.heatExp();
  if (typeof HeatDeath !== 'undefined') e *= HeatDeath.heatExp();
  if (typeof Absolute !== 'undefined') e *= Absolute.heatExp();
  for (const def of Layers.list) if (def.chapter === 4 && def.heatExp) e *= def.heatExp();
  if (typeof Beyond !== 'undefined') e *= Beyond.heatExp();
  return HeatLossV.apply(e);
}

// Heat Loss V (Chapter 4): the heat gain exponent itself is softcapped. Above ^start, extra exponent is raised to ^power.
// Every exponent bonus multiplies the others, and without this they stack into the hundreds.
const HeatLossV = {
  active() { return player.chapters.unlocked >= 4; },
  start() {
    let s = 4;
    if (hasUpg('beyond', 1)) s += 0.25;
    if (hasUpg('beyond', 7)) s += 0.25;
    return s;
  },
  power: () => 0.2,
  apply(e) {
    if (!this.active()) return e;
    const s = this.start();
    return e > s ? s * Math.pow(e / s, this.power()) : e;
  },
};
