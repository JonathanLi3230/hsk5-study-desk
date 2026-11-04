/* ===== Writing practice ===== */
let sampleP = null;
async function getSample() {
  if (!S.set.ai) return null;
  if (!window.claude || !window.claude.use) return null;
  if (!sampleP) sampleP = window.claude.use('sample');
  try { return await sampleP; } catch (e) { return null; }
}
function aiUnavailableMsg() { return S.set.ai ? 'AI feedback isn’t available in this view (for example, the page was opened outside Claude, or access wasn’t allowed). Compare your answer with the suggested one below.' : 'AI feedback is turned off in Settings.'; }
function aiErr(e) { const c = e && e.code; if (c === 'not_granted') { return 'AI access wasn’t allowed. You can allow it from this page’s Permissions menu, or keep using self-check.'; } if (c === 'rate_limited') return 'You’ve reached the AI usage limit for now. Self-check still works; try AI feedback again later.'; return 'AI feedback didn’t come through this time. Compare with the suggested answer, or try again.'; }

const WTYPES = { mixed: 'Mixed', translate: 'Translate', scramble: 'Reorder', combine: 'Combine sentences', colloc: 'Use a combination', complete: 'Complete', prompt: 'Short writing' };
const LEVELNAME = { 1: 'Guided', 2: 'Fewer hints', 3: 'No hints' };
let writeType = 'mixed', writeCtx = null, EX = null, wTab = 'practice';
VIEWS.write = col => {
  col.innerHTML = `<div class="topbar"><h1>Writing</h1><div class="seg" role="group" aria-label="Writing view"><button type="button" data-wt="practice" aria-pressed="${wTab === 'practice'}">Practice</button><button type="button" data-wt="log" aria-pressed="${wTab === 'log'}">My answers (${S.wlog.length})</button></div></div>
  <div id="wbody"></div>`;
  $$('[data-wt]').forEach(b => b.onclick = () => { wTab = b.dataset.wt; route(); });
  if (wTab === 'log') return renderWLog($('#wbody'));
  const pool = writingPool();
  $('#wbody').innerHTML = `
  <div class="row"><div class="seg" role="group" aria-label="Exercise type" style="flex-wrap:wrap">${Object.entries(WTYPES).map(([k, l]) => `<button type="button" data-wx="${k}" aria-pressed="${writeType === k}">${l}</button>`).join('')}</div></div>
  <div class="small muted">${writeCtx?.ids ? `Using ${writeCtx.ids.length} selected word${writeCtx.ids.length > 1 ? 's' : ''}. <a href="#write" id="clearctx">Use my usual queue</a>` : pool.fallback ? 'You haven’t studied any words yet, so these use core Level 5 words. Once you study cards, writing focuses on your recent and difficult words.' : `${pool.due ? pool.due + ' writing reviews are due. ' : ''}Words due for writing come first, then ones you’ve struggled with, then recently learned words.`}</div>
  <div id="ex"></div>
  <details class="panel tight small"><summary><b>How answers are checked</b></summary><div class="stack" style="margin-top:8px">
    <p><b>Translate, combine, use a combination and short writing</b> are open-ended. When AI feedback is available, Claude reviews your sentence for vocabulary, grammar, word order and naturalness, and accepts any valid wording. You don’t need an API key or any setup. The first time, Claude asks whether this page may use it. If AI isn’t available, you compare your answer with a suggested one and mark it yourself, and the app says so.</p>
    <p><b>Reorder and Complete</b> are first checked by exact match against the original sentence. If your answer is different but might still be valid, you can ask the AI to check it.</p>
    <p>Hints fade as you improve. After three good answers in a row of one type, the next level removes more hints. A clearly wrong answer brings hints back. You can also pick the level yourself.</p></div></details>`;
  $$('[data-wx]').forEach(b => b.onclick = () => { writeType = b.dataset.wx; EX = null; route(); });
  const cc = $('#clearctx'); if (cc) cc.onclick = e => { e.preventDefault(); writeCtx = null; EX = null; route(); };
  if (!EX || EX.type !== writeType && writeType !== 'mixed') EX = makeExercise();
  renderEx();
};
function nextWordId(type) {
  let ids = writeCtx?.ids?.length ? writeCtx.ids : writingPool().ids;
  if (writeCtx?.fromSession) { const today = W.filter(w => S.srs[w.id] && todayKey(S.srs[w.id].last) === todayKey()).map(w => w.id); if (today.length) ids = today; }
  if (type === 'colloc') ids = ids.filter(id => W[id].col.length);
  const recent = S.wlog.slice(-8).map(x => x.w);
  const cand = ids.filter(id => !recent.includes(id));
  const list = cand.length ? cand : ids;
  return list[Math.min(list.length - 1, Math.floor(Math.random() * Math.min(list.length, 6)))];
}
function makeExercise() {
  let type = writeType === 'mixed' ? pick(['translate', 'translate', 'scramble', 'complete', 'colloc', 'combine', 'prompt']) : writeType;
  const lv = S.wlevel[type] || 1;
  if (type === 'combine') { const recent = S.wlog.filter(x => x.t === 'combine').slice(-10).map(x => x.k); const pool = D.combine.map((c, i) => i).filter(i => !recent.includes('c' + i)); const i = pick(pool.length ? pool : D.combine.map((c, i) => i)); return { type, lv, key: 'c' + i, item: D.combine[i], tries: [] }; }
  if (type === 'prompt') { const recent = S.wlog.filter(x => x.t === 'prompt').slice(-12).map(x => x.k); const pool = D.prompts.filter(p => !recent.includes(p.id)); const p = pick(pool.length ? pool : D.prompts); return { type, lv, key: p.id, item: p, tries: [] }; }
  const id = nextWordId(type); const w = W[id];
  const ex = { type, lv, key: type + ':' + id, w, tries: [] };
  if (type === 'scramble') { let toks = w.tok.filter(t => !/^[，。！？、；：,.!?]$/.test(t)); ex.punct = (lastLine(w).match(/[。！？]$/) || ['。'])[0]; ex.answerToks = toks; let sh = shuffle(toks.map((t, i) => ({ t, i }))); for (let k = 0; k < 4 && sh.every((x, j) => x.i === j); k++) sh = shuffle(sh); ex.shuffled = sh; ex.built = []; }
  if (type === 'colloc') ex.coll = pick(w.col);
  return ex;
}
function hintsFor(ex) {
  const w = ex.w, lv = ex.lv; const h = [];
  const wordHint = full => full ? `<span class="han" style="font-size:1.2rem">${esc(w.w)}</span> ${pyHTML(w.py)} <span class="muted">· ${esc(w.m)}</span>` : `<span class="han" style="font-size:1.2rem">${esc(w.w)}</span>`;
  if (ex.type === 'translate') { if (lv === 1) { h.push('Use: ' + wordHint(true)); h.push('Useful combinations: ' + w.col.map(c => `<span class="zh">${esc(c.z)}</span>`).join(' · ')); } else if (lv === 2) h.push('Use: ' + wordHint(false)); else h.push('Use a Level 5 word that fits.'); }
  if (ex.type === 'scramble') { if (lv <= 2) h.push('Meaning: ' + esc(lastEn(w))); if (lv === 1) h.push(`Starts with: <span class="zh">${esc(ex.answerToks[0])}</span>`); }
  if (ex.type === 'complete') { if (lv <= 2) h.push('Meaning: ' + esc(lastEn(w))); if (lv === 1) h.push(`The missing word starts with <span class="han">${esc([...w.w][0])}</span> and is pronounced ${esc(w.py)}.`); }
  if (ex.type === 'colloc') { if (lv === 1) { h.push(`Meaning: ${esc(w.w)} = ${esc(w.m)}`); h.push(`Model: <span class="zh">${esc(lastLine(w))}</span>`); } else if (lv === 2) h.push(`Meaning: ${esc(w.w)} = ${esc(w.m)}`); }
  if (ex.type === 'combine') { if (lv <= 2) h.push(`Connector: <span class="zh">${esc(ex.item.conn)}</span>`); if (lv === 1) h.push('Meaning: ' + esc(ex.item.en)); }
  if (ex.type === 'prompt') { if (lv <= 2) h.push('Try to use: ' + ex.item.targets.map(t => `<span class="zh">${esc(t)}</span>`).join(' · ')); if (lv === 1) h.push(`Opening idea: <span class="zh">${esc(ex.item.model.split(/[，。]/)[0])}…</span>`); }
  return h;
}
function taskText(ex) {
  const w = ex.w;
  if (ex.type === 'translate') return { label: 'Translate into natural Chinese', body: `<div style="font-size:1.15rem">“${esc(lastEn(w))}”</div>` };
  if (ex.type === 'scramble') return { label: 'Put the words in order', body: '' };
  if (ex.type === 'complete') { const s = lastLine(w); return { label: 'Fill in the blank', body: `<div class="q-zh">${s.includes(w.w) ? esc(s).split(esc(w.w)).join('<span class="blank">？</span>') : esc(s)}</div>` }; }
  if (ex.type === 'colloc') return { label: 'Write your own sentence using this combination', body: `<div class="row"><span class="zhbig" style="font-size:1.5rem">${esc(ex.coll.z)}</span>${pyHTML(ex.coll.p)}</div>` };
  if (ex.type === 'combine') return { label: 'Combine into one natural sentence', body: `<ol class="zhbig" style="margin:0;padding-left:1.3em">${ex.item.parts.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` };
  return { label: { reply: 'Reply', opinion: 'Give your opinion', message: 'Write a short message', describe: 'Describe' }[ex.item.type] || 'Write', body: `<div style="font-size:1.05rem">${esc(ex.item.en)}</div><div class="zh muted">${esc(ex.item.zh)}</div>` };
}
function renderEx() {
  const box = $('#ex'); if (!box) return; const ex = EX; const t = taskText(ex); const hints = hintsFor(ex); const last = ex.tries[ex.tries.length - 1];
  const showModel = !!last;
  let input;
  if (ex.type === 'scramble') {
    input = `<div class="build" id="build" aria-label="Your sentence">${ex.built.length ? ex.built.map((k, j) => `<button class="tok" data-un="${j}">${esc(ex.shuffled[k].t)}</button>`).join('') : '<span class="small muted">Tap the words below in order. Tap a word here to remove it.</span>'}<span class="zh">${ex.built.length === ex.shuffled.length ? esc(ex.punct) : ''}</span></div>
    <div class="tokens">${ex.shuffled.map((x, k) => `<button class="tok ${ex.built.includes(k) ? 'used' : ''}" data-tk="${k}">${esc(x.t)}</button>`).join('')}</div>`;
  } else if (ex.type === 'complete') input = `<input type="text" id="win" class="zhin" placeholder="Type the missing word" autocomplete="off" aria-label="Your answer">`;
  else input = `<textarea id="win" placeholder="用中文写…" aria-label="Your answer"></textarea>`;
  box.innerHTML = `<section class="card">
    <div class="head"><span class="chip acc">${WTYPES[ex.type]}</span><span class="levels" title="Hint level">${[1, 2, 3].map(l => `<button type="button" class="lvl ${l <= ex.lv ? 'on' : ''}" data-lv="${l}" aria-label="${LEVELNAME[l]}" style="border:0;cursor:pointer"></button>`).join('')}</span><span class="small muted">${LEVELNAME[ex.lv]}</span>
      <span class="sp"></span>${ex.w ? `<button class="btn ghost sm" data-w="${ex.w.id}">Word card</button>` : '<span class="chip" title="Exercise written for this app, beyond the word list">Extra exercise</span>'}</div>
    <div class="stack" style="gap:8px"><span class="label">${t.label}</span>${t.body}</div>
    ${hints.length ? `<div class="stack small" style="gap:4px">${hints.map(h => `<div>${h}</div>`).join('')}</div>` : ''}
    ${input}
    <div class="row"><button class="btn primary" id="wsubmit">${ex.tries.length ? 'Submit again' : 'Submit'} <span class="k kbd-hint">Ctrl+Enter</span></button><button class="btn ghost" id="wskip">${ex.tries.length ? 'Next exercise' : 'Skip'}</button></div>
    <div id="wfb">${last ? feedbackHTML(ex, last) : ''}</div>
    ${showModel ? `<div class="ex"><span class="label">Suggested answer</span><div class="zhbig">${esc(modelOf(ex))}</div><div>${pyHTML(modelPy(ex))}</div>${ex.w ? audioBtns(modelOf(ex), 'Listen') : ''}</div>` : ''}
    ${ex.tries.length > 1 ? `<details class="small"><summary>Earlier tries on this exercise (${ex.tries.length - 1})</summary>${ex.tries.slice(0, -1).map(tr => `<div class="zh" style="margin-top:6px">${esc(tr.a)} <span class="chip ${verdictChip(tr.v)}">${verdictLabel(tr.v)}</span></div>`).join('')}</details>` : ''}
  </section>`;
  $$('[data-tk]', box).forEach(b => b.onclick = () => { ex.built.push(+b.dataset.tk); renderEx(); });
  $$('[data-un]', box).forEach(b => b.onclick = () => { ex.built.splice(+b.dataset.un, 1); renderEx(); });
  $$('[data-lv]', box).forEach(b => b.onclick = () => { ex.lv = +b.dataset.lv; S.wlevel[ex.type] = ex.lv; save(); renderEx(); });
  $$('[data-w]', box).forEach(b => b.onclick = () => openWord(+b.dataset.w));
  $('#wsubmit').onclick = submitWriting;
  $('#wskip').onclick = () => { EX = makeExercise(); renderEx(); };
  const inp = $('#win'); if (inp) { inp.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || ex.type === 'complete')) { e.preventDefault(); submitWriting(); } }; if (!last) inp.focus(); }
  const aic = $('#aicheck'); if (aic) aic.onclick = () => runAI(ex, last, true);
}
const modelOf = ex => ex.type === 'combine' || ex.type === 'prompt' ? ex.item.model : ex.type === 'colloc' ? lastLine(ex.w) : lastLine(ex.w);
const modelPy = ex => ex.type === 'combine' || ex.type === 'prompt' ? ex.item.mp : ex.w.exP[ex.w.exP.length - 1];
const verdictLabel = v => ({ correct: 'Correct', minor: 'Small issues', major: 'Needs work', self_good: 'Self-check: got it', self_part: 'Self-check: partly', self_miss: 'Self-check: missed', exact: 'Exact match', diff: 'Different from original' }[v] || v);
const verdictChip = v => /correct|exact|self_good/.test(v) ? 'acc' : /minor|part|diff/.test(v) ? 'warn' : 'bad';
function answerText(ex) { if (ex.type === 'scramble') return ex.built.map(k => ex.shuffled[k].t).join('') + (ex.built.length === ex.shuffled.length ? ex.punct : ''); return ($('#win')?.value || '').trim(); }
async function submitWriting() {
  const ex = EX; const a = answerText(ex); if (!a) { toast('Write an answer first'); return; }
  if (ex.type === 'scramble' && ex.built.length < ex.shuffled.length) { toast('Use all the words'); return; }
  const tr = { a, ts: Date.now() }; ex.tries.push(tr);
  if (ex.type === 'scramble' || ex.type === 'complete') {
    const ok = ex.type === 'scramble' ? zhOnly(a) === zhOnly(lastLine(ex.w)) : zhOnly(a) === ex.w.w;
    tr.v = ok ? 'exact' : 'diff'; tr.method = 'exact';
    finishTry(ex, tr); return;
  }
  tr.v = 'pending'; renderEx(); await runAI(ex, tr, false);
}
async function runAI(ex, tr, isRecheck) {
  const fbBox = $('#wfb'); const sample = await getSample();
  if (!sample) { tr.method = 'self'; tr.v = isRecheck ? tr.v : 'self_pending'; tr.aiMsg = aiUnavailableMsg(); renderEx(); return; }
  fbBox.innerHTML = '<div class="small muted">Claude is reading your answer…</div>';
  const task = { translate: `Translate into natural Chinese: "${lastEn(ex.w)}". The learner should try to use ${ex.w?.w} (${ex.w?.m}).`, scramble: `Reorder these words into a sentence: ${ex.answerToks?.join(' / ')}`, complete: `Fill the blank in: ${lastLine(ex.w).replace(ex.w.w, '＿＿')}`, colloc: `Write an original sentence using the combination "${ex.coll?.z}" (${ex.w?.w}: ${ex.w?.m}).`, combine: `Combine into one natural sentence, using a suitable connector: ${ex.item?.parts?.join(' ')}`, prompt: `Writing prompt: ${ex.item?.en}` }[ex.type];
  const target = ex.type === 'combine' ? `connector such as ${ex.item.conn}` : ex.type === 'prompt' ? ex.item.targets.join('、') : ex.w.w;
  const prompt = `You are a Mandarin writing tutor giving feedback to an intermediate learner (HSK 5, standard mainland Mandarin, simplified characters).
Task: ${task}
Target to use: ${target}
Reference answer (one possible version, NOT required): ${modelOf(ex)}
Learner's answer: ${tr.a}

Judge the learner's answer on its own merits. Accept any natural, grammatical wording that fulfils the task, even if it differs from the reference. Keep the learner's intended meaning in corrections.
Reply with JSON only, in this shape:
{"verdict":"correct"|"minor"|"major","used_target":true|false,"vocabulary":"","grammar":"","word_order":"","naturalness":"","corrected":"","natural":"","summary":""}
Rules: each feedback field is one short English sentence (max 25 words), quoting Chinese where useful; write "Fine." if there is nothing to fix. "corrected" is the learner's sentence with minimal edits (identical if already correct). "natural" is a more natural native-sounding alternative, or "" if the answer is already natural. "summary" is one encouraging sentence in English. "minor" = understandable with small slips; "major" = meaning unclear, wrong grammar, or task not done.`;
  try {
    const r = await sample.json(prompt, { modelTier: 'default' });
    tr.fb = r; tr.v = ['correct', 'minor', 'major'].includes(r.verdict) ? r.verdict : 'minor'; tr.method = 'ai';
    finishTry(ex, tr);
  } catch (e) { tr.method = 'self'; tr.aiMsg = aiErr(e); if (!isRecheck) tr.v = 'self_pending'; renderEx(); }
}
function finishTry(ex, tr) {
  const good = /correct|exact|self_good/.test(tr.v), bad = /major|self_miss/.test(tr.v) || (tr.v === 'diff' && ex.type === 'complete');
  // hint level progression per type
  const k = ex.type; S.wstreak[k] = good ? (S.wstreak[k] || 0) + 1 : 0;
  if (good && S.wstreak[k] >= 3 && S.wlevel[k] < 3) { S.wlevel[k]++; S.wstreak[k] = 0; toast(`Hints reduced: ${LEVELNAME[S.wlevel[k]]}`); }
  if (bad && S.wlevel[k] > 1 && ex.tries.length === 1) { S.wlevel[k]--; toast(`More hints next time: ${LEVELNAME[S.wlevel[k]]}`); }
  // writing schedule for the word (first attempt counts)
  if (ex.w && ex.tries.length === 1) { const r = good ? 3 : bad ? 1 : 2; let c = S.ws[ex.w.id]; c = schedule(c && c.st === 'n' ? null : c, r); if (c.st === 'l') { c.st = 'r'; c.ivl = r === 1 ? 1 : 2; c.due = Date.now() + c.ivl * DAY; } S.ws[ex.w.id] = c; if (bad) S.weak[ex.w.id] = (S.weak[ex.w.id] || 0) + 1; }
  S.wlog.push({ k: ex.key, t: ex.type, w: ex.w ? ex.w.id : null, q: taskSummary(ex), a: tr.a, v: tr.v, m: tr.method, fb: tr.fb ? { c: tr.fb.corrected, n: tr.fb.natural, s: tr.fb.summary, vo: tr.fb.vocabulary, g: tr.fb.grammar, o: tr.fb.word_order, na: tr.fb.naturalness } : null, ts: tr.ts, tryN: ex.tries.length });
  if (S.wlog.length > 600) S.wlog = S.wlog.slice(-600);
  logHist('w'); save(); renderEx();
}
function taskSummary(ex) { if (ex.type === 'combine') return ex.item.parts.join(' '); if (ex.type === 'prompt') return ex.item.en; if (ex.type === 'colloc') return 'Use ' + ex.coll.z; if (ex.type === 'translate') return lastEn(ex.w); if (ex.type === 'complete') return lastLine(ex.w).replace(ex.w.w, '＿'); return ex.answerToks.join(' / '); }
function feedbackHTML(ex, tr) {
  if (tr.v === 'pending') return '<div class="small muted">Checking…</div>';
  if (tr.method === 'exact') {
    const ok = tr.v === 'exact';
    return `<div class="ex stack"><div class="verdict ${ok ? 'ok' : 'mid'}">${ok ? 'Matches the original sentence' : ex.type === 'complete' ? 'Not the word this sentence was written with' : 'Your order is different from the original'} <span class="chip">exact-match check</span></div>
      ${ok ? '' : `<div class="small">${ex.type === 'complete' ? `The missing word is <span class="han">${esc(ex.w.w)}</span>.` : 'Chinese sometimes allows other orders, such as moving a time phrase.'} An exact-match check can’t tell whether your version is also correct.</div>${S.set.ai ? '<button class="btn sm" id="aicheck">Ask AI whether mine also works</button>' : ''}`}</div>`;
  }
  if (tr.method === 'ai' && tr.fb) {
    const f = tr.fb; const v = tr.v;
    return `<div class="ex stack"><div class="verdict ${v === 'correct' ? 'ok' : v === 'minor' ? 'mid' : 'no'}">${verdictLabel(v)} <span class="chip">AI feedback</span>${ex.type !== 'combine' && f.used_target === false ? ' <span class="chip warn">target not used</span>' : ''}</div>
      ${f.summary ? `<div>${esc(f.summary)}</div>` : ''}
      <dl class="fb"><dt>Vocabulary</dt><dd>${esc(f.vocabulary)}</dd><dt>Grammar</dt><dd>${esc(f.grammar)}</dd><dt>Word order</dt><dd>${esc(f.word_order)}</dd><dt>Naturalness</dt><dd>${esc(f.naturalness)}</dd></dl>
      ${f.corrected && zhOnly(f.corrected) !== zhOnly(tr.a) ? `<div><span class="label">Corrected (your meaning)</span><div class="zhbig">${esc(f.corrected)}</div></div>` : ''}
      ${f.natural ? `<div><span class="label">More natural</span><div class="zhbig">${esc(f.natural)}</div></div>` : ''}
      <div class="small muted">Edit your answer above and submit again, or move on.</div></div>`;
  }
  // self-check (no AI)
  return `<div class="ex stack"><div class="verdict mid">Check it yourself <span class="chip">no AI assessment</span></div><div class="small">${esc(tr.aiMsg || aiUnavailableMsg())}</div>
    <div class="small">Look at the suggested answer below. Does yours say the same thing, use the target word, and keep a natural order?</div>
    <div class="row">${[['self_good', 'I got it'], ['self_part', 'Partly'], ['self_miss', 'Missed it']].map(([k, l]) => `<button class="btn sm ${tr.v === k ? 'primary' : ''}" data-self="${k}">${l}</button>`).join('')}</div></div>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-self]'); if (!b || !EX) return; const tr = EX.tries[EX.tries.length - 1]; const first = tr.v === 'self_pending'; tr.v = b.dataset.self; if (first) finishTry(EX, tr); else { const L = S.wlog[S.wlog.length - 1]; if (L) L.v = tr.v; save(); renderEx(); } });
function renderWLog(box) {
  const byKey = {}; S.wlog.forEach(x => (byKey[x.k] = byKey[x.k] || []).push(x));
  const improved = k => { const a = byKey[k]; return a.length > 1 && !/correct|exact|self_good/.test(a[0].v) && /correct|exact|self_good/.test(a[a.length - 1].v); };
  const f = renderWLog.f || 'all';
  let list = [...S.wlog].reverse();
  if (f === 'work') list = list.filter(x => /major|minor|diff|self_miss|self_part/.test(x.v));
  if (f === 'improved') list = list.filter(x => improved(x.k) && x === byKey[x.k][byKey[x.k].length - 1]);
  box.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="Filter">${[['all', 'All'], ['work', 'Needs work'], ['improved', 'Improved on retry']].map(([k, l]) => `<button type="button" data-lf="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div></div>
  ${list.length ? `<div class="stack">${list.slice(0, 150).map(x => `<div class="panel tight stack" style="gap:6px">
    <div class="row small"><span class="chip">${WTYPES[x.t]}</span><span class="chip ${verdictChip(x.v)}">${verdictLabel(x.v)}</span>${x.tryN > 1 ? `<span class="chip">try ${x.tryN}</span>` : ''}<span class="muted" style="margin-left:auto">${new Date(x.ts).toLocaleDateString()}</span></div>
    <div class="small muted">${esc(x.q)}</div><div class="zhbig">${esc(x.a)}</div>
    ${x.fb ? `${x.fb.c && zhOnly(x.fb.c) !== zhOnly(x.a) ? `<div class="small"><b>Corrected:</b> <span class="zh">${esc(x.fb.c)}</span></div>` : ''}${x.fb.n ? `<div class="small"><b>More natural:</b> <span class="zh">${esc(x.fb.n)}</span></div>` : ''}${[x.fb.g, x.fb.vo, x.fb.o, x.fb.na].filter(t => t && !/^fine\.?$/i.test(t)).map(t => `<div class="small muted">· ${esc(t)}</div>`).join('')}` : ''}
    <div><button class="btn sm" data-retry="${esc(x.k)}">Retry this</button></div></div>`).join('')}</div>` : '<div class="panel muted">Your answers and feedback are saved here, so you can look back at mistakes and see what improved.</div>'}`;
  $$('[data-lf]', box).forEach(b => b.onclick = () => { renderWLog.f = b.dataset.lf; renderWLog(box); });
  $$('[data-retry]', box).forEach(b => b.onclick = () => { EX = exFromKey(b.dataset.retry); wTab = 'practice'; if (EX) { writeType = EX.type; route(); } });
}
function exFromKey(k) {
  if (/^c\d+$/.test(k)) { const i = +k.slice(1); return { type: 'combine', lv: S.wlevel.combine, key: k, item: D.combine[i], tries: [] }; }
  if (/^p\d+$/.test(k)) { const p = D.prompts.find(x => x.id === k); return p ? { type: 'prompt', lv: S.wlevel.prompt, key: k, item: p, tries: [] } : null; }
  const [type, id] = k.split(':'); const sv = writeCtx; writeCtx = { ids: [+id] }; const save1 = writeType; writeType = type; const ex = makeExercise(); writeType = save1; writeCtx = sv; return ex;
}

/* ===== Handwriting ===== */
let handCtx = null; const strokeCache = {};
function strokeLoader(ch, onLoad, onErr) {
  const b = ch.codePointAt(0) % 16;
  (strokeCache[b] = strokeCache[b] || fetch('strokes/s' + b + '.json').then(r => r.json())).then(d => d[ch] ? onLoad(d[ch]) : onErr && onErr('missing')).catch(onErr);
}
VIEWS.hand = col => {
  const todayIds = W.filter(w => S.srs[w.id] && todayKey(S.srs[w.id].last) === todayKey()).map(w => w.id);
  const src = handCtx?.src || (todayIds.length ? 'today' : Object.keys(S.bm).length ? 'bm' : 'core');
  const lists = { today: todayIds, bm: Object.keys(S.bm).map(Number), due: W.filter(w => statusOf(w.id) === 'due').map(w => w.id), weak: Object.keys(S.weak).map(Number), core: W.filter(w => w.d === 1).map(w => w.id) };
  let ids = lists[src] || []; if (!ids.length) ids = lists.core;
  let id = handCtx?.id ?? ids[0]; if (!W[id]) id = ids[0];
  handCtx = { src, id, ids };
  const w = W[id]; const reps = S.set.reps; const chars = [...w.w];
  col.innerHTML = `<div class="topbar"><h1>Handwriting</h1></div>
  <div class="panel tight small stack" style="gap:6px"><div><b>Character formation.</b> Watch the stroke order, then write each character in the grid: trace the first two, then write the rest from memory. The app shows you what to write and how many times. It does not grade your handwriting.</div><div class="muted">Writing whole sentences is practised separately under <a href="#write">Writing</a>, by typing.</div></div>
  <div class="row"><label class="small muted" for="hsrc">Words from</label><select id="hsrc">${[['today', 'Studied today'], ['due', 'Due today'], ['bm', 'Bookmarked'], ['weak', 'Struggled with'], ['core', 'Core Level 5 words']].map(([k, l]) => `<option value="${k}" ${src === k ? 'selected' : ''}>${l} (${lists[k].length})</option>`).join('')}</select>
    <select id="hword" aria-label="Word">${ids.slice(0, 300).map(i => `<option value="${i}" ${i === id ? 'selected' : ''}>${esc(W[i].w)} · ${esc(W[i].m.split(';')[0].slice(0, 30))}</option>`).join('')}</select>
    <label class="small muted">Times <select id="hreps">${[3, 5, 8, 10].map(n => `<option ${n === reps ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
  <section class="card">
    <div class="head"><span class="han" style="font-size:2rem">${esc(w.w)}</span>${pyHTML(w.py)}<span class="muted">${esc(w.m)}</span><span class="sp"></span>${audioBtns(w.w)}</div>
    <div class="small"><b>Write ${chars.map(c => `<span class="han">${esc(c)}</span>`).join(' ')} ${reps} times each.</b> ${S.hand[id] ? `<span class="muted">You’ve practised this word ${S.hand[id].n} time${S.hand[id].n > 1 ? 's' : ''}.</span>` : ''}</div>
    ${chars.map((c, ci) => `<div class="stack" style="gap:8px">
      <div class="row"><div class="tzg" id="anim${ci}"><div class="w"></div></div>
        <div class="stack" style="gap:6px"><div class="han" style="font-size:1.3rem">${esc(c)}</div><div class="small muted" id="sc${ci}">Loading strokes…</div>
        <div class="row"><button class="btn sm" data-anim="${ci}">Play stroke order</button><button class="btn sm ghost" data-step="${ci}">Next stroke</button></div></div></div>
      <div class="practice">${Array.from({ length: reps }, (_, k) => `<div class="cellwrap"><div class="tzg sm" id="cell${ci}_${k}"><div class="w"></div><canvas aria-label="Practice square ${k + 1}"></canvas></div>${k < 2 ? 'trace' : k + 1}</div>`).join('')}</div>
    </div>`).join('<hr class="sep">')}
    <div class="row"><button class="btn primary" id="hdone">Done · next word</button><button class="btn ghost" id="hclear">Clear grids</button></div>
  </section>`;
  $('#hsrc').onchange = e => { handCtx = { src: e.target.value }; route(); };
  $('#hword').onchange = e => { handCtx.id = +e.target.value; route(); };
  $('#hreps').onchange = e => { S.set.reps = +e.target.value; save(); route(); };
  $('#hclear').onclick = () => $$('canvas', col).forEach(cv => cv.getContext('2d').clearRect(0, 0, cv.width, cv.height));
  $('#hdone').onclick = () => { S.hand[id] = { n: (S.hand[id]?.n || 0) + 1, last: Date.now() }; logHist('hw'); save(); const i = ids.indexOf(id); handCtx.id = ids[(i + 1) % ids.length]; toast('Practice logged'); route(); };
  setupHand(chars);
};
let hwReady = null;
function loadHW() { if (window.HanziWriter) return Promise.resolve(); return hwReady || (hwReady = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.3/dist/hanzi-writer.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); })); }
function themeColor(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#333'; }
async function setupHand(chars) {
  // drawing canvases first, so practice works even if stroke data fails
  $$('.tzg.sm canvas').forEach(cv => {
    const r = cv.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1; cv.width = r.width * dpr; cv.height = r.height * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = themeColor('--ink');
    let down = false, lx, ly;
    cv.onpointerdown = e => { down = true; cv.setPointerCapture(e.pointerId); const b = cv.getBoundingClientRect(); lx = e.clientX - b.left; ly = e.clientY - b.top; };
    cv.onpointermove = e => { if (!down) return; const b = cv.getBoundingClientRect(); const x = e.clientX - b.left, y = e.clientY - b.top; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y); ctx.stroke(); lx = x; ly = y; };
    cv.onpointerup = cv.onpointercancel = () => { down = false; };
  });
  try { await loadHW(); } catch (e) { chars.forEach((c, ci) => { const el = $('#sc' + ci); if (el) el.textContent = 'Stroke animation couldn’t load. You can still practise in the grid.'; }); return; }
  const ink = themeColor('--ink'), acc = themeColor('--accent'), faint = themeColor('--line');
  chars.forEach((c, ci) => {
    const host = $('#anim' + ci + ' .w'); if (!host) return;
    const writer = HanziWriter.create(host, c, { width: 130, height: 130, padding: 8, strokeColor: ink, radicalColor: acc, outlineColor: faint, showOutline: true, delayBetweenStrokes: 220, strokeAnimationSpeed: 1.1, charDataLoader: strokeLoader,
      onLoadCharDataSuccess: d => { const el = $('#sc' + ci); if (el) el.textContent = d.strokes.length + ' strokes'; },
      onLoadCharDataError: () => { const el = $('#sc' + ci); if (el) el.textContent = 'No stroke data for this character.'; } });
    let step = 0;
    $(`[data-anim="${ci}"]`).onclick = () => { step = 0; writer.animateCharacter(); };
    $(`[data-step="${ci}"]`).onclick = () => { strokeLoader(c, d => { if (step === 0) writer.hideCharacter(); if (step >= d.strokes.length) { step = 0; writer.hideCharacter(); return; } writer.animateStroke(step++); }); };
    for (let k = 0; k < 2; k++) { const cell = $(`#cell${ci}_${k} .w`); if (cell) HanziWriter.create(cell, c, { width: 96, height: 96, padding: 6, showCharacter: false, showOutline: true, outlineColor: faint, charDataLoader: strokeLoader }); }
  });
}

/* ===== Conversation (beyond the list) ===== */
let talkCat = '';
const CATS = { refusal: 'Polite refusals', request: 'Indirect requests', implied: 'What people really mean', softener: 'Softeners & set replies', idiom: 'Idioms & set phrases' };
VIEWS.talk = col => {
  const list = D.prag.filter(p => !talkCat || p.cat === talkCat);
  col.innerHTML = `<div class="topbar"><h1>Conversation</h1><span class="chip warn">Beyond the HSK 5 list</span></div>
  <p class="small muted">These everyday expressions aren’t on the official Level 5 word list. They help you read tone and intent: how people say no without saying no, ask without asking, and soften what they mean.</p>
  <div class="row"><div class="seg" role="group" aria-label="Category" style="flex-wrap:wrap"><button type="button" data-tc="" aria-pressed="${!talkCat}">All</button>${Object.entries(CATS).map(([k, l]) => `<button type="button" data-tc="${k}" aria-pressed="${talkCat === k}">${l}</button>`).join('')}</div></div>
  <div class="stack">${list.map(p => `<article class="panel stack" style="gap:8px">
    <div class="row"><span class="zhbig" style="font-size:1.45rem">${esc(p.z)}</span>${pyHTML(p.p)}${audioBtns(p.z)}<span class="chip" style="margin-left:auto">${CATS[p.cat]}</span></div>
    <div><b>${esc(p.m)}.</b> ${esc(p.real)}</div>
    <div class="ex" style="gap:2px">${p.dz.map((d, i) => `<div class="zh" style="font-size:1.05rem">${esc(d)}</div><div>${pyHTML(p.dp[i])}</div><div class="muted small">${esc(p.de[i] || '')}</div>`).join('')}<div>${audioBtns(p.dz.join('//'), 'Dialogue')}</div></div>
  </article>`).join('')}</div>`;
  $$('[data-tc]').forEach(b => b.onclick = () => { talkCat = b.dataset.tc; route(); });
};
VIEWS.more = col => {
  col.innerHTML = `<div class="topbar"><h1>More</h1></div><div class="tiles">${NAV.filter(n => !TABS.includes(n[0])).map(([k, h, l]) => `<a class="tile" href="#${k}" style="text-decoration:none"><span class="han">${h}</span><b>${l}</b></a>`).join('')}</div>`;
};
