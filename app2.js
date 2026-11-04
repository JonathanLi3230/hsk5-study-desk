/* ===== views: shell, today, study, cards ===== */
const NAV = [
  ['today', '今', 'Review today', 't'], ['cards', '词', 'Word list', 'c'], ['listen', '听', 'Listening', 'l'], ['quiz', '考', 'Quizzes', 'q'],
  ['write', '写', 'Writing', 'w'], ['hand', '笔', 'Handwriting', 'h'], ['talk', '说', 'Conversation', 'e'], ['progress', '进', 'Progress', 'p'], ['settings', '设', 'Settings', 's']];
const TABS = ['today', 'cards', 'listen', 'quiz', 'write', 'more'];
let view = 'today';
function shell() {
  document.body.innerHTML = `
  <div class="shell">
    <aside class="rail"><div class="brand"><span class="han">五级</span><span>HSK 5 Study Desk</span></div>
      <nav class="nav" aria-label="Sections">${NAV.map(([k, h, l, key]) => `<a href="#${k}" data-nav="${k}"><span class="han">${h}</span>${l}<span class="k">g ${key}</span></a>`).join('')}</nav>
      <div class="foot"><div id="syncstate">Progress saved in this browser</div><div>Press <kbd>?</kbd> for shortcuts</div></div></aside>
    <main id="main" tabindex="-1"></main>
  </div>
  <nav class="tabs" aria-label="Sections">${TABS.map(k => { if (k === 'more') return `<a href="#more" data-nav="more"><span class="han">更</span>More</a>`; const n = NAV.find(x => x[0] === k); return `<a href="#${k}" data-nav="${k}"><span class="han">${n[1]}</span>${n[2].split(' ')[0]}</a>`; }).join('')}</nav>
  <div id="toast" class="toast" role="status"></div><div id="layer"></div>`;
  setSync(syncState);
}
function setNav() { $$('[data-nav]').forEach(a => a.setAttribute('aria-current', a.dataset.nav === view || (a.dataset.nav === 'more' && ['hand', 'talk', 'progress', 'settings', 'more'].includes(view)) ? 'page' : 'false')); }
const VIEWS = {};
function route() {
  rollDay();
  const h = (location.hash || '#today').slice(1);
  view = VIEWS[h] ? h : 'today';
  if (view !== 'study') session = null;
  setNav(); closeSheet();
  const m = $('#main'); m.innerHTML = '<div class="col" id="col"></div>';
  VIEWS[view]($('#col'));
  if (S.set.pinyin === 'shown') m.classList.add('showpy'); else m.classList.remove('showpy');
  window.scrollTo(0, 0);
}
function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }

/* ---------- Today ---------- */
VIEWS.today = col => {
  const c = counts(); const q = todayQueue(); const nl = Math.min(newLeft(), c.nw);
  const wdue = wsDue().length; const bm = Object.keys(S.bm).length; const st = streak();
  const reviewsNow = q.length - Math.min(nl, q.length);
  col.innerHTML = `
  ${voiceBanner()}
  <div class="topbar"><h1>Review today</h1><span class="chip">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>${st ? `<span class="chip acc">${st}-day streak</span>` : ''}</div>
  <section class="panel hero">
    <div class="stack" style="gap:14px">
      <div class="counts">
        <div class="count due"><b>${reviewsNow}</b><span>reviews due</span></div>
        <div class="count new"><b>${nl}</b><span>new words left today</span></div>
        <div class="count wr"><b>${wdue}</b><span>writing reviews due</span></div>
      </div>
      <div class="row small"><span class="muted">New words per day</span>
        <span class="stepper"><button type="button" id="nminus" aria-label="Fewer new words">−</button><span id="nper">${S.set.newPerDay}</span><button type="button" id="nplus" aria-label="More new words">+</button></span>
        <span class="muted">· ${S.day.new} introduced today</span></div>
    </div>
    <div class="stack" style="align-items:stretch">
      <button class="btn primary" id="start" ${q.length ? '' : 'disabled'} style="min-height:48px;padding:10px 22px;font-size:1rem">${q.length ? 'Start review' : 'All done for today'} <span class="k kbd-hint">Enter</span></button>
      ${!q.length && c.nw ? `<button class="btn sm" id="more5">Learn 5 more new words</button>` : ''}
    </div>
  </section>
  <section class="tiles">
    <button class="tile" data-go="write"><span class="han">写</span><b>Writing practice</b><span class="small muted">${wdue ? wdue + ' due · ' : ''}translate, reorder, compose</span></button>
    <button class="tile" data-go="listen"><span class="han">听</span><b>Listening drill</b><span class="small muted">Words, sentences and dialogues</span></button>
    <button class="tile" data-go="quiz"><span class="han">考</span><b>Quick quiz</b><span class="small muted">10 questions with explanations</span></button>
    <button class="tile" id="bmstudy" ${bm ? '' : 'disabled'}><span class="han">签</span><b>Bookmarked words</b><span class="small muted">${bm ? bm + ' saved for extra practice' : 'Bookmark hard words with B'}</span></button>
  </section>
  <section class="panel stack">
    <div class="row" style="justify-content:space-between"><h2>Your HSK 5 list</h2><a href="#progress" class="small">Full progress</a></div>
    <div class="meter" aria-label="Progress through the list">${['mastered', 'review', 'learning'].map(k => `<i style="width:${(k === 'mastered' ? c.mastered : k === 'review' ? c.review : c.learning) / W.length * 100}%;background:var(${k === 'mastered' ? '--good' : k === 'review' ? '--easy' : '--hard'})"></i>`).join('')}</div>
    <div class="legend"><span><i class="dot mastered"></i>${c.mastered} mastered</span><span><i class="dot review"></i>${c.review} learned</span><span><i class="dot learning"></i>${c.learning} learning</span><span><i class="dot"></i>${c.nw} not started</span><span>of ${W.length} new Level 5 words</span></div>
    <div class="small muted">New words come ${S.set.order === 'core' ? 'most frequent first' : S.set.order === 'random' ? 'in random order' : 'in syllabus order'}${S.set.topic ? ', from ' + esc(D.TOPICS[S.set.topic]) : ''}. <a href="#settings">Change</a></div>
  </section>`;
  $('#nminus').onclick = () => { S.set.newPerDay = Math.max(0, S.set.newPerDay - 5); save(); route(); };
  $('#nplus').onclick = () => { S.set.newPerDay = Math.min(100, S.set.newPerDay + 5); save(); route(); };
  $('#start').onclick = () => startSession(todayQueue(), 'Today’s review');
  const m5 = $('#more5'); if (m5) m5.onclick = () => startSession(newOrder().slice(0, 5).map(w => w.id), 'Extra new words', { extraNew: true });
  $('#bmstudy').onclick = () => startSession(shuffle(Object.keys(S.bm).map(Number)), 'Bookmarked words');
  $$('[data-go]', col).forEach(b => b.onclick = () => go(b.dataset.go));
};

/* ---------- Study session ---------- */
let session = null;
function startSession(ids, title, opts = {}) {
  if (!ids.length) { toast('Nothing to study right now'); return; }
  session = { ids: [...ids], title, i: 0, done: 0, total: ids.length, shown: false, opts, again: 0, started: Date.now() };
  if (location.hash === '#study') renderStudy(); else location.hash = 'study';
}
VIEWS.study = col => { if (!session) { go('today'); return; } renderStudy(); };
function affectsSchedule(id) { const c = S.srs[id]; const st = cardStatus(c); return !c || st === 'due' || session.opts.extraNew; }
function renderStudy() {
  const col = $('#col'); if (!col) return;
  if (!session.ids.length) {
    const c = counts();
    col.innerHTML = `<div class="topbar"><h1>${esc(session.title)} · done</h1></div>
      <section class="panel stack"><p>You went through <b>${session.done}</b> cards${session.again ? `, and pressed Again on ${session.again}` : ''}. Learning cards come back after their short delay; reviews are scheduled for later days.</p>
      <div class="row"><span class="chip">${c.due} still due today</span><span class="chip">${Math.min(newLeft(), c.nw)} new left</span></div>
      <div class="row"><button class="btn primary" id="tw">Practise writing with today’s words</button><a class="btn" href="#hand">Handwriting</a><a class="btn" href="#today">Back to today</a></div></section>`;
    $('#tw').onclick = () => { writeCtx = { fromSession: true }; go('write'); };
    return;
  }
  const id = session.ids[0]; const w = W[id]; const c = S.srs[id]; const sched = affectsSchedule(id); const pv = preview(c);
  const pct = session.done / (session.done + session.ids.length) * 100;
  col.innerHTML = `
  <div class="topbar"><h1>${esc(session.title)}</h1><span class="chip tabnum">${session.ids.length} left</span><button class="btn ghost sm" id="endsess">End session</button></div>
  <div class="progressline"><i style="width:${pct}%"></i></div>
  <article class="card" id="card">
    <div class="head"><span class="chip ${c ? '' : 'acc'}">${c ? statusLabel(cardStatus(c)) : 'New word'}</span>${sched ? '' : '<span class="chip warn" title="This card isn’t due, so your rating won’t change its schedule">Practice only</span>'}
      <span class="sp"></span><button class="btn ghost sm" id="bm" aria-pressed="${!!S.bm[id]}">${S.bm[id] ? '★ Bookmarked' : '☆ Bookmark'} <span class="k kbd-hint">B</span></button></div>
    ${session.shown ? wordDetail(w) : `<div class="bigword" style="padding:30px 0 10px">${esc(w.w)}</div><div class="row" style="justify-content:center">${audioBtns(w.w, 'Word')}</div><div class="cent muted small">Recall the meaning and pronunciation, then check.</div>`}
  </article>
  ${session.shown ? `<div class="rate" role="group" aria-label="How well did you know it?">
      <button class="a" data-r="1">Again<small>${pv[0]} · 1</small></button><button class="h" data-r="2">Difficult<small>${pv[1]} · 2</small></button>
      <button class="g" data-r="3">Good<small>${pv[2]} · 3</small></button><button class="e" data-r="4">Easy<small>${pv[3]} · 4</small></button></div>
      <div class="kbd-hint"><kbd>P</kbd> pinyin · <kbd>A</kbd> word audio · <kbd>S</kbd> sentence · <kbd>Shift</kbd>+<kbd>S</kbd> slow</div>`
      : `<button class="btn primary" id="show" style="min-height:50px">Show answer <span class="k kbd-hint">Space</span></button>`}`;
  $('#endsess').onclick = () => { session = null; go('today'); };
  $('#bm').onclick = () => { bmToggle(id); renderStudy(); };
  const sh = $('#show'); if (sh) sh.onclick = () => { session.shown = true; renderStudy(); };
  $$('[data-r]').forEach(b => b.onclick = () => rate(+b.dataset.r));
}
function rate(r) {
  if (!session || !session.shown) return;
  const id = session.ids.shift(); const old = S.srs[id];
  if (affectsSchedule(id)) {
    const isNew = !old; const c = schedule(old, r); S.srs[id] = c;
    if (isNew) { S.day.new++; logHist('new'); } else { S.day.rev++; logHist('rev'); }
    if (r === 1) { logHist('again'); S.weak[id] = (S.weak[id] || 0) + 1; session.again++; }
    if (c.st === 'l' && c.due - Date.now() <= 20 * MIN) session.ids.splice(Math.min(session.ids.length, r === 1 ? 3 : 6), 0, id);
  } else if (r === 1) { session.ids.splice(Math.min(session.ids.length, 4), 0, id); session.again++; }
  session.done++; session.shown = false; save(); renderStudy();
}

/* ---------- Word list / browse ---------- */
let browse = { q: '', topic: '', diff: '', reg: '', st: '', earlier: false, limit: 120 };
VIEWS.cards = col => {
  col.innerHTML = `
  <div class="topbar"><h1>Word list</h1><span class="chip">${W.length} new Level 5 words</span></div>
  <div class="panel stack">
    <input type="search" id="q" placeholder="Search by word, pinyin (with or without tones) or English" value="${esc(browse.q)}" aria-label="Search">
    <div class="filters">
      <select id="ft" aria-label="Topic"><option value="">All topics</option>${Object.entries(D.TOPICS).map(([k, v]) => `<option value="${k}" ${browse.topic === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <select id="fd" aria-label="Difficulty"><option value="">All difficulty</option>${[1, 2, 3].map(d => `<option value="${d}" ${browse.diff == d ? 'selected' : ''}>${TIER[d]}</option>`).join('')}</select>
      <select id="fr" aria-label="Register"><option value="">All registers</option>${Object.entries(D.REG).map(([k, v]) => `<option value="${k}" ${browse.reg === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      <select id="fs" aria-label="Learning status"><option value="">Any status</option>${['new', 'learning', 'due', 'review', 'mastered', 'bookmarked', 'weak'].map(s => `<option value="${s}" ${browse.st === s ? 'selected' : ''}>${s === 'bookmarked' ? 'Bookmarked' : s === 'weak' ? 'Struggled with' : statusLabel(s)}</option>`).join('')}</select>
    </div>
    <label class="row small"><input type="checkbox" id="fe" ${browse.earlier ? 'checked' : ''}> Show earlier levels (HSK 1–4 of the same syllabus) as a reference list</label>
  </div>
  <div class="row" id="resbar"></div>
  <div id="res"></div>`;
  const upd = () => { browse.limit = 120; renderBrowse(); };
  $('#q').oninput = e => { browse.q = e.target.value; upd(); };
  $('#ft').onchange = e => { browse.topic = e.target.value; upd(); };
  $('#fd').onchange = e => { browse.diff = e.target.value; upd(); };
  $('#fr').onchange = e => { browse.reg = e.target.value; upd(); };
  $('#fs').onchange = e => { browse.st = e.target.value; upd(); };
  $('#fe').onchange = e => { browse.earlier = e.target.checked; upd(); };
  renderBrowse();
};
function matchQ(q, w, py, m) {
  if (!q) return true; const ql = q.toLowerCase().trim();
  if (/[一-鿿]/.test(ql)) return w.includes(ql);
  const qp = plainPy(ql);
  if (qp && plainPy(py).startsWith(qp)) return true;
  if (/[1-5āáǎàēéěèīíǐìōóǒòūúǔù]/.test(ql) && tonedPy(py).startsWith(tonedPy(ql))) return true;
  return m.toLowerCase().includes(ql);
}
function filtered() {
  return W.filter(w => {
    if (browse.topic && w.t !== browse.topic) return false;
    if (browse.diff && w.d != browse.diff) return false;
    if (browse.reg && w.reg !== browse.reg) return false;
    if (browse.st) { if (browse.st === 'bookmarked') { if (!S.bm[w.id]) return false; } else if (browse.st === 'weak') { if (!S.weak[w.id]) return false; } else if (statusOf(w.id) !== browse.st) return false; }
    return matchQ(browse.q, w.w, w.py, w.m);
  });
}
function renderBrowse() {
  const res = $('#res'), bar = $('#resbar'); if (!res) return;
  if (browse.earlier) {
    const list = D.earlier.filter(e => matchQ(browse.q, e[0], e[1], e[2]));
    bar.innerHTML = `<span class="small muted">${list.length} words from Levels 1–4 · reference only, not scheduled</span>`;
    res.innerHTML = `<div class="list">${list.slice(0, browse.limit).map(e => `<div class="li" style="cursor:default"><span class="han">${esc(e[0])}</span><span class="m">${pyHTML(e[1])} <span class="muted">· ${esc(e[2])}</span></span><span class="chip">Level ${e[3]}</span></div>`).join('')}</div>${list.length > browse.limit ? '<button class="btn" id="moreres" style="width:100%">Show more</button>' : ''}`;
  } else {
    const list = filtered();
    const studyable = list.filter(w => statusOf(w.id) !== 'mastered').length;
    bar.innerHTML = `<span class="small muted" style="margin-right:auto">${list.length} words</span>${list.length ? `<button class="btn sm" id="studythese">Study these (${Math.min(list.length, 50)})</button><button class="btn sm" id="writethese">Write with these</button>` : ''}`;
    res.innerHTML = list.length ? `<div class="list">${list.slice(0, browse.limit).map(w => { const st = statusOf(w.id); return `<button class="li" data-w="${w.id}"><span class="han">${esc(w.w)}</span><span class="m">${pyHTML(w.py)} <span class="muted">· ${esc(w.m)}</span></span><span class="row" style="gap:6px">${S.bm[w.id] ? '<span title="Bookmarked">★</span>' : ''}<span class="dot ${st}" title="${statusLabel(st)}"></span></span></button>`; }).join('')}</div>${list.length > browse.limit ? '<button class="btn" id="moreres" style="width:100%">Show more</button>' : ''}` : '<div class="panel muted">No words match. Try fewer filters or search the English meaning.</div>';
    const s = $('#studythese'); if (s) s.onclick = () => { const ids = list.slice(0, 50).map(w => w.id); startSession(ids, browse.topic ? D.TOPICS[browse.topic] : 'Selected words', { extraNew: false }); };
    const wt = $('#writethese'); if (wt) wt.onclick = () => { writeCtx = { ids: list.slice(0, 60).map(w => w.id) }; go('write'); };
    void studyable;
  }
  const mr = $('#moreres'); if (mr) mr.onclick = () => { browse.limit += 200; renderBrowse(); };
}
function openWord(id) {
  const w = W[id]; const st = statusOf(id); const c = S.srs[id];
  $('#layer').innerHTML = `<div class="overlay" id="ov"><div class="sheet ${S.set.pinyin === 'shown' ? 'showpy' : ''}" role="dialog" aria-modal="true" aria-label="${esc(w.w)}">
    <div class="row" style="justify-content:space-between"><span class="chip">${statusLabel(st)}${c && c.st === 'r' ? ' · next in ' + fmtIvl(Math.max(0, c.due - Date.now())) : ''}</span><button class="btn ghost sm" id="closeov">Close <span class="k kbd-hint">Esc</span></button></div>
    <div class="card" style="border:0;padding:12px 4px">${wordDetail(w)}</div>
    <div class="row"><button class="btn" id="ovbm">${S.bm[id] ? '★ Bookmarked' : '☆ Bookmark'}</button><button class="btn" id="ovst">Study now</button><button class="btn" id="ovwr">Write with it</button><button class="btn" id="ovhw">Handwriting</button></div>
  </div></div>`;
  $('#ov').onclick = e => { if (e.target.id === 'ov') closeSheet(); };
  $('#closeov').onclick = closeSheet;
  $('#ovbm').onclick = () => { bmToggle(id); openWord(id); };
  $('#ovst').onclick = () => { closeSheet(); startSession([id], w.w); };
  $('#ovwr').onclick = () => { closeSheet(); writeCtx = { ids: [id] }; go('write'); };
  $('#ovhw').onclick = () => { closeSheet(); handCtx = { id }; go('hand'); };
}
function closeSheet() { const l = $('#layer'); if (l) l.innerHTML = ''; }
