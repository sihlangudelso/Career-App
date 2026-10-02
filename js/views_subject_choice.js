/* ============================================================
   GRADE 9 SUBJECT CHOICE ASSESSMENT -- LEARNER SCREENS
   Route: 'subject-choice'. All scoring/wording comes from
   js/subject_choice_engine.js + js/subject_choice_config.js; this file
   only decides which screen to show and draws it.

   Flow: results first (same principle as Subject Guidance) -> interest
   questions -> the existing personality assessment -> report. A saved
   report is always viewable.
   ============================================================ */

const SC_Q_BY_ID = {};
SC_QUESTIONS.forEach(function(q){ SC_Q_BY_ID[q.id] = q; });

function scHasSavedAnswers(l){
  const sc = l.subjectChoice;
  return !!(sc && sc.answers && Object.keys(sc.answers).length);
}
function scPageCount(d){ return Math.ceil(d.order.length / SC_CONFIG.questionsPerPage); }
function scPageIds(d){
  const per = SC_CONFIG.questionsPerPage;
  return d.order.slice(d.page * per, d.page * per + per);
}
// A draft restored from storage may predate a change to the question bank:
// drop questions that no longer exist, append new ones, and clamp the page.
function scSanitizeDraft(d){
  d.order = (d.order || []).filter(function(id){ return SC_Q_BY_ID[id]; });
  const inOrder = {};
  d.order.forEach(function(id){ inOrder[id] = true; });
  SC_QUESTIONS.forEach(function(q){ if(!inOrder[q.id]) d.order.push(q.id); });
  const clean = {};
  Object.keys(d.answers || {}).forEach(function(id){
    const v = Number(d.answers[id]);
    if(SC_Q_BY_ID[id] && v >= 1 && v <= 5) clean[id] = v;
  });
  d.answers = clean;
  d.page = clamp(Number(d.page) || 0, 0, scPageCount(d) - 1);
  return d;
}
function newSubjectChoiceDraft(){
  const seed = (Date.now() ^ scHashString(String(ME.id || 'anon'))) >>> 0;
  return { seed: seed, order: scBuildQuestionOrder(seed), page: 0, answers: {} };
}

function viewSubjectChoice(){
  const l = ensureLearnerObj();
  if(SUBJECT_CHOICE_DRAFT) return subjectChoiceQuestionsHTML(scSanitizeDraft(SUBJECT_CHOICE_DRAFT), l);
  if(scHasSavedAnswers(l)) return subjectChoiceReportHTML(l);
  if(!hasEnteredResults(l)) return subjectChoicePrerequisiteHTML(l);
  return subjectChoiceIntroHTML(l);
}

/* ---------------- before the questions ---------------- */
function subjectChoicePrerequisiteHTML(l){
  const isG9 = l.grade === 9;
  const route = isG9 ? 'grade9-report' : 'profile';
  const label = isG9 ? 'Enter my Grade 9 report results' : 'Add my subject marks';
  return `
  ${pageHeadHTML('Subject Choice Assessment', 'A personalised look at which Grade 10 subjects fit you.')}
  <div class="card">
    <h3>Add your results first</h3>
    <p class="page-sub">We look at three things together — what you enjoy, how you naturally work, and how you are currently performing. Add your ${isG9 ? 'Grade 9 report' : 'subject'} marks first so we can see how ready you are for each subject, then come back to answer the questions.</p>
    <button class="btn btn-primary" onclick="navigate('${route}')">${label}</button>
  </div>`;
}

function subjectChoiceIntroHTML(l){
  const total = SC_QUESTIONS.length;
  const mins = Math.max(5, Math.round(total * 6 / 60));
  const personalityDone = !!l.assessmentCompletedAt;
  const step = function(done, title, text){
    return `<div class="sc-step"><div class="mk ${done ? 'done' : ''}">${done ? icon('check') : ''}</div><div><b>${title}</b><span class="d">${text}</span></div></div>`;
  };
  return `
  ${pageHeadHTML('Subject Choice Assessment', 'Which Grade 10 subjects fit you best? Let’s talk about what you enjoy.')}
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
    <h1 style="font-size:22px;">Let’s find subjects that fit you</h1>
    <p style="font-size:15px;">${total} quick questions about things you enjoy — about ${mins} minutes. Just tap what sounds most like you. There are no right or wrong answers, and this isn’t a test.</p>
  </div>
  <div class="card">
    <h3>What we’ll look at</h3>
    <div class="sc-steps">
      ${step(true, 'How you are currently performing', 'Your marks show how ready you are for each subject.')}
      ${step(false, 'What you enjoy', 'That’s these questions — fun, short and about everyday things.')}
      ${step(personalityDone, 'How you naturally work', personalityDone ? 'From the personality assessment you already did.' : 'From the personality assessment — we’ll take you straight there when you finish.')}
    </div>
    <div style="margin-top:18px;"><button class="btn btn-primary" onclick="App.subjectChoiceStart()">Let’s start</button></div>
  </div>`;
}

/* ---------------- the questions ---------------- */
function subjectChoiceQuestionHTML(q, value){
  return `
  <div class="sc-q" id="scq_${q.id}">
    <div class="sc-qt">${esc(q.text)}</div>
    <div class="sc-scale" role="group" aria-label="${esc(q.text)}">
      ${[1, 2, 3, 4, 5].map(function(n){
        return `<button class="${value === n ? 'on' : ''}" aria-pressed="${value === n}" onclick="App.subjectChoiceAnswer('${q.id}',${n},this)"><span class="n">${n}</span><span class="l">${esc(SC_CONFIG.scaleLabels[n - 1])}</span></button>`;
      }).join('')}
    </div>
  </div>`;
}
function subjectChoiceQuestionsHTML(d, l){
  const total = d.order.length;
  const pages = scPageCount(d);
  const answered = Object.keys(d.answers).length;
  const ids = scPageIds(d);
  const pageDone = ids.every(function(id){ return d.answers[id]; });
  const isLast = d.page === pages - 1;
  const personalityDone = !!l.assessmentCompletedAt;
  const nextLabel = isLast ? (personalityDone ? 'See my subject results' : 'Save & take the personality assessment') : 'Next';
  const nextAction = isLast ? 'App.subjectChoiceFinish()' : 'App.subjectChoicePage(1)';
  const nextOff = isLast ? answered < total : !pageDone;
  return `
  ${pageHeadHTML('Subject Choice Assessment', 'Part ' + (d.page + 1) + ' of ' + pages + ' — go with your first instinct. There are no wrong answers.')}
  <div class="aps-bar" style="margin-bottom:6px;"><div id="scBar" style="width:${Math.round(answered / total * 100)}%"></div></div>
  <div class="page-sub" style="margin-bottom:14px;"><span id="scCount">${answered}</span> of ${total} answered</div>
  <div class="card q-anim${d.dir === 'back' ? ' back' : ''}">
    ${ids.map(function(id){ return subjectChoiceQuestionHTML(SC_Q_BY_ID[id], d.answers[id]); }).join('')}
    <div class="sc-nav">
      ${d.page > 0 ? `<button class="btn btn-ghost" onclick="App.subjectChoicePage(-1)">Back</button>` : ''}
      <button class="btn btn-primary" id="scNext" ${nextOff ? 'disabled' : ''} onclick="${nextAction}">${nextLabel}</button>
    </div>
    <div class="sc-foot"><button class="link-btn" onclick="App.subjectChoiceStartOver()">Start over</button></div>
  </div>`;
}

/* ---------------- the report ---------------- */
const SC_LEVEL_BADGE = { High: 'badge-strong', Moderate: 'badge-good', Low: 'badge-low' };
const SC_BAND_BADGE = { strong: 'badge-strong', good: 'badge-strong', reasonable: 'badge-good', developing: 'badge-explore', support: 'badge-explore' };

function scBadge(text, cls){ return `<span class="badge ${cls}">${esc(text)}</span>`; }
function scReadinessBadge(r){
  return r.academic.band
    ? scBadge(r.academic.band.label, SC_BAND_BADGE[r.academic.band.key])
    : scBadge('Not yet available', 'badge-low');
}

function subjectCardHTML(r, full){
  const f = r.feedback;
  return `
  <div class="card sc-card">
    <div class="sc-head">
      <div>
        <h3>${esc(r.label)}</h3>
        ${scBadge(r.category.label, r.category.badge)}
      </div>
      <div style="text-align:right;"><div class="sc-pct">${Math.round(r.fit.overall)}%</div><div class="page-sub" style="font-size:11.5px;">Overall match</div></div>
    </div>
    <div class="aps-bar" style="margin:12px 0 4px;"><div style="width:${Math.round(r.fit.overall)}%"></div></div>
    <div class="sc-grade">
      <div><div class="k">Interest</div>${scBadge(r.interest.level, SC_LEVEL_BADGE[r.interest.level])}</div>
      <div><div class="k">Personality alignment</div>${r.personality.level ? scBadge(r.personality.level, SC_LEVEL_BADGE[r.personality.level]) : scBadge('Not yet available', 'badge-low')}</div>
      <div><div class="k">Academic readiness</div>${scReadinessBadge(r)}</div>
    </div>
    <div class="sc-label">Why it matches you</div>
    <p>${f.why.map(esc).join(' ')}</p>
    <div class="sc-label">What to consider</div>
    <p>${esc(f.consider)}</p>
    ${full ? `
    <div class="sc-label">Will it feel natural?</div>
    <p><b>Natural fit: ${esc(f.thrive.naturalFit.level || '—')}</b></p>
    <p class="page-sub">${esc(f.thrive.explanation)}</p>
    <div class="sc-label">May support pathways such as</div>
    <div class="pill-list">${r.pathways.slice(0, 5).map(function(p){ return `<span class="pill">${esc(p)}</span>`; }).join('')}</div>
    ` : ''}
    ${r.note ? `<p class="page-sub" style="margin-top:10px;">${esc(r.note)}</p>` : ''}
  </div>`;
}

function subjectChoiceReportHTML(l){
  const rep = buildSubjectChoiceReport(l);
  if(!rep.ready.personality) return subjectChoicePersonalityNeededHTML();
  const W = SC_CONFIG.weights;
  const pctOf = function(x){ return Math.round(x * 100); };
  const letter = function(i){ return String.fromCharCode(65 + i); };
  const m = rep.mathChoice;
  const mathLean = scMathLeanLabel(m);
  const pti = personalityTypeInfo(l);
  // The same best-suited careers (and explanation) as the report overview,
  // so the two pages can't name different careers for the same learner.
  const matches = bestSuitedCareers(l, 5);
  const fit = reconcileCareersAndSubjects(matches, rep);
  return `
  ${pageHeadHTML('Your Subject Choice Report', 'Based on what you enjoy, how you naturally work and how you are currently performing.')}
  ${!rep.ready.complete ? `<p class="page-sub" style="margin-bottom:14px;">This report uses the ${rep.answered} of ${rep.total} questions you answered. The question set has grown since you took it — retake to include everything.</p>` : ''}

  <div class="section-title"><h2>1. Your subject choice profile</h2></div>
  <div class="card card-top-accent">
    ${rep.profile.summary.map(function(s){ return `<p>${esc(s)}</p>`; }).join('')}
    ${pti ? `<div class="sc-label">Your personality type</div><div class="pill-list"><span class="pill rec"><b>${esc(pti.code)}</b> · ${esc(pti.top[0].name)} · ${esc(pti.top[1].name)}</span></div>` : ''}
    <p class="page-sub" style="margin-top:12px;font-size:12.5px;">Each match percentage blends what you enjoy (${pctOf(W.interest)}%), how you naturally work (${pctOf(W.personality)}%) and how you are currently performing (${pctOf(W.academic)}%).</p>
  </div>

  <div class="section-title"><h2>2. Your strongest subject matches</h2></div>
  ${rep.top.length
    ? `<div class="grid grid-2">${rep.top.map(function(r){ return subjectCardHTML(r, true); }).join('')}</div>`
    : `<div class="card"><p style="margin:0;">No subject stood out strongly this time — and that is completely fine. It can simply mean you are still exploring. Try the assessment again after you have looked into a few subjects, and talk to your Life Orientation teacher about what you enjoy.</p></div>`}

  <div class="card" style="margin-top:16px;">
    <h3>Mathematics or Mathematical Literacy?</h3>
    ${scBadge(mathLean, 'badge-good')}
    <p style="margin-top:10px;">${esc(m.message)}</p>
    <p class="page-sub">${esc(m.always)}</p>
  </div>

  <div class="section-title"><h2>3. Subjects worth exploring</h2></div>
  ${rep.explore.length
    ? `<div class="grid grid-2">${rep.explore.map(function(r){ return subjectCardHTML(r, false); }).join('')}</div>`
    : `<div class="card"><p class="page-sub" style="margin:0;">Your strongest matches above already cover the subjects that line up best with you.</p></div>`}

  <div class="section-title"><h2>4. Subjects that may require more effort</h2></div>
  ${rep.effort.length ? `
  <div class="card">
    <p>${esc(SC_COPY.lowerAlignment)}</p>
    <div class="pill-list" style="margin-top:6px;">${rep.effort.map(function(r){ return `<span class="pill">${esc(r.label)} · ${Math.round(r.fit.overall)}%</span>`; }).join('')}</div>
    ${rep.effort.some(function(r){ return r.note; }) ? `<p class="page-sub" style="margin-top:10px;">${rep.effort.filter(function(r){ return r.note; }).map(function(r){ return esc(r.label + ': ' + r.note); }).join(' ')}</p>` : ''}
  </div>` : `
  <div class="card"><p class="page-sub" style="margin:0;">None of the subjects showed notably lower alignment with your interests and working style — a good sign that you have plenty of options.</p></div>`}

  <div class="section-title"><h2>5. Your best subject combinations</h2></div>
  <div class="grid grid-2">
    ${rep.combos.map(function(c, i){ return `
    <div class="card">
      <div class="page-sub" style="font-size:12px;font-weight:700;">Option ${letter(i)}</div>
      <h3>${esc(c.name)}</h3>
      <div class="pill-list" style="margin-bottom:10px;">${c.labels.map(function(n){ return `<span class="pill rec">${esc(n)}</span>`; }).join('')}</div>
      <p>${esc(c.why)}</p>
      <p class="page-sub" style="margin:0;">Overall fit ${Math.round(c.score)}%</p>
    </div>`; }).join('')}
  </div>
  <p class="page-sub" style="margin-top:10px;">These are starting points, not streams — you can mix and match.</p>

  <div class="section-title"><h2>6. What you should work on</h2></div>
  <div class="card"><ul style="margin:0;padding-left:20px;">${rep.workOn.map(function(t){ return `<li style="margin-bottom:6px;">${esc(t)}</li>`; }).join('')}</ul></div>

  <div class="section-title"><h2>7. Careers these subjects keep open</h2></div>
  <h3 style="margin:0 0 4px;">Your best-suited careers</h3>
  <p class="page-sub" style="margin-bottom:12px;">From your personality and strengths assessment — with how your recommended subjects relate to each.</p>
  ${matches.map(function(mt){ return `<div class="ov-career">${careerRowHTML(mt.career, mt.score, l, mt.category, { route:'subject-choice' })}${careerSupportLineHTML(careerSubjectSupport(mt.career, rep))}</div>`; }).join('')}
  ${fit.length ? `<div class="card" style="margin:6px 0 18px;">${fit.map(function(s, i){ return `<p style="margin:0 0 ${i === fit.length - 1 ? 0 : 8}px;">${esc(s)}</p>`; }).join('')}</div>` : ''}
  <div class="card">
    <h3>Fields your recommended subjects connect to</h3>
    <p class="page-sub">From your subject interests — these can differ from the careers above, and that is fine.</p>
    <p>These subjects may keep these broad pathways open: ${esc(rep.careers.pathways.slice(0, 6).join(', '))}.</p>
    ${rep.careers.clusters.length ? `<div class="grid grid-2" style="margin-top:12px;">${rep.careers.clusters.map(function(c){ return `
      <div class="card" style="padding:14px;">
        <b>${esc(c.name)}</b>
        <div class="pill-list" style="margin-top:8px;">${c.careers.map(function(n){ return `<span class="pill">${esc(n)}</span>`; }).join('')}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="navigate('cluster','${esc(c.id)}')">Explore this field</button>
      </div>`; }).join('')}</div>` : ''}
    <p class="page-sub" style="margin:12px 0 0;">Taking a subject does not guarantee entry into a career — requirements differ between universities, colleges and years.</p>
  </div>

  <div style="margin-top:20px;">${disclaimerHTML(SC_COPY.finalDecision + ' Talk it through with your Life Orientation teacher or subject counsellor.')}</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
    <button class="btn btn-ghost" onclick="App.subjectChoiceRetake()">Retake the assessment</button>
    <button class="btn btn-ghost" onclick="navigate('home')">Back to dashboard</button>
  </div>`;
}

function subjectChoicePersonalityNeededHTML(){
  return `
  ${pageHeadHTML('Subject Choice Assessment', 'One more step to see your results.')}
  <div class="card">
    <h3>Your answers are saved</h3>
    <p class="page-sub">To see how your natural working style fits each subject, take the quick personality assessment. As soon as you finish it, we’ll bring you straight back to your subject results.</p>
    <button class="btn btn-primary" onclick="navigate('assessment')">Take the personality assessment</button>
  </div>`;
}
