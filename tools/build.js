// Builds dist/game.js, the only game script the public site loads.
//
// 1. Concatenates every local script listed in dev.html into ONE function scope, so nothing (player, Layers,
//    Save...) is reachable from the browser console.
// 2. Injects the save-signing key from tools/.save-key (never committed; created on first build).
// 3. Obfuscates the result: renamed identifiers, encrypted strings, self-defending code that breaks when
//    reformatted, and debugger traps while developer tools are open.
//
// Usage: npm install javascript-obfuscator   (anywhere Node can find it)
//        node tools/build.js
//
// This makes cheating much harder, not impossible: anything that runs in a browser can be read by the person
// using that browser.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const obfPath = require.resolve('javascript-obfuscator', { paths: [process.cwd(), __dirname, root] });
const JavaScriptObfuscator = require(obfPath);

const keyFile = path.join(__dirname, '.save-key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(24).toString('base64'));
const key = fs.readFileSync(keyFile, 'utf8').trim();

const dev = fs.readFileSync(path.join(root, 'dev.html'), 'utf8');
const files = [...dev.matchAll(/<script src="(js\/[^"?]+)/g)].map((m) => m[1]);
const parts = files.map((f) => `// ${f}\n${fs.readFileSync(path.join(root, f), 'utf8')}`);
const source = `(function () {\nconst SAVE_SECRET = ${JSON.stringify(key)};\n${parts.join('\n;\n')}\n})();\n`;

const out = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['rc4'],
  stringArrayThreshold: 0.75,
  splitStrings: true,
  splitStringsChunkLength: 8,
  selfDefending: true,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: true,
  // Control-flow flattening and dead code would slow the game loop too much on phones.
  controlFlowFlattening: false,
  deadCodeInjection: false,
  transformObjectKeys: false,
}).getObfuscatedCode();

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'game.js'), out);
console.log(`Built dist/game.js from ${files.length} files: ${(out.length / 1024).toFixed(0)} KB`);
