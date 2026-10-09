/* ============================================================
   GRADE 9 SUBJECT CHOICE ASSESSMENT -- LEARNER SCREENS
   Route: 'subject-choice'. All scoring/wording comes from
   js/subject_choice_engine.js + js/subject_choice_config.js; this file
   only decides which screen to show and draws it.

   Flow: results first -> interest questions -> the personality
   assessment -> report. A saved report is always viewable.
   ============================================================ */

// The prerequisite for starting: real, grade-appropriate results -- a current
// subject mark or a Grade 9 report mark (the same evidence the readiness
// scoring and the academic profile use). apsLast is deliberately not
// accepted: nothing in the scoring reads it, so it isn't evidence here.
function hasEnteredResults(l){
  const fetCount = l.subjectMarks ? Object.keys(l.subjectMarks).length : 0;
  const g9Count = (l.grade9Report && l.grade9Report.subjects) ? Object.keys(l.grade9Report.subjects).length : 0;
  return fetCount>0 || g9Count>0;
}

const SC_Q_BY_ID = {};
SC_QUESTIONS.forEach(function(q){ SC_Q_BY_ID[q.id] = q; });

function scHasSavedAnswers(l){
  const sc = l.subjectChoice;
  return !!(sc && sc.answers && Object.keys(sc.answers).length);
}
// A draft restored from storage may predate a change to the questions (an
// earlier version asked all 113, six to a page): keep only questions still asked and
// answers still valid, rebuild the order if it is not exactly today's questions, and put
// the learner on a question that exists (an old draft counted pages, so it resumes at the
// first question not yet answered). Field types are checked too, not just presence: a
// draft that came back from storage in an unexpected shape must be repaired, never crash.
function scSanitizeDraft(d){
  const clean = {};
  const given = (d.answers && typeof d.answers === 'object' && !Array.isArray(d.answers)) ? d.answers : {};
  Object.keys(given).forEach(function(id){
    const v = Number(given[id]);
    if(SC_Q_BY_ID[id] && Number.isInteger(v) && v >= 1 && v <= 5) clean[id] = v;
  });
  d.answers = clean;
  const order = (Array.isArray(d.order) ? d.order : []).filter(function(id, i, all){ return SC_Q_BY_ID[id] && all.indexOf(id) === i; });
  if(order.length === SC_QUESTIONS.length){
    d.order = order;
  } else {
    if(!(Number(d.seed) >= 0)) d.seed = (Date.now() ^ scHashString(String(ME.id || 'anon'))) >>> 0;
    d.order = scBuildQuestionOrder(Number(d.seed));
  }
  // A learner only ever stands on a question once every question before it is answered
  // (Continue needs an answer), so the furthest they can be is the first unanswered one --
  // or the "all done" screen when nothing is left. Anything beyond that is a damaged draft.
  const firstOpen = d.order.findIndex(function(id){ return !clean[id]; });
  const furthest = firstOpen === -1 ? d.order.length : firstOpen;
  if(typeof d.step !== 'number' || isNaN(d.step)) d.step = furthest;
  d.step = clamp(Math.floor(d.step), 0, furthest);
  delete d.page;
  return d;
}
function newSubjectChoiceDraft(){
  const seed = (Date.now() ^ scHashString(String(ME.id || 'anon'))) >>> 0;
  return { seed: seed, order: scBuildQuestionOrder(seed), step: 0, dir: 'fwd', answers: {} };
}

function viewSubjectChoice(){
  const l = ensureLearnerObj();
  if(!subjectChoiceAvailable(l)) return subjectChoiceNotAvailableHTML(l);
  if(SUBJECT_CHOICE_DRAFT) return subjectChoiceQuestionsHTML(scSanitizeDraft(SUBJECT_CHOICE_DRAFT), l);
  if(scHasSavedAnswers(l)) return subjectChoiceReportHTML(l);
  if(!hasEnteredResults(l)) return subjectChoicePrerequisiteHTML(l);
  return subjectChoiceIntroHTML(l);
}

/* ---------------- before the questions ---------------- */
// Reached only by a link or a typed address: the navigation and the pages
// that offer this assessment all check subjectChoiceAvailable() first.
function subjectChoiceNotAvailableHTML(l){
  const done = !!(l && l.assessmentCompletedAt);
  return `
  ${pageHeadHTML('Subject Choice Assessment', 'For Grade 9 learners choosing their Grade 10 subjects.')}
  <div class="card">
    <h3>This assessment is for Grade 9 learners</h3>
    <p class="page-sub">It helps a Grade 9 learner choose their Grade 10 subjects. You can still ${done ? 'see your best-suited careers and the subjects they rely on in your report.' : 'take the personality assessment, then see your best-suited careers and the subjects they rely on in your report.'}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      ${done ? '' : `<button class="btn btn-primary" onclick="navigate('assessment')">Take the personality assessment</button>`}
      <button class="btn ${done ? 'btn-primary' : 'btn-ghost'}" onclick="navigate('report')">See your report</button>
    </div>
  </div>`;
}

// Only Grade 9 learners reach this (see subjectChoiceAvailable), and their
// marks go in the Grade 9 report form. The 'subject-choice' parameter brings
// them straight back here when they save.
function subjectChoicePrerequisiteHTML(l){
  return `
  ${pageHeadHTML('Subject Choice Assessment', 'A personalised look at which Grade 10 subjects fit you.')}
  <div class="card">
    <h3>Add your results first</h3>
    <p class="page-sub">We look at three things together — what you enjoy, how you naturally work, and how you are currently performing. Add your Grade 9 report marks first so we can see how ready you are for each subject, then come back to answer the questions.</p>
    <button class="btn btn-primary" onclick="navigate('grade9-report','subject-choice')">Enter my Grade 9 report results</button>
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
// One question per screen, laid out exactly like the personality assessment: a progress
// bar, the question, the same answer styles (text buttons, numbered dots, a slider,
// faces), the pick animation and a pause before the next question slides in.
function subjectChoiceQuestionsHTML(d, l){
  const total = d.order.length, step = d.step;
  const personalityDone = !!l.assessmentCompletedAt;
  if(step >= total){
    return `
    ${pageHeadHTML('Nice work!', 'You’ve answered every question.')}
    <div class="card q-anim" style="text-align:center;padding:40px 24px;">
      ${icon('trophy')}
      <h3 style="margin-top:10px;">All ${total} questions done</h3>
      <p class="page-sub">${personalityDone ? 'Ready to see which Grade 10 subjects fit you best?' : 'Next, a quick look at how you naturally work — then your subject results.'}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
        <button class="btn btn-ghost" onclick="App.subjectChoiceGoto(${total - 1},'back')">Back</button>
        <button class="btn btn-primary" id="scNext" onclick="App.subjectChoiceFinish()">${icon('check')} ${personalityDone ? 'See my subject results' : 'Save & take the personality assessment'}</button>
      </div>
      <div class="sc-foot"><button class="link-btn" onclick="App.subjectChoiceStartOver()">Start over</button></div>
    </div>`;
  }
  const q = SC_Q_BY_ID[d.order[step]];
  const value = d.answers[q.id] || 0;
  const pct = Math.round(step / total * 100);
  const animClass = 'q-anim' + (d.dir === 'back' ? ' back' : '');
  return `
  ${pageHeadHTML('Subject Choice Assessment', `Question ${step + 1} of ${total} — go with your first instinct. There are no wrong answers.`)}
  <div class="aps-bar" style="margin-bottom:18px;"><div style="width:${pct}%"></div></div>
  <div class="card ${animClass}">
    <div class="qcard" style="margin-bottom:8px;">
      <div class="qn">QUESTION ${step + 1} OF ${total}</div>
      <div class="qt" style="font-size:19px;margin:10px 0 4px;">${esc(q.text)}</div>
    </div>
    ${assessWidgetHTML(step, 'subject', value)}
    <div style="display:flex;gap:10px;margin-top:22px;justify-content:center;">
      ${step > 0 ? `<button class="btn btn-ghost" onclick="App.subjectChoiceBack()">Back</button>` : ''}
      <button class="btn btn-primary" ${value ? '' : 'disabled'} onclick="App.subjectChoiceNext()">Continue</button>
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
  const pti = personalityTypeInfo(l);
  // The same best-suited careers (and explanation) as the learner report,
  // so the two pages can't name different careers for the same learner.
  const matches = bestSuitedCareers(l, 5);
  const fit = reconcileCareersAndSubjects(matches, rep);
  return `
  ${pageHeadHTML('Your Subject Choice Report', 'Based on what you enjoy, how you naturally work and how you are currently performing.')}
  <button class="btn btn-ghost btn-sm" style="margin-bottom:14px;" onclick="navigate('report')">← See your summary report</button>
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
    ${scBadge(m.headline, m.pick === 'either' ? 'badge-explore' : 'badge-good')}
    <p style="margin-top:10px;">${esc(m.message)}</p>
    ${m.careerNote ? `<p>${esc(m.careerNote)}</p>` : ''}
    ${m.pick !== 'mathematics' ? `<p class="page-sub">${esc(m.litNote)}</p>` : ''}
    <p class="page-sub">${esc(m.always)}</p>
  </div>

  ${Object.keys(rep.pairs).filter(function(k){ return rep.pairs[k].pick !== 'either'; }).map(function(k){ const d = rep.pairs[k]; return `
  <div class="card" style="margin-top:16px;">
    <h3>${esc(d.title)}</h3>
    ${scBadge(d.headline, 'badge-good')}
    <p style="margin-top:10px;">${esc(d.message)}</p>
    ${d.careerNote ? `<p>${esc(d.careerNote)}</p>` : ''}
  </div>`; }).join('')}

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
  ${rep.variant ? `
  <div class="card" style="margin-top:14px;border-style:dashed;">
    <div class="page-sub" style="font-size:12px;font-weight:700;">${rep.variant.kind === 'aspirational' ? 'Aspirational pathway — not the safest choice yet' : 'A safer alternative'}</div>
    <h3>${esc(rep.variant.name)}</h3>
    <div class="pill-list" style="margin-bottom:10px;">${rep.variant.labels.map(function(n){ return `<span class="pill">${esc(n)}</span>`; }).join('')}</div>
    <p>${esc(rep.variant.why)}</p>
  </div>` : ''}
  <p class="page-sub" style="margin-top:10px;">These are starting points, not streams — you can mix and match. ${esc(SC_COPY.schoolOffers)}</p>

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
    <button class="btn btn-ghost" onclick="App.subjectChoiceRetake()">Retake the Subject Choice Assessment</button>
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
