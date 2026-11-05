/* ===== HSK 5 Study Desk — core: data, storage, SRS, audio, helpers ===== */
const D = window.HSK || { words: [], earlier: [], prag: [], combine: [], prompts: [], TOPICS: {}, REG: {} };
const W = D.words;
const byWord = {}; W.forEach(w => byWord[w.w] = w);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.random() * a.length | 0];
const MIN = 60e3, DAY = 864e5;
const todayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const endOfDay = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return +d; };
const TIER = { 1: 'Core', 2: 'Common', 3: 'Less common' };
const REGLONG = { N: 'Neutral — fine in speech and writing', F: 'Formal — notices, work, news', W: 'Mainly written — essays, news, exams', I: 'Informal — casual speech, chat' };
const TONEMAP = { 'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v' };
const plainPy = s => [...String(s).toLowerCase()].map(c => TONEMAP[c] || c).join('').replace(/[^a-z]/g, '');
function numToMarks(s) { // "an1wei4" -> "ānwèi" for tone-sensitive compare
  const marks = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', v: 'ǖǘǚǜ' };
  return String(s).toLowerCase().replace(/u:/g, 'v').replace(/([a-zv]+)([1-5])/g, (m, syl, t) => {
    if (t === '5') return syl.replace(/v/g, 'ü');
    let i = syl.search(/[ae]/); if (i < 0) i = syl.indexOf('ou'); if (i < 0) { const v = [...syl].map((c, k) => /[aeiouv]/.test(c) ? k : -1).filter(k => k >= 0); i = v[v.length - 1]; }
    if (i == null || i < 0) return syl;
    return (syl.slice(0, i) + marks[syl[i]][+t - 1] + syl.slice(i + 1)).replace(/v/g, 'ü');
  });
}
const tonedPy = s => numToMarks(String(s).toLowerCase()).normalize('NFC').replace(/[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/g, '');
const zhOnly = s => String(s).replace(/[\s，。！？、；：,.!?;:“”"'（）()…—~～·《》]/g, '');
// each word has three examples: { z: Chinese lines, e: English lines, p: pinyin lines, tok: [[word, pinyin]], bp: pinyin with the word blanked }
const lastLine = x => x.z[x.z.length - 1].replace(/^[AB]：/, '');
const lastEn = x => x.e[x.e.length - 1].replace(/^[AB]: /, '');
const lastPy = x => x.p[x.p.length - 1];
const xIndex = (w, x) => Math.max(0, w.ex.indexOf(x));
function pickX(w, { cloze = false } = {}) { const pool = cloze ? w.ex.filter(x => x.bp) : w.ex; return pick(pool.length ? pool : w.ex); }
const isTW = n => /台湾/.test(n);

/* ---------- state ---------- */
const LS = 'hsk5-study-desk-v1';
function fresh() {
  return { v: 1, upd: 0, srs: {}, ws: {}, bm: {}, weak: {}, hand: {}, hist: {}, wlog: [], wlevel: { translate: 1, scramble: 1, combine: 1, colloc: 1, complete: 1, prompt: 1 }, wstreak: {},
    day: { date: todayKey(), new: 0, rev: 0 },
    set: { newPerDay: 15, order: 'core', topic: '', pinyin: 'hidden', rateN: 0.9, rateS: 0.55, voice: '', reps: 5, ai: true, theme: '' } };
}
let S = (() => { try { const s = JSON.parse(localStorage.getItem(LS)); if (s && s.v === 1) return Object.assign(fresh(), s, { set: Object.assign(fresh().set, s.set) }); } catch (e) { } return fresh(); })();
function rollDay() { const k = todayKey(); if (S.day.date !== k) S.day = { date: k, new: 0, rev: 0 }; }
rollDay();
let syncTimer = null, dbRef = null, syncState = 'local';
function save() {
  S.upd = Date.now();
  try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { }
  clearTimeout(syncTimer); syncTimer = setTimeout(pushDb, 2500);
}
function packForDb() {
  const copy = Object.assign({}, S); let log = S.wlog.slice(-150);
  let json = JSON.stringify(Object.assign(copy, { wlog: log }));
  while (json.length > 240000 && log.length > 10) { log = log.slice(Math.floor(log.length / 3)); json = JSON.stringify(Object.assign(copy, { wlog: log })); }
  return { json, upd: S.upd };
}
let pushing = false;
async function pushDb() {
  if (!dbRef || pushing) return; pushing = true;
  try { const p = packForDb(); await dbRef.set({ upd: p.upd, state: p.json }); setSync('synced'); }
  catch (e) { setSync('local'); }
  pushing = false;
}
function setSync(s) { syncState = s; const el = $('#syncstate'); if (el) el.textContent = s === 'synced' ? 'Progress saved to your account' : s === 'loading' ? 'Connecting…' : 'Progress saved in this browser'; }
(async () => { // account-backed storage when the viewer can provide it
  try {
    if (!window.claude || !window.claude.use) return;
    setSync('loading');
    const timer = setTimeout(() => setSync('local'), 10000);
    const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
    if (!db || !user) { clearTimeout(timer); setSync('local'); return; }
    const id = await user.id(); if (!id) { clearTimeout(timer); setSync('local'); return; }
    dbRef = db.collection('data/users/' + id).doc('state');
    const snap = await dbRef.get(); clearTimeout(timer);
    if (snap.exists) {
      const d = snap.data();
      if (d && d.upd > (S.upd || 0)) { try { const s = JSON.parse(d.state); S = Object.assign(fresh(), s, { set: Object.assign(fresh().set, s.set) }); rollDay(); localStorage.setItem(LS, JSON.stringify(S)); route(); } catch (e) { } }
      else if (S.upd > (d?.upd || 0)) pushDb();
    } else if (S.upd) pushDb();
    setSync('synced');
  } catch (e) { setSync('local'); }
})();

/* ---------- spaced repetition ---------- */
const STEPS = [1 * MIN, 10 * MIN];
function cardStatus(c, now = Date.now()) {
  if (!c) return 'new';
  if (c.st === 'l') return c.due <= now ? 'due' : 'learning';
  if (c.due <= endOfDay()) return 'due';
  return c.ivl >= 21 ? 'mastered' : 'review';
}
function statusOf(id) { return cardStatus(S.srs[id]); }
function schedule(c, r, now = Date.now()) {
  // r: 1 again, 2 hard, 3 good, 4 easy. Returns a new card object.
  c = c ? { ...c } : { st: 'n', step: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0, first: now };
  const fuzz = d => d < 3 ? d : Math.round(d * (0.95 + Math.random() * 0.1));
  c.reps++; c.last = now;
  if (c.st === 'n' || c.st === 'l') {
    const relearn = c.st === 'l' && c.ivl > 0;
    if (r === 1) { c.st = 'l'; c.step = 0; c.due = now + STEPS[0]; }
    else if (r === 2) { c.st = 'l'; c.due = now + (c.step === 0 ? 6 * MIN : STEPS[1]); }
    else if (r === 3) {
      if (c.st === 'n' || c.step === 0) { c.st = 'l'; c.step = 1; c.due = now + STEPS[1]; }
      else { c.st = 'r'; c.ivl = relearn ? Math.max(1, c.ivl) : 1; c.due = now + c.ivl * DAY; }
    } else { c.st = 'r'; c.ivl = relearn ? Math.max(2, Math.round(c.ivl * 1.5)) : 4; c.due = now + c.ivl * DAY; }
  } else {
    if (r === 1) { c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = Math.max(1, Math.round(c.ivl * 0.3)); c.st = 'l'; c.step = 0; c.due = now + STEPS[1]; }
    else if (r === 2) { c.ease = Math.max(1.3, c.ease - 0.15); c.ivl = Math.max(c.ivl + 1, fuzz(Math.round(c.ivl * 1.2))); c.due = now + c.ivl * DAY; }
    else if (r === 3) { c.ivl = Math.max(c.ivl + 1, fuzz(Math.round(c.ivl * c.ease))); c.due = now + c.ivl * DAY; }
    else { c.ease = Math.min(3.2, c.ease + 0.15); c.ivl = Math.max(c.ivl + 2, fuzz(Math.round(c.ivl * c.ease * 1.3))); c.due = now + c.ivl * DAY; }
  }
  return c;
}
function fmtIvl(ms) {
  if (ms < 60 * MIN) return Math.max(1, Math.round(ms / MIN)) + 'm';
  if (ms < DAY) return Math.round(ms / (60 * MIN)) + 'h';
  const d = Math.round(ms / DAY); if (d < 30) return d + 'd'; if (d < 365) return (d / 30).toFixed(d < 60 ? 1 : 0) + 'mo'; return (d / 365).toFixed(1) + 'y';
}
function preview(c) { const now = Date.now(); return [1, 2, 3, 4].map(r => fmtIvl(schedule(c, r, now).due - now)); }
function counts() {
  const now = Date.now(), eod = endOfDay(); let nw = 0, learning = 0, due = 0, mastered = 0, review = 0;
  for (const w of W) {
    const c = S.srs[w.id];
    if (!c) { nw++; continue; }
    if (c.st === 'l') { learning++; if (c.due <= now) due++; }
    else { if (c.due <= eod) due++; if (c.ivl >= 21) mastered++; else review++; }
  }
  return { nw, learning, due, mastered, review, seen: W.length - nw };
}
function newOrder() {
  let pool = W.filter(w => !S.srs[w.id]);
  if (S.set.topic) { const t = pool.filter(w => w.t === S.set.topic); if (t.length) pool = t; }
  if (S.set.order === 'core') pool.sort((a, b) => (a.d - b.d) || ((a.f || 1e9) - (b.f || 1e9)));
  else if (S.set.order === 'random') pool = shuffle(pool);
  return pool;
}
function newLeft() { return Math.max(0, S.set.newPerDay - S.day.new); }
function todayQueue() {
  const now = Date.now(), eod = endOfDay();
  const learning = [], reviews = [];
  for (const w of W) { const c = S.srs[w.id]; if (!c) continue; if (c.st === 'l' && c.due <= now) learning.push(w.id); else if (c.st === 'r' && c.due <= eod) reviews.push(w.id); }
  reviews.sort((a, b) => S.srs[a].due - S.srs[b].due);
  const news = newOrder().slice(0, newLeft()).map(w => w.id);
  // interleave new cards among reviews so sessions don't end on a wall of new words
  const out = [...learning]; const rv = shuffle(reviews); let ni = 0;
  rv.forEach((id, i) => { out.push(id); if (ni < news.length && i % 3 === 2) out.push(news[ni++]); });
  while (ni < news.length) out.push(news[ni++]);
  return out;
}
function logHist(kind) { const k = todayKey(); const h = S.hist[k] || (S.hist[k] = { rev: 0, new: 0, again: 0, w: 0, q: 0, l: 0, hw: 0 }); h[kind] = (h[kind] || 0) + 1; }
function streak() { let n = 0; const d = new Date(); for (; ;) { const h = S.hist[todayKey(+d)]; if (h && (h.rev || h.new || h.w || h.q || h.l)) { n++; d.setDate(d.getDate() - 1); } else break; } return n; }

/* writing schedule (separate from flashcards) */
function wsDue() { const eod = endOfDay(); return Object.keys(S.ws).filter(id => S.ws[id].due <= eod).map(Number); }
function writingPool() {
  const due = wsDue();
  const now = Date.now();
  const recent = W.filter(w => S.srs[w.id] && !S.ws[w.id] && now - (S.srs[w.id].first || 0) < 14 * DAY).map(w => w.id);
  const weak = Object.keys(S.weak).map(Number).filter(id => !due.includes(id)).sort((a, b) => S.weak[b] - S.weak[a]);
  const lapsed = W.filter(w => S.srs[w.id]?.lapses).map(w => w.id);
  const learned = W.filter(w => S.srs[w.id]).map(w => w.id);
  const ordered = [...new Set([...due, ...weak, ...lapsed, ...recent, ...learned])];
  return { ids: ordered.length ? ordered : W.filter(w => w.d === 1).slice(0, 120).map(w => w.id), due: due.length, fallback: !ordered.length };
}

/* ---------- audio (browser text-to-speech) ---------- */
const TTS = { ok: 'speechSynthesis' in window, voices: [], zh: [], ready: false };
function loadVoices() {
  if (!TTS.ok) return;
  TTS.voices = speechSynthesis.getVoices();
  TTS.zh = TTS.voices.filter(v => /^zh([-_](CN|Hans)|$)/i.test(v.lang) || /^cmn/i.test(v.lang));
  if (!TTS.zh.length) TTS.zh = TTS.voices.filter(v => /^zh/i.test(v.lang) && !/HK|yue/i.test(v.lang));
  TTS.ready = true;
  const b = $('#voicebanner'); if (b) b.outerHTML = voiceBanner();
}
if (TTS.ok) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; setTimeout(loadVoices, 800); }
function chosenVoice() { return TTS.zh.find(v => v.voiceURI === S.set.voice) || TTS.zh.find(v => /CN/i.test(v.lang)) || TTS.zh[0]; }
function voiceBanner() {
  if (!TTS.ok) return `<div id="voicebanner" class="banner"><b>Audio isn't available in this browser.</b> Audio here uses your device's text-to-speech, and this browser doesn't offer it. Try Chrome, Edge or Safari.</div>`;
  if (TTS.ready && !TTS.zh.length) return `<div id="voicebanner" class="banner"><b>No Mandarin voice found on this device.</b> Audio uses your device's text-to-speech. To hear Chinese: on Windows add the <i>Chinese (Simplified, China)</i> speech pack under Settings › Time &amp; language › Speech; on macOS or iOS download a Chinese voice under Spoken Content; on Android install or enable Google Speech Services with Chinese. Then reload this page. Until then, the audio buttons are disabled and listening exercises show the transcript.</div>`;
  return '<div id="voicebanner" hidden></div>';
}
const canSpeak = () => TTS.ok && TTS.zh.length > 0;
function speak(text, slow, onend) {
  if (!canSpeak()) { toast('No Mandarin voice available on this device'); return; }
  speechSynthesis.cancel();
  const lines = String(text).split('//').map(s => s.trim()).filter(Boolean);
  const v = chosenVoice();
  lines.forEach((ln, i) => {
    const speaker = (ln.match(/^([AB])：/) || [])[1];
    const u = new SpeechSynthesisUtterance(ln.replace(/^[AB]：/, ''));
    u.lang = v?.lang || 'zh-CN'; if (v) u.voice = v;
    u.rate = slow ? S.set.rateS : S.set.rateN; u.pitch = speaker === 'B' ? 1.18 : 1;
    if (i === lines.length - 1 && onend) u.onend = onend;
    speechSynthesis.speak(u);
  });
}
const ICON_PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5h2.5L9 2.5v11L5.5 10.5H3z" fill="currentColor"/><path d="M11 5.2a3.5 3.5 0 0 1 0 5.6M12.6 3.4a6 6 0 0 1 0 9.2" stroke="currentColor" fill="none" stroke-width="1.3" stroke-linecap="round"/></svg>';
function audioBtns(text, label = '') {
  const t = esc(text); const dis = canSpeak() ? '' : ' disabled title="No Mandarin voice on this device"';
  return `<span class="aud"><button type="button" data-say="${t}"${dis} aria-label="Play ${esc(label || 'audio')}">${ICON_PLAY}${label ? esc(label) : ''}</button><button type="button" data-say="${t}" data-slow="1"${dis} aria-label="Play slowly">Slow</button></span>`;
}

/* ---------- rendering helpers ---------- */
function pyHTML(py, cls = '') { if (!py) return ''; const hid = S.set.pinyin === 'hidden'; return `<span class="py ${hid ? 'hid' : ''} ${cls}" ${hid ? 'role="button" tabindex="0" title="Show pinyin (P)"' : ''}>${esc(py)}</span>`; }
function hlSentence(s, w) { const e = esc(s); const k = esc(w); return e.split(k).join(`<mark>${k}</mark>`); }
function badgeRow(w) {
  return `<span class="chip acc" title="HSK 3.0 (2025 exam syllabus), new at Level 5">HSK 5 · new</span><span class="chip" title="${esc(REGLONG[w.reg])}">${esc(D.REG[w.reg])}</span><span class="chip">${esc(D.TOPICS[w.t])}</span><span class="chip" title="Learning difficulty from word frequency">${TIER[w.d]}</span>`;
}
function noteHTML(w, { twOnly = false, noTW = false } = {}) {
  if (!w.noteP || !w.noteP.length) return '';
  const groups = [[]]; // split the note where a Taiwan usage remark starts
  w.noteP.forEach((sg, i) => { if (sg[0] === '台湾' && /^：/.test((w.noteP[i + 1] || [''])[0])) groups.push([]); groups[groups.length - 1].push(sg); });
  return groups.filter(g => g.length).map(g => {
    const tw = g[0][0] === '台湾'; if ((tw && noTW) || (!tw && twOnly)) return '';
    const body = (tw ? g.slice(1) : g).map(([t, p], k) => p ? `<span class="zh">${esc(t)}</span>${pyHTML(p, 'inl')}` : esc(k === 0 && tw ? t.replace(/^：/, '') : t)).join('');
    return `<div class="note ${tw ? 'tw' : ''}">${tw ? '<b>Taiwan usage · </b>' : ''}${body}</div>`;
  }).join('');
}
function zhPy(z, p, cls = 'zh') { return `<span class="${cls}">${esc(z)}</span> ${pyHTML(p)}`; }
function exampleHTML(x, w, i) {
  const dlg = x.z.length > 1;
  return `<div class="exitem"><div class="row" style="justify-content:space-between"><span class="label">${dlg ? 'Dialogue' : 'Example'} ${i + 1}</span>${audioBtns(x.z.join('//'), 'Listen')}</div>
    ${x.z.map((s, k) => `<div class="zhl">${hlSentence(s, w.w)}</div><div>${pyHTML(x.p[k])}</div><div class="en">${esc(x.e[k] || '')}</div>`).join('')}</div>`;
}
function wordDetail(w) {
  return `
  <div class="cent stack" style="gap:6px">
    <div class="bigword">${esc(w.w)}</div>
    <div class="row" style="justify-content:center">${pyHTML(w.py, 'big')} ${audioBtns(w.w, 'Word')}</div>
    <div class="mean">${esc(w.m)}</div>
    <div class="row" style="justify-content:center;gap:6px">${badgeRow(w)}</div>
  </div>
  <div class="ex">${w.ex.map((x, i) => exampleHTML(x, w, i)).join('')}</div>
  <div class="stack" style="gap:6px"><span class="label">Common combinations</span><div class="colls">${w.col.map(c => `<div class="coll"><span class="zh">${esc(c.z)}</span>${pyHTML(c.p)}</div>`).join('')}</div></div>
  <div class="stack" style="gap:6px"><span class="label">When to use it</span><div class="small">${esc(REGLONG[w.reg])}.</div>${noteHTML(w)}</div>`;
}
/* runtime pinyin for text that isn't in the data (AI feedback, your answers) */
let pyLibP = null;
function loadPyLib() {
  if (window.pinyinPro) return Promise.resolve();
  return pyLibP || (pyLibP = new Promise(res => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/pinyin-pro@3.29.5/dist/index.js'; sc.onload = () => { res(); if (typeof onPyLib === 'function') onPyLib(); }; sc.onerror = () => res(); document.head.appendChild(sc); }));
}
function pyOf(t) { try { return window.pinyinPro && /[\u4e00-\u9fff]/.test(t) ? pinyinPro.pinyin(String(t), { nonZh: 'consecutive' }).replace(/\s+([，。！？、；：,.!?])/g, '$1') : ''; } catch (e) { return ''; } }
function zhLine(t, cls = 'zhbig') { return `<div class="${cls}">${esc(t)}</div>${pyOf(t) ? `<div>${pyHTML(pyOf(t))}</div>` : ''}`; }
function annZh(t) { // pinyin after each Chinese run inside English text
  return String(t || '').split(/([\u4e00-\u9fff][\u4e00-\u9fff…]*)/).map((part, i) => i % 2 ? `<span class="zh">${esc(part)}</span>${pyHTML(pyOf(part.replace(/…/g, '')), 'inl')}` : esc(part)).join('');
}
function revealPy(e) { const p = e.target.closest('.py.hid'); if (p) { p.classList.remove('hid'); e.stopPropagation(); e.preventDefault(); return true; } return false; }
let toastT; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
function bmToggle(id) { if (S.bm[id]) delete S.bm[id]; else S.bm[id] = Date.now(); save(); toast(S.bm[id] ? 'Bookmarked' : 'Bookmark removed'); }
function statusLabel(st) { return { new: 'New', learning: 'Learning', due: 'Due', review: 'Learned', mastered: 'Mastered' }[st]; }
function distractors(w, n, { sameChar = false, field = 'w' } = {}) {
  const pos0 = (w.pos || [])[0];
  let pool = W.filter(x => x.id !== w.id && x.w !== w.w && x.m !== w.m);
  const score = x => (sameChar && [...x.w].some(c => w.w.includes(c)) ? 6 : 0) + (x.t === w.t ? 2 : 0) + (pos0 && (x.pos || [])[0] === pos0 ? 3 : 0) + (x.w.length === w.w.length ? 1 : 0) + Math.random() * 2.5;
  pool = pool.map(x => [score(x), x]).sort((a, b) => b[0] - a[0]).slice(0, 30).map(a => a[1]);
  const out = []; for (const x of shuffle(pool.slice(0, 12))) { if (out.length >= n) break; if (!out.some(o => o[field] === x[field])) out.push(x); }
  return out;
}
