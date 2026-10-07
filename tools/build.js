#!/usr/bin/env node
'use strict';
// Bundles index.html + css + js into one self-contained file: dist/<name>_v<version>.html
// Usage: node tools/build.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);

// version comes from js/version.js
const ver = read('js/version.js');
const name = ver.match(/APP_NAME = '([^']+)'/)[1];
const version = ver.match(/APP_VERSION = '([^']+)'/)[1];
const title = `${name}_v${version}`;
html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);

const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
// keep only the current build in dist/
for (const f of fs.readdirSync(dist)) if (f.endsWith('.html')) fs.unlinkSync(path.join(dist, f));
const out = path.join(dist, `${title}.html`);
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
