/* ===== Progress ===== */
VIEWS.progress = col => {
  const c = counts(); const now = Date.now();
  const fc = Array.from({ length: 7 }, (_, i) => { const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() + i); const e = +s + DAY; return { d: s, n: W.filter(w => { const k = S.srs[w.id]; return k && (i === 0 ? k.due < e : k.due >= +s && k.due < e); }).length }; });
  const hist = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 29 + i); const h = S.hist[todayKey(+d)] || {}; return { d, n: (h.rev || 0) + (h.new || 0), w: h.w || 0 }; });
  const maxF = Math.max(1, ...fc.map(x => x.n)), maxH = Math.max(1, ...hist.map(x => x.n));
  const topics = Object.entries(D.TOPICS).map(([k, l]) => { const ws = W.filter(w => w.t === k); const m = ws.filter(w => statusOf(w.id) === 'mastered').length, s = ws.filter(w => S.srs[w.id]).length; return { k, l, n: ws.length, m, s }; }).sort((a, b) => b.n - a.n);
  const wl = S.wlog; const firstTries = wl.filter(x => x.tryN === 1); const goodFirst = firstTries.filter(x => /correct|exact|self_good/.test(x.v)).length;
  const byType = Object.keys(WTYPES).filter(k => k !== 'mixed').map(k => ({ k, n: wl.filter(x => x.t === k).length, lv: S.wlevel[k] }));
  col.innerHTML = `<div class="topbar"><h1>Progress</h1><span class="small muted" id="syncstate2">${syncState === 'synced' ? 'Saved to your account' : 'Saved in this browser'}</span></div>
  <section class="tiles">
    ${[['New', c.nw, 'not started yet', ''], ['Learning', c.learning, 'in short steps', '--hard'], ['Due today', c.due, 'reviews waiting', '--easy'], ['Mastered', c.mastered, 'interval 3 weeks or more', '--good']].map(([l, n, s, col]) => `<div class="panel tight"><div class="label">${l}</div><div style="font-size:1.9rem;font-weight:600;${col ? `color:var(${col})` : ''}" class="tabnum">${n}</div><div class="small muted">${s}</div></div>`).join('')}
  </section>
  <section class="panel stack"><h2>Reviews over the next 7 days</h2>
    <div class="bars">${fc.map(x => `<div class="${x.n ? '' : 'zero'}" style="height:${x.n / maxF * 100}%" title="${x.n} cards"></div>`).join('')}</div>
    <div class="barlabels">${fc.map((x, i) => `<span>${i === 0 ? 'Today' : x.d.toLocaleDateString(undefined, { weekday: 'short' })}<br><b class="tabnum">${x.n}</b></span>`).join('')}</div></section>
  <section class="panel stack"><h2>Cards studied, last 30 days</h2>
    <div class="bars" style="height:80px">${hist.map(x => `<div class="${x.n ? '' : 'zero'}" style="height:${x.n / maxH * 100}%" title="${x.d.toLocaleDateString()}: ${x.n} cards, ${x.w} writing"></div>`).join('')}</div>
    <div class="barlabels"><span style="text-align:left">${hist[0].d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span style="text-align:right">Today</span></div>
    <div class="small muted">${hist.reduce((a, x) => a + x.n, 0)} cards and ${hist.reduce((a, x) => a + x.w, 0)} writing answers in 30 days · ${streak()}-day streak</div></section>
  <section class="panel stack"><h2>By topic</h2><div style="overflow-x:auto"><table class="t"><thead><tr><th>Topic</th><th>Words</th><th>Started</th><th>Mastered</th><th style="width:34%"></th></tr></thead><tbody>
    ${topics.map(t => `<tr><td>${esc(t.l)}</td><td class="tabnum">${t.n}</td><td class="tabnum">${t.s}</td><td class="tabnum">${t.m}</td><td><div class="meter"><i style="width:${t.m / t.n * 100}%;background:var(--good)"></i><i style="width:${(t.s - t.m) / t.n * 100}%;background:var(--easy);opacity:.55"></i></div></td></tr>`).join('')}</tbody></table></div></section>
  <section class="panel stack"><h2>Writing</h2>
    <div class="small">${wl.length} answers saved · ${firstTries.length ? Math.round(goodFirst / firstTries.length * 100) + '% right first time' : 'no answers yet'} · ${wsDue().length} writing reviews due</div>
    <div style="overflow-x:auto"><table class="t"><thead><tr><th>Exercise</th><th>Answers</th><th>Hint level</th></tr></thead><tbody>${byType.map(x => `<tr><td>${WTYPES[x.k]}</td><td class="tabnum">${x.n}</td><td>${LEVELNAME[x.lv]}</td></tr>`).join('')}</tbody></table></div>
    <div class="small muted">${Object.keys(S.hand).length} words practised in handwriting.</div></section>
  <section class="panel stack"><h2>Bookmarks (${Object.keys(S.bm).length})</h2>
    <div class="row">${Object.keys(S.bm).map(Number).map(i => `<button class="chip" data-w="${i}" style="cursor:pointer"><span class="han">${esc(W[i].w)}</span> ${pyHTML(W[i].py, 'inl')}</button>`).join('') || '<span class="small muted">Press B on any card to bookmark it.</span>'}</div></section>
  <section class="panel stack"><h2>Backup</h2>
    <div class="small muted">Your progress is saved automatically. You can also copy a backup to move it somewhere else.</div>
    <div class="row"><button class="btn sm" id="bcopy">Copy backup</button><button class="btn sm" id="bimp">Restore from backup…</button><button class="btn sm ghost" id="breset">Reset all progress…</button></div><div id="bbox"></div></section>`;
  $$('[data-w]', col).forEach(b => b.onclick = e => { if (revealPy(e)) return; openWord(+b.dataset.w); });
  $('#bcopy').onclick = async () => { const t = JSON.stringify(S); try { await navigator.clipboard.writeText(t); toast('Backup copied'); } catch (e) { $('#bbox').innerHTML = `<textarea readonly id="bt">${esc(t)}</textarea>`; $('#bt').select(); toast('Select and copy the text'); } };
  $('#bimp').onclick = () => { $('#bbox').innerHTML = `<textarea id="bt" placeholder="Paste a backup here"></textarea><div class="row"><button class="btn sm primary" id="bdo">Restore</button></div>`; $('#bdo').onclick = () => { try { const s = JSON.parse($('#bt').value); if (s.v !== 1 || !s.srs) throw 0; S = Object.assign(fresh(), s, { set: Object.assign(fresh().set, s.set) }); save(); toast('Progress restored'); route(); } catch (e) { toast('That doesn’t look like a backup from this app'); } }; };
  $('#breset').onclick = () => { $('#bbox').innerHTML = `<div class="banner">This deletes all reviews, writing answers and bookmarks. <button class="btn sm" id="bconf">Yes, reset everything</button></div>`; $('#bconf').onclick = () => { const set = S.set; S = fresh(); S.set = set; save(); toast('Progress reset'); route(); }; };
};

/* ===== Settings & sources ===== */
VIEWS.settings = col => {
  const vs = TTS.zh;
  col.innerHTML = `<div class="topbar"><h1>Settings &amp; sources</h1></div>
  <section class="panel stack"><h2>Study</h2>
    <label class="row"><span style="min-width:170px">New words per day</span><input type="number" id="snew" min="0" max="100" value="${S.set.newPerDay}" style="width:100px"></label>
    <label class="row"><span style="min-width:170px">Order of new words</span><select id="sord"><option value="core" ${S.set.order === 'core' ? 'selected' : ''}>Most frequent first (recommended)</option><option value="list" ${S.set.order === 'list' ? 'selected' : ''}>Syllabus (alphabetical) order</option><option value="random" ${S.set.order === 'random' ? 'selected' : ''}>Random</option></select></label>
    <label class="row"><span style="min-width:170px">Focus new words on</span><select id="stop"><option value="">All topics</option>${Object.entries(D.TOPICS).map(([k, v]) => `<option value="${k}" ${S.set.topic === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
    <label class="row"><span style="min-width:170px">Pinyin</span><select id="spy"><option value="hidden" ${S.set.pinyin === 'hidden' ? 'selected' : ''}>Hidden until tapped (or press P)</option><option value="shown" ${S.set.pinyin === 'shown' ? 'selected' : ''}>Always visible</option></select></label>
    <label class="row"><input type="checkbox" id="sai" ${S.set.ai ? 'checked' : ''}> Use AI feedback for open-ended writing</label></section>
  <section class="panel stack"><h2>Audio</h2>
    <div class="small muted">Pronunciation uses your browser’s text-to-speech with a Mandarin (zh-CN) voice, so quality depends on your device. Sentence pinyin is generated automatically and may occasionally misread a multi-reading character. Word pinyin follows the dictionary.</div>
    ${vs.length ? `<label class="row"><span style="min-width:170px">Voice</span><select id="svoice">${vs.map(v => `<option value="${esc(v.voiceURI)}" ${chosenVoice() === v ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select><button class="btn sm" data-say="我们周末去看展览吧。">Test</button></label>` : voiceBanner()}
    <label class="row"><span style="min-width:170px">Normal speed</span><input type="range" id="srn" min="0.6" max="1.2" step="0.05" value="${S.set.rateN}" style="width:180px"><span class="tabnum small">${S.set.rateN}×</span></label>
    <label class="row"><span style="min-width:170px">Slow speed</span><input type="range" id="srs" min="0.3" max="0.8" step="0.05" value="${S.set.rateS}" style="width:180px"><span class="tabnum small">${S.set.rateS}×</span></label></section>
  <section class="panel stack small"><h2>About the vocabulary</h2>
    <p><b>Syllabus.</b> HSK 3.0, using the exam syllabus that CTI/CLEC released in November 2025. The first official HSK 3.0 exams (Levels 1–6) are scheduled for 13 December 2026. This app covers all <b>${W.length}</b> words that are new at Level 5. The cumulative total for Levels 1–5 is about 3,500. Levels 1–4 (${D.earlier.length} words) appear in the Word list as a reference that isn’t scheduled for review.</p>
    <p><b>Source.</b> The word list and part-of-speech data come from the open <a href="https://github.com/drkameleon/complete-hsk-vocabulary" target="_blank" rel="noopener">complete-hsk-vocabulary</a> dataset (its “newest” HSK 3.0 lists, which follow the 2025 syllabus). Its definitions come from CC-CEDICT. The English meanings, the three example sentences or dialogues for each word, register labels, topics, combinations, usage notes and Taiwan notes in this app were written for it. Learning difficulty comes from the dataset’s word-frequency ranking (Core = most frequent third).</p>
    <p><b>Beyond the list.</b> The Conversation section, its idioms and set phrases, and the combine-sentence and short-writing exercises are additions to the list and are labelled as such. Example sentences sometimes use words from other levels so they read naturally.</p>
    <p><b>Stroke order</b> comes from <a href="https://github.com/chanind/hanzi-writer-data" target="_blank" rel="noopener">hanzi-writer-data</a> (Arphic Public License, based on Make Me a Hanzi). The animations use Hanzi Writer.</p>
    <p><b>AI feedback.</b> Writing feedback and deeper quiz explanations come from Claude, through this page’s built-in access when you open it in Claude. You don’t need an API key. The first time, Claude asks for permission. Without it, open-ended answers use self-check against a suggested answer, and exact-match checks are labelled as exact-match.</p></section>
  <section class="panel small"><h2 style="margin-bottom:8px">Keyboard shortcuts</h2>${helpTable()}</section>`;
  const bind = (id, fn) => { const el = $('#' + id); if (el) el.onchange = e => { fn(e.target); save(); route(); }; };
  bind('snew', t => S.set.newPerDay = Math.max(0, Math.min(100, +t.value || 0)));
  bind('sord', t => S.set.order = t.value); bind('stop', t => S.set.topic = t.value); bind('spy', t => S.set.pinyin = t.value);
  bind('sai', t => S.set.ai = t.checked); bind('svoice', t => S.set.voice = t.value);
  bind('srn', t => S.set.rateN = +t.value); bind('srs', t => S.set.rateS = +t.value);
};
function helpTable() {
  return `<table class="t help"><tbody>
  <tr><td><kbd>g</kbd> then <kbd>t</kbd> <kbd>c</kbd> <kbd>l</kbd> <kbd>q</kbd> <kbd>w</kbd> <kbd>h</kbd> <kbd>e</kbd> <kbd>p</kbd> <kbd>s</kbd></td><td>Go to Today, Word list, Listening, Quizzes, Writing, Handwriting, Conversation, Progress, Settings</td></tr>
  <tr><td><kbd>Enter</kbd></td><td>Start review on Today · next question</td></tr>
  <tr><td><kbd>Space</kbd></td><td>Show answer on a flashcard</td></tr>
  <tr><td><kbd>1</kbd>–<kbd>4</kbd></td><td>Again / Difficult / Good / Easy · choose a quiz option</td></tr>
  <tr><td><kbd>P</kbd></td><td>Show pinyin on the current screen</td></tr>
  <tr><td><kbd>A</kbd> · <kbd>S</kbd> · <kbd>Shift</kbd>+<kbd>S</kbd></td><td>Play word · play the first example · play it slowly</td></tr>
  <tr><td><kbd>R</kbd> · <kbd>Shift</kbd>+<kbd>R</kbd></td><td>Replay listening audio · slowly</td></tr>
  <tr><td><kbd>B</kbd></td><td>Bookmark the current card</td></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>Enter</kbd></td><td>Submit a writing answer</td></tr>
  <tr><td><kbd>Esc</kbd></td><td>Close a word card</td></tr></tbody></table>`;
}

/* ===== global events ===== */
document.addEventListener('click', e => {
  const say = e.target.closest('[data-say]'); if (say) { speak(say.dataset.say, !!say.dataset.slow); return; }
  const py = e.target.closest('.py.hid'); if (py) { py.classList.remove('hid'); return; }
  const wbtn = e.target.closest('.li[data-w]'); if (wbtn) { openWord(+wbtn.dataset.w); return; }
});
document.addEventListener('keydown', e => {
  if (e.target.matches('.py.hid') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.target.classList.remove('hid'); }
});
let gPending = 0;
document.addEventListener('keydown', e => {
  const typing = e.target.matches('input,textarea,select') || e.target.isContentEditable;
  if (e.key === 'Escape') { if ($('#ov')) { closeSheet(); e.preventDefault(); } return; }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (gPending && Date.now() - gPending < 1200) { gPending = 0; const n = NAV.find(x => x[3] === k.toLowerCase()); if (n) { e.preventDefault(); go(n[0]); } return; }
  if (k === 'g') { gPending = Date.now(); return; }
  if (k === '?') { $('#layer').innerHTML = `<div class="overlay" id="ov"><div class="sheet"><div class="row" style="justify-content:space-between"><h2>Keyboard shortcuts</h2><button class="btn ghost sm" id="closeov">Close</button></div>${helpTable()}</div></div>`; $('#closeov').onclick = closeSheet; $('#ov').onclick = ev => { if (ev.target.id === 'ov') closeSheet(); }; return; }
  if (k === 'p' || k === 'P') { const scope = $('#ov') || $('#main'); $$('.py.hid', scope).forEach(p => p.classList.remove('hid')); return; }
  if ($('#ov')) { const w = $('#ov .bigword'); if (k === 'a' && w) speak(w.textContent); return; }
  if (view === 'today' && k === 'Enter') { const s = $('#start'); if (s && !s.disabled) { e.preventDefault(); s.click(); } return; }
  if (view === 'study' && session && session.ids.length) {
    const w = W[session.ids[0]];
    if (k === ' ' || k === 'Enter') { e.preventDefault(); if (!session.shown) { session.shown = true; renderStudy(); } return; }
    if (/^[1-4]$/.test(k) && session.shown) { e.preventDefault(); rate(+k); return; }
    if (k === 'a') { speak(w.w); return; }
    if (k === 's') { speak(w.ex[0].z.join('//')); return; }
    if (k === 'S') { speak(w.ex[0].z.join('//'), true); return; }
    if (k === 'b' || k === 'B') { bmToggle(w.id); renderStudy(); return; }
  }
  if (view === 'listen' && LQ) {
    if (k === 'r') { speak(LQ.audio); return; } if (k === 'R') { speak(LQ.audio, true); return; }
    if (/^[1-4]$/.test(k)) { const b = $$('[data-o]')[+k - 1]; if (b && !b.disabled) b.click(); return; }
    if (k === 'Enter') { const n = $('#lnext'); if (n) { e.preventDefault(); n.click(); } return; }
  }
  if (view === 'quiz' && QZ) {
    if (/^[1-4]$/.test(k)) { const b = $$('[data-q]')[+k - 1]; if (b && !b.disabled) b.click(); return; }
    if (k === 'Enter') { const n = $('#qnext'); if (n) { e.preventDefault(); n.click(); } return; }
  }
});
window.addEventListener('hashchange', route);
function onPyLib() { if (view === 'write') { if (wTab === 'log') route(); else if (EX) renderEx(); } }
(function boot() {
  shell(); loadPyLib();
  if (!W.length) { $('#main').innerHTML = '<div class="col"><div class="banner">The vocabulary file didn’t load. Reload the page to try again.</div></div>'; return; }
  route();
})();
