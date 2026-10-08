// Entry point: load, offline progress, game loop, autosave.

const OFFLINE_CAP = 24 * 3600;
let lastAutosave = Date.now();
let lastNaNCheck = Date.now();
let lastFrame = 0;
const FRAME_MS = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 150 : 100;

function snapshot() {
  const s = { T: player.T, best: player.bestT };
  for (const def of Layers.list) s[def.id] = player.layers[def.id].points;
  return s;
}

// The open "Welcome back" popup, if any. Further offline catch-ups merge into it instead of stacking.
let offlineSummary = null;

function runOffline(seconds) {
  seconds = Math.min(seconds, OFFLINE_CAP);
  const before = offlineSummary ? offlineSummary.before : snapshot();
  simulateTime(seconds, 1000, 1);
  const after = snapshot();
  const total = (offlineSummary ? offlineSummary.seconds : 0) + seconds;
  if (offlineSummary) offlineSummary.close();
  const lines = [h('p', { text: `You were away for ${formatTime(total)}.` })];
  lines.push(h('p', { text: `Temperature: ${formatK(before.T)} → ${formatK(after.T)}` }));
  if (after.best.gt(before.best)) lines.push(h('p', { text: `Best temperature: ${formatK(before.best)} → ${formatK(after.best)}` }));
  for (const def of Layers.list) {
    if (Layers.isUnlocked(def.id) && !after[def.id].eq(before[def.id])) {
      lines.push(h('p', { text: `${def.currency}: ${format(before[def.id])} → ${format(after[def.id])}` }));
    }
  }
  const close = UI.modal('Welcome back', lines, [{ text: 'Close', action: () => { offlineSummary = null; } }]);
  offlineSummary = { before, seconds: total, close };
}

function gameLoop() {
  const now = Date.now();
  // Paused while developer tools are open (see guard.js).
  if (typeof Guard !== 'undefined' && Guard.paused) { player.lastTick = now; return; }
  const real = (now - player.lastTick) / 1000;
  player.lastTick = now;
  if (real > 60 && player.options.offline) {
    runOffline(real);
  } else if (real > 0) {
    const speed = player.options.devMode ? player.options.devSpeed : 1;
    const dt = Math.min(real, 60) * speed;
    const steps = Math.min(20, Math.max(1, Math.ceil(dt / 1)));
    for (let i = 0; i < steps; i++) gameTick(dt / steps);
  }
  if (now - lastFrame >= FRAME_MS) {
    lastFrame = now;
    UI.update();
  }

  if (now - lastNaNCheck > 5000) {
    lastNaNCheck = now;
    const fixed = fixNaN();
    if (fixed.length) console.warn('NaN values were reset:', fixed);
  }
  if (player.options.autosave && now - lastAutosave > 30000) {
    lastAutosave = now;
    Save.save();
  }
  if (typeof Cloud !== 'undefined') Cloud.tick();
}

function start() {
  if (typeof Decimal === 'undefined') {
    document.getElementById('content').textContent = 'Could not load break_eternity.js from the CDN. Check your connection and reload.';
    return;
  }
  Save.load();
  const away = (Date.now() - player.lastTick) / 1000;
  player.lastTick = Date.now();
  UI.init();
  if (player.chapters.seenIntro < 1) UI.showChapterIntro(Chapters.get(1));
  else if (player.options.offline && away > 60) runOffline(away);
  setInterval(gameLoop, 50);
  if (typeof Cloud !== 'undefined') Cloud.resume();
  window.addEventListener('beforeunload', () => { if (player.options.autosave) Save.save(); });
}

start();
