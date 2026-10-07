// Number and time formatting. All game numbers are break_eternity Decimals.

const D = (x) => (x instanceof Decimal ? x : new Decimal(x));

const ST_FIRST = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const ST_UNITS = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N'];
const ST_TENS = ['', 'Dc', 'Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Og', 'Ng'];

// Suffix for 10^(3i). Returns null past the supported range (1e300).
function standardSuffix(i) {
  if (i < ST_FIRST.length) return ST_FIRST[i];
  const n = i - 1;
  if (n >= 100) return null;
  return ST_UNITS[n % 10] + ST_TENS[Math.floor(n / 10)];
}

function notation() {
  return (typeof player !== 'undefined' && player && player.options && player.options.notation) || 'scientific';
}

function formatExponent(e) {
  return e < 1e6 ? Math.round(e).toLocaleString('en-US') : format(e, 2);
}

function format(x, dp = 2) {
  x = D(x);
  if (Number.isNaN(x.mag) || Number.isNaN(x.layer)) return 'NaN';
  if (x.sign < 0) return '-' + format(x.neg(), dp);
  if (!Number.isFinite(x.mag) || !Number.isFinite(x.layer)) return 'Infinity';
  if (x.eq(0)) return (0).toFixed(dp);
  if (x.lt(1e-3)) {
    const e = Math.floor(x.log10().toNumber());
    return (x.toNumber() / Math.pow(10, e)).toFixed(dp) + 'e' + e;
  }
  if (x.lt(1e3)) return x.toNumber().toFixed(dp);
  if (x.layer >= 4) return 'F' + x.slog().toNumber().toFixed(3);
  if (x.lt('1e1000000')) {
    const lg = x.log10().toNumber();
    let e = Math.floor(lg);
    let m = Math.pow(10, lg - e);
    if (m >= 10 - Math.pow(10, -dp) / 2) { m = 1; e += 1; }
    const mode = notation();
    if (mode === 'standard' && e < 303) {
      const i = Math.floor(e / 3);
      const suffix = standardSuffix(i);
      if (suffix !== null) return (m * Math.pow(10, e - 3 * i)).toFixed(dp) + ' ' + suffix;
    }
    if (mode === 'engineering') {
      const e3 = Math.floor(e / 3) * 3;
      return (m * Math.pow(10, e - e3)).toFixed(dp) + 'e' + formatExponent(e3);
    }
    return m.toFixed(dp) + 'e' + formatExponent(e);
  }
  return 'e' + format(x.log10(), dp);
}

// Integers below 1000 shown without decimals.
function formatWhole(x) {
  x = D(x);
  if (x.lt(1e3) && x.gte(0)) return String(Math.floor(x.toNumber() + 1e-9));
  return format(x, 2);
}

function formatK(x, dp = 2) { return format(x, dp) + ' K'; }
function formatMult(x, dp = 2) { return '×' + format(x, dp); }

function formatTime(s) {
  s = Number(s);
  if (!Number.isFinite(s)) return '∞';
  if (s < 60) return s.toFixed(1) + 's';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}
