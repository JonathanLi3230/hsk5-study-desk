const fs = require('fs');
const css = fs.readFileSync('app.css', 'utf8');
const js = ['app1.js', 'app2.js', 'app3.js', 'app4.js', 'app5.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');
fs.writeFileSync('bundle.js', js);
const html = `<title>HSK 5 Study Desk</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+SC:wght@400;500&family=Noto+Serif+SC:wght@400;600&display=swap">
<style>${css}</style>
<div style="padding:40px 16px;text-align:center;font-family:system-ui;color:#5a6762">Loading HSK 5 Study Desk…</div>
<script src="data.js"></script>
<script>${js}</script>
`;
fs.writeFileSync('artifact.html', html);
fs.writeFileSync('index.html', '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + html.replace('<div style="padding', '</head><body>\n<div style="padding') + '</body></html>\n');
console.log('index.html', html.length);
