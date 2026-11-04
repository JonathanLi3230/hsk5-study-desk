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
  '盛': 'shèng', '处理': 'chǔ lǐ', '相处': 'xiāng chǔ', '处于': 'chǔ yú',
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
function sentPinyin(s) {
  const chars = [...s];
  const arr = pinyin(s, { type: 'array', toneSandhi: true });
  if (arr.length !== chars.length) return pinyin(s);
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
  chars.forEach((c, i) => { // 得 after pronoun/adverb = modal děi; otherwise structural de unless inside a word pinyin-pro knows
    if (c === '得' && !done[i]) {
      const prev = chars.slice(Math.max(0, i - 2), i).join('');
      if (/(我|你|他|她|们|还|就|也|都|总)$/.test(prev)) arr[i] = 'děi';
      else if (arr[i] === 'dé' && !/[获取赢难懂舍]$/.test(prev)) arr[i] = 'de';
    }
  });
  // group syllables into words using the segmenter
  let r = '', pos = 0, qOpen = false;
  for (const { segment } of seg.segment(s)) {
    const L = [...segment].length, piece = arr.slice(pos, pos + L); pos += L;
    if (!isHan(segment)) {
      const t = segment.replace(/，/g, ',').replace(/。/g, '.').replace(/！/g, '!').replace(/？/g, '?').replace(/、/g, ',').replace(/；/g, ';').replace(/：/g, ':').replace(/[“”]/g, '"').replace(/（/g, '(').replace(/）/g, ')');
      if (t === '"') { qOpen = !qOpen; r += qOpen ? ' "' : '"'; } else if (/^[,.!?;:)…—]/.test(t)) r += t; else r += (r ? ' ' : '') + t;
      continue;
    }
    if (segment === '地' && piece[0] === 'dì' && pos > 1) piece[0] = 'de';
    const joined = piece.map((p, k) => (k > 0 && /^[aeoāáǎàēéěèōóǒò]/.test(p) ? "'" : '') + p).join('');
    r += (r && !/[(\s"]$/.test(r) ? ' ' : '') + joined;
  }
  return r.replace(/\s+/g, ' ').replace(/ ([,.!?;:])/g, '$1').trim();
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
const srcOrder = lvl5.map(w => w.simplified);
const HEADS = rows.map(r => r[0]).filter(w => w.length > 1).sort((a, b) => b.length - a.length);
const SPLIT = {}; rows.forEach(r => { SPLIT[r[0]] = splitSyl(r[1]); });
rows.sort((a, b) => srcOrder.indexOf(a[0]) - srcOrder.indexOf(b[0]));

const words = rows.map(([w, py, mean, reg, topic, exz, exe, col, note], i) => {
  const ex = exz.split('//'), exE = exe.split('//');
  return {
    id: i, w, py, m: mean, reg, t: topic, d: tier[w], f: freq[w] || null, pos: (pos[w] || []).filter(p => /^[nvadcpqmr]$/.test(p)).slice(0, 2),
    ex: ex.map(s => s.trim()), exE: exE.map(s => s.trim()), exP: ex.map(s => sentPinyin(s.replace(/^[AB]：/, ''))),
    col: col.split('；').filter(Boolean).map(c => ({ z: c, p: sentPinyin(c.replace(/…/g, '')) })),
    note: note || '', tok: tokens(ex[ex.length - 1].replace(/^[AB]：/, '')),
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
  if (mode === 'c') combine.push({ parts: p[0].split('¦'), conn: p[1], model: p[2], en: p[3], mp: sentPinyin(p[2]) });
  else prompts.push({ id: p[0], type: p[1], en: p[2], zh: p[3], targets: p[4].split('；'), model: p[5], mp: sentPinyin(p[5]) });
}

const data = { TOPICS, REG, words, earlier, prag, combine, prompts, built: new Date().toISOString().slice(0, 10) };
fs.writeFileSync('data.js', 'window.HSK=' + JSON.stringify(data) + ';');
console.log('words', words.length, 'earlier', earlier.length, 'prag', prag.length, 'combine', combine.length, 'prompts', prompts.length, 'bytes', fs.statSync('data.js').size);
if (process.env.CHECK) { const bad = rows.filter(r => { const s = SPLIT[r[0]]; return !s || s.length !== [...r[0]].length; }).map(r => r[0] + ':' + r[1] + '>' + (SPLIT[r[0]] || []).join('.')); console.log('split mismatches', bad.length, bad.join('  ')); }
