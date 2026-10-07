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
    notify = (msg) => this.toast(msg);
    document.getElementById('menu-toggle').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.getElementById('content').addEventListener('click', () => document.body.classList.remove('nav-open'));
    this.buildHeader();
    this.updateSidebar(true);
    this.switchTab(player.options.tab || 'main');
    document.addEventListener('keydown', (ev) => {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT')) return;
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
      setText(gain, '+' + formatK(heatGain()) + '/s' + (heatLossActive() ? '  (heat loss active)' : ''));
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
        const show = Layers.isUnlocked(def.id);
        if (chip.hidden === show) chip.hidden = !show;
        if (show) setText(amount, format(layerPts(def.id)));
      });
    }
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
    t.push({ id: 'achievements', name: 'Achievements', group: 'Other', show: true });
    t.push({ id: 'stats', name: 'Stats', group: 'Other', show: true });
    t.push({ id: 'options', name: 'Options', group: 'Other', show: true });
    return t.filter((x) => x.show);
  },

  updateSidebar(force) {
    const tabs = this.tabs();
    const key = tabs.map((t) => t.id).join(',') + '|' + this.currentTab;
    if (!force && key === this.sidebarKey) return;
    this.sidebarKey = key;
    const nav = document.getElementById('sidebar');
    nav.textContent = '';
    let group = null;
    for (const t of tabs) {
      if (t.group !== group) {
        group = t.group;
        nav.append(h('div', { class: 'nav-group', text: group }));
      }
      const b = h('button', { class: 'nav-btn' + (t.id === this.currentTab ? ' active' : ''), onclick: () => this.switchTab(t.id) }, t.name);
      if (t.color) b.style.setProperty('--tab', t.color);
      nav.append(b);
    }
  },

  switchTab(id) {
    if (!this.tabs().some((t) => t.id === id)) id = 'main';
    this.currentTab = id;
    player.options.tab = id;
    this.updaters = [];
    const content = document.getElementById('content');
    content.textContent = '';
    const render = Tabs[id] || (Layers.map[id] ? () => renderLayerTab(Layers.map[id]) : Tabs.main);
    content.append(render());
    content.scrollTop = 0;
    document.body.classList.remove('nav-open');
    this.updateSidebar(true);
    this.update();
  },

  // ---------- per frame ----------
  frame: 0,
  update() {
    for (const fn of this.headerUpdaters) fn();
    for (const fn of this.updaters) fn();
    if (this.frame++ % 10 === 0) this.updateSidebar(false);
    this.updateAccent();
  },

  updateAccent() {
    const target = Math.log10(Math.max(0, player.T.max(1).log10().toNumber()) + 1);
    this.accentLog += (target - this.accentLog) * 0.08;
    document.documentElement.style.setProperty('--accent', accentColor(this.accentLog));
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

function heatLossActive() {
  const raw = rawHeatGain();
  return HeatLoss.some((hl) => raw.gt(hl.start()));
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
  return UI.showIf(row, a.unlocked);
}

function card(title, ...kids) {
  return h('section', { class: 'card' }, title ? h('h2', { text: title }) : null, kids);
}

// ---------- tabs ----------

const Tabs = {
  main() {
    const root = h('div', { class: 'tab' });
    const rows = Buyables.order.map((id) => {
      const b = Buyables.defs[id];
      const buyBtn = h('button', { class: 'buy', onclick: () => Buyables.buy(id) });
      const maxBtn = h('button', { class: 'buy', onclick: () => Buyables.buyMax(id) }, 'Max');
      UI.bind(() => {
        setText(buyBtn, 'Cost: ' + formatK(Buyables.cost(id)));
        const can = Buyables.canBuy(id);
        buyBtn.classList.toggle('can', can);
        maxBtn.classList.toggle('can', can);
      });
      const row = h('div', { class: 'buyable' },
        h('div', { class: 'buyable-info' },
          h('div', { class: 'buyable-title' }, h('b', { text: b.name }), ' ',
            UI.dyn(() => '[' + formatWhole(Buyables.level(id)) + ']', 'span', 'level'),
            UI.showIf(h('span', { class: 'tag', text: 'Scaled' }), () => Buyables.isScaled(id))),
          h('div', { class: 'muted', text: b.desc }),
          UI.dyn(() => b.effectText(), 'div', 'effect')),
        h('div', { class: 'buyable-buttons' }, buyBtn, maxBtn, autoToggle('buy_' + id)));
      return UI.showIf(row, b.unlocked);
    });
    root.append(card('Heat sources',
      h('p', { class: 'muted' }, 'Base heat: ', UI.dyn(() => formatK(heatBase()) + '/s'), '. Press M to buy max of everything.'),
      h('button', { class: 'wide', onclick: maxAll }, 'Max all'),
      rows));

    const hlRows = HeatLoss.map((hl, i) => {
      const row = h('div', { class: 'heatloss' });
      const txt = h('span');
      row.append(h('b', { text: hl.name + ': ' }), txt);
      UI.bind(() => {
        let x = heatBase();
        for (const [, v] of heatMultipliers()) x = x.mul(v);
        let before = x;
        for (let j = 0; j < i; j++) {
          const s = HeatLoss[j].start();
          if (before.gt(s)) before = s.mul(before.div(s).pow(HeatLoss[j].power()));
        }
        const s = hl.start();
        const active = before.gt(s);
        const after = active ? s.mul(before.div(s).pow(hl.power())) : before;
        row.classList.toggle('active', active);
        setText(txt, `gain above ${formatK(s)}/s is raised to ^${hl.power().toFixed(2)}` + (active ? `. Currently dividing gain by ${format(before.div(after))}.` : '. Not active yet.'));
      });
      return UI.showIf(row, () => i === 0 || player.bestT.gte(HeatLoss[i - 1].start()));
    });
    root.append(card('Heat Loss', h('p', { class: 'muted', text: 'The hotter things get, the faster they lose heat. Past each threshold, the excess part of your heat gain per second is raised to a power below 1.' }), hlRows));
    return root;
  },

  ranks() {
    const root = h('div', { class: 'tab' });
    root.append(h('p', { class: 'muted', text: 'Ranking up resets your Temperature and buyables. Grade also resets Degree, and Order resets Grade and Degree.' }));
    for (const id of Ranks.order) {
      const r = Ranks.defs[id];
      const btn = h('button', { class: 'big', onclick: () => Ranks.rankUp(id) });
      UI.bind(() => {
        setText(btn, `Rank up (requires ${r.reqText(player.ranks[id])})`);
        btn.classList.toggle('can', Ranks.can(id));
      });
      const rewards = r.rewards.map(([at, d]) => {
        const li = h('li', null, h('b', { text: `${r.name} ${at}: ` }), UI.dyn(() => (typeof d === 'function' ? d() : d)));
        UI.classIf(li, 'done', () => player.ranks[id].gte(at));
        return li;
      });
      const c = card(null,
        h('h2', null, r.name + ' ', UI.dyn(() => formatWhole(player.ranks[id]), 'span', 'level')),
        btn, autoToggle('rank_' + id),
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
    root.append(h('p', { class: 'muted', text: 'Entering a challenge performs a Vaporize reset without giving Pressure. Each challenge has 5 tiers: a tier is completed the moment you reach its goal, and you can keep going for the next one. Leaving also performs a Vaporize reset.' }));
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

  achievements() {
    const root = h('div', { class: 'tab' });
    root.append(h('p', { class: 'muted' }, 'Each Chapter 1 achievement multiplies heat gain by ×1.1. Total: ',
      UI.dyn(() => formatMult(Achievements.mult())), ' (', UI.dyn(() => `${Achievements.count()} / ${Achievements.list.length}`), ').'));
    for (const ch of Chapters.list) {
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
      UI.showIf(row('Developer speed used', () => 'yes'), () => player.stats.devUsed))));

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
      ['scientific', 'standard', 'engineering'].map((n) => h('option', { value: n, text: n[0].toUpperCase() + n.slice(1) })));
    select.value = player.options.notation;
    select.addEventListener('change', () => { player.options.notation = select.value; });

    const check = (key, label) => {
      const box = h('input', { type: 'checkbox' });
      box.checked = !!player.options[key];
      box.addEventListener('change', () => { player.options[key] = box.checked; if (key === 'devMode') UI.switchTab('options'); });
      return h('label', { class: 'option' }, box, ' ' + label);
    };

    root.append(card('Display',
      h('label', { class: 'option' }, 'Notation: ', select)));

    root.append(card('Saving',
      check('autosave', 'Autosave every 30 seconds'),
      check('offline', 'Offline progress (up to 24 hours)'),
      h('div', { class: 'button-row' },
        h('button', { onclick: () => { if (Save.save()) notify('Game saved.'); } }, 'Save now'),
        h('button', { onclick: showExport }, 'Export'),
        h('button', { onclick: showImport }, 'Import'),
        h('button', { class: 'danger', onclick: showHardReset }, 'Hard reset'))));

    const dev = card('Debug',
      check('devMode', 'Developer mode'),
      h('p', { class: 'muted', text: 'Speeds up game time to test pacing. Saves record that it was used.' }));
    if (player.options.devMode) {
      const speed = h('select', { 'aria-label': 'Developer speed' }, [1, 2, 5, 10, 100, 1000].map((n) => h('option', { value: n, text: '×' + n })));
      speed.value = String(player.options.devSpeed);
      speed.addEventListener('change', () => {
        player.options.devSpeed = Number(speed.value);
        if (player.options.devSpeed > 1) player.stats.devUsed = true;
      });
      dev.append(h('label', { class: 'option' }, 'Game speed: ', speed));
      dev.append(h('button', { onclick: () => { const f = fixNaN(); notify(f.length ? 'Fixed: ' + f.join(', ') : 'No NaN found.'); } }, 'Scan for NaN'));
    }
    root.append(dev);
    root.append(h('p', { class: 'muted small', text: `Absolute Zero · save version ${SAVE_VERSION}` }));
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
  const resetsWhat = ['Temperature', 'buyables', 'ranks', ...lower].join(', ');

  root.append(card(null,
    h('h2', { class: 'layer-title', text: `${def.name}` }),
    h('p', { class: 'amount' }, 'You have ', UI.dyn(() => format(d().points), 'b'), ` ${def.currency}.`),
    UI.dyn(() => def.effectText(), 'p'),
    resetBtn,
    h('p', { class: 'muted small', text: `${def.name} resets ${resetsWhat}.` }),
    UI.showIf(UI.dyn(() => `Passively gaining ${format((def.passive ? def.passive() : 0) * 100, 0)}% of pending ${def.currency} per second.`, 'p', 'muted'), () => def.passive && def.passive() > 0),
    def.autoReset ? autoToggle('reset_' + def.id) : null,
    def.panel ? def.panel() : null));

  if (def.upgrades.length) {
    const grid = h('div', { class: 'upg-grid' });
    for (const u of def.upgrades) {
      const btn = h('button', { class: 'upg', onclick: () => Layers.buyUpg(def.id, u.id) },
        h('span', { class: 'upg-desc', text: u.desc }),
        u.effect ? UI.dyn(() => 'Currently: ' + u.effectText(u.effect()), 'span', 'upg-eff') : null,
        h('span', { class: 'upg-cost', text: `Cost: ${format(u.cost, 0)} ${def.currency}` }));
      UI.bind(() => {
        btn.classList.toggle('bought', hasUpg(def.id, u.id));
        btn.classList.toggle('can', Layers.canBuyUpg(def.id, u.id));
      });
      grid.append(u.unlocked ? UI.showIf(btn, u.unlocked) : btn);
    }
    root.append(card('Upgrades', grid));
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
