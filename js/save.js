// Saving, loading, migrations, export/import, NaN protection.

// migrations[v] turns a version-v save into a version-(v+1) save.
const migrations = {
  // v2: Degrees became automatic, so the Degree autobuyer no longer exists.
  1: (s) => {
    if (s.auto) delete s.auto.rank_degree;
    return s;
  },
  // v3: new notations; the old scientific default becomes Named.
  2: (s) => {
    if (s.options && (s.options.notation === 'scientific' || !s.options.notation)) s.options.notation = 'named';
    if (s.options && s.options.notation === 'standard') s.options.notation = 'short';
    return s;
  },
  // v4: autobuyers and "keep lower upgrades" moved from milestones to upgrades (ids 101+). A save that had
  // already reached such a milestone gets the matching upgrade, so nothing it had is taken away.
  3: (s) => {
    const was = {
      meltdown: [1, 10], vaporize: [1, 2, 5], ionize: [1, 2, 2], fusion: [1, 2, 3],
      supernova: [2, 3, 5, 10], collapse: [1, 2], singularity: [1, 2], quasar: [1, 2], planck: [1, 2, 10],
      bigbang: [1, 2, 3], inflation: [1, 2], entropy: [1, 2, 3], heatdeath: [1, 2, 3], absolute: [1, 2],
      laser: [1], spin: [1, 2], negkelvin: [1, 2], tachyon: [1, 2], beyond: [1, 2],
    };
    for (const [id, reqs] of Object.entries(was)) {
      const d = s.layers && s.layers[id];
      if (!d || !Array.isArray(d.upgrades)) continue;
      reqs.forEach((req, i) => { if ((d.resets || 0) >= req && !d.upgrades.includes(101 + i)) d.upgrades.push(101 + i); });
    }
    return s;
  },
};

function isBadDecimal(d) {
  return Number.isNaN(d.mag) || Number.isNaN(d.layer) || !Number.isFinite(d.mag) || !Number.isFinite(d.layer);
}

// Rebuild a save on top of the default template: Decimals are revived, missing fields filled in,
// unknown keys kept (for maps like challenge completions).
function reviveFrom(tpl, saved) {
  if (tpl instanceof Decimal) {
    if (saved === undefined || saved === null) return tpl;
    let d;
    try { d = new Decimal(saved); } catch (e) { return tpl; }
    return isBadDecimal(d) ? tpl : d;
  }
  if (Array.isArray(tpl)) return Array.isArray(saved) ? saved.slice() : tpl;
  if (tpl && typeof tpl === 'object') {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return tpl;
    const out = {};
    for (const k of Object.keys(saved)) out[k] = saved[k];
    for (const k of Object.keys(tpl)) out[k] = reviveFrom(tpl[k], saved[k]);
    return out;
  }
  if (saved === undefined || saved === null || typeof saved !== typeof tpl) return tpl;
  if (typeof tpl === 'number' && !Number.isFinite(saved)) return tpl;
  return saved;
}

// Replace any NaN/Infinite Decimal in the live state with its default. Returns the paths it fixed.
function fixNaN(obj = player, tpl = getDefaultPlayer(), pathName = 'player') {
  const fixed = [];
  for (const k of Object.keys(tpl)) {
    const v = obj[k], t = tpl[k];
    if (t instanceof Decimal) {
      if (!(v instanceof Decimal) || isBadDecimal(v)) { obj[k] = t; fixed.push(pathName + '.' + k); }
    } else if (t && typeof t === 'object' && !Array.isArray(t) && v && typeof v === 'object') {
      fixed.push(...fixNaN(v, t, pathName + '.' + k));
    }
  }
  return fixed;
}

// Saves are signed with a keyed hash. The real key only exists inside the built bundle (tools/build.js reads it
// from an untracked file), so a save edited by hand no longer loads. Without the bundle (development and the
// simulator), a placeholder key is used.
const SIGN_KEY = typeof SAVE_SECRET !== 'undefined' ? SAVE_SECRET : 'development-key';
// Saves from before signing still load until this date, so nobody loses progress when the update lands.
const UNSIGNED_UNTIL = Date.UTC(2026, 10, 15);

// cyrb53-style 53-bit hash, run twice around the key. Not cryptographic, but useless without the key.
function signHash(str) {
  const h = (s, seed) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };
  return h(SIGN_KEY + str + SIGN_KEY, 7) + h(str + SIGN_KEY, 131);
}

const Save = {
  encode(p) {
    const json = JSON.stringify(p);
    return btoa(unescape(encodeURIComponent(json))) + '.' + signHash(json);
  },
  decode(str) {
    const [body, sig] = str.trim().split('.');
    const json = decodeURIComponent(escape(atob(body)));
    if (!sig) {
      if (Date.now() > UNSIGNED_UNTIL) throw new Error('This save is not signed.');
    } else if (sig !== signHash(json)) {
      throw new Error('This save was edited outside the game, so it cannot be loaded.');
    }
    return JSON.parse(json);
  },

  fromObject(obj) {
    if (!obj || typeof obj !== 'object' || obj.T === undefined) throw new Error('Not an Absolute Zero save.');
    let v = obj.version || 1;
    if (v > SAVE_VERSION) throw new Error('This save comes from a newer version of the game.');
    while (v < SAVE_VERSION) {
      if (migrations[v]) obj = migrations[v](obj);
      v += 1;
      obj.version = v;
    }
    return reviveFrom(getDefaultPlayer(), obj);
  },

  save() {
    try {
      const s = this.encode(player);
      localStorage.setItem(SAVE_KEY, s);
      localStorage.setItem(SAVE_KEY + '_backup', s);
      return true;
    } catch (e) {
      console.error('Save failed', e);
      return false;
    }
  },

  load() {
    this.loadProgress();
    this.applySettings();
  },

  loadProgress() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
    if (!raw) { player = getDefaultPlayer(); return false; }
    try {
      player = this.fromObject(this.decode(raw));
      return true;
    } catch (e) {
      // Fall back to the backup copy (it is also signed, so it cannot be edited either).
      try {
        player = this.fromObject(this.decode(localStorage.getItem(SAVE_KEY + '_backup') || ''));
        console.warn('The main save could not be loaded; the backup was used instead.', e);
        return true;
      } catch (e2) { /* no valid backup */ }
      console.error('Could not load save, starting fresh. The broken save is kept under ' + SAVE_KEY + '_broken.', e);
      try { localStorage.setItem(SAVE_KEY + '_broken', raw); } catch (e2) { /* ignore */ }
      player = getDefaultPlayer();
      return false;
    }
  },

  // Display and saving preferences are stored on their own the moment they change, so they survive a refresh
  // even with autosave off. Developer settings are deliberately not part of it.
  SETTINGS: ['notation', 'unit', 'autosaveEvery', 'offline', 'effects', 'toasts', 'cloudAuto'],
  saveSettings() {
    const s = {};
    for (const k of this.SETTINGS) s[k] = player.options[k];
    try { localStorage.setItem(SAVE_KEY + '_settings', JSON.stringify(s)); } catch (e) { /* storage blocked */ }
  },
  applySettings() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(SAVE_KEY + '_settings') || 'null'); } catch (e) { s = null; }
    if (!s || typeof s !== 'object') return;
    for (const k of this.SETTINGS) {
      if (k in s && typeof s[k] === typeof player.options[k]) player.options[k] = s[k];
    }
  },

  exportString() { return this.encode(player); },

  importString(str) {
    const p = this.fromObject(this.decode(str));
    p.lastTick = Date.now();
    player = p;
    // Preferences belong to this device, not to the imported save.
    this.applySettings();
    this.save();
  },

  hardReset() {
    player = getDefaultPlayer();
    this.save();
  },
};
