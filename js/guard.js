// Discourages editing the game from the browser's developer tools.
// 1. Blocks the right-click menu and the usual shortcuts (F12, Ctrl+Shift+I/J/C/K, Ctrl+U and Mac equivalents).
// 2. Detects open developer tools: a `debugger` statement only stops the page while they are open, so a check
//    that suddenly takes long means someone is inside. The game then rolls back to the last state saved while
//    the tools were closed (undoing console edits), pauses behind a notice, and records it in the save.
// A web page can never fully stop a determined person (breakpoints can be switched off), but casual
// console cheating no longer sticks.

const Guard = {
  paused: false,
  clean: null,
  overlay: null,
  // Runs a `debugger` statement; returns true if it paused (developer tools open with breakpoints active).
  probe() {
    const t = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    return performance.now() - t > 100;
  },
  check() {
    if (typeof player === 'undefined' || !player) return;
    if (this.probe()) {
      this.caught();
    } else {
      if (this.paused) this.release();
      this.clean = Save.encode(player);
    }
  },
  caught() {
    if (this.clean) {
      try { player = Save.fromObject(Save.decode(this.clean)); } catch (e) { /* keep the current state */ }
    }
    player.stats.devtools = true;
    player.lastTick = Date.now();
    Save.save();
    if (!this.paused) {
      this.paused = true;
      this.overlay = document.createElement('div');
      this.overlay.className = 'guard-overlay';
      this.overlay.innerHTML = '<div class="modal"><h2>Developer tools detected</h2>'
        + '<p>The game is paused and any changes made from the console were undone.</p>'
        + '<p>Close the developer tools to keep playing.</p></div>';
      document.body.append(this.overlay);
    }
  },
  release() {
    this.paused = false;
    if (this.overlay) this.overlay.remove();
    this.overlay = null;
    if (typeof UI !== 'undefined') UI.refresh();
  },
  // Text fields keep their right-click menu so export/import copy and paste still work.
  editable(t) {
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  },
  isBlockedKey(ev) {
    const k = (ev.key || '').toLowerCase();
    if (ev.key === 'F12') return true;
    const mod = ev.ctrlKey || ev.metaKey;
    if (!mod) return false;
    // Ctrl+Shift+I/J/C/K (Windows/Linux) and Cmd+Option+I/J/C (Mac): developer tools and console.
    if ((ev.shiftKey || ev.altKey) && ['i', 'j', 'c', 'k'].includes(k)) return true;
    // Ctrl+U / Cmd+Option+U: view source.
    if (k === 'u') return true;
    return false;
  },
  init() {
    document.addEventListener('contextmenu', (ev) => {
      if (!this.editable(ev.target)) ev.preventDefault();
    });
    document.addEventListener('keydown', (ev) => {
      if (this.isBlockedKey(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }, true);
    setInterval(() => this.check(), 1500);
  },
};

Guard.init();
