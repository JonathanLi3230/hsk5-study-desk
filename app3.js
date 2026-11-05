/* ===== Listening and quizzes ===== */
function studiedPool(min = 40) {
  const seen = W.filter(w => S.srs[w.id]).sort((a, b) => (S.srs[b.id].last || 0) - (S.srs[a.id].last || 0));
  if (seen.length >= min) return seen;
  return [...seen, ...W.filter(w => !S.srs[w.id] && w.d === 1).slice(0, min - seen.length + 40)];
}
function poolNote() { const n = W.filter(w => S.srs[w.id]).length; return n >= 40 ? `Drawn from the ${n} words you’ve studied, most recent first.` : `You’ve studied ${n} words so far, so this also includes core (high-frequency) words you haven’t met yet.`; }
const wordOpt = o => `<span class="han">${esc(o.w)}</span> ${pyHTML(o.py)}`;
function transcriptHTML(x, w) { return x.z.map((s, i) => `<div class="zhl q-zh">${hlSentence(s, w.w)}</div><div>${pyHTML(x.p[i])}</div><div class="muted">${esc(x.e[i] || '')}</div>`).join(''); }

/* ---------- Listening ---------- */
let LQ = null; let listenMode = 'word';
VIEWS.listen = col => {
  col.innerHTML = `${voiceBanner()}
  <div class="topbar"><h1>Listening</h1><span class="chip" title="Audio is produced by your device">Browser text-to-speech</span></div>
  <div class="row"><div class="seg" role="group" aria-label="Exercise type">
    ${[['word', 'Words'], ['sent', 'Sentences & dialogues'], ['dict', 'Dictation (typing)']].map(([k, l]) => `<button type="button" data-lm="${k}" aria-pressed="${listenMode === k}">${l}</button>`).join('')}</div>
    <span class="small muted">${poolNote()}</span></div>
  <div id="lq"></div>
  <p class="small muted">Audio comes from your device’s Mandarin text-to-speech voice. Tones are generally reliable, but synthetic voices can misread a few multi-reading characters. Transcripts stay hidden until you answer.</p>`;
  $$('[data-lm]').forEach(b => b.onclick = () => { listenMode = b.dataset.lm; LQ = null; route(); });
  if (!LQ || LQ.mode !== listenMode || LQ.i >= LQ.items.length && LQ.finished) newListen();
  renderListen();
};
function newListen() {
  const pool = shuffle(studiedPool().slice(0, 120)).slice(0, 10);
  LQ = { mode: listenMode, i: 0, score: 0, items: pool.map(w => {
    const x = pickX(w);
    if (listenMode === 'word') { const ds = distractors(w, 3, { field: 'm' }); return { w, x, kind: 'word', opts: shuffle([w, ...ds]), ans: null }; }
    if (listenMode === 'sent') {
      const ask = x.z.length > 1 || Math.random() < 0.5 ? 'trans' : 'which';
      if (ask === 'which') { const ds = distractors(w, 3, { sameChar: true }); return { w, x, kind: 'which', opts: shuffle([w, ...ds]), ans: null }; }
      const ds = distractors(w, 3); const labels = { [w.id]: x.e.join(' / ') }; ds.forEach(o => labels[o.id] = pick(o.ex).e.join(' / '));
      return { w, x, kind: 'trans', opts: shuffle([w, ...ds]), labels, ans: null };
    }
    const sentence = Math.random() < 0.5; return { w, x, kind: 'dict', target: sentence ? lastLine(x) : w.w, sentence, typeBy: 'han', ans: null };
  }) };
}
function renderListen() {
  const box = $('#lq'); if (!box) return;
  if (LQ.i >= LQ.items.length) {
    LQ.finished = true;
    box.innerHTML = `<section class="panel stack"><h2>Round complete · ${LQ.score}/${LQ.items.length}</h2><p class="muted small">Words you missed are added to your “struggled with” list and come up more in writing practice.</p><div class="row"><button class="btn primary" id="again">New round</button></div></section>`;
    $('#again').onclick = () => { newListen(); renderListen(); }; return;
  }
  const it = LQ.items[LQ.i]; const w = it.w; const x = it.x; const answered = it.ans !== null;
  const audioText = it.kind === 'word' ? w.w : it.kind === 'dict' ? it.target : x.z.join('//');
  const prompt = { word: 'What does this word mean?', which: 'Which HSK 5 word did you hear in the sentence?', trans: x.z.length > 1 ? 'Which translation matches the dialogue?' : 'Which translation matches what you heard?', dict: it.sentence ? 'Type the sentence you hear.' : 'Type the word you hear.' }[it.kind];
  let body = '';
  if (it.kind === 'dict') {
    body = `<div class="row"><div class="seg" role="group" aria-label="Answer with"><button type="button" data-tb="han" aria-pressed="${it.typeBy === 'han'}">Characters</button><button type="button" data-tb="py" aria-pressed="${it.typeBy === 'py'}">Pinyin</button></div><span class="small muted">${it.typeBy === 'py' ? 'Tone marks or numbers (an1wei4) are optional, but are checked if you include them.' : 'Punctuation and spaces are ignored.'}</span></div>
      <input type="text" id="dictin" class="${it.typeBy === 'han' ? 'zhin' : ''}" autocomplete="off" ${answered ? 'disabled' : ''} value="${esc(it.ans?.text || '')}" placeholder="${it.typeBy === 'han' ? '输入汉字' : 'type pinyin'}" aria-label="Your answer">
      ${answered ? '' : '<div class="row"><button class="btn primary" id="dictgo">Check</button><button class="btn ghost" id="giveup">Show transcript</button></div>'}`;
  } else {
    const label = o => it.kind === 'word' ? esc(o.m) : it.kind === 'which' ? wordOpt(o) : esc(it.labels[o.id]);
    body = `<div class="opts">${it.opts.map((o, i) => `<button class="opt ${answered ? (o.id === w.id ? 'right' : it.ans === o.id ? 'wrong' : '') : ''}" data-o="${o.id}" ${answered ? 'disabled' : ''}><span class="n">${i + 1}</span><span>${label(o)}</span></button>`).join('')}</div>`;
  }
  let reveal = '';
  if (answered) {
    const ok = it.kind === 'dict' ? it.ans.ok : it.ok;
    const trans = (it.kind === 'word' || (it.kind === 'dict' && !it.sentence))
      ? `<div class="row"><span class="han" style="font-size:1.8rem">${esc(w.w)}</span>${pyHTML(w.py)}<span>${esc(w.m)}</span></div>`
      : transcriptHTML(x, w);
    let extra = '';
    if (it.kind === 'dict') extra = ok ? '' : `<div class="small">You typed: <span class="zh">${esc(it.ans.text || '—')}</span> ${it.typeBy === 'han' ? pyHTML(pyOf(it.ans.text || ''), 'inl') : ''}${it.ans.near ? ' — the syllables are right; check the tones.' : ''}</div>`;
    if (it.kind === 'which' && !ok) { const o = W[it.ans]; extra = `<div class="small">${wordOpt(o)} means “${esc(o.m)}” and wasn’t in the sentence. The sentence uses ${wordOpt(w)}.</div>`; }
    if (it.kind === 'word' && !ok) { const o = W[it.ans]; extra = `<div class="small">“${esc(o.m)}” is ${wordOpt(o)}.</div>`; }
    reveal = `<div class="ex stack"><div class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct' : 'Not quite'}${it.kind === 'dict' ? ' <span class="chip">exact-match check</span>' : ''}</div>${extra}<span class="label">Transcript</span>${trans}</div>
      <div class="row"><button class="btn primary" id="lnext">Next <span class="k kbd-hint">Enter</span></button><button class="btn ghost sm" id="lopen">Open word card</button></div>`;
  }
  box.innerHTML = `<section class="card">
    <div class="head"><span class="chip tabnum">${LQ.i + 1} / ${LQ.items.length}</span><span class="sp"></span><span class="chip">${LQ.score} correct</span></div>
    <div class="stack cent" style="align-items:center;gap:12px;padding:8px 0">
      <div class="row" style="justify-content:center">${audioBtns(audioText, 'Play')}</div>
      <div class="small muted">${canSpeak() ? 'Press <kbd>R</kbd> to replay, <kbd>Shift</kbd>+<kbd>R</kbd> slowly' : 'No Mandarin voice on this device — read the transcript after answering, or set up a voice (see the note above).'}</div>
      <h2>${prompt}</h2></div>
    ${body}${reveal}</section>`;
  LQ.audio = audioText;
  if (!answered && canSpeak() && !it.played) { it.played = true; setTimeout(() => speak(audioText, false), 250); }
  $$('[data-o]', box).forEach(b => b.onclick = e => { if (revealPy(e)) return; answerListen(+b.dataset.o); });
  $$('[data-tb]', box).forEach(b => b.onclick = () => { it.typeBy = b.dataset.tb; renderListen(); });
  const dg = $('#dictgo'); if (dg) { dg.onclick = checkDict; $('#dictin').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); checkDict(); } }; $('#dictin').focus(); }
  const gu = $('#giveup'); if (gu) gu.onclick = () => { it.ans = { ok: false, text: '' }; S.weak[w.id] = (S.weak[w.id] || 0) + 1; save(); renderListen(); };
  const ln = $('#lnext'); if (ln) ln.onclick = () => { LQ.i++; renderListen(); };
  const lo = $('#lopen'); if (lo) lo.onclick = () => openWord(w.id);
}
function answerListen(oid) {
  const it = LQ.items[LQ.i]; if (it.ans !== null) return;
  it.ans = oid; it.ok = oid === it.w.id;
  if (it.ok) LQ.score++; else S.weak[it.w.id] = (S.weak[it.w.id] || 0) + 1;
  logHist('l'); save(); renderListen();
}
function checkDict() {
  const it = LQ.items[LQ.i]; const v = $('#dictin').value.trim(); if (!v) return;
  let ok = false, near = false;
  if (it.typeBy === 'han') ok = zhOnly(v) === zhOnly(it.target);
  else {
    const tgt = it.sentence ? lastPy(it.x) : it.w.py;
    const hasTones = /[1-5āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(v);
    const plainOk = plainPy(numToMarks(v)) === plainPy(tgt);
    ok = hasTones ? tonedPy(v) === tonedPy(tgt) : plainOk; near = hasTones && !ok && plainOk;
  }
  it.ans = { ok, text: v, near }; if (ok) LQ.score++; else S.weak[it.w.id] = (S.weak[it.w.id] || 0) + 1;
  logHist('l'); save(); renderListen();
}

/* ---------- Quizzes ---------- */
let QZ = null; let quizType = 'mixed'; let quizTyping = false;
const QTYPES = { mixed: 'Mixed', meaning: 'Meaning', reverse: 'English → Chinese', cloze: 'Sentence completion', context: 'Right word in context' };
VIEWS.quiz = col => {
  col.innerHTML = `<div class="topbar"><h1>Quizzes</h1></div>
  <div class="row"><div class="seg" role="group" aria-label="Quiz type" style="flex-wrap:wrap">${Object.entries(QTYPES).map(([k, l]) => `<button type="button" data-qt="${k}" aria-pressed="${quizType === k}">${l}</button>`).join('')}</div>
  <label class="row small"><input type="checkbox" id="qtyping" ${quizTyping ? 'checked' : ''}> Type answers for completion questions</label></div>
  <div class="small muted">${poolNote()}</div><div id="qz"></div>`;
  $$('[data-qt]').forEach(b => b.onclick = () => { quizType = b.dataset.qt; QZ = null; route(); });
  $('#qtyping').onchange = e => { quizTyping = e.target.checked; QZ = null; route(); };
  if (!QZ || QZ.done) newQuiz();
  renderQuiz();
};
function newQuiz() {
  const pool = shuffle(studiedPool().slice(0, 150)).slice(0, 10);
  QZ = { i: 0, score: 0, done: false, items: pool.map((w, k) => {
    let t = quizType === 'mixed' ? ['meaning', 'reverse', 'cloze', 'context'][k % 4] : quizType;
    if ((t === 'cloze' || t === 'context') && !w.ex.some(x => x.bp)) t = 'reverse';
    const typed = quizTyping && (t === 'cloze' || t === 'context');
    const opts = t === 'meaning' ? shuffle([w, ...distractors(w, 3, { field: 'm' })]) : shuffle([w, ...distractors(w, 3, { sameChar: t === 'context' })]);
    return { w, x: pickX(w, { cloze: t === 'cloze' || t === 'context' }), t, typed, opts, ans: null };
  }) };
}
function clozeText(x, w) { const s = lastLine(x); return s.includes(w.w) ? esc(s).split(esc(w.w)).join('<span class="blank">？</span>') : esc(s) + ' <span class="blank">？</span>'; }
function renderQuiz() {
  const box = $('#qz'); if (!box) return;
  if (QZ.i >= QZ.items.length) {
    QZ.done = true; const miss = QZ.items.filter(x => !x.ok);
    box.innerHTML = `<section class="panel stack"><h2>Score · ${QZ.score}/${QZ.items.length}</h2>${miss.length ? `<div class="small">Review these:</div><div class="row">${miss.map(x => `<button class="chip" data-w="${x.w.id}" style="cursor:pointer"><span class="han">${esc(x.w.w)}</span> ${pyHTML(x.w.py, 'inl')} ${esc(x.w.m.split(';')[0])}</button>`).join('')}</div>` : '<p>Full marks.</p>'}
      <div class="row"><button class="btn primary" id="qagain">New quiz</button>${miss.length ? '<button class="btn" id="qstudy">Study missed words</button>' : ''}</div></section>`;
    $('#qagain').onclick = () => { newQuiz(); renderQuiz(); };
    const qs = $('#qstudy'); if (qs) qs.onclick = () => startSession(miss.map(x => x.w.id), 'Missed in quiz');
    $$('[data-w]', box).forEach(b => b.onclick = e => { if (revealPy(e)) return; openWord(+b.dataset.w); });
    return;
  }
  const it = QZ.items[QZ.i]; const w = it.w; const x = it.x; const answered = it.ans !== null;
  let q = '';
  if (it.t === 'meaning') q = `<div class="label">What does this mean?</div><div class="bigword" style="font-size:3rem">${esc(w.w)}</div><div class="cent">${pyHTML(w.py)}</div>`;
  if (it.t === 'reverse') q = `<div class="label">Which word means…</div><h2 style="font-size:1.3rem">“${esc(w.m)}”</h2>`;
  if (it.t === 'cloze') q = `<div class="label">Complete the sentence</div><div class="q-zh">${clozeText(x, w)}</div><div>${pyHTML(x.bp)}</div><div class="muted small">${esc(lastEn(x))}</div>`;
  if (it.t === 'context') q = `<div class="label">Choose the word that fits — the options look or mean alike</div><div class="q-zh">${clozeText(x, w)}</div><div>${pyHTML(x.bp)}</div>`;
  let body;
  if (it.typed) {
    body = `<input type="text" id="qin" class="zhin" placeholder="Type the missing word in characters or pinyin" ${answered ? 'disabled' : ''} value="${esc(it.ans?.text || '')}" aria-label="Your answer" autocomplete="off">${answered ? '' : '<div class="row"><button class="btn primary" id="qgo">Check</button><button class="btn ghost" id="qskip">Show answer</button></div>'}`;
  } else {
    const lab = o => it.t === 'meaning' ? esc(o.m) : wordOpt(o);
    body = `<div class="opts">${it.opts.map((o, i) => `<button class="opt ${answered ? (o.id === w.id ? 'right' : it.ans === o.id ? 'wrong' : '') : ''}" data-q="${o.id}" ${answered ? 'disabled' : ''}><span class="n">${i + 1}</span><span>${lab(o)}</span></button>`).join('')}</div>`;
  }
  box.innerHTML = `<section class="card"><div class="head"><span class="chip tabnum">${QZ.i + 1} / ${QZ.items.length}</span><span class="chip">${QTYPES[it.t]}</span><span class="sp"></span><span class="chip">${QZ.score} correct</span></div>
    <div class="stack" style="gap:10px">${q}</div>${body}${answered ? explainQuiz(it) : ''}</section>`;
  $$('[data-q]', box).forEach(b => b.onclick = e => { if (revealPy(e)) return; answerQuiz(+b.dataset.q); });
  const qg = $('#qgo'); if (qg) { qg.onclick = checkTypedQuiz; $('#qin').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); checkTypedQuiz(); } }; $('#qin').focus(); }
  const qsk = $('#qskip'); if (qsk) qsk.onclick = () => { it.ans = { text: '' }; it.ok = false; S.weak[w.id] = (S.weak[w.id] || 0) + 1; save(); renderQuiz(); };
  const qn = $('#qnext'); if (qn) qn.onclick = () => { QZ.i++; renderQuiz(); };
  const ai = $('#qai'); if (ai) ai.onclick = () => aiExplainQuiz(it);
  $$('[data-w]', box).forEach(b => b.onclick = e => { if (revealPy(e)) return; openWord(+b.dataset.w); });
}
function answerQuiz(oid) { const it = QZ.items[QZ.i]; if (it.ans !== null) return; it.ans = oid; it.ok = oid === it.w.id; if (it.ok) QZ.score++; else S.weak[it.w.id] = (S.weak[it.w.id] || 0) + 1; logHist('q'); save(); renderQuiz(); }
function checkTypedQuiz() {
  const it = QZ.items[QZ.i]; const v = $('#qin').value.trim(); if (!v) return;
  const ok = /[一-鿿]/.test(v) ? zhOnly(v) === it.w.w : plainPy(numToMarks(v)) === plainPy(it.w.py) && (!/[1-5āáǎàēéěèīíǐìōóǒòūúǔù]/.test(v) || tonedPy(v) === tonedPy(it.w.py));
  it.ans = { text: v }; it.ok = ok; if (ok) QZ.score++; else S.weak[it.w.id] = (S.weak[it.w.id] || 0) + 1; logHist('q'); save(); renderQuiz();
}
function explainQuiz(it) {
  const w = it.w; const x = it.x; const ok = it.ok;
  const why = (it.typed ? [] : it.opts.filter(o => o.id !== w.id)).map(o => {
    const reason = it.t === 'meaning' ? `belongs to ${wordOpt(o)}, not ${esc(w.w)}.` :
      `means “${esc(o.m)}”. ${o.note && [...o.w].some(c => w.w.includes(c)) ? noteHTML(o, { noTW: true }) : 'That meaning doesn’t match what this sentence needs.'}`;
    return `<span>${it.t === 'meaning' ? '“' + esc(o.m.split(';')[0]) + '”' : wordOpt(o)}</span><span>${reason}</span>`;
  }).join('');
  const typedNote = it.typed && !ok && it.ans.text ? `<div class="small">You typed <span class="zh">${esc(it.ans.text)}</span> ${pyHTML(pyOf(it.ans.text), 'inl')}. This is an exact-match check: a synonym can be valid, but the sentence was written around <b>${esc(w.w)}</b>.</div>` : '';
  return `<div class="ex expl">
    <div class="verdict ${ok ? 'ok' : 'no'}">${ok ? 'Correct' : 'Not quite'} — <span class="han">${esc(w.w)}</span> ${pyHTML(w.py, 'inl')} · ${esc(w.m)}</div>
    ${it.t === 'cloze' || it.t === 'context' ? `<div class="zhl q-zh" style="font-size:1.1rem">${hlSentence(lastLine(x), w.w)}</div><div>${pyHTML(lastPy(x))}</div><div class="muted small">${esc(lastEn(x))}</div>` : ''}
    ${noteHTML(w, { noTW: true })}
    ${typedNote}
    ${why ? `<div class="label">Why the others don’t fit</div><div class="why">${why}</div>` : ''}
    <div id="qaiout"></div>
    <div class="row"><button class="btn primary" id="qnext">Next <span class="k kbd-hint">Enter</span></button>${S.set.ai && !it.typed ? '<button class="btn ghost sm" id="qai">Explain in more depth (AI)</button>' : ''}<button class="btn ghost sm" data-w="${w.id}">Word card</button></div></div>`;
}
async function aiExplainQuiz(it) {
  const out = $('#qaiout'); const sample = await getSample(); if (!sample) { out.innerHTML = `<div class="small muted">${aiUnavailableMsg()}</div>`; return; }
  out.innerHTML = '<div class="small muted">Asking Claude…</div>';
  const w = it.w; const opts = it.opts.map(o => `${o.w} (${o.py}): ${o.m}`).join('\n');
  try {
    const r = await sample(`You are a concise Mandarin tutor for an intermediate (HSK 5) learner. Explain in English, in at most 120 words, why "${w.w}" is the best answer and why each other option doesn't fit. Mention register or collocation differences where relevant. Use Chinese characters for any words you cite.\n\nQuestion type: ${QTYPES[it.t]}\nSentence: ${lastLine(it.x)}\nCorrect: ${w.w} — ${w.m}\nOptions:\n${opts}`, { modelTier: 'quick', onText: ({ text }) => { out.innerHTML = `<div class="note small">${esc(text)}</div>`; } });
    await loadPyLib();
    out.innerHTML = `<div class="note small">${annZh(r.text)}<div class="muted" style="margin-top:4px">AI explanation · check anything surprising with the word card</div></div>`;
  } catch (e) { out.innerHTML = `<div class="small muted">${aiErr(e)}</div>`; }
}
