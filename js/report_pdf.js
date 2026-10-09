/* ============================================================
   THE LEARNER REPORT AS A PDF -- a deliberate A4 document, not the web page printed.

   "Download PDF" (js/report_download.js) turns these pages into a PDF file, and the
   browser's own Print prints them: four A4 portrait pages, each composed on purpose
   and answering one question for the learner and the reader (a parent, a teacher):

     1  Your Learner Profile     Who am I?
     2  Your Subject Fit         Which subjects currently fit me?
     3  Your Pathway             Where could these subjects take me?
     4  Your Recommendation      What should I do next?

   (A report that is not finished yet -- no personality assessment, or a
   learner who is not choosing Grade 10 subjects -- gets only the pages it has
   something real to say on, never a page of empty boxes.)

   Everything here reads the object buildLearnerReport() returns; nothing on
   these pages is scored or worded anywhere else.

   How the layout stays honest about overlap and overflow:
   - Each page is exactly 210mm x 297mm (a fixed box, flex column: header,
     body, footer). Nothing is positioned absolutely; the body is a stack of
     blocks that grow with their text, and the footer owns its own strip, so
     the body can never run underneath it.
   - Text wraps (overflow-wrap) and grid columns use minmax(0, ...), so a long
     name, school or career wraps inside its own box instead of pushing a
     neighbour.
   - If a learner's content is longer than usual, a page TIGHTENS rather than
     shrinking its type: a fit pass (a4FitAll) measures each body and, while
     it does not fit, applies .c1, .c2, .c3 (smaller gaps and paddings) and
     then leaves out the least important blocks one at a time (data-opt: the
     higher the number, the sooner it goes). It runs just before printing.
   The sizes live in style.css under "Learner report: the A4 PDF".
   ============================================================ */

function a4Pct(v){ return v == null || isNaN(v) ? '—' : Math.round(v) + '%'; }
function a4Bar(v, extra){
  return `<span class="a4-bar ${extra || ''}" aria-hidden="true"><i style="width:${Math.max(2, Math.min(100, Math.round(v || 0)))}%"></i></span>`;
}
function a4Chip(rec){ return `<span class="a4-chip a4-chip-${rec.key}">${esc(rec.label)}</span>`; }

/* ---------------- the page frame ---------------- */
function a4Frame(o, R, i, n){
  const m = R.meta;
  const head = o.hero ? `
    <header class="a4-head a4-hero">
      <div class="a4-brand"><span class="a4-logo"><img src="assets/logo-wordmark.png" alt="iroli"/></span><p class="a4-tag">Discover your path.<br>Choose with confidence.</p></div>
      <div class="a4-titleblock"><h1>${esc(m.title)}</h1><p>Insights today. More opportunities tomorrow.</p></div>
    </header>` : `
    <header class="a4-head a4-slim">
      <span class="a4-logo"><img src="assets/logo-wordmark.png" alt="iroli"/></span>
      <div class="a4-pagetitle"><h2>${esc(o.title)}</h2><p>${esc(o.question)}</p></div>
      <div class="a4-who"><b>${esc(m.name)}</b><small>${esc([m.grade ? 'Grade ' + m.grade : '', m.school || ''].filter(Boolean).join(' · '))}</small></div>
    </header>`;
  return `
  <section class="a4-page a4-${o.key}" aria-label="${esc(o.title)}">
    ${head}
    <div class="a4-body">${o.body}</div>
    <footer class="a4-foot"><span class="a4-fbrand"><img src="assets/logo-mark.png" alt=""/><b>iroli</b></span><span class="a4-ftitle">${esc(m.title)}</span><span class="a4-fmeta">Page ${i + 1} of ${n} · ${esc(m.date)}</span></footer>
  </section>`;
}
function a4SecTitle(title, question){
  return `<div class="a4-sectitle"><h2>${esc(title)}</h2><p>${esc(question)}</p></div>`;
}
function a4Info(R){
  const m = R.meta;
  const cells = [['Name', m.name], ['Grade', m.grade], ['School', m.school], ['Date', m.date]].filter(function(c){ return c[1]; });
  return `<dl class="a4-info">${cells.map(function(c){ return `<div><dt>${esc(c[0])}</dt><dd>${esc(c[1])}</dd></div>`; }).join('')}</dl>`;
}
function a4Prompt(text){ return `<div class="a4-prompt"><p>${esc(text)}</p></div>`; }

/* ---------------- page 1: who am I? ---------------- */
function a4ProfileBody(R){
  const pr = R.profile;
  if(!pr.available){
    return a4Info(R) + a4SecTitle('Your Learner Profile', 'Who am I?') +
      a4Prompt('Take the personality assessment to see your key traits, interests and how you work.');
  }
  const traits = pr.traits.map(function(t, i){
    return `<li class="a4-t${(i % 5) + 1}"><span class="a4-dot">${icon(LR_TRAIT_ICON[t.id] || 'spark', 'a4-ic')}</span><div><b>${esc(t.word)}</b><p>${esc(t.about)}</p></div></li>`;
  }).join('');
  const bars = pr.interests.map(function(x, i){
    return `<li class="a4-t${(i % 5) + 1}"><span class="a4-iname">${esc(x.name)}</span>${a4Bar(x.score)}<b class="a4-ipct">${a4Pct(x.score)}</b></li>`;
  }).join('');
  const type = `
    <section class="a4-card a4-type">
      <div class="a4-code" aria-hidden="true">${esc(pr.code)}</div>
      <div class="a4-type-t">
        <h3 class="a4-h3">Your personality type: ${esc(pr.names.join(' · '))}</h3>
        ${pr.strengths.length ? `<p class="a4-small a4-strengths" data-opt="8"><b>Strongest areas:</b> ${esc(pr.strengths.join(', '))}.</p>` : ''}
      </div>
    </section>`;
  const sliders = pr.work && pr.work.sliders.length ? `
    <section class="a4-card a4-work">
      <h3 class="a4-h3">How you like to work</h3>
      <ul class="a4-sliders">${pr.work.sliders.map(function(s, i){
        return `<li${i >= 4 ? ' data-opt="7"' : ''}><div class="a4-sl-l"><span>${esc(s.left)}</span><span>${esc(s.right)}</span></div><div class="a4-track" aria-hidden="true"><i style="margin-left:${Math.round(s.value)}%"></i></div></li>`;
      }).join('')}</ul>
    </section>` : '';
  const learn = pr.learn ? `
    <section class="a4-card a4-learn">
      <span class="a4-learn-ic">${icon('cap', 'a4-ic')}</span>
      <div><h3 class="a4-h3">How you learn best</h3><p>${esc(pr.learn)}</p></div>
    </section>` : '';
  return `
    ${a4Info(R)}
    ${a4SecTitle('Your Learner Profile', 'Who am I?')}
    <div class="a4-two">
      <section class="a4-card"><h3 class="a4-h3">Your key traits</h3><ul class="a4-traits">${traits}</ul></section>
      <section class="a4-card"><h3 class="a4-h3">Your interests</h3><ul class="a4-ibars">${bars}</ul></section>
    </div>
    ${type}
    <div class="a4-two${sliders && learn ? '' : ' a4-one'}">${sliders}${learn}</div>`;
}

/* ---------------- page 2: which subjects currently fit me? ---------------- */
function a4SubjectRow(r, i, R){
  const metric = function(label, v, cls){
    return v.score == null
      ? `<div class="a4-m a4-m-na ${cls}"><span class="a4-ml">${label}</span><b>No marks yet</b></div>`
      : `<div class="a4-m ${cls}"><span class="a4-ml">${label}</span><b>${a4Pct(v.score)}</b>${a4Bar(v.score, 'a4-bar-' + cls)}</div>`;
  };
  const opt = i === 7 ? ' data-opt="8"' : (i === 6 ? ' data-opt="6"' : '');
  return `
  <article class="a4-subj"${opt}>
    <div class="a4-subj-main">
      <div class="a4-sname"><b>${esc(r.label)}</b></div>
      ${metric('Academic', r.academic, 'ac')}${metric('Interest', r.interest, 'in')}${metric('Personality', r.personality, 'pe')}
      <div class="a4-m a4-m-ov"><span class="a4-ml">Overall</span><b class="a4-ov a4-ov-${r.overall.key}">${a4Pct(r.overall.score)}</b></div>
      <div class="a4-recwrap">${a4Chip(r.rec)}</div>
    </div>
    ${r.why ? `<p class="a4-why">${esc(r.why)}</p>` : ''}
  </article>`;
}
function a4ResultsBox(R){
  const a = R.academic;
  if(!a.has) return '';
  const list = function(items, empty){
    return items.length
      ? `<ul class="a4-res">${items.map(function(e, i){ return `<li${i >= 2 ? ' data-opt="7"' : ''}><span>${esc(e.subject)}</span>${a4Bar(e.pct)}<b>${e.pct}%</b></li>`; }).join('')}</ul>`
      : `<p class="a4-small">${esc(empty)}</p>`;
  };
  return `
  <div class="a4-two a4-results">
    <section class="a4-card"><h3 class="a4-h3">Your strongest Grade 9 results</h3>${list(a.strongest, 'No results entered yet.')}</section>
    <section class="a4-card"><h3 class="a4-h3">Areas to strengthen</h3>${list(a.toStrengthen, 'None below ' + LR_CONFIG.weakBelow + '% — nice work.')}</section>
    <p class="a4-small a4-source">Based on ${esc(a.source)}.</p>
  </div>`;
}
function a4FitBody(R){
  const f = R.fit;
  return `
    <section class="a4-subjects">
      <h3 class="a4-h3">Subject fit</h3>
      ${f.rows.map(function(r, i){ return a4SubjectRow(r, i, R); }).join('')}
    </section>
    ${a4ResultsBox(R)}`;
}

/* ---------------- page 3: where could these subjects take me? ---------------- */
function a4ComboCard(c, kind, pair){
  if(!c) return '';
  const best = kind === 'best';
  return `
  <section class="a4-combo ${best ? 'a4-best' : 'a4-altc'} a4-combo-${kind}">
    <div class="a4-combo-h"><span class="a4-sq">${icon(best ? 'check' : (kind === 'aspirational' ? 'compass' : 'switch'), 'a4-ic')}</span><div><h3 class="a4-h3">${esc(lrComboTitle(kind, pair))}</h3><p class="a4-small">${esc(c.name)}</p></div></div>
    <ul class="a4-pills">${c.subjects.map(function(x){ return `<li>${esc(x)}</li>`; }).join('')}</ul>
    <p class="a4-why">${esc(c.why)}</p>
  </section>`;
}
function a4AreaCard(a, A, i){
  const tag = function(c){ return '<span class="a4-asp-tag">Aspirational — ' + esc(c.needs || 'Mathematics') + ' required</span>'; };
  const allAsp = a.careers.length > 0 && a.careers.every(function(c){ return c.aspirational; });
  const careers = a.careers.map(function(c){ return esc(c.name) + (c.aspirational && !allAsp ? ' ' + tag(c) : ''); }).join(', ') + (allAsp ? ' ' + tag(a.careers[0]) : '');
  const uses = a.gaps.length ? `<b>${A.basis === 'none' ? 'Typically needs' : 'Often also needs'}</b> ${esc(a.gaps.join(', '))}` : '';
  return `
  <article class="a4-area a4-t${(i % 5) + 1}"${a.status !== 'aspirational' && i >= 2 ? ' data-opt="' + (i === 3 ? 3 : 2) + '"' : ''}>
    <div class="a4-area-l">
      <div class="a4-area-h"><span class="a4-dot">${icon(LR_AREA_ICON[a.faculty.id] || 'compass', 'a4-ic')}</span><h3 class="a4-h3">${esc(a.faculty.name)}</h3></div>
      <p class="a4-area-chips"><span class="a4-chip a4-area-${a.status}">${esc(a.label.t)}</span></p>
      <p class="a4-pair"><span><b>Interest &amp; personality</b> ${esc(a.alignLevel.label)}</span><span><b>Academic readiness</b> ${a.readyLevel ? esc(a.readyLevel.label) : 'Not yet available'}</span></p>
    </div>
    <div class="a4-area-r">
      <p class="a4-why">${esc(a.why)}</p>
      <p class="a4-careers-w"><b class="a4-careers-l">Careers to explore</b> ${careers}</p>
      ${uses ? `<p class="a4-small a4-uses">${uses}</p>` : ''}
    </div>
  </article>`;
}
function a4PathwayBody(R){
  const A = R.areas, c = R.combo;
  let combos = '';
  if(c.state === 'ready' && c.best) combos = `<div class="a4-two a4-combos">${a4ComboCard(c.best, 'best')}${c.alt ? a4ComboCard(c.alt, c.kind || 'alternative', c.pair) : ''}</div>`;
  else if(c.state === 'ready') combos = a4Prompt('No subject combination stood out strongly this time — talk through the subjects on the previous page with your teacher.');
  let areas;
  if(!A.ready) areas = a4Prompt('Take the personality assessment to see which broad career areas fit you.');
  else areas = `<div class="a4-areas">${A.list.map(function(a, i){ return a4AreaCard(a, A, i); }).join('')}</div>`;
  const provisional = R.fit.provisional && R.fit.provisional.length ? `
    <section class="a4-card"><h3 class="a4-h3">Subjects your careers rely on</h3>
      <ul class="a4-pills">${R.fit.provisional.map(function(s){ return `<li>${esc(s.subject)}</li>`; }).join('')}</ul>
      <p class="a4-small">These describe the careers, not a personal ranking.</p></section>` : '';
  return `
    ${combos}
    ${provisional}
    <section class="a4-sec">
      <h3 class="a4-h3">Career pathways</h3>
      ${areas}
    </section>`;
}

/* ---------------- page 4: what should I do next? ---------------- */
function a4NextBody(R){
  const f = R.final, S = R.summary;
  const answers = [];
  if(f.thrive) answers.push(['star', '1  Where am I likely to thrive?', [f.thrive]]);
  if(f.fitNow) answers.push(['check', '2  Which subjects fit me best right now?', f.fitNow]);
  if(f.improve.length) answers.push(['flag', (f.fitNow ? '3' : '2') + '  Which areas do I need to improve?', f.improve]);
  if(f.open.length) answers.push(['compass', (f.fitNow ? '4' : '3') + '  Which future pathways could open if I improve?', f.open]);
  // The summary: what was chosen (a table), then the four levels as tiles.
  const word = function(r){
    if(r.kind === 'level') return `<span class="a4-lv a4-lv-${r.level.key}">${esc(r.level.label)}</span>`;
    if(r.kind === 'fit') return `<span class="a4-chip a4-fit-${r.fit.key}">${esc(r.fit.word)}</span>`;
    return '';
  };
  const textRows = S.rows.filter(function(r){ return r.kind === 'text' || r.kind === 'todo'; }).map(function(r){
    return `<tr><th scope="row">${esc(r.area)}</th><td>${r.kind === 'todo' ? `<span class="a4-todo">${esc(r.result)}</span>` : esc(r.result)}</td></tr>`;
  }).join('');
  const tileRows = S.rows.filter(function(r){ return r.kind === 'level' || r.kind === 'fit'; });
  const tiles = tileRows.map(function(r){ return `<div class="a4-tile"><span class="a4-k">${esc(r.kind === 'fit' ? 'Overall fit' : r.area)}</span>${word(r)}</div>`; }).join('');
  const tileNotes = tileRows.filter(function(r){ return r.note; }).map(function(r){ return r.note; });
  const a = R.academic;
  const readiness = a.has ? `
    <section class="a4-card a4-ready">
      <h3 class="a4-h3">Your academic readiness</h3>
      <div class="a4-avg"><b>${a4Pct(a.average)}</b><span>${esc(lrLevel(a.average, 'academic').label)}<small>average result</small></span></div>
    </section>` : `<section class="a4-card a4-ready"><h3 class="a4-h3">Your academic readiness</h3><p class="a4-small">Add your marks to see this.</p></section>`;
  const steps = f.steps.map(function(s, i){ return `<li${i >= 3 ? ' data-opt="9"' : ''}><span>${esc(s.text)}</span></li>`; }).join('');
  return `
    ${answers.length ? `<div class="a4-two a4-answers">${answers.map(function(x, i){
      return `<section class="a4-ans a4-t${i + 1}"><div class="a4-ans-h"><span class="a4-dot">${icon(x[0], 'a4-ic')}</span><h3 class="a4-h3">${esc(x[1])}</h3></div>${x[2].map(function(t, k){ return `<p${k >= 2 ? ' data-opt="6"' : (k === 1 ? ' data-opt="5"' : '')}>${esc(t)}</p>`; }).join('')}</section>`;
    }).join('')}</div>` : ''}
    <div class="a4-two a4-sums">
      <section class="a4-card"><h3 class="a4-h3">${S.complete ? (R.grade9 ? 'Your subject choice summary' : 'Your summary') : 'Your summary so far'}</h3>
        ${textRows ? `<table class="a4-sumtable"><tbody>${textRows}</tbody></table>` : ''}
        ${tiles ? `<div class="a4-tiles">${tiles}</div>` : ''}
        ${tileNotes.length ? `<p class="a4-small a4-tilenote" data-opt="4">${esc(tileNotes.join(' '))}</p>` : ''}
      </section>
      ${readiness}
    </div>
    <section class="a4-card a4-steps"><h3 class="a4-h3">Your next steps</h3><ol>${steps}</ol></section>
    <div class="a4-disc">${icon('info', 'a4-ic')}<div>${R.disclaimer.map(function(t){ return `<p>${esc(t)}</p>`; }).join('')}</div></div>`;
}
function a4StartBody(R){
  const steps = [['Take the personality assessment', 'Shows your personality type, interests and best-suited careers.']];
  if(R.grade9){
    steps.push(['Enter your Grade 9 report results', 'So we can see how ready you are for each subject.']);
    steps.push(['Take the Subject Choice Assessment', 'Shows which Grade 10 subjects fit you best.']);
  }
  return `
    ${a4Info(R)}
    ${a4SecTitle('Start here', 'Your report builds as you go.')}
    <ol class="a4-start">${steps.map(function(s, i){ return `<li><span class="a4-num">${i + 1}</span><div><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div></li>`; }).join('')}</ol>
    <div class="a4-disc">${icon('info', 'a4-ic')}<div>${R.disclaimer.map(function(t){ return `<p>${esc(t)}</p>`; }).join('')}</div></div>`;
}

/* ---------------- the document ---------------- */
function a4Pages(l, R){
  const known = R.summary.rows.some(function(r){ return r.kind !== 'todo'; });
  if(!known) return [{ key: 'start', hero: true, title: 'Start here', question: 'Your report builds as you go.', body: a4StartBody(R) }];
  const pages = [{ key: 'profile', hero: true, title: 'Your Learner Profile', question: 'Who am I?', body: a4ProfileBody(R) }];
  if(R.fit.state === 'ready') pages.push({ key: 'fit', title: 'Your Subject Fit', question: 'Which subjects currently fit me?', body: a4FitBody(R) });
  pages.push({ key: 'pathway', title: 'Your Pathway', question: R.fit.state === 'ready' ? 'Where could these subjects take me?' : 'Where could my interests take me?', body: a4PathwayBody(R) });
  pages.push({ key: 'next', title: 'Your Recommendation', question: 'What should I do next?', body: a4NextBody(R) });
  return pages;
}
function reportA4HTML(l, R){
  R = R || buildLearnerReport(l);
  const pages = a4Pages(l, R);
  // The A4 page rule (no margin: the pages carry their own, so the browser has no room for its URL / date / page
  // numbers) travels with the document, so it applies only while the report is on screen and every other page
  // prints with the browser's usual margins.
  return `<style>@page{size:A4 portrait;margin:0;}</style><div class="a4-doc" lang="en-ZA">${pages.map(function(p, i){ return a4Frame(p, R, i, pages.length); }).join('')}</div>`;
}

/* ---------------- the fit pass ---------------- */
// While a page body is taller than the space it has, tighten it: .c1, .c2, .c3 (smaller gaps
// and paddings), then leave out optional blocks one at a time, the least important first
// (data-opt: the larger the number, the sooner it goes; later in the page goes before earlier).
// Type size is never reduced. Returns the page's fate, for the tests.
function a4FitAll(root){
  root = root || document;
  const fate = [];
  root.querySelectorAll('.a4-page').forEach(function(page){
    const body = page.querySelector('.a4-body');
    const fits = function(){ return body.scrollHeight <= body.clientHeight + 0.5; };
    page.classList.remove('c1', 'c2', 'c3');
    page.querySelectorAll('.a4-gone').forEach(function(e){ e.classList.remove('a4-gone'); });
    let level = 0, dropped = 0; const what = [], goneEls = [];
    for(let lvl = 1; lvl <= 3 && !fits(); lvl++){ page.classList.add('c' + lvl); level = lvl; }
    if(!fits()){
      const opts = Array.prototype.slice.call(page.querySelectorAll('[data-opt]'))
        .map(function(e, i){ return { e: e, p: Number(e.dataset.opt), i: i }; })
        .sort(function(a, b){ return (b.p - a.p) || (b.i - a.i); });
      for(let k = 0; k < opts.length && !fits(); k++){ opts[k].e.classList.add('a4-gone'); goneEls.push(opts[k].e); dropped++; what.push((opts[k].e.className.split(' ')[0] || opts[k].e.tagName.toLowerCase()) + ':' + opts[k].p); }
      // the last block dropped may have been bigger than it needed to be: bring back what fits after all
      if(fits()) for(let k = goneEls.length - 1; k >= 0; k--){
        goneEls[k].classList.remove('a4-gone');
        if(fits()){ dropped--; what.splice(k, 1); goneEls.splice(k, 1); } else goneEls[k].classList.add('a4-gone');
      }
    }
    fate.push({ level: level, dropped: dropped, fits: fits(), what: what });
  });
  return fate;
}
// The fit pass needs the pages laid out, which the hidden print copy is not on screen: show it
// off-screen (invisible, out of the way) for the moment it takes to measure.
function a4MeasureAndFit(){
  const copies = document.querySelectorAll('.print-only .a4-doc');
  if(!copies.length) return;
  document.body.classList.add('a4-measure');
  try { copies.forEach(function(c){ a4FitAll(c); }); }
  finally { document.body.classList.remove('a4-measure'); }
}
window.addEventListener('beforeprint', a4MeasureAndFit);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ a4MeasureAndFit(); });
