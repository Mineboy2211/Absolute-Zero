// Chapter 4 panels: Laser beams, Spin Lattice puzzle, Negative Kelvin buyables, Tachyon time bank.

// Beams for Laser.
Layers.map.laser.panel = () => {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const mk = (field) => {
      const sel = h('select', { 'aria-label': field === 'from' ? 'Beam source' : 'Beam target' },
        h('option', { value: '', text: field === 'from' ? '(source)' : '(target)' }),
        Beams.choices().map((l) => h('option', { value: l.id, text: l.currency })));
      const d = Beams.data().beams[i];
      sel.value = d ? d[field] : '';
      sel.addEventListener('change', () => Beams.set(i, field, sel.value));
      return sel;
    };
    const row = h('div', { class: 'beam' }, h('span', { class: 'beam-n', text: `Beam ${i + 1}` }), mk('from'), h('span', { text: '→' }), mk('to'),
      UI.dyn(() => {
        const b = Beams.data().beams[i];
        if (!b || !b.from || !b.to || b.from === b.to) return 'idle';
        return `${Layers.map[b.to].currency} gain ${formatMult(layerPts(b.from).add(1).log10().add(1).pow(Beams.power()).mul(Beams.coherenceBoost()))}`;
      }, 'span', 'effect'));
    rows.push(UI.showIf(row, () => i < Beams.slots()));
  }
  return h('div', { class: 'panel' },
    h('p', { class: 'muted' }, 'A beam takes any currency from Chapters 1 to 3 and multiplies the gain of another by (1 + log of the source)^',
      UI.dyn(() => format(Beams.power(), 1)), '.'),
    rows);
};

// Spin Lattice puzzle: spins on even grid positions, bonds between them.
Layers.map.spin.panel = () => {
  const n = Lattice.size();
  const grid = h('div', { class: 'lattice' });
  grid.style.setProperty('--n', String(2 * n - 1));
  const bondAt = {};
  for (const [a, b, j] of Lattice.bonds(n)) bondAt[a + ',' + b] = j;
  for (let r = 0; r < 2 * n - 1; r++) {
    for (let c = 0; c < 2 * n - 1; c++) {
      if (r % 2 === 0 && c % 2 === 0) {
        const i = (r / 2) * n + c / 2;
        const btn = h('button', { class: 'spin-cell', 'aria-label': 'Flip spin', onclick: () => Lattice.flip(i) });
        UI.bind(() => {
          const up = Lattice.cells()[i] > 0;
          setText(btn, up ? '↑' : '↓');
          btn.classList.toggle('down', !up);
        });
        grid.append(btn);
      } else if (r % 2 === 0 || c % 2 === 0) {
        const a = r % 2 === 0 ? (r / 2) * n + (c - 1) / 2 : ((r - 1) / 2) * n + c / 2;
        const b = r % 2 === 0 ? a + 1 : a + n;
        const j = bondAt[a + ',' + b];
        const bond = h('span', { class: 'bond', title: j > 0 ? 'Wants equal spins' : 'Wants opposite spins', text: j > 0 ? '=' : '≠' });
        UI.bind(() => { const cells = Lattice.cells(); bond.classList.toggle('ok', j * cells[a] * cells[b] > 0); });
        grid.append(bond);
      } else {
        grid.append(h('span'));
      }
    }
  }
  // Rebuild when an upgrade grows the lattice.
  UI.bind(() => { if (Lattice.size() !== n) UI.refresh(); });
  const anneal = h('button', { onclick: () => Lattice.anneal() }, 'Anneal');
  return h('div', { class: 'panel' },
    h('p', { class: 'muted', text: 'Tap a spin to flip it. A "=" bond is satisfied (green) when its two spins match, a "≠" bond when they differ. Some loops can never all be satisfied: find the best arrangement you can.' }),
    h('p', null, 'Satisfied bonds: ', UI.dyn(() => `${Lattice.satisfied()} / ${Lattice.total()} (${(Lattice.order() * 100).toFixed(1)}%)`, 'b')),
    grid,
    h('div', { class: 'button-row' }, UI.showIf(anneal, () => hasUpg('spin', 2))),
    autoToggle('auto_anneal'));
};

// Inverted Temperature, Pumps and Cavities for Negative Kelvin.
Layers.map.negkelvin.panel = () => {
  const tiles = Object.entries(NK_BUYABLES).map(([k, b]) => {
    const buy = h('button', { onclick: () => NegKelvin.buy(k) });
    UI.bind(() => {
      setText(buy, `Buy (−${formatK(NegKelvin.cost(k))})`);
      buy.classList.toggle('can', NegKelvin.canBuy(k));
    });
    const el = h('div', { class: 'pool' },
      h('div', { class: 'pool-head' }, h('span', { class: 'pool-name', text: b.name }), UI.dyn(() => 'level ' + NegKelvin.level(k), 'span', 'pool-amount')),
      h('div', { class: 'muted small', text: b.desc }),
      h('div', { class: 'button-row' }, buy, h('button', { onclick: () => NegKelvin.buyMax(k) }, 'Max')));
    el.style.setProperty('--pool', k === 'pump' ? '#8f7bff' : '#ff5c8a');
    return el;
  });
  return h('div', { class: 'panel' },
    h('p', null, 'Inverted Temperature: ', UI.dyn(() => Inversion.format(), 'b'), UI.dyn(() => ` (−${formatK(Inversion.gain())}/s)`, 'span', 'muted')),
    h('p', { class: 'muted small', text: 'Inverting converts your Inverted Temperature into Inversions and sets it back to 0. Pumps and Cavities are paid with Inverted Temperature.' }),
    h('div', { class: 'pools' }, tiles),
    autoToggle('auto_pump'));
};

// Time bank for Tachyon.
Layers.map.tachyon.panel = () => {
  const d = () => player.layers.tachyon;
  const fill = h('div', { class: 'fill' });
  UI.bind(() => {
    const w = (Math.min(1, d().bank / Tachyons.cap()) * 100).toFixed(1) + '%';
    if (fill.style.width !== w) fill.style.width = w;
  });
  const warp = h('button', { class: 'big', onclick: () => Tachyons.warp() });
  UI.bind(() => {
    setText(warp, Tachyons.canWarp() ? `Warp ${formatTime(d().bank * Tachyons.efficiency())} forward` : 'Bank at least 1 minute to warp');
    warp.classList.toggle('can', Tachyons.canWarp());
  });
  return h('div', { class: 'panel' },
    h('p', null, 'Time bank: ', UI.dyn(() => `${formatTime(d().bank)} / ${formatTime(Tachyons.cap())}`, 'b'),
      UI.dyn(() => ` · banking ${format(Tachyons.rate(), 2)} s per second played`, 'span', 'muted')),
    h('div', { class: 'meter' }, fill),
    warp,
    h('p', { class: 'muted small' }, 'Warping runs the game forward instantly. Total warped: ', UI.dyn(() => formatTime(d().warped))),
    autoToggle('auto_warp'));
};
