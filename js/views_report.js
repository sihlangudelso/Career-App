/* ---------------- Your Career & Subject Choice Report ---------------- */
// One report, organised as in-page tabs (not six separate nav items),
// matching the navigation structure asked for: Overview / My Profile /
// Career Pathways / Careers / Subjects / Next Steps. Each tab is added in
// its own phase as it's built -- REPORT_TABS grows as the report does.
const REPORT_TABS = [
  { id:'overview', label:'Overview' },
  { id:'profile', label:'My Profile' },
  { id:'pathways', label:'Career Pathways' },
  { id:'careers', label:'Careers' },
  { id:'academic', label:'Academic Strengths' },
  { id:'subjects', label:'Subjects' },
  { id:'next-steps', label:'Next Steps' },
];
// Display metadata for buildSubjectRelevanceTiers' 4 tiers -- never
// implies an optional subject is compulsory; each label is distinct from
// the others on purpose.
const SUBJECT_TIER_META = {
  required: { label:'Required for many programmes', pillClass:'req' },
  strongly: { label:'Strongly recommended', pillClass:'rec' },
  useful: { label:'Useful', pillClass:'' },
  complementary: { label:'Optional / complementary', pillClass:'' },
};

function viewReport(){
  const l = ensureLearnerObj();
  const tab = (ROUTE_PARAM && REPORT_TABS.some(t=>t.id===ROUTE_PARAM)) ? ROUTE_PARAM : 'overview';
  const body =
    tab==='overview' ? reportOverviewHTML(l) :
    tab==='profile' ? learnerProfileBodyHTML(l) :
    tab==='pathways' ? reportPathwaysHTML(l) :
    tab==='careers' ? reportCareersHTML(l) :
    tab==='academic' ? reportAcademicHTML(l) :
    tab==='subjects' ? reportSubjectsHTML(l) :
    tab==='next-steps' ? reportNextStepsHTML(l) :
    reportOverviewHTML(l);
  return `
  ${pageHeadHTML('Your Career & Subject Choice Report', 'A starting point for exploring careers and Grade 10 subjects — not a prediction of your future.')}
  <div class="filter-bar" style="margin-bottom:10px;">
    ${REPORT_TABS.map(t=>`<button class="chip-select ${tab===t.id?'on':''}" onclick="navigate('report','${t.id}')">${esc(t.label)}</button>`).join('')}
  </div>
  <button class="btn btn-ghost btn-sm" style="margin-bottom:18px;" onclick="window.print()">${icon('download')} Print / Save as PDF</button>
  ${body}
  <div class="print-only">${reportPrintHTML(l)}</div>`;
}

// Part 1 — report header: learner name/grade/school/assessment date + the
// required non-deterministic-sounding intro sentence. Shown once, at the
// top of Overview, not repeated on every tab (the tab bar above already
// makes clear this is all one report).
function reportHeaderHTML(l){
  const dateStr = l.assessmentCompletedAt
    ? new Date(l.assessmentCompletedAt).toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' })
    : null;
  return `
  <div class="card" style="margin-bottom:18px;">
    <div class="grid grid-3">
      <div><div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);">Learner</div><div style="font-weight:700;">${esc(ME.name||'You')}</div></div>
      <div><div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);">Grade</div><div style="font-weight:700;">${l.grade?('Grade '+l.grade):'—'}</div></div>
      <div><div style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);">School</div><div style="font-weight:700;">${esc(l.school||'—')}</div></div>
    </div>
    ${dateStr?`<div class="page-sub" style="margin-top:10px;">Assessment completed ${esc(dateStr)}</div>`:''}
    <p style="margin:12px 0 0;">Your results combine your interests, working style and academic performance to help you explore career pathways and make more informed Grade 10 subject choices.</p>
  </div>`;
}

// Part 10 — Overview: the one page that pulls the report together. It
// leads with the three things a learner most wants to know -- their Grade
// 10 subject recommendations, their personality type and their best-suited
// careers -- then explains how those fit together, and everything else in
// the report follows. Each block reads from ONE canonical source, and says
// which: subjects from the Subject Choice Assessment, personality type from
// the personality assessment (personalityTypeInfo), careers from the same
// computeMatches() ranking the Career Matches page uses. Never a separate,
// potentially-drifting summary calculation.

// Slim one-line identity (the large header card above is kept for print).
function reportIdentityHTML(l){
  const dateStr = l.assessmentCompletedAt
    ? new Date(l.assessmentCompletedAt).toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' })
    : null;
  const parts = [ME.name || 'You', l.grade ? ('Grade ' + l.grade) : null, l.school || null].filter(Boolean);
  return `<div class="page-sub ov-identity">${esc(parts.join(' · '))}${dateStr ? ' · Personality assessment completed ' + esc(dateStr) : ''}</div>`;
}

// Where this learner's Grade 10 subject recommendations come from:
//  assessment       -- Subject Choice Assessment done (and the personality
//                      assessment it needs): the personalised list
//  needsPersonality -- answers saved, personality assessment still to do
//  provisional      -- no Subject Choice yet: the subjects their top career
//                      pathways rely on (clearly labelled as that)
//  none             -- nothing to base a list on yet
function reportSubjectSource(l){
  if(scHasSavedAnswers(l)){
    const rep = buildSubjectChoiceReport(l);
    return rep.ready.personality ? { kind:'assessment', report:rep } : { kind:'needsPersonality' };
  }
  const tiers = buildSubjectRelevanceTiers(l);
  const list = [];
  ['required', 'strongly', 'useful'].forEach(tier=>{ tiers[tier].forEach(s=>list.push({ subject:s.subject, tier:tier })); });
  return list.length ? { kind:'provisional', list:list } : { kind:'none' };
}

// A career's required/helpful subjects with where each sits in the
// learner's subject results -- how the careers and subjects relate.
function careerSupportLineHTML(sup){
  if(!sup || (!sup.required.length && !sup.helpful.length)) return '';
  const label = { explore:'worth exploring', effort:'needs extra effort', possible:'not highlighted' };
  const pill = (s, cls)=>`<span class="pill ${cls}">${esc(s.subject)}${s.status === 'recommended' ? ' ✓' : ' · ' + label[s.status]}</span>`;
  return `<div class="pill-list ov-support">
    ${sup.required.length ? `<span class="ov-k">Needs</span>${sup.required.map(s=>pill(s, 'req')).join('')}` : ''}
    ${sup.helpful.length ? `<span class="ov-k">Also helpful</span>${sup.helpful.slice(0, 3).map(s=>pill(s, 'rec')).join('')}` : ''}
  </div>`;
}

// Top subject matches as rows (name, category, match %), shared by the
// Overview and the Subjects tab so they can never list different subjects.
function recommendedSubjectRowsHTML(rep){
  return rep.top.length
    ? rep.top.map(r=>`<div class="ov-item"><div><b>${esc(r.label)}</b><div class="ov-sub"><span class="badge ${r.category.badge}">${esc(r.category.label)}</span></div></div><div class="ov-pct">${Math.round(r.fit.overall)}%</div></div>`).join('')
    : `<p class="page-sub" style="margin:0 0 6px;">No subject stood out strongly this time — your full subject report shows what is worth exploring.</p>`;
}

function overviewSubjectsHTML(l, src){
  const title = (badge)=>`<div class="section-title" style="margin-top:0;"><h2>Grade 10 subject recommendations</h2>${badge}</div>`;
  if(src.kind === 'assessment'){
    const rep = src.report;
    return `${title('<span class="badge badge-good">From your Subject Choice Assessment</span>')}
    <div class="card" style="margin-bottom:6px;">
      ${recommendedSubjectRowsHTML(rep)}
      <p class="ov-math"><b>Mathematics or Mathematical Literacy:</b> ${esc(scMathLeanLabel(rep.mathChoice))}</p>
      <button class="btn btn-ghost btn-sm" onclick="navigate('subject-choice')">See your full subject report</button>
    </div>`;
  }
  if(src.kind === 'needsPersonality'){
    return `${title('')}
    <div class="card"><p>Your Subject Choice answers are saved. Take the personality assessment to see your Grade 10 subject recommendations — it only takes a few minutes.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('assessment')">Take the personality assessment</button></div>`;
  }
  if(src.kind === 'provisional'){
    return `${title('<span class="badge badge-explore">Based on your career pathways so far</span>')}
    <div class="card">
      ${src.list.slice(0, 5).map(s=>`<div class="ov-item"><div><b>${esc(s.subject)}</b><div class="ov-sub page-sub">${esc(SUBJECT_TIER_META[s.tier].label)}</div></div></div>`).join('')}
      <p class="page-sub" style="margin:10px 0;">${l.exploringOnly ? 'These are the subjects your strongest career pathways lean on. The Subject Choice Assessment is for school learners choosing Grade 10 subjects.' : 'These are the subjects your strongest career pathways lean on. The Subject Choice Assessment gives a personalised recommendation based on what you enjoy, how you work and how you are performing.'}</p>
      ${l.exploringOnly
        ? `<button class="btn btn-ghost btn-sm" onclick="navigate('profile')">Set up a school-learner profile</button>`
        : `<button class="btn btn-primary btn-sm" onclick="navigate('subject-choice')">Take the Subject Choice Assessment</button>`}
    </div>`;
  }
  return `${title('')}
  <div class="card"><p class="page-sub" style="margin:0 0 10px;">${l.exploringOnly ? 'Grade 10 subject recommendations are for school learners — set up a school-learner profile to get yours.' : 'Your Grade 10 subject recommendations will appear here once you have added your results and taken the Subject Choice Assessment.'}</p>
    ${l.exploringOnly
      ? `<button class="btn btn-ghost btn-sm" onclick="navigate('profile')">Set up a school-learner profile</button>`
      : `<button class="btn btn-primary btn-sm" onclick="navigate('subject-choice')">Start the Subject Choice Assessment</button>`}</div>`;
}

function overviewPersonalityHTML(l){
  const p = personalityTypeInfo(l);
  const title = `<div class="section-title"><h2>Your personality type</h2></div>`;
  if(!p){
    return `${title}<div class="card"><p class="page-sub" style="margin:0 0 10px;">Take the personality assessment to discover your type — it also shapes your career matches.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('assessment')">Take the personality assessment</button></div>`;
  }
  return `${title}
  <div class="card">
    <div class="ov-type">
      <div class="ov-code">${esc(p.code)}</div>
      <div style="flex:1;min-width:200px;">
        <div class="ov-names">${esc(p.top[0].name)} · ${esc(p.top[1].name)}</div>
        <p style="margin:0;">${esc(p.summary)}</p>
      </div>
    </div>
    ${p.strengths.length ? `<div class="ov-label">Your top strengths</div><div class="pill-list">${p.strengths.map(s=>`<span class="pill rec">${esc(s.label)}</span>`).join('')}</div>` : ''}
    <p class="page-sub" style="margin:12px 0 10px;">A starting point for exploring careers, not a fixed label.</p>
    <button class="btn btn-ghost btn-sm" onclick="navigate('report','profile')">See your full profile</button>
  </div>`;
}

function overviewCareersHTML(l, matches, rep){
  const title = `<div class="section-title"><h2>Best-suited careers</h2></div>`;
  if(!l.assessmentCompletedAt || !matches.length){
    return `${title}<div class="card"><p class="page-sub" style="margin:0 0 10px;">Take the personality assessment to see careers matched to your interests, strengths and results.</p>
      <button class="btn btn-primary btn-sm" onclick="navigate('assessment')">Take the personality assessment</button></div>`;
  }
  return `${title}
  ${matches.map(m=>`<div class="ov-career">${careerRowHTML(m.career, m.score, l, m.category, { route:'report', param:'overview' })}${rep ? careerSupportLineHTML(careerSubjectSupport(m.career, rep)) : ''}</div>`).join('')}
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:4px;">
    <button class="btn btn-ghost btn-sm" onclick="navigate('matches')">See all career matches</button>
    <button class="btn btn-ghost btn-sm" onclick="navigate('report','careers')">Careers in your strongest pathways</button>
  </div>`;
}

function overviewFitHTML(sentences){
  if(!sentences.length) return '';
  return `<div class="section-title"><h2>How these fit together</h2></div>
  <div class="card">${sentences.map((s, i)=>`<p style="margin:0 0 ${i === sentences.length - 1 ? 0 : 8}px;">${esc(s)}</p>`).join('')}</div>`;
}

// The three headline blocks + how they fit together. Shared by the
// Overview tab and the printed report.
function reportOverviewCoreHTML(l){
  const src = reportSubjectSource(l);
  const rep = src.kind === 'assessment' ? src.report : null;
  const matches = l.assessmentCompletedAt ? computeMatches(l).slice(0, 5) : [];
  const fit = rep ? reconcileCareersAndSubjects(matches, rep) : [];
  return `${overviewSubjectsHTML(l, src)}${overviewPersonalityHTML(l)}${overviewCareersHTML(l, matches, rep)}${overviewFitHTML(fit)}`;
}

function reportOverviewHTML(l){
  const identity = reportIdentityHTML(l);
  const topDomains = computeStrengthDomains(l).filter(d=>d.hasEvidence).slice(0,3);
  if(!topDomains.length && !scHasSavedAnswers(l)){
    return `${identity}<div class="empty-state">${icon('target')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">assessment</a> or enter your <a href="#" onclick="navigate('grade9-report');return false;">Grade 9 Report Results</a> to build your report.</p></div>`;
  }
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null).slice(0,3);
  const guidanceNeeded = isGuidanceRequired(l);

  let attentionMsg = '';
  if(guidanceNeeded){
    const top = pathways[0];
    const conflict = top && subjectConflictForFaculty(l, top.faculty.id);
    attentionMsg = (conflict && conflict.hasConflict) ? conflict.reason
      : (!l.intendedSubjects || !l.intendedSubjects.length)
        ? 'You haven’t noted which Grade 10 subjects you’re leaning toward yet — add them in the Subjects section so we can check they support your strongest pathways.'
        : 'Your current results suggest one of your strongest pathways could use some academic support — see the Subjects and Academic Strengths sections for details.';
  }

  return `
  ${identity}
  ${reportOverviewCoreHTML(l)}

  <div class="section-title"><h2>More from your report</h2></div>
  ${topDomains.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your strongest areas</h3>
    <p class="page-sub" style="margin-bottom:10px;">Where your results and interests are strongest together:</p>
    <div class="pill-list">${topDomains.map(d=>`<span class="pill rec">${esc(d.domain.name)}</span>`).join('')}</div>
  </div>` : ''}

  ${pathways.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your strongest pathways</h3>
    ${pathways.map(p=>{ const al=alignmentLabel(p.alignment); return `<div class="kv"><b>${esc(p.faculty.name)}</b><span class="badge ${al.c}">${esc(al.t)}</span></div>`; }).join('')}
    <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="navigate('report','pathways')">See all pathways</button>
  </div>` : ''}

  ${guidanceNeeded ? `
  <div class="disclaimer warn" style="margin-bottom:18px;">${icon('warn','ic')}<div><b>1 area needs your attention</b><br/>${esc(attentionMsg)}</div></div>` : ''}

  <button class="btn btn-primary" onclick="navigate('report','profile')">${icon('chevron')} View Full Report</button>
  `;
}

// Part 3/4 — "Career Areas That Align With You" + "Why this pathway
// appears", before any specific career. Alignment and Readiness are
// always shown as two separately-labeled things, never one blended
// percentage -- a pathway can be Strong Alignment + Developing Readiness,
// and that's shown as exactly that, never hidden or averaged away.
function reportPathwaysHTML(l){
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null);
  if(!pathways.length){
    return `<div class="empty-state">${icon('target')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">assessment</a> to see which career pathways align with you.</p></div>`;
  }
  return `
  <p class="page-sub" style="margin-bottom:16px;">Broader fields before specific careers — starting points to explore, not a ranked list of "correct" choices.</p>
  ${pathways.map(p=>{
    const al = alignmentLabel(p.alignment);
    const rl = readinessLabel(p.readiness);
    const why = pathwayReasoningHTML(l, p.faculty);
    const subject = keySubjectFor(p.faculty.id);
    const careers = CAREERS.filter(c=>c.faculty===p.faculty.id).slice(0,3);
    const cluster = clustersForFaculty(p.faculty.id, 1)[0];
    return `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;">
        <div style="flex:1;min-width:200px;">
          <h3 style="margin-bottom:4px;">${esc(p.faculty.name)}</h3>
          <p class="page-sub" style="margin-bottom:0;">${esc(p.faculty.overview)}</p>
        </div>
        <div style="text-align:right;">
          <div style="font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);">Career Alignment</div>
          <span class="badge ${al.c}">${esc(al.t)}</span>
          <div style="font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);margin-top:6px;">Academic Readiness</div>
          <span class="badge ${rl.c}">${esc(rl.t)}</span>
        </div>
      </div>
      <div style="font-size:12.5px;font-weight:700;margin:12px 0 4px;">Why this appears for you</div>
      <ul style="margin:0 0 10px;">${why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
      ${subject?`<p class="page-sub" style="margin-bottom:10px;">Relevant subject: <b>${esc(subject)}</b></p>`:''}
      ${careers.length?`<div class="pill-list" style="margin-bottom:${cluster?'10px':'0'};">${careers.map(c=>`<span class="tag" style="cursor:pointer;" onclick="navigate('career',{id:'${c.id}',from:{route:'report',param:'careers'}})">${esc(c.name)}</span>`).join('')}</div>`:''}
      ${cluster?`<button class="btn btn-ghost btn-sm" onclick="navigate('cluster','${cluster.id}')">${icon('compass')} Explore ${esc(cluster.name)} in more depth</button>`:''}
    </div>`;
  }).join('')}
  `;
}

// Part 5 — "Careers Worth Exploring": multiple careers, drawn from the
// SAME top pathways shown in the Pathways tab (not an independent
// top-score list), so the two tabs tell one consistent story rather than
// risking a career appearing here from a pathway that isn't highlighted
// above.
function reportCareersHTML(l){
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null).slice(0,5);
  const facultyIds = new Set(pathways.map(p=>p.faculty.id));
  const matches = facultyIds.size
    ? computeMatches(l).filter(m=>facultyIds.has(m.career.faculty)).slice(0,10)
    : computeMatches(l).slice(0,6); // pre-assessment fallback, same subject-based ordering viewMatches already uses
  if(!matches.length){
    return `<div class="empty-state">${icon('search')}<p>No careers to show yet.</p></div>`;
  }
  return `
  <p class="page-sub" style="margin-bottom:16px;">Several careers worth a look — not a single "best" answer. Open any one for the full picture.</p>
  ${matches.map(m=>{
    const c = m.career;
    const fac = facultyById(c.faculty);
    const al = alignmentLabel(m.eval.interestFit);
    return `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
        <div>
          <div class="page-sub" style="margin-bottom:2px;">${esc(fac.name)}</div>
          <h3 style="margin-bottom:6px;">${esc(c.name)}</h3>
        </div>
        <span class="badge ${al.c}">${esc(al.t)}</span>
      </div>
      <p style="margin-bottom:10px;">${esc(c.blurb)}</p>
      <div class="pill-list" style="margin-bottom:10px;">
        ${c.requiredSubjects.map(s=>`<span class="pill req">${esc(s)}</span>`).join('')}
        ${c.recommendedSubjects.map(s=>`<span class="pill rec">${esc(s)}</span>`).join('')}
      </div>
      <button class="btn btn-primary btn-sm" onclick="navigate('career',{id:'${c.id}',from:{route:'report',param:'careers'}})">${icon('chevron')} View Career</button>
    </div>`;
  }).join('')}
  `;
}

// Part 6 — "Your Academic Strengths": entered results, strongest
// subjects, then interpreted against the learner's own top pathways using
// current-readiness/keeping-pathways-open language -- never "this
// permanently excludes you".
function reportAcademicHTML(l){
  const p = buildAcademicProfile(l);
  if(!p || !p.entries.length){
    return `<div class="empty-state">${icon('chart')}<p>Enter your <a href="#" onclick="navigate('grade9-report');return false;">Grade 9 Report Results</a> to see your academic strengths here.</p></div>`;
  }
  const pathways = computePathwayMatches(l).filter(pw=>pw.alignment!=null && pw.alignment>=65).slice(0,3);
  return `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your entered results</h3>
    ${p.entries.map(e=>`<div class="kv"><b>${esc(e.subject)}</b><span>${e.pct}%</span></div>`).join('')}
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Strongest subjects</h3>
    ${p.strongest.map(e=>`<div class="kv"><b>${esc(e.subject)}</b><span>${e.pct}% — ${esc(markBandLabel(e.pct))}</span></div>`).join('')}
  </div>

  ${pathways.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>What this means for your pathways</h3>
    <ul style="margin:0;">${pathways.map(pw=>{
      const subject = keySubjectFor(pw.faculty.id);
      const pct = subject ? subjectMarkPct(l, subject) : null;
      if(pct==null) return `<li>${esc(pw.faculty.name)} doesn’t depend on one specific subject result the way some pathways do.</li>`;
      return pct>=60
        ? `<li>Your current ${esc(subject)} performance (${pct}%) supports several of the ${esc(pw.faculty.name)} pathways you’re aligned with.</li>`
        : `<li>You show strong interest in ${esc(pw.faculty.name)}, but your current ${esc(subject)} result (${pct}% — ${esc(markBandLabel(pct))}) suggests ${esc(subject)} could become a priority area if you want to keep this pathway fully open.</li>`;
    }).join('')}</ul>
  </div>` : ''}

  ${p.toStrengthen.length ? `
  <div class="disclaimer" style="margin-bottom:18px;">${icon('info','ic')}<div>${esc(p.toStrengthen.map(e=>e.subject).join(', '))} ${p.toStrengthen.length>1?'are':'is'} currently ${esc(markBandLabel(p.toStrengthen[0].pct))} — this describes where you are right now, and where extra support could help keep more pathways open, not a permanent limit.</div></div>` : ''}
  `;
}

// Part 7 — 4-tier "Subjects to Consider for Grade 10" (from
// buildSubjectRelevanceTiers) + Part 8 — the subject-career conflict
// warning, built from the SAME subjectConflictForFaculty function the
// school dashboard will also use. The intended-subjects checkboxes below
// start unchecked and are never pre-filled from the app's own
// recommendation -- ticking them is what turns the conflict check on.
function reportSubjectsHTML(l){
  const src = reportSubjectSource(l);
  const recCard = src.kind === 'assessment' ? `
  <div class="card" style="margin-bottom:6px;">
    <h3>Your recommended subjects</h3>
    <p class="page-sub" style="margin-bottom:6px;">From your Subject Choice Assessment — what you enjoy, how you naturally work and how you are performing.</p>
    ${recommendedSubjectRowsHTML(src.report)}
    <p class="ov-math"><b>Mathematics or Mathematical Literacy:</b> ${esc(scMathLeanLabel(src.report.mathChoice))}</p>
    <button class="btn btn-ghost btn-sm" onclick="navigate('subject-choice')">See your full subject report</button>
  </div>` : '';
  const tiers = buildSubjectRelevanceTiers(l);
  const hasAny = Object.values(tiers).some(arr=>arr.length);
  if(!hasAny){
    return `${recCard}<div class="empty-state">${icon('compass')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">assessment</a> to see which subjects matter for your pathways.</p></div>`;
  }
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null && p.alignment>=50).slice(0,5);
  const conflicts = pathways
    .map(p=>({ pathway:p, conflict: subjectConflictForFaculty(l, p.faculty.id) }))
    .filter(x=>x.conflict && x.conflict.hasConflict);
  const allSubjects = [...new Set(Object.values(tiers).flat().map(s=>s.subject))]
    .filter(s=>s!=='Mathematics' && s!=='Mathematical Literacy');

  return `
  ${recCard}
  ${conflicts.map(x=>`
  <div class="disclaimer warn" style="margin-bottom:16px;">${icon('warn','ic')}<div><b>Subject Choice Needs Attention</b><br/>${esc(x.conflict.reason)}<br/><br/><b>Discuss this with your teacher, parent or career adviser before finalising your subjects.</b></div></div>`).join('')}

  <div class="section-title" style="margin-top:${recCard ? 24 : 0}px;"><h2>What your top pathways rely on</h2></div>
  <p class="page-sub" style="margin-bottom:14px;">These describe the careers in your strongest pathways — they are not a personal ranking. ${src.kind === 'assessment' ? 'Your personal recommendation is above.' : 'For a personal recommendation, <a href="#" onclick="navigate(\'subject-choice\');return false;">take the Subject Choice Assessment</a>.'}</p>
  ${['required','strongly','useful','complementary'].map(tier=>{
    const list = tiers[tier];
    if(!list.length) return '';
    const meta = SUBJECT_TIER_META[tier];
    return `
    <div class="card" style="margin-bottom:16px;">
      <h3>${esc(meta.label)}</h3>
      ${list.map(s=>`<div class="kv"><b>${esc(s.subject)}</b></div><p class="page-sub" style="margin:-6px 0 10px;">${esc(s.explanation)}</p>`).join('')}
    </div>`;
  }).join('')}

  <div class="card" style="margin-bottom:18px;">
    <h3>Which are you currently leaning toward?</h3>
    <p class="page-sub" style="margin-bottom:12px;">Optional, and not final — this just helps us check whether your intended subjects support the pathways above.</p>
    <div class="form-row">
      <label>Mathematics track</label>
      <div class="filter-bar">
        <button class="chip-select ${l.intendedMathType==='Mathematics'?'on':''}" onclick="App.setIntendedMathType('Mathematics')">Mathematics</button>
        <button class="chip-select ${l.intendedMathType==='MathLit'?'on':''}" onclick="App.setIntendedMathType('MathLit')">Mathematical Literacy</button>
      </div>
    </div>
    <div class="check-grid">
      ${allSubjects.map(s=>`
      <label class="check-item">
        <input type="checkbox" ${((l.intendedSubjects||[]).includes(s))?'checked':''} onchange="App.toggleIntendedSubject('${esc(s)}')"/>
        <span style="flex:1;">${esc(s)}</span>
      </label>`).join('')}
    </div>
  </div>
  ${disclaimerHTML('This does not lock in your subjects — final choice depends on your school’s offering and timetable. Talk it through with your Life Orientation teacher or subject counsellor.')}
  `;
}

// Part 9 — "Your Next Steps": a personalised, actionable list built from
// buildNextSteps (the same computed pathway/career/conflict/academic data
// as the rest of the report), never generic boilerplate.
function reportNextStepsHTML(l){
  const steps = buildNextSteps(l);
  if(!steps.length){
    return `<div class="empty-state">${icon('check')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">assessment</a> to get your personalised next steps.</p></div>`;
  }
  return `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your Next Steps</h3>
    <ol style="margin:0;padding-left:20px;">
      ${steps.map(s=>`<li style="margin-bottom:10px;">${esc(s)}</li>`).join('')}
    </ol>
  </div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="btn btn-ghost" onclick="navigate('report','pathways')">${icon('target')} Review Pathways</button>
    <button class="btn btn-ghost" onclick="navigate('report','subjects')">${icon('compass')} Review Subjects</button>
    <button class="btn btn-primary" onclick="navigate('matches')">${icon('chevron')} See All Career Matches</button>
  </div>
  `;
}

// Part 6 — the structured, printable full report (native browser
// print-to-PDF via the @media print rules in style.css, not a
// screenshot-based library): every section concatenated in one
// document, always present in the DOM but hidden on screen (.print-only)
// and shown only when printing, so "Print / Save as PDF" captures the
// whole report in one go regardless of which tab is currently open.
function reportPrintHTML(l){
  const sections = [
    { title:'Overview', html: reportOverviewCoreHTML(l) },
    { title:'Your Profile', html: learnerProfileBodyHTML(l) },
    { title:'Career Pathways', html: reportPathwaysHTML(l) },
    { title:'Careers Worth Exploring', html: reportCareersHTML(l) },
    { title:'Your Academic Strengths', html: reportAcademicHTML(l) },
    { title:'Subjects to Consider for Grade 10', html: reportSubjectsHTML(l) },
    { title:'Your Next Steps', html: reportNextStepsHTML(l) },
  ];
  return `
  <div style="text-align:center;margin-bottom:24px;">
    <img class="brand-mark-img" src="assets/logo-mark.png" alt="Iroli"/>
    <h1>Your Career &amp; Subject Choice Report</h1>
  </div>
  ${reportHeaderHTML(l)}
  ${sections.map(s=>`<h2 style="margin-top:28px;">${esc(s.title)}</h2>${s.html}`).join('')}
  `;
}
