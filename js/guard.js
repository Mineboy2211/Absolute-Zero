// Discourages opening the browser's developer tools on desktop: blocks the right-click menu and
// the usual shortcuts (F12, Ctrl+Shift+I/J/C/K, Ctrl+U and their Mac equivalents).
// This is a deterrent only: the browser menu can still open the tools.

const Guard = {
  // Text fields keep their right-click menu so export/import copy and paste still work.
  editable(t) {
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  },
  blocked(ev) {
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
      if (this.blocked(ev)) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }, true);
  },
};

Guard.init();
