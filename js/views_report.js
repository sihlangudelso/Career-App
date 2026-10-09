/* ---------------- Your Career & Subject Choice Report ---------------- */
// The report is ONE short page -- five sections and a summary table, built by
// js/learner_report.js. The longer views that used to be tabs (career
// pathways, careers, academic strengths, subjects, profile, next steps) are
// still here, one step away from the "More detail" row at the bottom, and
// navigate('report', <id>) still opens each. The printed copy is only the
// short report.
const REPORT_DETAILS = [
  { id:'profile', label:'My Profile', sub:'Your results, interests and work style in one picture.' },
  { id:'pathways', label:'Career Pathways', sub:'Broad fields that fit you, before specific careers.' },
  { id:'careers', label:'Careers Worth Exploring', sub:'Several careers worth a look — not a single best answer.' },
  { id:'academic', label:'Academic Strengths', sub:'Your entered results and what they mean for your pathways.' },
  { id:'subjects', label:'Subjects', sub:'What your top pathways rely on, and the subjects you are leaning toward.' },
  { id:'next-steps', label:'Next Steps', sub:'A personalised list of what to do next.' },
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
  const R = buildLearnerReport(l);
  const detail = REPORT_DETAILS.filter(function(d){ return d.id === ROUTE_PARAM; })[0];
  if(detail){
    const body = detail.id === 'profile' ? learnerProfileBodyHTML(l)
      : detail.id === 'pathways' ? reportPathwaysHTML(l)
      : detail.id === 'careers' ? reportCareersHTML(l)
      : detail.id === 'academic' ? reportAcademicHTML(l)
      : detail.id === 'subjects' ? reportSubjectsHTML(l)
      : reportNextStepsHTML(l);
    return `
    ${pageHeadHTML(detail.label, detail.sub)}
    <button class="btn btn-ghost btn-sm" style="margin-bottom:18px;" onclick="navigate('report')">← Back to your report</button>
    ${body}
    <div class="print-only">${reportPrintHTML(l, R)}</div>`;
  }
  // The report draws its own header (logo, title, name / grade / school / date),
  // so there is no separate page heading above it.
  return `
  <div class="rp-toolbar"><button class="btn btn-ghost btn-sm" onclick="downloadReportPDF(this)">${icon('download')} Download PDF</button></div>
  ${learnerReportHTML(l, R)}
  ${reportMoreDetailHTML(l, R)}
  <div class="print-only">${reportPrintHTML(l, R)}</div>`;
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
  const label = { explore:'worth exploring', effort:'needs extra effort', possible:'not highlighted', aspirational:'aspirational for now' };
  const pill = (s, cls)=>`<span class="pill ${cls}">${esc(s.subject)}${s.status === 'recommended' ? ' ✓' : ' · ' + label[s.status]}</span>`;
  return `<div class="pill-list ov-support">
    ${sup.required.length ? `<span class="ov-k">Needs</span>${sup.required.map(s=>pill(s, 'req')).join('')}` : ''}
    ${sup.helpful.length ? `<span class="ov-k">Also helpful</span>${sup.helpful.slice(0, 3).map(s=>pill(s, 'rec')).join('')}` : ''}
  </div>`;
}

// Top subject matches as rows (name, category, match %), used by the Subjects
// page so it lists the same subjects as the Subject Choice report.
function recommendedSubjectRowsHTML(rep){
  return rep.top.length
    ? rep.top.map(r=>`<div class="ov-item"><div><b>${esc(r.label)}</b><div class="ov-sub"><span class="badge ${r.category.badge}">${esc(r.category.label)}</span></div></div><div class="ov-pct">${Math.round(r.fit.overall)}%</div></div>`).join('')
    : `<p class="page-sub" style="margin:0 0 6px;">No subject stood out strongly this time — your full subject report shows what is worth exploring.</p>`;
}

// Part 3/4 — "Career Areas That Align With You" + "Why this pathway
// appears", before any specific career. Alignment and Readiness are
// always shown as two separately-labeled things, never one blended
// percentage -- a pathway can be Strong Alignment + Developing Readiness,
// and that's shown as exactly that, never hidden or averaged away.
function reportPathwaysHTML(l){
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null);
  if(!pathways.length){
    return `<div class="empty-state">${icon('target')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">personality assessment</a> to see which career pathways align with you.</p></div>`;
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
  const assessed = !!l.assessmentCompletedAt;
  // Before the assessment the only evidence is school marks or chosen subjects
  // (the same subject-based ordering the Career Matches page shows). With
  // neither, every career ties -- show nothing rather than an arbitrary six.
  const hasSignal = hasEnteredResults(l) || !!(l.subjects && l.subjects.length);
  const matches = facultyIds.size
    ? bestSuitedCareers(l, CAREERS.length).filter(m=>facultyIds.has(m.career.faculty)).slice(0,10)
    : ((assessed || hasSignal) ? computeMatches(l).slice(0,6) : []);
  if(!matches.length){
    return `<div class="empty-state">${icon('search')}<p>Take the <a href="#" onclick="navigate('assessment');return false;">personality assessment</a> to see careers worth exploring.</p></div>`;
  }
  return `
  <p class="page-sub" style="margin-bottom:16px;">Several careers worth a look — not a single "best" answer. Open any one for the full picture.</p>
  ${matches.map(m=>{
    const c = m.career;
    const fac = facultyById(c.faculty);
    // interestFit is a neutral 50 until the assessment is done -- not "Good Alignment".
    const al = alignmentLabel(assessed ? m.eval.interestFit : null);
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
    const entry = resultsEntryLinkHTML(l);
    return `<div class="empty-state">${icon('chart')}<p>${entry ? 'Enter your ' + entry + ' to see your academic strengths here.' : 'This section uses school marks, which aren’t needed to explore careers.'}</p></div>`;
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
    ${Object.keys(src.report.pairs).filter(k=>src.report.pairs[k].pick!=='either').map(k=>`<p class="ov-math"><b>${esc(src.report.pairs[k].title)}</b> ${esc(scPairLeanLabel(src.report.pairs[k]))}</p>`).join('')}
    <button class="btn btn-ghost btn-sm" onclick="navigate('subject-choice')">See your full subject report</button>
  </div>` : '';
  const tiers = buildSubjectRelevanceTiers(l);
  const hasAny = Object.values(tiers).some(arr=>arr.length);
  if(!hasAny){
    return `${recCard}<div class="empty-state">${icon('compass')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">personality assessment</a> to see which subjects matter for your pathways.</p></div>`;
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
  <p class="page-sub" style="margin-bottom:14px;">These describe the careers in your strongest pathways — they are not a personal ranking. ${src.kind === 'assessment' ? 'Your personal recommendation is above.' : (subjectChoiceAvailable(l) ? 'For a personal recommendation, <a href="#" onclick="navigate(\'subject-choice\');return false;">take the Subject Choice Assessment</a>.' : '')}</p>
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
    return `<div class="empty-state">${icon('check')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">personality assessment</a> to get your personalised next steps.</p></div>`;
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

// The printed copy is the A4 document built by js/report_pdf.js (four deliberate
// pages, not this web page tightened): always in the page but hidden on screen
// (.print-only), and shown only when printing, so the browser's Print captures
// the report whichever page is open. (The "Download PDF" button builds its own copy
// of the same pages: js/report_download.js.) The longer views are not part of it.
function reportPrintHTML(l, R){
  R = R || buildLearnerReport(l);
  return reportA4HTML(l, R);
}
