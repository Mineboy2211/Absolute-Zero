// DOM rendering. Each tab is built once when opened; small "updater" closures refresh it every frame.

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return e;
}

function setText(e, v) {
  if (e._t !== v) { e._t = v; e.textContent = v; }
}

const UI = {
  updaters: [],
  headerUpdaters: [],
  sidebarKey: '',
  accentLog: 0,

  bind(fn) { this.updaters.push(fn); },
  // Text that is recomputed every frame.
  dyn(fn, tag = 'span', cls) {
    const e = h(tag, cls ? { class: cls } : null);
    this.bind(() => setText(e, fn()));
    return e;
  },
  showIf(e, fn) {
    this.bind(() => {
      const v = !!fn();
      if (e._shown !== v) { e._shown = v; e.hidden = !v; }
    });
    return e;
  },
  classIf(e, cls, fn) {
    this.bind(() => e.classList.toggle(cls, !!fn()));
    return e;
  },

  init() {
    notify = (msg) => { if (player.options.toasts) this.toast(msg); };
    document.getElementById('menu-toggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.getElementById('content').addEventListener('click', () => document.body.classList.remove('nav-open'));
    this.buildHeader();
    // Keep the layout below the header, whatever height it wraps to.
    const top = document.getElementById('top');
    const syncHeader = () => document.documentElement.style.setProperty('--header-h', top.offsetHeight + 'px');
    if (window.ResizeObserver) new ResizeObserver(syncHeader).observe(top);
    window.addEventListener('resize', syncHeader);
    syncHeader();
    this.updateSidebar(true);
    this.switchTab(player.options.tab || 'main');
    Feel.init();
    document.addEventListener('keydown', (ev) => {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT')) return;
      DevUnlock.key(ev.key);
      if (ev.key === 'm' || ev.key === 'M') maxAll();
    });
  },

  // ---------- header ----------
  buildHeader() {
    const temp = document.getElementById('temp');
    const gain = document.getElementById('gain');
    const cur = document.getElementById('currencies');
    const banner = document.getElementById('chal-banner');
    this.headerUpdaters.push(() => {
      setText(temp, formatK(player.T));
      if (typeof HeatDeath !== 'undefined' && HeatDeath.running()) setText(gain, `Heat Death: cooling ${format(HeatDeath.rate())} orders of magnitude/s`);
      else setText(gain, '+' + formatK(heatGain()) + '/s' + (heatLossActive() ? '  (heat loss active)' : ''));
      const id = player.challenges.active;
      if (banner.hidden === !!id) banner.hidden = !id;
      if (id) {
        const c = Challenges.get(id);
        const goal = Challenges.goal(id);
        setText(banner, `In challenge: ${c.name}. ` + (goal ? `Next goal: ${formatK(goal)}` : 'All tiers completed.'));
      }
    });
    for (const def of Layers.list) {
      const chip = h('button', { class: 'chip', title: `Go to ${def.name}`, onclick: () => this.switchTab(def.id) });
      chip.style.setProperty('--chip', def.color);
      const amount = h('b');
      chip.append(h('span', { class: 'chip-name', text: def.currency }), amount);
      cur.append(chip);
      this.headerUpdaters.push(() => {
        const show = Layers.isUnlocked(def.id) && def.chapter === headerChapter();
        if (chip.hidden === show) chip.hidden = !show;
        if (show) setText(amount, format(layerPts(def.id)));
      });
    }
    const gLabel = document.getElementById('gauge-label');
    const gFill = document.getElementById('gauge-fill');
    this.headerUpdaters.push(() => {
      const g = nextGoal();
      const pct = logProgress(player.T, g.from, g.target);
      setText(gLabel, `${g.name} · ${formatK(g.target)} · ${(pct * 100).toFixed(1)}%`);
      const w = (pct * 100).toFixed(2) + '%';
      if (gFill.style.width !== w) gFill.style.width = w;
    });
  },

  // ---------- sidebar ----------
  tabs() {
    const t = [
      { id: 'main', name: 'Main', group: 'General', show: true },
      { id: 'ranks', name: 'Ranks', group: 'General', show: true },
      { id: 'chapter', name: 'Chapter', group: 'General', show: true },
      { id: 'challenges', name: 'Challenges', group: 'General', show: Challenges.anyUnlocked() },
    ];
    for (const ch of Chapters.list) {
      if (ch.id > player.chapters.unlocked) continue;
      for (const def of Layers.list.filter((l) => l.chapter === ch.id)) {
        t.push({ id: def.id, name: def.name, group: `Chapter ${ch.id}: ${ch.name}`, show: Layers.isUnlocked(def.id), color: def.color });
      }
    }
    t.push({ id: 'news', name: 'News', group: 'Other', show: true, badge: News.hasUnread() });
    t.push({ id: 'achievements', name: 'Achievements', group: 'Other', show: true });
    t.push({ id: 'stats', name: 'Stats', group: 'Other', show: true });
    t.push({ id: 'options', name: 'Options', group: 'Other', show: true });
    return t.filter((x) => x.show);
  },

  updateSidebar(force) {
    const tabs = this.tabs();
    const key = tabs.map((t) => t.id + (t.badge ? '*' : '')).join(',') + '|' + this.currentTab;
    if (!force && key === this.sidebarKey) return;
    this.sidebarKey = key;
    const nav = document.getElementById('sidebar');
    nav.textContent = '';
    // The highlight behind the active tab is one element kept across rebuilds, so it can slide between tabs.
    if (!this.navPill) this.navPill = h('div', { class: 'nav-pill', 'aria-hidden': 'true' });
    nav.append(this.navPill);
    let group = null;
    for (const t of tabs) {
      if (t.group !== group) {
        group = t.group;
        nav.append(h('div', { class: 'nav-group', text: group }));
      }
      const b = h('button', { class: 'nav-btn' + (t.id === this.currentTab ? ' active' : ''), onclick: () => this.switchTab(t.id) }, t.name,
        t.badge ? h('span', { class: 'badge', text: 'new' }) : null);
      if (t.color) b.style.setProperty('--tab', t.color);
      nav.append(b);
    }
    this.placeNavPill();
  },
  placeNavPill() {
    const pill = this.navPill;
    const active = document.querySelector('#sidebar .nav-btn.active');
    if (!pill || !active) { if (pill) pill.style.opacity = '0'; return; }
    pill.style.setProperty('--tab', active.style.getPropertyValue('--tab') || 'var(--accent)');
    pill.style.top = active.offsetTop + 'px';
    pill.style.height = active.offsetHeight + 'px';
    pill.style.opacity = '1';
  },

  // Rebuild the current tab (e.g. after a display setting changed).
  refresh() { this.switchTab(this.currentTab); },

  // Changing tab: the old page fades out, then the new one's cards slide in one after another, from below when
  // moving down the menu and from above when moving up. Rebuilding the same tab (refresh) is instant.
  switchToken: 0,
  switchTab(id) {
    const tabs = this.tabs();
    if (!tabs.some((t) => t.id === id)) id = 'main';
    const content = document.getElementById('content');
    const old = content.firstElementChild;
    const order = tabs.map((t) => t.id);
    const dir = order.indexOf(id) >= order.indexOf(this.currentTab) ? 1 : -1;
    const changed = id !== this.currentTab;
    const fx = changed && player.options.effects && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const token = ++this.switchToken;
    this.currentTab = id;
    player.options.tab = id;
    document.body.classList.remove('nav-open');
    this.updateSidebar(true);
    if (fx && old) {
      this.updaters = [];
      old.style.setProperty('--dir', dir);
      old.classList.add('leave');
      setTimeout(() => { if (token === this.switchToken) this.renderTab(id, dir, true); }, 120);
    } else {
      this.renderTab(id, dir, fx);
    }
  },
  renderTab(id, dir, fx) {
    this.updaters = [];
    const content = document.getElementById('content');
    content.textContent = '';
    const render = Tabs[id] || (Layers.map[id] ? () => renderLayerTab(Layers.map[id]) : Tabs.main);
    const el = render();
    if (fx) {
      el.classList.add('enter');
      el.style.setProperty('--dir', dir);
      Array.from(el.children).forEach((c, i) => c.style.setProperty('--i', Math.min(i, 7)));
    }
    content.append(el);
    content.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    this.update();
  },

  // ---------- per frame ----------
  frame: 0,
  update() {
    GainCache.clear();
    for (const fn of this.headerUpdaters) fn();
    for (const fn of this.updaters) fn();
    if (this.frame++ % 10 === 0) this.updateSidebar(false);
    this.updateAccent();
  },

  // Changing --accent restyles the whole page, so it is only written when the colour really changes.
  updateAccent() {
    const target = Math.log10(Math.max(0, player.T.max(1).log10().toNumber()) + 1);
    this.accentLog += (target - this.accentLog) * 0.15;
    const c = accentColor(Math.round(this.accentLog * 50) / 50);
    if (c !== this.accentValue) {
      this.accentValue = c;
      document.documentElement.style.setProperty('--accent', c);
    }
  },

  // ---------- modals & toasts ----------
  toast(msg) {
    const box = document.getElementById('toasts');
    const t = h('div', { class: 'toast', text: msg });
    box.append(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => t.classList.add('fade'), 3500);
    setTimeout(() => t.remove(), 4200);
  },

  modal(title, body, buttons = [{ text: 'Close' }]) {
    const root = document.getElementById('modal-root');
    const close = () => wrap.remove();
    const wrap = h('div', { class: 'modal-wrap' },
      h('div', { class: 'modal', role: 'dialog', 'aria-label': title },
        h('h2', { text: title }),
        h('div', { class: 'modal-body' }, body),
        h('div', { class: 'modal-buttons' }, buttons.map((b) => h('button', {
          class: b.danger ? 'danger' : (b.primary ? 'primary' : ''),
          onclick: () => { if (!b.action || b.action() !== false) close(); },
        }, b.text)))));
    root.append(wrap);
    return close;
  },

  showChapterComplete(ch) {
    const body = h('div', { class: 'chapter-intro' },
      h('div', { class: 'chapter-num', text: `Chapter ${ch.id} complete` }),
      (ch.complete || []).map((line) => h('p', { text: line })),
      h('p', { text: 'The next chapter is still being forged.' }),
      h('p', { class: 'chapter-rule' }, h('b', { text: 'Coming next: ' }), ch.id === 1 ? 'Chapter 2, Stellar.' : ch.id === 2 ? 'Chapter 3, Cosmic.' : ch.id === 3 ? 'Chapter 4, Inversion.' : 'Chapter 5.'));
    this.modal(`${ch.name}: complete`, body, [{ text: 'Keep burning', primary: true }]);
  },

  showChapterIntro(ch) {
    player.chapters.seenIntro = Math.max(player.chapters.seenIntro, ch.id);
    const body = h('div', { class: 'chapter-intro' },
      h('div', { class: 'chapter-num', text: `Chapter ${ch.id}` }),
      ch.intro.map((line) => h('p', { text: line })),
      h('p', { class: 'chapter-rule' }, h('b', { text: 'New rule: ' }), ch.rule));
    this.modal(ch.name, body, [{ text: 'Begin', primary: true }]);
    this.updateSidebar(true);
  },
};

// Blue -> red -> orange -> white -> violet, keyed on log10(log10(T) + 1).
const ACCENT_STOPS = [
  [0, [70, 150, 255]],
  [0.45, [215, 215, 225]],
  [0.85, [255, 70, 70]],
  [1.6, [255, 150, 40]],
  [2.6, [245, 245, 255]],
  [6, [180, 110, 255]],
];
function accentColor(q) {
  let a = ACCENT_STOPS[0], b = ACCENT_STOPS[ACCENT_STOPS.length - 1];
  if (q <= a[0]) b = a;
  for (let i = 0; i < ACCENT_STOPS.length - 1; i++) {
    if (q >= ACCENT_STOPS[i][0] && q <= ACCENT_STOPS[i + 1][0]) { a = ACCENT_STOPS[i]; b = ACCENT_STOPS[i + 1]; break; }
  }
  if (q > b[0]) a = b;
  const t = b[0] === a[0] ? 0 : (q - a[0]) / (b[0] - a[0]);
  const c = a[1].map((v, i) => Math.round(v + (b[1][i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// The header shows the currencies of the newest chapter that has an unlocked layer.
function headerChapter() {
  for (let c = player.chapters.unlocked; c > 1; c--) {
    if (Layers.list.some((l) => l.chapter === c && Layers.isUnlocked(l.id))) return c;
  }
  return 1;
}

// Fraction of the way from `from` to `to`, measured in orders of magnitude.
function logProgress(x, from, to) {
  const a = D(from).max(1).log10().toNumber(), b = D(to).max(1).log10().toNumber();
  const v = D(x).max(1).log10().toNumber();
  if (!(b > a)) return v >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (v - a) / (b - a)));
}

// What the header gauge tracks: the first layer never reset, otherwise the next Degree.
function nextGoal() {
  for (const def of Layers.list) {
    if (player.layers[def.id].resets === 0) return { name: `Next: ${def.name}`, from: D(1), target: def.req() };
  }
  const deg = Ranks.defs.degree;
  const d = player.ranks.degree;
  return { name: `Next: Degree ${formatWhole(d.add(1))}`, from: d.gt(0) ? deg.req(d.sub(1)) : D(1), target: deg.req(d) };
}

function heatLossActive() {
  const raw = rawHeatGain();
  return HeatLoss.some((hl) => !(hl.broken && hl.broken()) && raw.gt(hl.start()));
}

function maxAll() {
  for (const id of ['tickspeed', 'furnace', 'bellows', 'kindling']) Buyables.buyMax(id);
}

// ---------- shared widgets ----------

function autoToggle(id) {
  const a = Automation.map[id];
  const box = h('input', { type: 'checkbox' });
  box.checked = player.auto[id].on;
  box.addEventListener('change', () => { player.auto[id].on = box.checked; });
  const row = h('label', { class: 'auto-toggle' }, box, ` Auto ${a.name}`);
  if (a.amount) {
    const input = h('input', { type: 'text', class: 'amount', value: player.auto[id].amount, 'aria-label': 'Minimum gain' });
    input.addEventListener('change', () => { player.auto[id].amount = input.value; });
    row.append(' when gain ≥ ', input);
  }
  UI.bind(() => { if (box.checked !== player.auto[id].on) box.checked = player.auto[id].on; });
  return UI.showIf(row, () => Automation.isUnlocked(id));
}

function card(title, ...kids) {
  return h('section', { class: 'card' }, title ? h('h2', { text: title }) : null, kids);
}

// ---------- tabs ----------

const Tabs = {
  main() {
    const root = h('div', { class: 'tab' });
    const tiles = Buyables.order.map((id) => {
      const b = Buyables.defs[id];
      const buyBtn = h('button', { class: 'buy', onclick: () => Buyables.buy(id) });
      const maxBtn = h('button', { class: 'buy max', onclick: () => Buyables.buyMax(id) }, 'Max');
      const fill = h('div', { class: 'fill' });
      UI.bind(() => {
        const cost = Buyables.cost(id);
        setText(buyBtn, formatK(cost));
        const can = Buyables.canBuy(id);
        buyBtn.classList.toggle('can', can);
        maxBtn.classList.toggle('can', can);
        const w = (logProgress(player.T, 1, cost) * 100).toFixed(1) + '%';
        if (fill.style.width !== w) fill.style.width = w;
      });
      const tile = h('div', { class: 'machine', 'data-kind': id },
        h('div', { class: 'machine-head' },
          h('span', { class: 'machine-name', text: b.name }),
          Feel.bumpOnChange(UI.dyn(() => formatWhole(Buyables.level(id)), 'span', 'machine-level'))),
        h('div', { class: 'muted small', text: b.desc }),
        UI.dyn(() => b.effectText(), 'div', 'effect'),
        UI.showIf(h('span', { class: 'tag', text: 'Cost scaling' }), () => Buyables.isScaled(id)),
        h('div', { class: 'meter' }, fill),
        h('div', { class: 'machine-buttons' }, buyBtn, maxBtn),
        autoToggle('buy_' + id));
      return UI.showIf(tile, b.unlocked);
    });
    root.append(card('The Hearth',
      h('div', { class: 'hearth-top' },
        h('p', { class: 'muted' }, 'Base heat ', UI.dyn(() => formatK(heatBase()) + '/s', 'b'), ' · Press M to max everything.'),
        h('button', { onclick: maxAll }, 'Max all')),
      h('div', { class: 'machines' }, tiles)));

    const grav = card('Gravity',
      h('p', { class: 'muted', text: 'Gravity grows with your Temperature above 1e450 K. Until you learn to use it, it raises your heat gain to a power below 1.' }),
      h('div', { class: 'gravity-row' },
        h('div', null, h('div', { class: 'muted small', text: 'Gravity' }), UI.dyn(() => format(Gravity.amount()), 'div', 'gravity-big')),
        h('div', null, h('div', { class: 'muted small', text: 'Weight' }), UI.dyn(() => Gravity.weight().toFixed(4), 'div', 'gravity-big')),
        h('div', null, h('div', { class: 'muted small', text: 'Heat gain exponent' }), UI.dyn(() => '^' + Gravity.exponent().toFixed(3), 'div', 'gravity-big'))),
      UI.dyn(() => Gravity.describe(), 'p'));
    UI.classIf(grav, 'gravity-bonus', () => Gravity.isBonus());
    root.append(UI.showIf(grav, () => Gravity.active()));

    const inv = card('Inversion',
      h('p', { class: 'muted', text: 'Your heat pumps a negative temperature, hotter than any positive one. Inverted Temperature pushes Heat Loss IV further away.' }),
      h('div', { class: 'gravity-row' },
        h('div', null, h('div', { class: 'muted small', text: 'Inverted Temperature' }), UI.dyn(() => Inversion.format(), 'div', 'gravity-big')),
        h('div', null, h('div', { class: 'muted small', text: 'Gain' }), UI.dyn(() => '−' + formatK(Inversion.gain()) + '/s', 'div', 'gravity-big')),
        h('div', null, h('div', { class: 'muted small', text: 'Heat Loss IV starts' }), UI.dyn(() => formatMult(Inversion.hl4StartMult()) + ' later', 'div', 'gravity-big'))),
      UI.dyn(() => `Heat Loss V: the heat gain exponent is softcapped above ^${format(HeatLossV.start(), 2)} (the extra part is raised to ^${HeatLossV.power()}).`, 'p', 'muted small'));
    root.append(UI.showIf(inv, () => Inversion.active()));

    const hlRows = HeatLoss.map((hl, i) => {
      const row = h('div', { class: 'heatloss' });
      const txt = h('span');
      row.append(h('b', { text: hl.name + ': ' }), txt);
      UI.bind(() => {
        let x = heatBase();
        for (const [, v] of heatMultipliers()) x = x.mul(v);
        let before = x;
        for (let j = 0; j < i; j++) {
          const o = HeatLoss[j];
          if (o.broken && o.broken()) continue;
          before = o.log ? logSoftcap(before, o.start(), o.power()) : softcap(before, o.start(), o.power());
        }
        if (hl.broken && hl.broken()) {
          row.classList.remove('active');
          setText(txt, 'broken by Planck Break. It no longer slows you down.');
          return;
        }
        const s = hl.start();
        const active = before.gt(s);
        const after = hl.log ? logSoftcap(before, s, hl.power()) : softcap(before, s, hl.power());
        row.classList.toggle('active', active);
        const rule = hl.log
          ? `above ${formatK(s)}/s, the exponent of your gain is raised to ^${hl.power().toFixed(2)}`
          : `gain above ${formatK(s)}/s is raised to ^${hl.power().toFixed(2)}`;
        setText(txt, rule + (active ? `. Currently dividing gain by ${format(before.div(after))}.` : '. Not active yet.'));
      });
      return UI.showIf(row, () => i === 0 || player.bestT.gte(HeatLoss[i - 1].start()));
    });
    root.append(card('Heat Loss', h('p', { class: 'muted', text: 'The hotter things get, the faster they lose heat. Past each threshold, the excess part of your heat gain per second is raised to a power below 1.' }), hlRows));
    return root;
  },

  ranks() {
    const root = h('div', { class: 'tab' });
    root.append(h('p', { class: 'muted' }, UI.dyn(() => (Chapters.passed(1)
      ? 'Degrees are earned on their own as your Temperature climbs. Since Chapter 2, Grade and Order no longer reset anything.'
      : 'Degrees are earned on their own as your Temperature climbs. Grade and Order temper the fire: they reset your Temperature, buyables and the ranks below them in exchange for permanent rewards.'))));
    for (const id of Ranks.order) {
      const r = Ranks.defs[id];
      let btn;
      if (r.auto) {
        const fill = h('div', { class: 'fill' });
        btn = h('div', { class: 'degree-progress' },
          UI.dyn(() => `Next Degree at ${r.reqText(player.ranks.degree)}`, 'div', 'muted small'),
          h('div', { class: 'meter' }, fill));
        UI.bind(() => {
          const d = player.ranks.degree;
          const w = (logProgress(player.T, d.gt(0) ? r.req(d.sub(1)) : 1, r.req(d)) * 100).toFixed(1) + '%';
          if (fill.style.width !== w) fill.style.width = w;
        });
      } else {
        btn = h('button', { class: 'big', onclick: () => Ranks.rankUp(id) });
        UI.bind(() => {
          setText(btn, `Temper into ${r.name} ${formatWhole(r.target().max(player.ranks[id].add(1)))} (requires ${r.reqText(player.ranks[id])})`);
          btn.classList.toggle('can', Ranks.can(id));
        });
      }
      const rewards = r.rewards.map(([at, d]) => {
        const li = h('li', null, h('b', { text: `${r.name} ${at}: ` }), UI.dyn(() => (typeof d === 'function' ? d() : d)));
        UI.classIf(li, 'done', () => player.ranks[id].gte(at));
        return li;
      });
      const c = card(null,
        h('h2', null, r.name + ' ', UI.dyn(() => formatWhole(player.ranks[id]), 'span', 'level')),
        btn, Automation.map['rank_' + id] ? autoToggle('rank_' + id) : null,
        UI.showIf(h('p', { class: 'warn', text: 'Rank rewards are disabled in this challenge.' }), () => inChal(6)),
        h('ul', { class: 'rewards' }, rewards));
      root.append(id === 'degree' ? c : UI.showIf(c, () => id === 'grade' ? (player.ranks.degree.gte(3) || player.ranks.grade.gt(0) || player.ranks.order.gt(0) || anyLayerReset()) : (player.ranks.grade.gte(2) || player.ranks.order.gt(0) || player.layers.meltdown.resets > 0)));
    }
    return root;
  },

  chapter() {
    const root = h('div', { class: 'tab' });
    const ch = Chapters.current();
    root.append(card(`Chapter ${ch.id}: ${ch.name}`,
      h('p', { text: ch.rule }),
      h('p', { class: 'muted' }, 'Goals done: ', UI.dyn(() => `${Chapters.goalsDone(ch)} / ${ch.goals.length}`)),
      h('ul', { class: 'goals' }, ch.goals.map((g) => {
        const li = h('li', null, h('span', { class: 'check' }), g.desc);
        UI.classIf(li, 'done', g.check);
        return li;
      })),
      h('p', { class: 'muted', text: Chapters.get(ch.id + 1)
        ? 'Completing every goal unlocks the next chapter. This is not a reset.'
        : 'The next chapter is still being forged. Complete these goals to be ready for it.' }),
      h('button', { onclick: () => UI.showChapterIntro(ch) }, 'Replay chapter intro')));
    return root;
  },

  challenges() {
    const root = h('div', { class: 'tab' });
    root.append(h('p', { class: 'muted', text: 'Entering a challenge performs a reset of its layer without giving anything. Ionize and every higher reset wipe challenge completions unless milestones of that layer keep them. Each challenge has 5 tiers: a tier is completed the moment you reach its goal, and you can keep going for the next one. Leaving also performs a Vaporize reset.' }));
    const exit = h('button', { class: 'wide danger', onclick: () => Challenges.exit() }, 'Leave the current challenge');
    root.append(UI.showIf(exit, () => player.challenges.active));
    const grid = h('div', { class: 'grid' });
    for (const c of Challenges.list) {
      const btn = h('button', { onclick: () => (inChal(c.id) ? Challenges.exit() : Challenges.enter(c.id)) });
      UI.bind(() => setText(btn, inChal(c.id) ? 'Leave' : (Challenges.goal(c.id) ? 'Enter' : 'Re-enter (maxed)')));
      const el = h('div', { class: 'chal' },
        h('h3', { text: `${c.id}. ${c.name}` }),
        h('p', { text: c.desc }),
        h('p', null, 'Completions: ', UI.dyn(() => `${chalComps(c.id)} / ${Challenges.maxComps}`)),
        h('p', null, 'Goal: ', UI.dyn(() => { const g = Challenges.goal(c.id); return g ? formatK(g) : 'maxed'; })),
        h('p', null, 'Reward: ', UI.dyn(() => c.rewardText(c.reward(chalComps(c.id))) + (chalComps(c.id) < Challenges.maxComps ? ` (next: ${c.rewardText(c.reward(chalComps(c.id) + 1))})` : ''))),
        btn);
      UI.classIf(el, 'active', () => inChal(c.id));
      UI.classIf(el, 'maxed', () => chalComps(c.id) >= Challenges.maxComps);
      grid.append(UI.showIf(el, c.unlocked));
    }
    root.append(grid);
    return root;
  },

  news() {
    const root = h('div', { class: 'tab' });
    News.markRead();
    for (const n of News.list) {
      root.append(h('section', { class: 'card news' },
        h('div', { class: 'news-head' },
          h('span', { class: 'news-version', text: 'v' + n.version }),
          h('h2', { text: n.title }),
          h('span', { class: 'muted small', text: n.date })),
        h('ul', null, n.notes.map((x) => h('li', { text: x })))));
    }
    root.append(h('p', { class: 'muted small', text: 'Only major updates are listed here.' }));
    return root;
  },

  achievements() {
    const root = h('div', { class: 'tab' });
    root.append(h('p', { class: 'muted' }, 'Chapter 1 achievements multiply heat gain by ×1.1 each (total ',
      UI.dyn(() => formatMult(Achievements.mult())), '). Chapter 2 achievements multiply Stardust gain by ×1.1 each (total ',
      UI.dyn(() => formatMult(Achievements.stardustMult())), '). Chapter 3 achievements multiply Universe, Expansion, Entropy and Absolute gain and cooling speed by ×1.1 each (total ',
      UI.dyn(() => formatMult(Achievements.universeMult())), '). Unlocked: ', UI.dyn(() => `${Achievements.count()} / ${Achievements.list.length}`), '.'));
    for (const ch of Chapters.list) {
      if (ch.id > player.chapters.unlocked) continue;
      const list = Achievements.list.filter((a) => a.chapter === ch.id);
      const grid = h('div', { class: 'ach-grid' });
      for (const a of list) {
        const el = h('div', { class: 'ach', title: a.desc }, h('b', { text: a.name }), h('span', { text: a.desc }));
        UI.classIf(el, 'done', () => Achievements.has(a.id));
        grid.append(el);
      }
      root.append(card(`Chapter ${ch.id}: ${ch.name}`, grid));
    }
    return root;
  },

  stats() {
    const root = h('div', { class: 'tab' });
    const row = (label, fn) => h('tr', null, h('td', { text: label }), h('td', null, UI.dyn(fn)));
    root.append(card('General', h('table', { class: 'stats' },
      row('Time played', () => formatTime(player.stats.timePlayed)),
      row('Current temperature', () => formatK(player.T)),
      row('Best temperature', () => formatK(player.bestT)),
      row('Achievements', () => `${Achievements.count()} / ${Achievements.list.length}`),
      row('Challenge completions', () => String(Challenges.totalComps())),
      UI.showIf(row('Developer speed used', () => 'yes'), () => player.stats.devUsed),
      UI.showIf(row('Developer tools opened', () => 'yes'), () => player.stats.devtools))));

    const multTable = h('table', { class: 'stats' });
    const rebuild = () => {
      const rows = [['Base heat', formatK(heatBase()) + '/s']];
      for (const [n, v] of heatMultipliers()) rows.push([n, formatMult(v)]);
      rows.push(['Before heat loss', formatK(rawHeatGain()) + '/s']);
      rows.push(['After heat loss', formatK(heatGain()) + '/s']);
      const key = rows.map((r) => r.join(':')).join('|');
      if (multTable._k === key) return;
      multTable._k = key;
      multTable.textContent = '';
      for (const [a, b] of rows) multTable.append(h('tr', null, h('td', { text: a }), h('td', { text: b })));
    };
    UI.bind(rebuild);
    root.append(card('Heat gain breakdown', multTable));

    const layerTable = h('table', { class: 'stats' }, h('tr', null, h('th', { text: 'Layer' }), h('th', { text: 'Resets' }), h('th', { text: 'Best' }), h('th', { text: 'This run' })));
    for (const def of Layers.list) {
      const tr = h('tr', null, h('td', { text: def.name }),
        h('td', null, UI.dyn(() => String(player.layers[def.id].resets))),
        h('td', null, UI.dyn(() => format(player.layers[def.id].best) + ' ' + def.currency)),
        h('td', null, UI.dyn(() => formatTime(player.layers[def.id].time))));
      layerTable.append(UI.showIf(tr, () => Layers.isUnlocked(def.id)));
    }
    root.append(card('Layers', layerTable));
    return root;
  },

  options() {
    const root = h('div', { class: 'tab' });
    const select = h('select', { 'aria-label': 'Number notation' },
      Object.entries(NOTATIONS).map(([id, n]) => h('option', { value: id, text: n.label })));
    select.value = notation();
    select.addEventListener('change', () => { player.options.notation = select.value; Save.saveSettings(); UI.refresh(); });
    const unit = h('select', { 'aria-label': 'Temperature unit' },
      h('option', { value: 'K', text: 'K' }), h('option', { value: 'kelvin', text: 'Kelvin' }));
    unit.value = player.options.unit === 'kelvin' ? 'kelvin' : 'K';
    unit.addEventListener('change', () => { player.options.unit = unit.value; Save.saveSettings(); UI.refresh(); });
    const samples = ['12345', '6.78e15', '4.2e48', '1e400', '3e5000'];

    const check = (key, label, hint, after) => {
      const box = h('input', { type: 'checkbox', class: 'switch' });
      box.checked = !!player.options[key];
      box.addEventListener('change', () => { player.options[key] = box.checked; Save.saveSettings(); if (after) after(box.checked); });
      return h('label', { class: 'option-row' },
        h('span', { class: 'option-text' }, h('span', { text: label }), hint ? h('span', { class: 'muted small', text: hint }) : null),
        box);
    };

    root.append(card('Display',
      h('label', { class: 'option' }, 'Notation: ', select),
      h('label', { class: 'option' }, 'Temperature unit: ', unit),
      h('p', { class: 'muted small' }, 'Preview: ', UI.dyn(() => samples.map((x) => formatK(x)).join(' · '))),
      check('effects', 'Animations and effects', 'Hover growth, sparks when you buy, bouncing numbers and the like.', (on) => document.body.classList.toggle('no-fx', !on)),
      check('toasts', 'Pop-up notifications', 'Achievements, new layers and other messages in the corner of the screen.')));

    const every = h('select', { 'aria-label': 'Autosave interval' },
      [[0, 'Off'], [10, 'Every 10 seconds'], [30, 'Every 30 seconds'], [60, 'Every minute'], [300, 'Every 5 minutes']]
        .map(([v, t]) => h('option', { value: String(v), text: t })));
    every.value = String(player.options.autosaveEvery);
    every.addEventListener('change', () => { player.options.autosaveEvery = Number(every.value); Save.saveSettings(); });
    root.append(card('Saving',
      h('label', { class: 'option-row' },
        h('span', { class: 'option-text' }, h('span', { text: 'Autosave' }),
          h('span', { class: 'muted small', text: 'How often the game saves on its own. It also saves when you close the page, unless this is off.' })),
        every),
      check('offline', 'Offline progress', 'Keep heating while the game is closed, up to 24 hours.'),
      h('div', { class: 'button-row' },
        h('button', { onclick: () => { if (Save.save()) notify('Game saved.'); } }, 'Save now'),
        h('button', { onclick: showExport }, 'Export'),
        h('button', { onclick: showImport }, 'Import'),
        h('button', { class: 'danger', onclick: showHardReset }, 'Hard reset'))));

    if (typeof Cloud !== 'undefined') root.append(Cloud.card());

    if (player.options.devMode) {
      const dev = card('Developer',
        h('p', { class: 'muted', text: 'Speeds up game time to test pacing.' }));
      const speed = h('select', { 'aria-label': 'Developer speed' }, [1, 2, 5, 10, 100, 1000].map((n) => h('option', { value: n, text: '×' + n })));
      speed.value = String(player.options.devSpeed);
      speed.addEventListener('change', () => {
        player.options.devSpeed = Number(speed.value);
        if (player.options.devSpeed > 1) player.stats.devUsed = true;
      });
      dev.append(h('label', { class: 'option' }, 'Game speed: ', speed));
      dev.append(h('div', { class: 'button-row' },
        h('button', { onclick: () => { const f = fixNaN(); notify(f.length ? 'Fixed: ' + f.join(', ') : 'No NaN found.'); } }, 'Scan for NaN'),
        h('button', { onclick: () => { player.options.devMode = false; player.options.devSpeed = 1; UI.refresh(); } }, 'Close developer mode')));
      root.append(dev);
    }
    // Tapping the version line 7 times (or the Konami code) opens developer mode.
    const footer = h('p', { class: 'muted small version-line', text: `Absolute Zero v${GAME_VERSION} · save ${SAVE_VERSION}${player.stats.devUsed ? '·' : ''}` });
    footer.addEventListener('click', () => DevUnlock.tap());
    root.append(footer);
    return root;
  },
};

function renderLayerTab(def) {
  const root = h('div', { class: 'tab layer-tab' });
  root.style.setProperty('--layer', def.color);
  const d = () => player.layers[def.id];

  const resetBtn = h('button', { class: 'big reset', onclick: () => Layers.doReset(def.id) });
  UI.bind(() => {
    const can = Layers.canReset(def.id);
    setText(resetBtn, can
      ? `${def.verb} for +${formatWhole(Layers.gain(def.id))} ${def.currency}`
      : `Reach ${formatK(def.req())} to ${def.verb.toLowerCase()}`);
    resetBtn.classList.toggle('can', can);
  });

  const lower = Layers.list.filter((l) => l.chapter === def.chapter && l.order < def.order).map((l) => l.currency);
  if (def.chapter > 1) lower.push(`every Chapter ${def.chapter > 2 ? '1–' + (def.chapter - 1) : '1'} currency`);
  const resetsWhat = ['Temperature', 'buyables', 'ranks', ...lower].join(', ');

  root.append(card(null,
    h('h2', { class: 'layer-title', text: `${def.name}` }),
    h('p', { class: 'amount' }, 'You have ', UI.dyn(() => format(d().points), 'b'), ` ${def.currency}.`),
    UI.dyn(() => def.effectText(), 'p'),
    def.manual ? null : resetBtn,
    h('p', { class: 'muted small', text: `${def.name} resets ${resetsWhat}.` }),
    UI.showIf(UI.dyn(() => `Passively gaining ${format((def.passive ? def.passive() : 0) * 100, 0)}% of pending ${def.currency} per second.`, 'p', 'muted'), () => def.passive && def.passive() > 0),
    def.autoReset ? autoToggle('reset_' + def.id) : null,
    def.panel ? def.panel() : null));

  if (def.card) root.append(def.card());

  const upgGrid = (list) => {
    const grid = h('div', { class: 'upg-grid' });
    for (const u of list) {
      const btn = h('button', { class: 'upg', onclick: () => Layers.buyUpg(def.id, u.id) },
        u.name ? h('span', { class: 'node-name', text: u.name }) : null,
        h('span', { class: 'upg-desc', text: u.desc }),
        u.effect ? UI.dyn(() => 'Currently: ' + u.effectText(u.effect()), 'span', 'upg-eff') : null,
        h('span', { class: 'upg-cost', text: 'Cost: ' + [...(u.cost.gt(0) || !u.extra ? [`${formatWhole(u.cost)} ${def.currency}`] : []),
          ...(u.extra || []).map(([lid, amt]) => `${formatWhole(amt)} ${extraName(lid)}`)].join(' + ') }));
      UI.bind(() => {
        btn.classList.toggle('bought', hasUpg(def.id, u.id));
        btn.classList.toggle('can', Layers.canBuyUpg(def.id, u.id));
      });
      grid.append(u.unlocked ? UI.showIf(btn, u.unlocked) : btn);
    }
    return grid;
  };
  if (def.upgrades.length && def.upgradeGrid !== false) root.append(card('Upgrades', upgGrid(def.upgrades)));
  if (def.qol.length) {
    root.append(card('Keeps and automation',
      h('p', { class: 'muted small', text: `Autobuyers and what ${def.name} keeps. These are ${def.name} upgrades, so a higher reset takes them away like any other.` }),
      upgGrid(def.qol)));
  }

  if (def.milestones.length) {
    root.append(card('Milestones',
      h('p', { class: 'muted' }, 'Total resets: ', UI.dyn(() => String(d().resets))),
      h('ul', { class: 'rewards' }, def.milestones.map((m) => {
        const li = h('li', null, h('b', { text: `${m.req} ${m.req === 1 ? 'reset' : 'resets'}: ` }), m.desc);
        UI.classIf(li, 'done', () => Layers.ms(def.id, m.req));
        return li;
      }))));
  }
  return root;
}

// Magma flow panel.
Layers.map.meltdown.panel = () => {
  const m = Layers.map.meltdown;
  return h('div', { class: 'panel' },
    h('p', null, 'Magma flow: ', UI.dyn(() => '+' + format(m.flowRate()) + ' Magma/s', 'b'),
      UI.dyn(() => ` (base flow ${format(player.layers.meltdown.flow)} × ${format(m.flowMult())})`, 'span', 'muted')),
    h('p', { class: 'muted' }, 'Every Meltdown adds the square root of the Magma it gives to your flow. Next Meltdown: ',
      UI.dyn(() => '+' + format(m.flowFromGain(Layers.gain('meltdown'))) + ' flow')),
    UI.showIf(h('p', { class: 'warn', text: 'Magma does not flow in Cold Core.' }), () => inChal(5)));
};

// ---------- options dialogs ----------

function showExport() {
  const str = Save.exportString();
  const area = h('textarea', { readonly: true, rows: 6 });
  area.value = str;
  UI.modal('Export save', [h('p', { text: 'Copy this text somewhere safe.' }), area], [
    { text: 'Copy', primary: true, action: () => { area.select(); if (navigator.clipboard) navigator.clipboard.writeText(str).then(() => notify('Copied to clipboard.')); else document.execCommand('copy'); return false; } },
    { text: 'Close' },
  ]);
  setTimeout(() => area.select(), 0);
}

function showImport() {
  const area = h('textarea', { rows: 6, placeholder: 'Paste your save here' });
  UI.modal('Import save', [h('p', { text: 'This replaces your current progress.' }), area], [
    {
      text: 'Import',
      primary: true,
      action: () => {
        try {
          Save.importString(area.value);
          UI.switchTab('main');
          notify('Save imported.');
          return true;
        } catch (e) {
          notify('Import failed: ' + e.message);
          return false;
        }
      },
    },
    { text: 'Cancel' },
  ]);
}

function showHardReset() {
  const input = h('input', { type: 'text', placeholder: 'absolute zero' });
  UI.modal('Hard reset', [h('p', { text: 'This deletes ALL progress and cannot be undone. Type "absolute zero" to confirm.' }), input], [
    {
      text: 'Delete everything',
      danger: true,
      action: () => {
        if (input.value.trim().toLowerCase() !== 'absolute zero') { notify('Type "absolute zero" to confirm.'); return false; }
        Save.hardReset();
        UI.accentLog = 0;
        UI.switchTab('main');
        UI.showChapterIntro(Chapters.get(1));
        return true;
      },
    },
    { text: 'Cancel' },
  ]);
}

// Hidden developer mode: Konami code on a keyboard, or 7 quick taps on the version line.
const DevUnlock = {
  seq: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
  pos: 0,
  taps: [],
  key(k) {
    k = k.length === 1 ? k.toLowerCase() : k;
    this.pos = k === this.seq[this.pos] ? this.pos + 1 : (k === this.seq[0] ? 1 : 0);
    if (this.pos === this.seq.length) { this.pos = 0; this.open(); }
  },
  tap() {
    const now = Date.now();
    this.taps = this.taps.filter((t) => now - t < 3000);
    this.taps.push(now);
    if (this.taps.length >= 7) { this.taps = []; this.open(); }
  },
  open() {
    if (player.options.devMode) return;
    player.options.devMode = true;
    notify('Developer mode unlocked. See Options.');
    if (UI.currentTab === 'options') UI.refresh();
  },
};

// Plasma split panel.
Layers.map.ionize.panel = () => {
  const L = Layers.map.ionize;
  const effText = {
    e: () => `Heat gain ${formatMult(L.poolEffects().heat)}`,
    i: () => `Magma flow ${formatMult(L.poolEffects().flow)}, Pressure gain ${formatMult(L.poolEffects().pressure)}`,
    p: () => `Heat Loss I and II start ${formatMult(L.poolEffects().lossStart)} later, Draft power +${format(L.poolEffects().draft, 3)}`,
  };
  const pools = Object.entries(PLASMA_POOLS).map(([k, pool]) => {
    const btn = (label, frac) => {
      const b = h('button', { onclick: () => L.allocate(k, frac) }, label);
      UI.bind(() => b.classList.toggle('can', layerPts('ionize').gte(1)));
      return b;
    };
    const el = h('div', { class: 'pool' },
      h('div', { class: 'pool-head' },
        h('span', { class: 'pool-name', text: pool.name }),
        UI.dyn(() => format(L.pool(k)), 'span', 'pool-amount')),
      UI.dyn(effText[k], 'div', 'muted small'),
      h('div', { class: 'pool-buttons' }, btn('+10%', 0.1), btn('+50%', 0.5), btn('All', 1)));
    el.style.setProperty('--pool', pool.color);
    return el;
  });
  return h('div', { class: 'panel' },
    h('p', null, 'Unsplit Plasma: ', UI.dyn(() => format(layerPts('ionize')), 'b'),
      h('span', { class: 'muted' }, ' (upgrades are paid with unsplit Plasma)')),
    UI.showIf(h('p', { class: 'warn', text: 'Electrons, Ions and Photons do nothing in Plasma Storm.' }), () => inChal(8)),
    h('div', { class: 'pools' }, pools),
    h('div', { class: 'button-row' },
      h('button', { onclick: () => L.respec() }, 'Respec split'),
      UI.dyn(() => (Layers.ms('ionize', 25) ? 'Respec returns all split Plasma.' : 'Respec returns all split Plasma and performs an Ionize reset.'), 'span', 'muted small')),
    autoToggle('split_plasma'));
};

// Element table for Fusion.
Layers.map.fusion.card = () => {
  const def = Layers.map.fusion;
  const grid = h('div', { class: 'elements' });
  def.upgrades.forEach((u, idx) => {
    const tile = h('button', {
      class: 'element',
      onclick: () => {
        if (Elements.selected === u.id) Layers.buyUpg('fusion', u.id);
        Elements.selected = u.id;
      },
    },
      h('span', { class: 'el-num', text: String(idx + 1) }),
      h('span', { class: 'el-sym', text: u.sym }),
      h('span', { class: 'el-name', text: u.name }));
    tile.style.setProperty('--row', u.row);
    tile.style.setProperty('--col', u.col);
    tile.addEventListener('mouseenter', () => Elements.selected = u.id);
    tile.addEventListener('focus', () => Elements.selected = u.id);
    UI.bind(() => {
      const owned = hasUpg('fusion', u.id);
      const visible = owned || u.unlocked();
      tile.classList.toggle('owned', owned);
      tile.classList.toggle('can', Layers.canBuyUpg('fusion', u.id));
      tile.classList.toggle('locked', !visible);
      tile.classList.toggle('selected', Elements.selected === u.id);
    });
    grid.append(tile);
  });
  const detail = h('div', { class: 'el-detail' });
  const dTitle = h('h3');
  const dDesc = h('p');
  const dEff = h('p', { class: 'effect' });
  const dCost = h('p', { class: 'muted small' });
  detail.append(dTitle, dDesc, dEff, dCost);
  UI.bind(() => {
    if (!Elements.selected) {
      const next = def.upgrades.find((u) => !hasUpg('fusion', u.id));
      Elements.selected = next ? next.id : def.upgrades[def.upgrades.length - 1].id;
    }
    const u = def.upgMap[Elements.selected];
    const visible = hasUpg('fusion', u.id) || u.unlocked();
    setText(dTitle, visible ? `${u.sym} · ${u.name}` : '???');
    setText(dDesc, visible ? u.desc : 'Synthesize the previous Element first.');
    setText(dEff, visible && u.effect ? 'Currently: ' + u.effectText(u.effect()) : '');
    setText(dCost, hasUpg('fusion', u.id) ? 'Synthesized.' : `Cost: ${formatWhole(u.cost)} Nucleons`);
  });
  return card('Elements',
    h('p', { class: 'muted', text: 'Tap an Element to see it, tap again to synthesize it. Elements unlock in order.' }),
    grid, detail);
};

// Stardust skill tree: four branches, each node needs the one above it.
Layers.map.supernova.card = () => {
  const def = Layers.map.supernova;
  const cols = TREE_BRANCHES.map((name, b) => {
    const col = h('div', { class: 'branch' }, h('div', { class: 'branch-name', text: name }));
    def.upgrades.filter((u) => u.branch === b).sort((x, y) => x.row - y.row).forEach((u) => {
      const extra = u.extra ? u.extra.map(([lid, amt]) => ` + ${formatWhole(amt)} ${Layers.map[lid].currency}`).join('') : '';
      const node = h('button', { class: 'node', onclick: () => Layers.buyUpg('supernova', u.id) },
        h('span', { class: 'node-name', text: u.name }),
        h('span', { class: 'node-desc', text: u.desc }),
        u.effect ? UI.dyn(() => 'Currently: ' + u.effectText(u.effect()), 'span', 'upg-eff') : null,
        h('span', { class: 'upg-cost', text: `${formatWhole(u.cost)} Stardust${extra}` }));
      UI.bind(() => {
        node.classList.toggle('bought', hasUpg('supernova', u.id));
        node.classList.toggle('can', Layers.canBuyUpg('supernova', u.id));
        node.classList.toggle('locked', !hasUpg('supernova', u.id) && !u.unlocked());
      });
      col.append(node);
    });
    return col;
  });
  return card('Stardust tree',
    h('p', { class: 'muted', text: 'Each node needs the one above it. Some also cost Pressure.' }),
    h('div', { class: 'tree' }, cols));
};

// Compressors for Collapse.
Layers.map.collapse.panel = () => {
  const effects = {
    embers: () => `Heat gain ${formatMult(Compressors.heatMult())}`,
    magma: () => `Stardust gain ${formatMult(Compressors.stardustMult())}`,
    plasma: () => `Gravity weight ÷${Compressors.gravityDiv().toFixed(2)}`,
  };
  const tiles = Object.entries(COMPRESSORS).map(([k, c]) => {
    const btn = h('button', { onclick: () => Compressors.compress(k) });
    UI.bind(() => {
      setText(btn, Compressors.canCompress(k) ? `Compress (record → ${format(Compressors.pending(k))})` : 'Needs more to beat the record');
      btn.classList.toggle('can', Compressors.canCompress(k));
    });
    const el = h('div', { class: 'pool' },
      h('div', { class: 'pool-head' }, h('span', { class: 'pool-name', text: c.name }),
        UI.dyn(() => 'record ' + format(Compressors.record(k)), 'span', 'pool-amount')),
      UI.dyn(() => `You have ${format(Compressors.amount(k))} (log ${format(Compressors.pending(k))})`, 'div', 'muted small'),
      UI.dyn(effects[k], 'div', 'effect'),
      btn);
    el.style.setProperty('--pool', c.color);
    return el;
  });
  return h('div', { class: 'panel' },
    h('p', { class: 'muted', text: 'Compressing sacrifices all of that currency. Each compressor keeps the best log10 you ever fed it, forever: Collapse and later layers never reset these records.' }),
    h('div', { class: 'pools' }, tiles),
    autoToggle('auto_compress'));
};

// Black hole panel for Singularity.
Layers.map.singularity.panel = () => {
  const hole = h('div', { class: 'black-hole' });
  UI.bind(() => {
    // The disc grows with log(mass): 40px when empty, up to 140px.
    const size = Math.round(40 + Math.min(100, BlackHole.mass().add(1).log10().toNumber() * 25)) + 'px';
    if (hole.style.width !== size) { hole.style.width = size; hole.style.height = size; }
  });
  const feed = h('button', { class: 'big', onclick: () => BlackHole.feed() });
  UI.bind(() => {
    setText(feed, BlackHole.canFeed() ? `Feed your Temperature (+${format(BlackHole.feedGain(), 3)} solar masses)` : 'Reach 1e100 K to feed the black hole');
    feed.classList.toggle('can', BlackHole.canFeed());
  });
  return h('div', { class: 'panel bh-panel' },
    h('div', { class: 'bh-visual' }, hole),
    h('div', { class: 'bh-info' },
      h('p', null, 'Mass: ', UI.dyn(() => format(BlackHole.mass(), 3) + ' solar masses', 'b')),
      h('p', null, 'Hawking radiation: ', UI.dyn(() => '+' + format(BlackHole.radiation()) + ' Hawking Heat/s', 'b')),
      h('p', { class: 'muted small', text: 'Feeding sets your Temperature to 0 and adds (log(T) / 1000)² solar masses. The heavier the black hole, the more Hawking Heat it radiates (mass^1.5).' }),
      feed,
      autoToggle('auto_feed')));
};

// Jet controls for Quasar.
Layers.map.quasar.panel = () => {
  const d = () => player.layers.quasar;
  const select = h('select', { 'aria-label': 'Jet target' },
    JET_TARGETS.map((t) => h('option', { value: t, text: Jets.targetName(t) })));
  select.value = d().target;
  select.addEventListener('change', () => { d().target = select.value; });
  const fire = h('button', { class: 'big', onclick: () => Jets.fire(d().target) });
  UI.bind(() => {
    let label;
    if (Jets.active()) label = `Jet blasting ${Jets.targetName(Jets.active())}: ${formatTime(d().remaining)} left`;
    else if (d().cooling > 0) label = `Cooling down: ${formatTime(d().cooling)}`;
    else if (layerPts('quasar').lt(1)) label = 'No Jets left';
    else label = `Fire a Jet at ${Jets.targetName(d().target)}`;
    setText(fire, label);
    fire.classList.toggle('can', Jets.canFire());
  });
  // Show only targets that are unlocked.
  UI.bind(() => {
    for (const opt of select.options) {
      const show = opt.value === 'heat' || Layers.isUnlocked(opt.value);
      if (opt.hidden === show) opt.hidden = !show;
    }
  });
  const fill = h('div', { class: 'fill' });
  UI.bind(() => {
    const w = (Math.min(1, d().recharge / Jets.rechargeTime()) * 100).toFixed(1) + '%';
    if (fill.style.width !== w) fill.style.width = w;
  });
  return h('div', { class: 'panel' },
    h('label', { class: 'option' }, 'Target: ', select),
    UI.dyn(() => `Jet power ${Jets.power()}: the target's gain ×${format(Decimal.pow(10, Jets.power()), 0)} for ${formatTime(Jets.duration())}` +
      ` (aimed at Heat: heat gain ${formatMult(Decimal.pow(10, Jets.power() * 20 * (hasUpg('quasar', 6) ? 2 : 1)))}).`, 'p', 'muted'),
    fire,
    h('p', { class: 'muted small' }, 'Next free Jet: ', UI.dyn(() => formatTime(Math.max(0, Jets.rechargeTime() - d().recharge))),
      ' · Jets fired: ', UI.dyn(() => formatWhole(d().fired))),
    h('div', { class: 'meter' }, fill),
    autoToggle('auto_jet'));
};

// Planck Levels.
Layers.map.planck.panel = () => {
  const buy = h('button', { class: 'big', onclick: () => Planck.buy() });
  UI.bind(() => {
    setText(buy, `Planck Level ${formatWhole(Planck.level().add(1))} (cost ${formatWhole(Planck.cost())} Planck Shards)`);
    buy.classList.toggle('can', Planck.canBuy());
  });
  return h('div', { class: 'panel' },
    h('p', null, 'Planck Level: ', UI.dyn(() => formatWhole(Planck.level()), 'b'),
      UI.dyn(() => ` · heat gain ^${format(Planck.heatExp(), 2)}`, 'span', 'muted')),
    h('div', { class: 'button-row' }, buy, h('button', { onclick: () => Planck.buyMax() }, 'Max')),
    h('p', { class: 'muted small', text: 'Each level costs ×3 more Shards and adds +0.02 to the heat exponent. The first three upgrades below break Heat Loss I, II and III. Heat Loss IV cannot be broken.' }),
    autoToggle('buy_planck'));
};

// Cosmic constants for Big Bang.
Layers.map.bigbang.panel = () => {
  const tiles = COSMIC_CONSTANTS.map((c) => {
    const btn = h('button', { class: 'const', onclick: () => Cosmos.toggle(c.id) },
      h('span', { class: 'const-name', text: c.name }),
      h('span', { class: 'const-desc', text: c.desc }),
      h('span', { class: 'const-mult', text: `Universes ×${c.mult}` }),
      UI.dyn(() => (Cosmos.has(c.id) ? 'active now' : '') + (Cosmos.has(c.id) && Cosmos.armed(c.id) ? ' · ' : '') + (Cosmos.armed(c.id) ? 'armed for the next universe' : ''), 'span', 'const-state'));
    UI.classIf(btn, 'armed', () => Cosmos.armed(c.id));
    UI.classIf(btn, 'active', () => Cosmos.has(c.id));
    return UI.showIf(btn, () => Cosmos.isUnlocked(c));
  });
  return h('div', { class: 'panel' },
    h('p', null, h('b', { text: 'Cosmic constants. ' }),
      'Arm the laws you want to break, then start a new universe. Armed constants take effect at the next Big Bang and stay until the one after. Their Universe multipliers stack.'),
    h('p', { class: 'muted' }, 'This universe: ', UI.dyn(() => `${Cosmos.data().active.length} active, Universes ${formatMult(Cosmos.constMult())}`),
      ' · next universe: ', UI.dyn(() => `${Cosmos.data().armed.length} armed, Universes ${formatMult(Cosmos.constMult(Cosmos.data().armed))}`)),
    h('div', { class: 'consts' }, tiles));
};

// Stretch for Inflation.
Layers.map.inflation.panel = () => {
  const tiles = Object.entries(STRETCH_GROUPS).map(([k, g]) => {
    const buy = h('button', { onclick: () => Stretch.buy(k) });
    UI.bind(() => {
      setText(buy, `Stretch (${formatWhole(Stretch.cost(k))} Expansion)`);
      buy.classList.toggle('can', Stretch.canBuy(k));
    });
    const el = h('div', { class: 'pool' },
      h('div', { class: 'pool-head' }, h('span', { class: 'pool-name', text: g.name }),
        UI.dyn(() => 'level ' + Stretch.level(k), 'span', 'pool-amount')),
      h('div', { class: 'muted small', text: `Raises ${g.desc} as heat multipliers to a power.` }),
      UI.dyn(() => `Power ^${format(Stretch.power(k), 3)}`, 'div', 'effect'),
      h('div', { class: 'button-row' }, buy, h('button', { onclick: () => Stretch.buyMax(k) }, 'Max')));
    el.style.setProperty('--pool', g.color);
    return el;
  });
  return h('div', { class: 'panel' },
    h('p', { class: 'muted' }, 'Each Stretch level adds ', UI.dyn(() => format(Stretch.perLevel(), 3)),
      ' to the power of every heat multiplier in its group. Entropy and later resets wipe them unless kept.'),
    h('div', { class: 'pools' }, tiles),
    autoToggle('auto_stretch'));
};

// Disorder and Heat Engines for Entropy.
Layers.map.entropy.panel = () => {
  const buy = h('button', { class: 'big', onclick: () => Thermo.buyEngine() });
  UI.bind(() => {
    setText(buy, `Build Heat Engine ${Thermo.engines() + 1} (${formatWhole(Thermo.engineCost())} Entropy)`);
    buy.classList.toggle('can', Thermo.canBuyEngine());
  });
  const fill = h('div', { class: 'fill' });
  UI.bind(() => {
    // How much of the incoming Disorder the Engines can handle.
    const r = Thermo.disorderRate();
    const pct = r.gt(0) ? Math.min(1, Thermo.capacity().div(r).toNumber()) : 1;
    const w = (pct * 100).toFixed(1) + '%';
    if (fill.style.width !== w) fill.style.width = w;
  });
  return h('div', { class: 'panel' },
    UI.showIf(h('p', { class: 'muted', text: 'Disorder starts rising after your first Entropy reset.' }), () => !Thermo.active()),
    h('p', null, 'Disorder: ', UI.dyn(() => format(Thermo.disorder()), 'b'),
      UI.dyn(() => ` (+${format(Thermo.disorderRate())}/s)`, 'span', 'muted')),
    h('p', null, 'Engines process: ', UI.dyn(() => format(Thermo.capacity()) + ' Disorder/s', 'b'),
      UI.dyn(() => ` · efficiency ×${format(Thermo.efficiency())}`, 'span', 'muted')),
    h('div', { class: 'meter' }, fill),
    h('p', null, 'Work: ', UI.dyn(() => format(Thermo.work()), 'b'),
      UI.dyn(() => ` · heat gain exponent ×${format(Thermo.workExp(), 3)}`, 'span', 'muted')),
    h('div', { class: 'button-row' }, buy, h('button', { onclick: () => Thermo.buyMaxEngines() }, 'Max')),
    h('p', { class: 'muted small', text: 'Disorder rises with the square root of your Entropy and faster the longer this Entropy run lasts. Engines turn it into Work, which is never lost. Unprocessed Disorder lowers heat gain (at most ×0.96) but is turned into extra Entropy when you reset.' }),
    autoToggle('auto_engine'));
};

// Heat Death runs.
Layers.map.heatdeath.panel = () => {
  const d = () => player.layers.heatdeath;
  const btn = h('button', { class: 'big reset', onclick: () => (HeatDeath.running() ? HeatDeath.end() : HeatDeath.start()) });
  UI.bind(() => {
    let label;
    if (HeatDeath.running()) label = `End the Heat Death for +${formatWhole(HeatDeath.pending())} Void`;
    else if (HeatDeath.canStart()) label = `Begin the Heat Death at ${formatK(player.T)}`;
    else label = `Reach ${formatK(Layers.map.heatdeath.req())} to begin the Heat Death`;
    setText(btn, label);
    btn.classList.toggle('can', HeatDeath.running() ? HeatDeath.pending().gt(0) : HeatDeath.canStart());
  });
  const cooler = h('button', { onclick: () => HeatDeath.buyCooler() });
  UI.bind(() => {
    setText(cooler, `Buy Cooler ${d().coolers + 1} (${formatWhole(HeatDeath.coolerCost())} Void)`);
    cooler.classList.toggle('can', HeatDeath.canBuyCooler());
  });
  const run = h('div', null,
    h('p', null, 'Cooled: ', UI.dyn(() => format(d().depth) + ' orders of magnitude', 'b'),
      UI.dyn(() => ` in ${formatTime(d().time)}`, 'span', 'muted')),
    h('p', null, 'Cooling speed: ', UI.dyn(() => format(HeatDeath.rate()) + ' orders of magnitude/s', 'b'),
      UI.dyn(() => ` (base ${format(HeatDeath.baseRate())}, slowing as you go deeper)`, 'span', 'muted')),
    UI.showIf(h('p', { class: 'effect', text: 'Below 1 K. Every Void you earn now is multiplied.' }), () => HeatDeath.belowOne()));
  return h('div', { class: 'panel' },
    h('p', { text: 'A Heat Death resets everything below it, then turns your fire around: Temperature stops rising and falls toward absolute zero. Nothing else can reset until you end it. Void depends on how many orders of magnitude you cooled, with a big bonus below 1 K.' }),
    btn,
    UI.showIf(run, () => HeatDeath.running()),
    h('p', { class: 'muted small' }, 'Coldest Temperature ever reached: ', UI.dyn(() => (d().bestLow < 1e9 ? formatK(Decimal.pow(10, d().bestLow)) : 'none yet'))),
    h('div', { class: 'button-row' }, cooler, h('button', { onclick: () => HeatDeath.buyMaxCoolers() }, 'Max')),
    h('p', { class: 'muted small', text: 'Each Cooler multiplies cooling speed by 1.5. Coolers are never reset.' }),
    autoToggle('auto_cooler'));
};

// ---------- feel: hover, press and purchase feedback ----------
// Every button ripples when pressed; buying something (a button that was affordable) throws a few sparks
// in the colour of the layer. Purely visual: nothing here changes the game.
const Feel = {
  layer: null,
  init() {
    this.layer = h('div', { class: 'fx-layer', 'aria-hidden': 'true' });
    document.body.append(this.layer);
    document.addEventListener('pointerdown', (ev) => {
      const b = ev.target.closest && ev.target.closest('button');
      if (!b) return;
      b.classList.remove('press');
      void b.offsetWidth; // restart the animation
      b.classList.add('press');
    });
    document.addEventListener('animationend', (ev) => {
      const t = ev.target;
      if (t && t.classList) t.classList.remove('press', 'bump', 'flip');
    });
    // An affordable button that gets clicked means something was bought or reset: celebrate it.
    document.addEventListener('click', (ev) => {
      const b = ev.target.closest && ev.target.closest('button');
      if (!b || !b.classList.contains('can')) return;
      const r = b.getBoundingClientRect();
      const x = ev.clientX || r.left + r.width / 2;
      const y = ev.clientY || r.top + r.height / 2;
      this.sparks(x, y, getComputedStyle(b).getPropertyValue('--layer').trim() || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), b.classList.contains('big') ? 14 : 8);
    }, true);
  },
  sparks(x, y, color, n) {
    if (!this.layer || !player.options.effects || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const d = 22 + Math.random() * 26;
      const s = h('span', { class: 'spark' });
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      if (color) s.style.setProperty('--c', color);
      this.layer.append(s);
      setTimeout(() => s.remove(), 650);
    }
  },
  // Adds a short bounce to an element whenever its text changes.
  bumpOnChange(el) {
    let last = null;
    UI.bind(() => {
      if (last !== null && el.textContent !== last) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      last = el.textContent;
    });
    return el;
  },
};
