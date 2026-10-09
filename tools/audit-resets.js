// Reset audit: fills a save with "everything" (currencies, upgrades, buyables, ranks, Magma flow, Plasma split,
// challenge completions), performs each Chapter 1 reset, and prints what survived.
// Run twice: with no milestones (nothing should survive except what the reset itself gives) and with every
// milestone (only the documented keeps should survive).
//
// Usage: node tools/audit-resets.js [path/to/break_eternity.cjs.js]

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const bePath = process.argv[2] || require.resolve('break_eternity.js/dist/break_eternity.cjs.js', { paths: [process.cwd(), __dirname, root] });
const html = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
const logic = scripts.slice(0, scripts.indexOf('js/ui.js'));
const ctx = { console, Date, Math, Number, String, Object, Array, JSON, escape, unescape, encodeURIComponent, decodeURIComponent,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary') };
ctx.Decimal = require(bePath);
if (ctx.Decimal.default) ctx.Decimal = ctx.Decimal.default;
vm.createContext(ctx);
vm.runInContext(logic.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n'), ctx);

vm.runInContext(`
const CH1 = Layers.list.filter((l) => l.chapter === 1).map((l) => l.id);
function fill(milestones) {
  player = getDefaultPlayer();
  player.T = D('1e200'); player.bestT = D('1e200');
  for (const k of Buyables.order) player.buyables[k] = D(50);
  player.ranks.degree = D(30); player.ranks.grade = D(12); player.ranks.order = D(8);
  for (const id of CH1) {
    const d = player.layers[id];
    d.unlocked = true; d.points = D(1e6); d.resets = milestones ? 100 : 0;
    d.upgrades = [...Layers.map[id].upgrades, ...(milestones ? Layers.map[id].qol : [])].map((u) => u.id);
  }
  player.layers.meltdown.flow = D(1e5);
  for (const k of Object.keys(PLASMA_POOLS)) player.layers.ionize.alloc[k] = D(1e3);
  for (const c of Challenges.list) if (c.chapter === 1) player.challenges.comps[c.id] = 3;
}
function snap() {
  const s = { T: format(player.T), buyables: Buyables.order.map((k) => formatWhole(player.buyables[k])).join('/'),
    ranks: ['degree', 'grade', 'order'].map((k) => formatWhole(player.ranks[k])).join('/'),
    flow: format(player.layers.meltdown.flow), split: format(Layers.map.ionize.allocated()),
    challenges: Challenges.list.filter((c) => c.chapter === 1).map((c) => chalComps(c.id)).join(''),
    autobuyers: Automation.list.filter((a) => (a.chapter || 1) === 1 && Automation.isUnlocked(a.id)).map((a) => a.id).join(',') };
  for (const id of CH1) s[id] = format(layerPts(id), 0) + ' pts, ' + player.layers[id].upgrades.length + ' upg';
  return s;
}
function run(label, action, milestones) {
  fill(milestones);
  const before = snap();
  action();
  const after = snap();
  console.log('\\n== ' + label + (milestones ? ' (all milestones)' : ' (no milestones)'));
  for (const k of Object.keys(after)) {
    const mark = before[k] === after[k] ? '  kept   ' : '  changed';
    console.log(mark + ' ' + k.padEnd(11) + ' ' + before[k] + '  ->  ' + after[k]);
  }
}
const resets = [
  ['Grade', () => { player.ranks.degree = D(100); Ranks.rankUp('grade'); }],
  ['Order', () => { player.ranks.grade = D(40); Ranks.rankUp('order'); }],
  ...CH1.map((id) => [Layers.map[id].name, () => Layers.doReset(id, { force: true })]),
];
for (const ms of [false, true]) for (const [n, f] of resets) run(n, f, ms);
`, ctx);
