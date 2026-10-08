// Number and time formatting. All game numbers are break_eternity Decimals.

const D = (x) => (x instanceof Decimal ? x : new Decimal(x));

// ---------- -illion names (Conway–Wechsler style), valid up to 10^3003 ----------

const ILLION_FIRST = ['thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion'];
const ILLION_UNITS = ['', 'un', 'duo', 'tre', 'quattuor', 'quin', 'sex', 'septen', 'octo', 'novem'];
const ILLION_TENS = ['', 'deci', 'viginti', 'triginta', 'quadraginta', 'quinquaginta', 'sexaginta', 'septuaginta', 'octoginta', 'nonaginta'];
const ILLION_HUNDREDS = ['', 'centi', 'ducenti', 'trecenti', 'quadringenti', 'quingenti', 'sescenti', 'septingenti', 'octingenti', 'nongenti'];

const SHORT_FIRST = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const SHORT_UNITS = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N'];
const SHORT_TENS = ['', 'Dc', 'Vg', 'Tg', 'Qd', 'Qq', 'Sg', 'St', 'Og', 'Nn'];
const SHORT_HUNDREDS = ['', 'Ce', 'Dn', 'Tc', 'Qe', 'Qu', 'Sc', 'Si', 'Oe', 'Ne'];

// Name of 10^(3i + 3), i from 0 (thousand) to 999.
function illionName(i) {
  if (i < ILLION_FIRST.length) return ILLION_FIRST[i];
  const n = i; // 10^33 = decillion: i = n = 10
  const stem = ILLION_UNITS[n % 10] + ILLION_TENS[Math.floor(n / 10) % 10] + ILLION_HUNDREDS[Math.floor(n / 100)];
  return stem.replace(/[ai]$/, '') + 'illion';
}
function illionShort(i) {
  if (i < SHORT_FIRST.length) return SHORT_FIRST[i];
  const n = i;
  return SHORT_UNITS[n % 10] + SHORT_TENS[Math.floor(n / 10) % 10] + SHORT_HUNDREDS[Math.floor(n / 100)];
}
const capitalize = (w) => w[0].toUpperCase() + w.slice(1);

// 1 -> a, 26 -> z, 27 -> aa ...
function letterCode(i) {
  let s = '';
  while (i > 0) { i -= 1; s = String.fromCharCode(97 + (i % 26)) + s; i = Math.floor(i / 26); }
  return s;
}

const NOTATIONS = {
  named: { label: 'Named (12.3 Million)' },
  short: { label: 'Short (12.3 M)' },
  letters: { label: 'Letters (12.3 b)' },
  scientific: { label: 'Scientific (1.23e7)' },
  engineering: { label: 'Engineering (12.3e6)' },
  logarithm: { label: 'Logarithm (e7.09)' },
};

function notation() {
  const n = typeof player !== 'undefined' && player && player.options && player.options.notation;
  if (n === 'standard') return 'short';
  return NOTATIONS[n] ? n : 'named';
}

function formatExponent(e) {
  return e < 1e6 ? Math.round(e).toLocaleString('en-US') : format(e, 2);
}

// "10^4,500" for numbers too big for suffixes.
function formatPower(x, dp) {
  const e = x.log10();
  return '10^' + (e.lt(1e6) ? Math.floor(e.toNumber()).toLocaleString('en-US') : '(' + format(e, dp) + ')');
}

function format(x, dp = 2) {
  x = D(x);
  if (Number.isNaN(x.mag) || Number.isNaN(x.layer)) return 'NaN';
  if (x.sign < 0) return '-' + format(x.neg(), dp);
  if (!Number.isFinite(x.mag) || !Number.isFinite(x.layer)) return 'Infinity';
  if (x.eq(0)) return (0).toFixed(dp);
  if (x.lt(1e-3)) {
    // Tiny numbers (a Heat Death can cool far below 1 K): mantissa from the logarithm, so 1e-500 still works.
    const lg = x.log10().toNumber();
    let e = Math.floor(lg);
    let m = Math.pow(10, lg - e);
    if (m >= 10 - Math.pow(10, -dp) / 2) { m = 1; e += 1; }
    return m.toFixed(dp) + 'e' + (e < -1e6 ? format(e, dp) : e.toLocaleString('en-US'));
  }
  if (x.lt(1e3)) return x.toNumber().toFixed(dp);
  if (x.layer >= 4) return 'F' + x.slog().toNumber().toFixed(3);
  const mode = notation();

  if (mode === 'logarithm') {
    if (x.lt('1e1000000')) return 'e' + x.log10().toNumber().toFixed(dp);
    return 'e' + format(x.log10(), dp);
  }

  if (x.lt('1e1000000')) {
    const lg = x.log10().toNumber();
    let e = Math.floor(lg);
    let m = Math.pow(10, lg - e);
    if (m >= 10 - Math.pow(10, -dp) / 2) { m = 1; e += 1; }
    const i = Math.floor(e / 3);
    const lead = (m * Math.pow(10, e - 3 * i)).toFixed(dp);
    if (mode === 'named') return i <= 1000 ? lead + ' ' + capitalize(illionName(i - 1)) : formatPower(x, dp);
    if (mode === 'short') return i <= 1000 ? lead + ' ' + illionShort(i - 1) : formatPower(x, dp);
    if (mode === 'letters') return lead + ' ' + letterCode(i);
    if (mode === 'engineering') return lead + 'e' + formatExponent(3 * i);
    return m.toFixed(dp) + 'e' + formatExponent(e);
  }
  if (mode === 'named' || mode === 'short' || mode === 'letters') return formatPower(x, dp);
  return 'e' + format(x.log10(), dp);
}

// Integers below 1000 shown without decimals.
function formatWhole(x) {
  x = D(x);
  if (x.lt(1e3) && x.gte(0)) return String(Math.floor(x.toNumber() + 1e-9));
  return format(x, 2);
}

function tempUnit() {
  return (typeof player !== 'undefined' && player && player.options && player.options.unit === 'kelvin') ? ' Kelvin' : ' K';
}
function formatK(x, dp = 2) { return format(x, dp) + tempUnit(); }
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
