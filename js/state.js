// Player state: default values and small shared helpers.

const SAVE_KEY = 'absoluteZeroSave';
const SAVE_VERSION = 3;

let player = null;

// Replaced by the UI with a toast; a no-op in headless runs.
let notify = () => {};

function getDefaultPlayer() {
  const p = {
    version: SAVE_VERSION,
    T: D(0),
    bestT: D(0),
    buyables: { kindling: D(0), bellows: D(0), furnace: D(0), tickspeed: D(0) },
    ranks: { degree: D(0), grade: D(0), order: D(0) },
    layers: {},
    challenges: { active: 0, comps: {} },
    achievements: [],
    chapters: { unlocked: 1, seenIntro: 0, completed: 0 },
    auto: {},
    options: {
      notation: 'named',
      unit: 'K',
      autosave: true,
      offline: true,
      devMode: false,
      devSpeed: 1,
      tab: 'main',
      newsSeen: '',
    },
    stats: { timePlayed: 0, created: Date.now(), devUsed: false },
    lastTick: Date.now(),
  };
  for (const def of Layers.list) p.layers[def.id] = Layers.defaultData(def);
  for (const id of Automation.ids()) p.auto[id] = { on: false, amount: '1' };
  return p;
}

const inChal = (id) => player.challenges.active === id;
const chalComps = (id) => player.challenges.comps[id] || 0;
