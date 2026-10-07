// Headless pacing simulator. Plays the game with a greedy "active player" bot and prints
// when each milestone is first reached.
//
// Usage (needs Node and break_eternity.js installed somewhere):
//   npm install break_eternity.js
//   node tools/sim.js [hours=3] [path/to/break_eternity.cjs.js]
//
// Environment variables:
//   STEP=6                 seconds per simulated tick (bigger is faster, slightly less precise)
//   LOAD=file.txt          start from an exported save instead of a new game
//   SAVE_OUT=file.txt      write the save to this file when the run ends
//   STOP_CHAPTER=1         stop as soon as this chapter is completed
//   QUIET=1                only print first-time events and checkpoints

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const hours = Number(process.argv[2] || 3);
const step = Number(process.env.STEP || 1);
const bePath = process.argv[3] || require.resolve('break_eternity.js/dist/break_eternity.cjs.js', { paths: [process.cwd(), __dirname] });
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// Logic scripts are every local script before ui.js in index.html.
const scripts = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
const logic = scripts.slice(0, scripts.indexOf('js/ui.js'));

const ctx = {
  console, Date, Math, Number, String, Object, Array, JSON, escape, unescape, encodeURIComponent, decodeURIComponent,
  btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
  atob: (s) => Buffer.from(s, 'base64').toString('binary'),
};
ctx.Decimal = require(bePath);
if (ctx.Decimal.default) ctx.Decimal = ctx.Decimal.default;
vm.createContext(ctx);
const code = logic.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') + '\n;player = getDefaultPlayer();';
vm.runInContext(code, ctx, { filename: 'game.js' });
if (process.env.LOAD) {
  ctx.LOADED = fs.readFileSync(process.env.LOAD, 'utf8').trim();
  vm.runInContext('player = Save.fromObject(Save.decode(LOADED));', ctx);
}
vm.runInContext('player.options.notation = "scientific";', ctx);

const bot = fs.readFileSync(path.join(__dirname, 'sim-bot.js'), 'utf8');
vm.runInContext(bot, ctx, { filename: 'sim-bot.js' });

ctx.HOURS = hours;
ctx.STEP = step;
ctx.STOP_CHAPTER = Number(process.env.STOP_CHAPTER || 0);
vm.runInContext(`
  const start = player.stats.timePlayed;
  const every = HOURS > 24 ? 6 * 3600 : 3600;
  let nextReport = start;
  while (player.stats.timePlayed < start + HOURS * 3600) {
    botStep(STEP);
    if (player.stats.timePlayed >= nextReport) { report(); nextReport += every; }
    if (STOP_CHAPTER && player.chapters.completed >= STOP_CHAPTER) { console.log('Stopped: chapter ' + STOP_CHAPTER + ' complete.'); break; }
  }
  report();
  console.log('Final: best=' + format(player.bestT) + ' NaN fixes: ' + JSON.stringify(fixNaN()));
`, ctx);
if (process.env.SAVE_OUT) fs.writeFileSync(process.env.SAVE_OUT, vm.runInContext('Save.encode(player)', ctx));
