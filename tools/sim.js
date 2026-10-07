// Headless pacing simulator. Plays the game with a greedy "active player" bot and prints
// when each milestone is first reached.
//
// Usage (needs Node and break_eternity.js installed somewhere):
//   npm install break_eternity.js
//   node tools/sim.js [hours=3] [path/to/break_eternity.cjs.js]

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const hours = Number(process.argv[2] || 3);
const debugAfter = process.env.DEBUG_AFTER;
const bePath = process.argv[3] || require.resolve('break_eternity.js/dist/break_eternity.cjs.js', { paths: [process.cwd(), __dirname] });
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// Logic scripts are every local script before ui.js in index.html.
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((m) => m[1]);
const logic = scripts.slice(0, scripts.indexOf('js/ui.js'));

const ctx = { console, Date, Math, Number, String, Object, Array, JSON };
ctx.Decimal = require(bePath);
if (ctx.Decimal.default) ctx.Decimal = ctx.Decimal.default;
vm.createContext(ctx);
const code = logic.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') + '\n;player = getDefaultPlayer();';
vm.runInContext(code, ctx, { filename: 'game.js' });

const bot = `
var events = {};
function mark(name) { if (!(name in events)) { events[name] = player.stats.timePlayed; console.log(formatTime(player.stats.timePlayed).padStart(12) + '  ' + name + '   (T=' + format(player.T) + ', gain=' + format(heatGain()) + '/s)'); } }
function botStep(dt) {
  const deg = player.ranks.degree;
  gameTick(dt);
  if (player.ranks.degree.gt(deg) && (player.ranks.degree.lte(3) || player.ranks.degree.toNumber() % 5 === 0)) mark('Degree ' + formatWhole(player.ranks.degree));
  for (const def of Layers.list) {
    if (!player.layers[def.id].unlocked) continue;
    let bought = true;
    while (bought) {
      bought = false;
      const opts = def.upgrades.filter(u => Layers.canBuyUpg(def.id, u.id)).sort((a, b) => a.cost.cmp(b.cost));
      if (opts.length) { Layers.buyUpg(def.id, opts[0].id); bought = true; }
    }
  }
  for (const id of ['tickspeed', 'furnace', 'bellows', 'kindling']) Buyables.buyMax(id);
  for (const def of [...Layers.list].reverse()) {
    const d = player.layers[def.id];
    if (!Layers.canReset(def.id)) continue;
    const g = Layers.gain(def.id);
    const passive = def.passive && def.passive() > 0;
    if (passive) continue;
    if (g.gte(d.points.max(1)) || (d.time > 600 && g.gte(d.points.mul(0.1)))) {
      Layers.doReset(def.id);
      mark('first ' + def.name);
      mark(def.name + ' x' + d.resets);
      break;
    }
  }
  for (const id of ['order', 'grade']) if (Ranks.rankUp(id) && (player.ranks[id].lte(3) || player.ranks[id].toNumber() % 5 === 0)) mark(Ranks.defs[id].name + ' ' + formatWhole(player.ranks[id]));
  // Challenges: try the cheapest uncompleted tier when the last Vaporize run reached far enough.
  if (!player.challenges.active && player.layers.vaporize.resets > 0) {
    for (const c of Challenges.list) {
      const goal = Challenges.goal(c.id);
      const fails = (player.challenges.fails || {})[c.id] || 0;
      if (c.unlocked() && goal && player.T.gte(goal.pow(1.1 + 0.15 * fails))) { Challenges.enter(c.id); player.challenges.started = player.stats.timePlayed; break; }
    }
  } else if (player.challenges.active && player.stats.timePlayed - player.challenges.started > 900) {
    player.challenges.fails = player.challenges.fails || {};
    player.challenges.fails[player.challenges.active] = (player.challenges.fails[player.challenges.active] || 0) + 1;
    Challenges.exit();
  } else if (player.challenges.active) {
    const id = player.challenges.active;
    if (!player.challenges.lastComps) player.challenges.lastComps = {};
    if ((player.challenges.lastComps[id] || 0) < chalComps(id)) { player.challenges.lastComps[id] = chalComps(id); mark('chal ' + id + ' tier ' + chalComps(id)); Challenges.exit(); }
  }
  for (const e of [1e3, 1e6, 1e10, 1e15, 1e20, 1e25, 1e30, 1e40, 1e50, 1e60, 1e80, 1e100]) if (player.bestT.gte(e)) mark('T >= ' + format(e, 0));
}
`;
vm.runInContext(bot + (debugAfter ? ';var DEBUG_AFTER = ' + Number(debugAfter) + ';' : ''), ctx);
vm.runInContext(`
  for (let t = 0; t < ${hours} * 3600; t++) {
    botStep(1);
    if (typeof DEBUG_AFTER !== 'undefined' && t > DEBUG_AFTER && t % 300 === 0) console.log('  dbg chal=' + player.challenges.active + ' T=' + format(player.T) + ' gain=' + format(heatGain()) + ' embers=' + format(layerPts('ignition')) + ' pendE=' + format(Layers.gain('ignition')) + ' passive=' + Layers.map.ignition.passive() + ' upgI=' + player.layers.ignition.upgrades.length + ' upgM=' + player.layers.meltdown.upgrades.length + ' ranks=' + player.ranks.degree + '/' + player.ranks.grade + '/' + player.ranks.order + ' buy=' + Buyables.order.map(b => player.buyables[b].toString()).join('/'));
    if (t % 1800 === 0) console.log('--- ' + formatTime(t) + ': T=' + format(player.T) + ' best=' + format(player.bestT) + ' Embers=' + format(layerPts('ignition')) + ' Magma=' + format(layerPts('meltdown')) + ' flow=' + format(player.layers.meltdown.flow) + ' P=' + format(layerPts('vaporize')) + ' ranks ' + player.ranks.degree + '/' + player.ranks.grade + '/' + player.ranks.order + ' buy ' + Buyables.order.map(b => player.buyables[b].toString()).join('/'));
  }
  console.log('Final: T=' + format(player.T) + ' best=' + format(player.bestT) + ' NaN check: ' + Number.isNaN(player.T.mag));
`, ctx);
