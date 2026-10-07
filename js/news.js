// Release notes. Only major updates get an entry here; small fixes are not listed.

const GAME_VERSION = '1.5';

const News = {
  list: [
    {
      version: '1.5',
      title: 'Ionized',
      date: '2026-10-07',
      notes: [
        'Chapter 1 is complete: two new layers, Ionize and Fusion.',
        'Ionize gives Plasma, which you split between Electrons, Ions and Photons. Respec any time.',
        'Fusion gives Nucleons, spent to synthesize the first 26 Elements, from Hydrogen to Iron.',
        'Two new challenges: Thin Air and Plasma Storm.',
        'The Chapter tab now tracks the 6 goals of Chapter 1.',
        'New News tab, nicer switches in Options.',
      ],
    },
    {
      version: '1.0',
      title: 'The First Spark',
      date: '2026-10-07',
      notes: [
        'The Hearth: Kindling, Bellows, Furnace and Draft.',
        'Degrees climb on their own; Grade and Order temper the fire.',
        'Chapter 1 layers: Ignition (Embers), Meltdown (Magma that keeps flowing) and Vaporize (Pressure).',
        'Six challenges with five tiers each.',
        'Heat Loss, achievements, offline progress, named number notation and a mobile layout.',
      ],
    },
  ],
  hasUnread() { return player.options.newsSeen !== GAME_VERSION; },
  markRead() { player.options.newsSeen = GAME_VERSION; },
};
