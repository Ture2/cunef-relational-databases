'use strict';

/* ==========================================================================
   Relational databases › ER concepts: concept cards and a concept quiz.
   Data: data/er-concepts.js (ER_CONCEPTS) and data/er-quiz.js (ER_QUIZ, ER_QUIZ_TOPICS).
   Routes: #/relational/er, #/relational/er/quiz, #/relational/er/quiz/<topic>
   ========================================================================== */

const ErSection = (() => {
  const BASE = '#/relational/er';
  const store = makeStore('er-quiz-v1');
  const best = Object.assign({}, store.load());       // topic ('all' or a key) -> best score
  const quiz = { topic: null, order: [], i: 0, score: 0, picked: null, typed: '', missed: [], done: false };
  let route = { page: 'concepts', topic: 'all' };

  const view = () => $('#view');

  function subNavHtml() {
    const on = (p) => (route.page === p ? ' aria-current="page"' : '');
    return `<nav class="subnav" aria-label="ER concepts">
        <a href="${BASE}"${on('concepts')}>Concepts</a>
        <a href="${BASE}/quiz"${on('quiz')}>Test yourself</a>
      </nav>`;
  }

  /* ---- Concept cards ------------------------------------------------------- */

  function cardHtml(c) {
    const n = ER_QUIZ.filter((q) => q.topic === c.topic).length;
    return `
      <article class="concept" id="c-${esc(c.id)}" aria-labelledby="c-${esc(c.id)}-h">
        <div class="concept-text">
          <h3 id="c-${esc(c.id)}-h">${esc(c.title)}</h3>
          <p class="summary">${md(c.summary)}</p>
          ${(c.body || []).map((p) => `<p>${md(p)}</p>`).join('')}
          ${c.points && c.points.length ? `<ul class="plain">${c.points.map((p) => `<li>${md(p)}</li>`).join('')}</ul>` : ''}
          ${c.example ? `<p class="example"><strong>Example.</strong> ${md(c.example)}</p>` : ''}
          ${c.mistake ? `<p class="mistake"><strong>Common mistake.</strong> ${md(c.mistake)}</p>` : ''}
          ${n ? `<p class="concept-quiz"><a href="${BASE}/quiz/${esc(c.topic)}">Test yourself: ${esc(ER_QUIZ_TOPICS[c.topic] || c.topic)} (${n} questions)</a></p>` : ''}
        </div>
        ${c.diagram ? `<figure class="concept-fig"><div class="scroll">${ErDiagram.chenSvg(c.diagram)}</div>${c.caption ? `<figcaption>${md(c.caption)}</figcaption>` : ''}</figure>` : ''}
      </article>`;
  }

  function renderConcepts() {
    view().innerHTML = `
      ${subNavHtml()}
      <header class="section-head">
        <h2>Key concepts of the ER model</h2>
        <p class="story">The conceptual model describes <em>what</em> the organization needs to store, independently of any database product. Read the cards in order, then test yourself.</p>
      </header>
      <nav class="toc" aria-label="Concepts"><ol>${ER_CONCEPTS.map((c) => `<li><a href="#c-${esc(c.id)}" data-action="jump" data-id="c-${esc(c.id)}">${esc(c.title)}</a></li>`).join('')}</ol></nav>
      <div class="concepts">${ER_CONCEPTS.map(cardHtml).join('')}</div>
      <p class="actions"><a class="btn" href="${BASE}/quiz">Test yourself</a> <a class="btn ghost" href="#/relational/logical">Go to ER → Logical</a></p>`;
  }

  /* ---- Quiz ---------------------------------------------------------------- */

  const pool = (topic) => ER_QUIZ.map((q, k) => k).filter((k) => topic === 'all' || ER_QUIZ[k].topic === topic);

  function startQuiz(topic) {
    Object.assign(quiz, { topic, order: shuffle(pool(topic)), i: 0, score: 0, picked: null, typed: '', missed: [], done: false });
  }

  const normAnswer = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const isRight = (q, picked) => {
    if (q.type === 'fib') return q.accept.some((a) => normAnswer(a) === normAnswer(picked));
    if (q.type === 'tf') return picked === (q.answer ? 1 : 0);
    return picked === q.answer;
  };
  const answerText = (q) => (q.type === 'fib' ? q.accept[0] : q.type === 'tf' ? (q.answer ? 'True' : 'False') : q.choices[q.answer]);

  function topicsHtml() {
    const topics = ['all', ...Object.keys(ER_QUIZ_TOPICS).filter((t) => pool(t).length)];
    return `<nav class="levels" aria-label="Quiz topic">${topics.map((t) => `
        <a href="${BASE}/quiz${t === 'all' ? '' : `/${t}`}"${quiz.topic === t ? ' aria-current="page"' : ''}>${t === 'all' ? 'All topics' : esc(ER_QUIZ_TOPICS[t])} <span>${pool(t).length} questions</span></a>`).join('')}
      </nav>`;
  }

  function renderQuiz() {
    if (quiz.topic !== route.topic || !quiz.order.length) startQuiz(route.topic);
    if (quiz.done) { renderQuizEnd(); return; }
    const q = ER_QUIZ[quiz.order[quiz.i]];
    const answered = quiz.picked !== null;
    const right = answered && isRight(q, quiz.picked);
    const last = quiz.i === quiz.order.length - 1;

    let answerUi;
    if (q.type === 'fib') {
      answerUi = `<form class="fib" data-action="fib-form">
          <label for="fib-in">Your answer</label>
          <div class="fib-row">
            <input id="fib-in" type="text" autocomplete="off" spellcheck="false" value="${esc(quiz.typed)}"${answered ? ' disabled' : ''}>
            <button type="submit" class="btn" data-fid="fib-go"${answered ? ' disabled' : ''}>Check</button>
          </div>
        </form>`;
    } else {
      const labels = q.type === 'tf' ? ['False', 'True'] : q.choices;
      const order = q.type === 'tf' ? [1, 0] : labels.map((_, k) => k);
      const correctIdx = q.type === 'tf' ? (q.answer ? 1 : 0) : q.answer;
      answerUi = `<div class="options" role="group" aria-label="Choose an answer">${order.map((k) => {
        let cls = 'opt';
        let tag = '';
        if (answered) {
          if (k === correctIdx) { cls += ' correct'; tag = '<span class="tag">Correct</span>'; }
          else if (k === quiz.picked) { cls += ' wrong'; tag = '<span class="tag">Your answer</span>'; }
        }
        const letter = q.type === 'mc' ? `<span class="letter">${'ABCDEFG'[k]}</span>` : '';
        return `<button type="button" class="${cls}" data-action="answer" data-i="${k}"${answered ? ' disabled' : ''}><span class="opt-text">${letter}<span>${md(labels[k])}</span></span>${tag}</button>`;
      }).join('')}</div>`;
    }

    const verdict = answered
      ? `<section class="feedback ${right ? 'ok' : 'bad'}" aria-labelledby="qf-title">
           <h3 id="qf-title" tabindex="-1">${right ? 'Correct' : 'Not quite'}</h3>
           <p>${right ? '' : `The answer is “${md(answerText(q))}”. `}${md(q.why || '')}</p>
         </section>
         <p class="actions"><button type="button" class="btn" data-action="next" data-fid="next">${last ? 'See result' : 'Next question'}</button></p>`
      : '';

    const kind = { mc: 'Multiple choice', tf: 'True or false', fib: 'Fill in the blank' }[q.type];
    view().innerHTML = `
      ${subNavHtml()}
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        <p class="q-progress">Question ${quiz.i + 1} of ${quiz.order.length} · ${kind} · ${esc(ER_QUIZ_TOPICS[q.topic] || '')}. Correct: ${quiz.score}.</p>
        <h2 id="q-title" class="q-text">${md(q.q).replace(/_{3,}/g, '<span class="blank">_____</span>')}</h2>
        ${q.diagram ? `<figure class="quiz-fig"><div class="scroll">${ErDiagram.chenSvg(q.diagram)}</div></figure>` : ''}
        ${answerUi}
        <div id="q-fb">${verdict}</div>
      </article>`;
  }

  function renderQuizEnd() {
    const total = quiz.order.length;
    const missed = quiz.missed.map((k) => ER_QUIZ[k]);
    view().innerHTML = `
      ${subNavHtml()}
      ${topicsHtml()}
      <article class="quiz" aria-labelledby="q-title">
        <h2 id="q-title" tabindex="-1">You got ${quiz.score} of ${total} right</h2>
        <p class="meta">Best result on this device for this topic: ${best[quiz.topic] || 0} of ${total}.</p>
        ${missed.length
          ? `<h3>To review</h3><ul class="plain review">${missed.map((q) => `<li>${md(q.q).replace(/_{3,}/g, '_____')} <strong>Answer: ${md(answerText(q))}.</strong> ${md(q.why || '')}</li>`).join('')}</ul>`
          : '<p class="story">You did not miss any. Move on to transforming ER models into tables.</p>'}
        <p class="actions">
          <button type="button" class="btn" data-action="restart" data-fid="restart">Repeat in a different order</button>
          <a class="btn ghost" href="${BASE}">Review the concepts</a>
          <a class="btn ghost" href="#/relational/logical">Go to ER → Logical</a>
        </p>
      </article>`;
    $('#q-title')?.focus({ preventScroll: true });
  }

  function answer(value) {
    if (quiz.picked !== null) return;
    const qi = quiz.order[quiz.i];
    quiz.picked = value;
    if (isRight(ER_QUIZ[qi], value)) quiz.score++; else quiz.missed.push(qi);
    renderQuiz();
    reveal($('#qf-title'));
  }

  function onClick(el) {
    switch (el.dataset.action) {
      case 'jump': {
        const target = document.getElementById(el.dataset.id);
        if (target) { target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
        break;
      }
      case 'answer': answer(+el.dataset.i); break;
      case 'next':
        if (quiz.i < quiz.order.length - 1) { quiz.i++; quiz.picked = null; quiz.typed = ''; }
        else {
          quiz.done = true;
          if (quiz.score > (best[quiz.topic] || 0)) { best[quiz.topic] = quiz.score; store.save(best); }
        }
        renderQuiz();
        (quiz.done ? $('#q-title') : $('#fib-in') || $('.options .opt'))?.focus({ preventScroll: true });
        break;
      case 'restart':
        startQuiz(quiz.topic);
        renderQuiz();
        $('#q-title')?.focus({ preventScroll: true });
        break;
      default:
    }
  }

  function onSubmit(form) {
    if (form.dataset.action !== 'fib-form') return;
    const input = $('#fib-in');
    const v = input ? input.value.trim() : '';
    if (!v) { input?.focus(); return; }
    quiz.typed = v;
    answer(v);
  }

  function render(rest) {
    const m = (rest || '').match(/^quiz(?:\/([a-z-]+))?$/);
    route = m ? { page: 'quiz', topic: m[1] && ER_QUIZ_TOPICS[m[1]] ? m[1] : 'all' } : { page: 'concepts', topic: 'all' };
    if (route.page === 'quiz') {
      renderQuiz();
      return `Test yourself${route.topic !== 'all' ? `: ${ER_QUIZ_TOPICS[route.topic]}` : ''} · ER concepts`;
    }
    renderConcepts();
    return 'ER concepts';
  }

  /* Console warnings for inconsistent quiz data. */
  (function selfTest() {
    ER_QUIZ.forEach((q, i) => {
      const where = `ER_QUIZ[${i}]`;
      if (!ER_QUIZ_TOPICS[q.topic]) console.warn(`${where}: unknown topic ${q.topic}`);
      if (q.type === 'mc' && !(q.answer >= 0 && q.answer < q.choices.length)) console.warn(`${where}: answer out of range`);
      if (q.type === 'fib' && !(q.accept && q.accept.length)) console.warn(`${where}: no accepted answers`);
    });
  })();

  return { render, onClick, onSubmit };
})();
