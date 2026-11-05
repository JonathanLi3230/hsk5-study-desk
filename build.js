// Builds data.js for the HSK 5 app from the authored content + source word list.
const fs = require('fs');
const { pinyin, customPinyin } = require('pinyin-pro');
const SRCROOT = process.env.HSK_SRC || '../complete-hsk-vocabulary';
const SRC = SRCROOT + '/wordlists/';
const lvl5 = JSON.parse(fs.readFileSync(SRC + 'exclusive/newest/5.json'));
const cum4 = JSON.parse(fs.readFileSync(SRC + 'inclusive/newest/4.json'));
const LV = {}; JSON.parse(fs.readFileSync(SRCROOT + '/complete.json')).forEach(w => LV[w.simplified] = w.level);

// Fixes for common polyphone errors in generated sentence pinyin.
customPinyin({
  '长得': 'zhǎng de', '调到': 'diào dào', '被调': 'bèi diào', '哪儿': 'nǎr', '这儿': 'zhèr', '那儿': 'nàr',
  '一会儿': 'yí huìr', '有点儿': 'yǒu diǎnr', '事儿': 'shìr', '没事儿': 'méi shìr', '大伙儿': 'dà huǒr',
  '好好': 'hǎo hǎo', '睡着': 'shuì zháo', '着急': 'zháo jí', '着凉': 'zháo liáng', '长大': 'zhǎng dà',
  '还是': 'hái shi', '还有': 'hái yǒu', '还要': 'hái yào', '还在': 'hái zài', '还没': 'hái méi', '还不': 'hái bù',
  '行业': 'háng yè', '银行': 'yín háng', '重新': 'chóng xīn', '重复': 'chóng fù',
  '得去': 'děi qù', '得先': 'děi xiān', '得交': 'děi jiāo', '得赔': 'děi péi', '得充': 'děi chōng', '得调整': 'děi tiáo zhěng',
  '得绕': 'děi rào', '得问问': 'děi wèn wen', '得马上': 'děi mǎ shàng', '得换': 'děi huàn',
  '为了': 'wèi le', '因为': 'yīn wèi', '为什么': 'wèi shén me', '成为': 'chéng wéi', '称为': 'chēng wéi', '视为': 'shì wéi', '作为': 'zuò wéi', '认为': 'rèn wéi', '以为': 'yǐ wéi', '行为': 'xíng wéi',
  '差点': 'chà diǎn', '差不多': 'chà bu duō', '一点儿': 'yì diǎnr', '玩儿': 'wánr',
  '一下子': 'yí xià zi', '每个人': 'měi gè rén', '盛': 'shèng', '处理': 'chǔ lǐ', '相处': 'xiāng chǔ', '处于': 'chǔ yú',
});

const TOPICS = { d: 'Daily life', w: 'Work & business', r: 'Relationships', t: 'Travel & transport', n: 'News & society', e: 'Education', c: 'Tech & online', h: 'Health & body', m: 'Feelings & character', f: 'Money & shopping', a: 'Nature & environment', u: 'Culture & arts', s: 'Sports & leisure', g: 'General & abstract', k: 'Food & drink' };
const REG = { N: 'Neutral', F: 'Formal', W: 'Mainly written', I: 'Informal' };

const seg = new Intl.Segmenter('zh', { granularity: 'word' });
const isHan = s => /[一-鿿]/.test(s);
const headPinyin = {};

const TONE = { 'ā':'a','á':'a','ǎ':'a','à':'a','ē':'e','é':'e','ě':'e','è':'e','ī':'i','í':'i','ǐ':'i','ì':'i','ō':'o','ó':'o','ǒ':'o','ò':'o','ū':'u','ú':'u','ǔ':'u','ù':'u','ǖ':'ü','ǘ':'ü','ǚ':'ü','ǜ':'ü' };
const plain = s => [...s].map(c => TONE[c] || c).join('').toLowerCase();
const SYL = /^(zh|ch|sh|[bpmfdtnlgkhjqxzcsrwy])?(iang|iong|uang|ang|eng|ing|ong|ian|iao|uai|uan|üan|ai|ei|ao|ou|an|en|in|un|ün|ia|ie|iu|ua|uo|ui|üe|ue|er|a|o|e|i|u|ü)(r(?![aeiouü]))?/;
function splitSyl(py) { // split authored pinyin into syllables, keeping tone marks
  const out = [];
  for (const chunk of py.split(/[\s'\-]+/).filter(Boolean)) {
    let rest = chunk;
    while (rest) {
      const p = plain(rest); let m = p.match(SYL); if (!m) return null;
      let len = m[0].length;
      // prefer a split that leaves a valid start (e.g. "xian" vs "xi'an" handled by apostrophes; "fang'an" too)
      if (/[aeiouü]$/.test(m[0]) === false && len < p.length && /^[aeiouü]/.test(p.slice(len))) {
        // final consonant n/g taken greedily but next starts with vowel: back off one char
        const back = p.slice(0, len - 1).match(SYL); if (back && back[0].length === len - 1) len -= 1;
      }
      out.push(rest.slice(0, len)); rest = rest.slice(len);
    }
  }
  return out;
}
function sentPinyin(s, opt = {}) {
  const chars = [...s];
  const arr = pinyin(s, { type: 'array', toneSandhi: true });
  if (arr.length !== chars.length) return opt.segs ? { text: pinyin(s), segs: [] } : pinyin(s);
  // override with authored pinyin for any HSK5 headword occurrence (longest first)
  const done = new Array(chars.length).fill(false);
  for (const hw of HEADS) {
    let from = 0, i;
    while ((i = s.indexOf(hw, from)) !== -1) {
      const ci = [...s.slice(0, i)].length, L = [...hw].length;
      if (!done.slice(ci, ci + L).some(Boolean)) {
        const syl = SPLIT[hw];
        if (syl && syl.length === L) for (let k = 0; k < L; k++) { arr[ci + k] = syl[k]; done[ci + k] = true; }
      }
      from = i + hw.length;
    }
  }
  // word segments, with a few splits closer to standard pinyin spacing
  const PRON = /^(我|你|他|她|它|您)(?!们|人|国|家|自)/;
  const rawSegs = [];
  // segmenter output, re-merged where an HSK 5 word was split across segments
  let base = [...seg.segment(s)].map(x => x.segment);
  for (const hw of HEADS) {
    let i = s.indexOf(hw);
    while (i !== -1) {
      let p = 0, a = -1, b = -1, pa = 0;
      base.forEach((t, k) => { const e = p + t.length; if (a < 0 && i < e) { a = k; pa = p; } if (b < 0 && i + hw.length <= e) b = k; p = e; });
      if (a >= 0 && b > a) {
        const joined = base.slice(a, b + 1).join(''); const pre = joined.slice(0, i - pa), post = joined.slice(i - pa + hw.length);
        base = [...base.slice(0, a), ...[pre, hw, post].filter(Boolean), ...base.slice(b + 1)];
      }
      i = s.indexOf(hw, i + hw.length);
    }
  }
  // long compound segments that contain HSK 5 words: split around them (货物运输 → 货物 运输)
  base = base.flatMap(t => {
    if ([...t].length < 4 || !isHan(t)) return [t];
    const hw = HEADS.find(h => h !== t && [...h].length >= 2 && t.includes(h));
    if (!hw) return [t];
    const i = t.indexOf(hw); return [t.slice(0, i), hw, t.slice(i + hw.length)].filter(Boolean);
  });
  for (const segment of base) {
    let t = segment;
    if (isHan(t) && [...t].length > 1 && PRON.test(t)) { rawSegs.push(t[0]); t = t.slice(1); }
    if (isHan(t) && [...t].length > 1 && /了$/.test(t) && !/^(为了|除了|罢了|算了|好了|对了|得了|极了|了)$/.test(t)) { rawSegs.push(t.slice(0, -1)); t = '了'; }
    rawSegs.push(t);
  }
  { let p = 0; for (const t of rawSegs) { const L = [...t].length;
    if (t === '得' && !done[p]) { const prev = chars.slice(Math.max(0, p - 2), p).join(''); arr[p] = /(我|你|他|她|们|还|就|也|都|总)$/.test(prev) ? 'děi' : 'de'; }
    p += L; } }
  if (opt.blank) { // replace the target word's syllables with a blank
    let i = s.indexOf(opt.blank);
    while (i !== -1) { const ci = [...s.slice(0, i)].length, L = [...opt.blank].length; for (let k = 0; k < L; k++) arr[ci + k] = k === 0 ? '＿＿' : ''; i = s.indexOf(opt.blank, i + opt.blank.length); }
  }
  // group syllables into words using the segmenter
  let r = '', pos = 0, qOpen = false; const segs = [];
  for (const segment of rawSegs) {
    const L = [...segment].length, piece = arr.slice(pos, pos + L); pos += L;
    if (!isHan(segment)) {
      const t = segment.replace(/，/g, ',').replace(/。/g, '.').replace(/！/g, '!').replace(/？/g, '?').replace(/、/g, ',').replace(/；/g, ';').replace(/：/g, ':').replace(/[“”]/g, '"').replace(/（/g, '(').replace(/）/g, ')');
      if (segment.trim() && !/^[，。！？、；：,.!?;:“”"《》（）()…—]+$/.test(segment)) segs.push([segment, segment]);
      if (t === '"') { qOpen = !qOpen; r += qOpen ? ' "' : '"'; } else if (/^[,.!?;:)…—]/.test(t)) r += t; else r += (r ? ' ' : '') + t;
      continue;
    }
    if (segment === '地' && piece[0] === 'dì' && pos > 1) piece[0] = 'de';
    const joined = piece.map((p, k) => (k > 0 && /^[aeoāáǎàēéěèōóǒò]/.test(p) ? "'" : '') + p).join('');
    segs.push([segment, joined]);
    r += (r && !/[(\s"]$/.test(r) ? ' ' : '') + joined;
  }
  const text = r.replace(/\s+/g, ' ').replace(/ ([,.!?;:])/g, '$1').trim();
  return opt.segs ? { text, segs } : text;
}
// pinyin for each Chinese run inside mixed English/Chinese text (usage notes)
function annotate(t) {
  const out = []; let m; const re = /([\u4e00-\u9fff][\u4e00-\u9fff…＋+]*)/g; let last = 0;
  while ((m = re.exec(t))) { if (m.index > last) out.push([t.slice(last, m.index), '']); out.push([m[1], sentPinyin(m[1].replace(/[…＋+]/g, ''))]); last = m.index + m[1].length; }
  if (last < t.length) out.push([t.slice(last), '']);
  return out;
}
const tokens = s => [...seg.segment(s)].map(x => x.segment).filter(x => x.trim());

// source meta
const freq = {}, pos = {}, trad = {};
lvl5.forEach(w => { freq[w.simplified] = w.frequency; pos[w.simplified] = w.pos; trad[w.simplified] = w.forms.map(f => f.traditional)[0]; });
const order = [...lvl5].sort((a, b) => (a.frequency || 1e9) - (b.frequency || 1e9)).map(w => w.simplified);
const tier = {}; order.forEach((w, i) => tier[w] = i < order.length / 3 ? 1 : i < 2 * order.length / 3 ? 2 : 3);

// authored rows
const rows = [];
for (const f of fs.readdirSync('content').filter(f => /^b\d+\.txt$/.test(f)).sort()) {
  for (const ln of fs.readFileSync('content/' + f, 'utf8').trim().split('\n')) {
    const p = ln.split('|'); rows.push(p); headPinyin[p[0]] = p[1];
  }
}
const more = {};
for (const f of fs.readdirSync('content').filter(f => /^s\d+\.txt$/.test(f)).sort())
  for (const ln of fs.readFileSync('content/' + f, 'utf8').trim().split('\n')) { const p = ln.split('|'); more[p[0]] = [[p[1], p[2]], [p[3], p[4]]]; }
const srcOrder = lvl5.map(w => w.simplified);
const HEADS = rows.map(r => r[0]).filter(w => w.length > 1).sort((a, b) => b.length - a.length);
const SPLIT = {}; rows.forEach(r => { SPLIT[r[0]] = splitSyl(r[1]); });
rows.sort((a, b) => srcOrder.indexOf(a[0]) - srcOrder.indexOf(b[0]));

function mkEx(z, e, hw) {
  const zs = z.split('//').map(x => x.trim()), es = e.split('//').map(x => x.trim());
  const bare = zs.map(x => x.replace(/^[AB]：/, ''));
  const last = bare[bare.length - 1];
  const sp = sentPinyin(last, { segs: true });
  return { z: zs, e: es, p: bare.map((x, i) => i === bare.length - 1 ? sp.text : sentPinyin(x)),
    tok: sp.segs.filter(([t]) => !/^[，。！？、；：,.!?“”"]+$/.test(t)),
    bp: last.includes(hw) ? sentPinyin(last, { blank: hw }) : '' };
}
const words = rows.map(([w, py, mean, reg, topic, exz, exe, col, note], i) => {
  if (!more[w]) throw new Error('missing extra sentences for ' + w);
  return {
    id: i, w, py, syl: SPLIT[w] && SPLIT[w].length === [...w].length ? SPLIT[w] : null, m: mean, reg, t: topic, d: tier[w], f: freq[w] || null, pos: (pos[w] || []).filter(p => /^[nvadcpqmr]$/.test(p)).slice(0, 2),
    ex: [mkEx(exz, exe, w), ...more[w].map(([z, e]) => mkEx(z, e, w))],
    col: col.split('；').filter(Boolean).map(c => ({ z: c, p: sentPinyin(c.replace(/…/g, '')) })),
    note: note || '', noteP: note ? annotate(note) : [],
  };
});

// earlier-level reference (cumulative L1–4 of the same syllabus)
const earlier = cum4.map(w => {
  const lv = (LV[w.simplified] || []).filter(l => l.startsWith('newest-')).map(l => +l.split('-')[1]);
  const f0 = w.forms.find(f => !/^surname/.test(f.meanings[0])) || w.forms[0];
  return [w.simplified, f0.transcriptions.pinyin.replace(/ /g, ''), f0.meanings.slice(0, 2).join('; ').slice(0, 60), Math.min(...lv)];
});

// extras
const prag = fs.readFileSync('content/extras_pragmatics.txt', 'utf8').trim().split('\n').map(l => {
  const [z, m, real, dz, de, cat] = l.split('|');
  return { z, p: sentPinyin(z.replace(/…/g, '')), m, real, dz: dz.split('//'), de: de.split('//'), dp: dz.split('//').map(s => sentPinyin(s.replace(/^[AB]：/, ''))), cat };
});
const wl = fs.readFileSync('content/extras_writing.txt', 'utf8').trim().split('\n');
const combine = [], prompts = []; let mode = '';
for (const l of wl) {
  if (l.startsWith('#COMBINE')) { mode = 'c'; continue; }
  if (l.startsWith('#PROMPTS')) { mode = 'p'; continue; }
  const p = l.split('|');
  if (mode === 'c') combine.push({ parts: p[0].split('¦'), pp: p[0].split('¦').map(x => sentPinyin(x)), conn: p[1], cp: sentPinyin(p[1].replace(/…/g, ' ')), model: p[2], en: p[3], mp: sentPinyin(p[2]) });
  else prompts.push({ id: p[0], type: p[1], en: p[2], zh: p[3], zp: sentPinyin(p[3]), targets: p[4].split('；'), tp: p[4].split('；').map(x => sentPinyin(x)), model: p[5], mp: sentPinyin(p[5]) });
}

const data = { TOPICS, REG, words, earlier, prag, combine, prompts, built: new Date().toISOString().slice(0, 10) };
fs.writeFileSync('data.js', 'window.HSK=' + JSON.stringify(data) + ';');
console.log('words', words.length, 'earlier', earlier.length, 'prag', prag.length, 'combine', combine.length, 'prompts', prompts.length, 'bytes', fs.statSync('data.js').size);
if (process.env.CHECK) { const bad = rows.filter(r => { const s = SPLIT[r[0]]; return !s || s.length !== [...r[0]].length; }).map(r => r[0] + ':' + r[1] + '>' + (SPLIT[r[0]] || []).join('.')); console.log('split mismatches', bad.length, bad.join('  ')); }
