// Cloud saves: log in with a username and password, then save and load the same progress on any device.
// Uses Firebase Authentication (email/password, the username becomes a made-up address) and one Firestore
// document per player. The stored save is the normal signed save string, so edited cloud saves are refused too.

const CLOUD_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const CLOUD_DOMAIN = '@players.absolute-zero.game';
const CLOUD_AUTO_EVERY = 5 * 60 * 1000;

const Cloud = {
  ready: false,
  loading: null,
  user: null,
  status: '',
  lastSync: 0,

  configured() { return typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG; },
  username() { return this.user ? this.user.email.replace(CLOUD_DOMAIN, '') : ''; },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not reach the cloud service. Check your connection.'));
      document.head.append(s);
    });
  },

  // Loads the Firebase SDK on first use, so players who never log in download nothing extra.
  init() {
    if (!this.configured()) return Promise.reject(new Error('Cloud saves are not set up yet.'));
    if (this.loading) return this.loading;
    this.loading = (async () => {
      await this.loadScript(CLOUD_SDK + 'firebase-app-compat.js');
      await this.loadScript(CLOUD_SDK + 'firebase-auth-compat.js');
      await this.loadScript(CLOUD_SDK + 'firebase-firestore-compat.js');
      firebase.initializeApp(FIREBASE_CONFIG);
      await new Promise((resolve) => {
        firebase.auth().onAuthStateChanged((u) => {
          this.user = u;
          if (typeof UI !== 'undefined' && UI.currentTab === 'options') UI.refresh();
          resolve();
        });
      });
      this.ready = true;
    })();
    this.loading.catch(() => { this.loading = null; });
    return this.loading;
  },

  validate(name, pass) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(name)) throw new Error('Usernames are 3 to 20 letters, numbers or _.');
    if (!pass || pass.length < 6) throw new Error('Passwords need at least 6 characters.');
  },
  email(name) { return name.toLowerCase() + CLOUD_DOMAIN; },
  // Firebase error codes in plain words.
  explain(e) {
    const code = e && e.code ? e.code : '';
    if (code.includes('email-already-in-use')) return 'That username is taken.';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Wrong username or password.';
    if (code.includes('too-many-requests')) return 'Too many tries. Wait a minute and try again.';
    if (code.includes('network')) return 'No connection to the cloud.';
    return e && e.message ? e.message : 'Something went wrong.';
  },

  async register(name, pass) {
    this.validate(name, pass);
    await this.init();
    await firebase.auth().createUserWithEmailAndPassword(this.email(name), pass);
    await this.upload();
  },
  async login(name, pass) {
    this.validate(name, pass);
    await this.init();
    await firebase.auth().signInWithEmailAndPassword(this.email(name), pass);
  },
  async logout() {
    await this.init();
    await firebase.auth().signOut();
  },

  doc() { return firebase.firestore().collection('saves').doc(this.user.uid); },

  async upload() {
    if (!this.user) throw new Error('Log in first.');
    await this.doc().set({
      save: Save.encode(player),
      timePlayed: player.stats.timePlayed,
      bestT: player.bestT.toString(),
      chapter: player.chapters.unlocked,
      updated: firebase.firestore.FieldValue.serverTimestamp(),
    });
    this.lastSync = Date.now();
  },
  // The cloud copy without loading it: { save, timePlayed, bestT, chapter, updated } or null.
  async fetch() {
    if (!this.user) throw new Error('Log in first.');
    const snap = await this.doc().get();
    return snap.exists ? snap.data() : null;
  },

  // Called from the game loop: quietly upload every few minutes while logged in.
  tick() {
    if (!this.user || !player.options.cloudAuto || Date.now() - this.lastSync < CLOUD_AUTO_EVERY) return;
    this.lastSync = Date.now();
    this.upload().catch((e) => { this.status = 'Auto cloud save failed: ' + this.explain(e); });
  },

  // Re-open the session from an earlier visit (Firebase remembers it), without blocking the game.
  resume() {
    if (this.configured() && player.options.cloudUser) this.init().catch(() => {});
  },
};

// ---------- Options card ----------

Cloud.card = function cloudCard() {
  if (!Cloud.configured()) {
    return card('Cloud save', h('p', { class: 'muted', text: 'Cloud saves are not available yet.' }));
  }
  const msg = h('p', { class: 'muted small' });
  const say = (t) => setText(msg, t);
  if (Cloud.status) say(Cloud.status);
  const busy = async (btn, label, fn) => {
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = label;
    try { await fn(); } catch (e) { say(Cloud.explain(e)); }
    btn.disabled = false;
    btn.textContent = old;
  };

  if (!Cloud.user) {
    const name = h('input', { type: 'text', placeholder: 'Username', autocomplete: 'username', 'aria-label': 'Username', class: 'cloud-input' });
    const pass = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password', 'aria-label': 'Password', class: 'cloud-input' });
    const loginBtn = h('button', { class: 'primary' }, 'Log in');
    const regBtn = h('button', null, 'Create account');
    loginBtn.addEventListener('click', () => busy(loginBtn, 'Logging in…', async () => {
      await Cloud.login(name.value.trim(), pass.value);
      player.options.cloudUser = name.value.trim();
      say('Logged in. Use "Load from cloud" to bring your progress to this device.');
      UI.refresh();
    }));
    regBtn.addEventListener('click', () => busy(regBtn, 'Creating…', async () => {
      await Cloud.register(name.value.trim(), pass.value);
      player.options.cloudUser = name.value.trim();
      notify('Account created. Your progress is now in the cloud.');
      UI.refresh();
    }));
    return card('Cloud save',
      h('p', { class: 'muted', text: 'Log in on any device to carry your progress over, no export code needed. Pick a password you do not use anywhere else.' }),
      h('div', { class: 'cloud-form' }, name, pass),
      h('div', { class: 'button-row' }, loginBtn, regBtn),
      msg);
  }

  const upBtn = h('button', { class: 'primary' }, 'Save to cloud');
  const downBtn = h('button', null, 'Load from cloud');
  const outBtn = h('button', null, 'Log out');
  upBtn.addEventListener('click', () => busy(upBtn, 'Saving…', async () => {
    await Cloud.upload();
    say('Saved to the cloud.');
  }));
  downBtn.addEventListener('click', () => busy(downBtn, 'Loading…', async () => {
    const data = await Cloud.fetch();
    if (!data) { say('Nothing saved in the cloud yet.'); return; }
    const when = data.updated && data.updated.toDate ? data.updated.toDate().toLocaleString() : 'unknown';
    UI.modal('Load from cloud', [
      h('p', { text: 'This replaces the progress on this device with your cloud save.' }),
      h('p', { text: `Cloud: ${formatTime(data.timePlayed)} played, best ${formatK(D(data.bestT))}, saved ${when}.` }),
      h('p', { text: `This device: ${formatTime(player.stats.timePlayed)} played, best ${formatK(player.bestT)}.` }),
    ], [
      { text: 'Load it', primary: true, action: () => {
        try {
          Save.importString(data.save);
          player.options.cloudUser = Cloud.username();
          UI.switchTab('main');
          notify('Cloud save loaded.');
        } catch (e) { notify('Could not load the cloud save: ' + e.message); }
      } },
      { text: 'Cancel' },
    ]);
  }));
  outBtn.addEventListener('click', () => busy(outBtn, 'Logging out…', async () => {
    await Cloud.logout();
    player.options.cloudUser = '';
    UI.refresh();
  }));
  const auto = h('input', { type: 'checkbox' });
  auto.checked = player.options.cloudAuto;
  auto.addEventListener('change', () => { player.options.cloudAuto = auto.checked; });
  return card('Cloud save',
    h('p', null, 'Logged in as ', h('b', { text: Cloud.username() }), '.'),
    h('label', { class: 'auto-toggle' }, auto, ' Save to the cloud automatically every 5 minutes'),
    h('div', { class: 'button-row' }, upBtn, downBtn, outBtn),
    UI.dyn(() => (Cloud.lastSync ? 'Last cloud save: ' + formatTime((Date.now() - Cloud.lastSync) / 1000) + ' ago.' : ''), 'p', 'muted small'),
    msg);
};
