// Chapter 2, layer 4: Quasar -> Jets. Fire a Jet at heat or a layer to supercharge it for a while.

const JET_TARGETS = ['heat', 'ignition', 'meltdown', 'vaporize', 'ionize', 'fusion', 'supernova', 'collapse', 'singularity'];

const Jets = {
  data() { return player.layers.quasar; },
  active() { const d = this.data(); return d && d.remaining > 0 ? d.activeTarget : null; },
  power() {
    let p = 2;
    if (hasUpg('quasar', 1)) p += 1;
    if (hasUpg('quasar', 9)) p += 2;
    if (Layers.ms('quasar', 25)) p += 1;
    if (hasUpg('planck', 9)) p += 2;
    return p;
  },
  duration: () => 60 + (hasUpg('quasar', 2) ? 30 : 0),
  cooldown: () => (hasUpg('quasar', 7) ? 15 : 30),
  rechargeTime: () => 600 / (hasUpg('quasar', 3) ? 2 : 1) / (Layers.ms('quasar', 10) ? 2 : 1),
  canFire() {
    const d = this.data();
    return !!d && Layers.isUnlocked('quasar') && d.points.gte(1) && d.remaining <= 0 && d.cooling <= 0;
  },
  fire(target) {
    if (!this.canFire() || !JET_TARGETS.includes(target)) return false;
    const d = this.data();
    d.points = d.points.sub(1);
    d.activeTarget = target;
    d.remaining = this.duration();
    d.cooling = this.duration() + this.cooldown();
    d.fired += 1;
    return true;
  },
  // Multiplier on a layer's currency gain from an active Jet.
  layerMult(id) { return this.active() === id ? Decimal.pow(10, this.power()) : D(1); },
  heatMult() {
    if (this.active() !== 'heat') return D(1);
    return Decimal.pow(10, this.power() * 20 * (hasUpg('quasar', 6) ? 2 : 1));
  },
  targetName(t) { return t === 'heat' ? 'Heat' : Layers.map[t].name; },
};

Layers.register({
  id: 'quasar',
  chapter: 2,
  order: 4,
  name: 'Quasar',
  currency: 'Jets',
  verb: 'Ignite a quasar',
  color: '#4cc9f0',
  extraData: () => ({ target: 'heat', activeTarget: 'heat', remaining: 0, cooling: 0, recharge: 0, fired: 0 }),
  unlocked: () => Layers.isUnlocked('singularity') && player.bestT.gte('1e680'),
  req: () => D('1e690'),
  gain() {
    // Jets stay scarce: polynomial in log(T).
    let g = player.T.log10().sub(690).div(20).add(1).pow(2).mul(layerPts('singularity').add(1).log10().add(1).pow(0.5));
    if (Layers.map.planck) g = g.mul(Layers.map.planck.jetMult());
    return g;
  },
  heatMult: () => Jets.heatMult(),
  tick(dt) {
    const d = player.layers.quasar;
    d.remaining = Math.max(0, d.remaining - dt);
    d.cooling = Math.max(0, d.cooling - dt);
    d.recharge += dt;
    const every = Jets.rechargeTime();
    if (d.recharge >= every) {
      const n = Math.floor(d.recharge / every);
      d.recharge -= n * every;
      Layers.addPoints('quasar', D(n));
    }
  },
  radiationMult: () => (hasUpg('quasar', 5) ? layerPts('quasar').add(1) : D(1)),
  effectText() {
    const a = Jets.active();
    return a ? `A Jet is blasting ${Jets.targetName(a)} for ${formatTime(player.layers.quasar.remaining)}.` : 'No Jet is active. Fire one below.';
  },
  passive: () => (Layers.ms('planck', 5) ? 0.1 : 0),
  onResetBy() {
    if (Layers.ms('planck', 3)) Layers.addPoints('quasar', D(10).sub(layerPts('quasar')).max(0));
  },
  autoReset: () => Layers.ms('planck', 2),
  keep: () => ({ upgrades: Layers.ms('planck', 1) }),
  upgrades: [
    { cost: D(2), desc: 'Jet power +1 (each power is ×10 on the target).' },
    { cost: D(5), desc: 'Jets last 30 seconds longer.' },
    { cost: D(10), desc: 'Jets recharge twice as fast.' },
    { cost: D(25), desc: 'Unlock auto-fire at your chosen target.' },
    {
      cost: D(60),
      desc: 'Stored Jets boost Hawking radiation.',
      effect: () => layerPts('quasar').add(1),
      effectText: (e) => formatMult(e),
    },
    { cost: D(150), desc: 'Jets aimed at Heat are twice as strong.' },
    { cost: D(400), desc: 'Jet cooldown halved.' },
    { cost: D(1e3), desc: 'Gravity weight ×0.8.' },
    { cost: D(3e3), desc: 'Jet power +2.' },
    { cost: D(1e4), desc: 'Quasar light: heat gain ^1.02.' },
  ],
  milestones: [
    { req: 1, desc: 'Keep Hawking upgrades on Quasar.' },
    { req: 2, desc: 'Unlock the Singularity autobuyer.' },
    { req: 3, desc: 'The black hole keeps its mass on Quasar.' },
    { req: 5, desc: 'Gain 10% of pending Hawking Heat every second.' },
    { req: 10, desc: 'Jets recharge twice as fast.' },
    { req: 25, desc: 'Jet power +1.' },
  ],
});

Automation.register({
  id: 'auto_jet',
  name: 'Fire Jets',
  chapter: 2,
  group: 'quasar',
  unlocked: () => hasUpg('quasar', 4),
  run: () => { if (Jets.canFire()) Jets.fire(player.layers.quasar.target); },
});
