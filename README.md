# Absolute Zero

An incremental game about heating up forever, from 0 K to absurd temperatures.

**Play it:** https://mineboy2211.github.io/Absolute-Zero/

Works on desktop, tablet and phone. Progress saves in your browser, and you can carry it between devices with a cloud account (Options → Cloud save).

## Development

Open `dev.html` to run the readable source from `js/`. Before publishing, rebuild the bundle that `index.html` loads:

```bash
npm install javascript-obfuscator
node tools/build.js
```
