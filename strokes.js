// Bundles hanzi-writer-data stroke files for every character in the Level 5 list into 16 files.
const fs = require('fs');
global.window = {}; require('./data.js');
const chars = new Set(); window.HSK.words.forEach(w => [...w.w].forEach(c => { if (/[一-鿿]/.test(c)) chars.add(c); }));
const B = {};
for (const c of chars) { const b = c.codePointAt(0) % 16; (B[b] = B[b] || {})[c] = JSON.parse(fs.readFileSync('node_modules/hanzi-writer-data/' + c + '.json')); }
fs.mkdirSync('strokes', { recursive: true });
for (const b in B) fs.writeFileSync('strokes/s' + b + '.json', JSON.stringify(B[b]));
console.log(chars.size, 'characters bundled');
