// Ranks: Degree -> Grade -> Order.
// Degrees are earned automatically as Temperature crosses each threshold (no reset).
// Grade and Order are "tempering" resets: they reset Temperature, buyables and the ranks below them.

function rankReward(rank, at) {
  return !inChal(6) && player.ranks[rank].gte(at);
}

const Ranks = {
  order: ['degree', 'grade', 'order'],
  defs: {
    degree: {
      name: 'Degree',
      auto: true,
      degreeExp: () => {
        let e = rankReward('order', 2) ? 1.15 : 1.2;
        e -= Challenges.reward(6);
        return e;
      },
      // Temperature needed for Degree lvl + 1.
      req(lvl) { return D(10).mul(D(5).pow(D(lvl).pow(this.degreeExp()))); },
      reqText(lvl) { return formatK(this.req(lvl)); },
      can() { return player.T.gte(this.req(player.ranks.degree)); },
      // Highest level reachable from current Temperature.
      target() {
        const x = player.T.div(10);
        if (x.lt(1)) return D(0);
        let t = x.log(5).pow(1 / this.degreeExp()).floor().add(1);
        while (t.gt(0) && this.req(t.sub(1)).gt(player.T)) t = t.sub(1);
        return t;
      },
      rewards: [
        [1, 'Unlock Bellows. Heat gain ×2.'],
        [2, 'Unlock Draft.'],
        [3, 'Unlock Furnace. Heat gain ×2.'],
        [4, 'Kindling power ×2.'],
        [6, () => `Heat gain ×(Degree + 1). Currently ${formatMult(player.ranks.degree.add(1))}.`],
        [10, 'Bellows are 10× cheaper.'],
        [15, 'Draft power +0.01.'],
        [25, 'Kindling cost scaling starts 25 levels later.'],
      ],
    },
    grade: {
      name: 'Grade',
      req(lvl) { return D(lvl).mul(2).add(5).sub(hasUpg('vaporize', 6) ? 1 : 0); },
      reqText(lvl) { return 'Degree ' + formatWhole(this.req(lvl)); },
      can() { return player.ranks.degree.gte(this.req(player.ranks.grade)); },
      target() {
        const x = player.ranks.degree.add(hasUpg('vaporize', 6) ? 1 : 0).sub(5);
        if (x.lt(0)) return D(0);
        return x.div(2).floor().add(1);
      },
      doReset() {
        const keep = hasUpg('ignition', 6)
          ? { kindling: true, bellows: true, furnace: true, tickspeed: true }
          : { kindling: rankReward('grade', 2) };
        resetCore(keep);
        player.ranks.degree = D(0);
      },
      rewards: [
        [1, 'Heat gain ×3.'],
        [2, 'Grade no longer resets Kindling.'],
        [3, 'Unlock the Kindling autobuyer.'],
        [5, 'Draft power +0.02.'],
        [8, () => `Heat gain ×Grade². Currently ${formatMult(player.ranks.grade.pow(2).max(1))}.`],
        [12, 'Furnace effect ×1.25.'],
      ],
    },
    order: {
      name: 'Order',
      req(lvl) { return D(3).add(D(lvl).pow(1.3).floor()).sub(hasUpg('vaporize', 6) ? 1 : 0); },
      reqText(lvl) { return 'Grade ' + formatWhole(this.req(lvl)); },
      can() { return player.ranks.grade.gte(this.req(player.ranks.order)); },
      target() {
        let t = player.ranks.order;
        while (player.ranks.grade.gte(this.req(t))) t = t.add(1);
        return t;
      },
      doReset() {
        const keep = hasUpg('ignition', 6) ? { kindling: true, bellows: true, furnace: true, tickspeed: true } : {};
        resetCore(keep);
        if (!rankReward('order', 4)) player.ranks.degree = D(0);
        player.ranks.grade = D(0);
      },
      rewards: [
        [1, 'Heat gain ×10.'],
        [2, 'Degree requirement exponent 1.2 → 1.15.'],
        [4, 'Order no longer resets Degree.'],
        [6, 'Bellows power +0.05.'],
        [10, () => `Heat gain ×1.5 per Order. Currently ${formatMult(Ranks.orderMult())}.`],
      ],
    },
  },
  orderMult() { return Decimal.pow(1.5, player.ranks.order); },
  heatMult() {
    let m = D(1);
    if (rankReward('degree', 1)) m = m.mul(2);
    if (rankReward('degree', 3)) m = m.mul(2);
    if (rankReward('degree', 6)) m = m.mul(player.ranks.degree.add(1));
    if (rankReward('grade', 1)) m = m.mul(3);
    if (rankReward('grade', 8)) m = m.mul(player.ranks.grade.pow(2));
    if (rankReward('order', 1)) m = m.mul(10);
    if (rankReward('order', 10)) m = m.mul(this.orderMult());
    return m;
  },
  can(id) { return this.defs[id].can(); },
  // Rank up as far as possible in one go.
  rankUp(id) {
    const def = this.defs[id];
    if (def.auto || !def.can()) return false;
    const t = def.target();
    if (t.lte(player.ranks[id])) return false;
    player.ranks[id] = t;
    def.doReset();
    return true;
  },
  // Degrees follow Temperature on their own.
  tick() {
    const t = this.defs.degree.target();
    if (t.gt(player.ranks.degree)) player.ranks.degree = t;
  },
  reset() {
    for (const id of this.order) player.ranks[id] = D(0);
  },
};

for (const id of ['grade', 'order']) {
  Automation.register({
    id: 'rank_' + id,
    name: Ranks.defs[id].name,
    group: 'ranks',
    unlocked: () => ({
      grade: hasUpg('ignition', 10),
      order: hasUpg('meltdown', 7),
    })[id],
    run: () => Ranks.rankUp(id),
  });
}
