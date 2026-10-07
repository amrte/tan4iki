#!/usr/bin/env node
'use strict';
// Bundles index.html + css + js into one self-contained file: dist/tank1990.html
// Usage: node tools/build.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

let html = read('index.html');
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, f) => `<style>\n${read(f)}\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => `<script>\n${read(f).replace(/<\/script/gi, '<\\/script')}\n</script>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'tank1990.html');
fs.writeFileSync(out, html);
console.log(`wrote ${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
