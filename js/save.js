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

const Save = {
  encode(p) { return btoa(unescape(encodeURIComponent(JSON.stringify(p)))); },
  decode(str) { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); },

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
      localStorage.setItem(SAVE_KEY, this.encode(player));
      return true;
    } catch (e) {
      console.error('Save failed', e);
      return false;
    }
  },

  load() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
    if (!raw) { player = getDefaultPlayer(); return false; }
    try {
      player = this.fromObject(this.decode(raw));
      return true;
    } catch (e) {
      console.error('Could not load save, starting fresh. The broken save is kept under ' + SAVE_KEY + '_broken.', e);
      try { localStorage.setItem(SAVE_KEY + '_broken', raw); } catch (e2) { /* ignore */ }
      player = getDefaultPlayer();
      return false;
    }
  },

  exportString() { return this.encode(player); },

  importString(str) {
    const p = this.fromObject(this.decode(str));
    p.lastTick = Date.now();
    player = p;
    this.save();
  },

  hardReset() {
    player = getDefaultPlayer();
    this.save();
  },
};
