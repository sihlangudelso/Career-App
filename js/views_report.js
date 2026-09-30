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
  <div class="filter-bar" style="margin-bottom:18px;">
    ${REPORT_TABS.map(t=>`<button class="chip-select ${tab===t.id?'on':''}" onclick="navigate('report','${t.id}')">${esc(t.label)}</button>`).join('')}
  </div>
  ${body}`;
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

// Part 10 — Overview: a scannable summary, not the full report forced
// top-to-bottom. Every number/name here is read live from the same
// functions the other tabs use -- never a separate, potentially-drifting
// summary calculation.
function reportOverviewHTML(l){
  const header = reportHeaderHTML(l);
  const topDomains = computeStrengthDomains(l).filter(d=>d.hasEvidence).slice(0,3);
  if(!topDomains.length){
    return `${header}<div class="empty-state">${icon('target')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">assessment</a> or enter your <a href="#" onclick="navigate('grade9-report');return false;">Grade 9 Report Results</a> to build your report.</p></div>`;
  }
  const firstName = (ME.name||'there').split(' ')[0];
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null).slice(0,3);
  const tiers = buildSubjectRelevanceTiers(l);
  const topSubjects = [...tiers.required, ...tiers.strongly, ...tiers.useful].slice(0,3);
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
  ${header}
  <div class="card" style="margin-bottom:18px;">
    <h3>Hi, ${esc(firstName)}</h3>
    <p class="page-sub" style="margin-bottom:10px;">Based on your assessment and academic results, your strongest areas are:</p>
    <div class="pill-list">${topDomains.map(d=>`<span class="pill rec">${esc(d.domain.name)}</span>`).join('')}</div>
  </div>

  ${pathways.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your strongest pathways</h3>
    ${pathways.map(p=>{ const al=alignmentLabel(p.alignment); return `<div class="kv"><b>${esc(p.faculty.name)}</b><span class="badge ${al.c}">${esc(al.t)}</span></div>`; }).join('')}
    <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="navigate('report','pathways')">See all pathways</button>
  </div>` : ''}

  ${topSubjects.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Subject Guidance</h3>
    ${topSubjects.map(s=>`<div class="kv"><b>${esc(s.subject)}</b><span>${tiers.required.includes(s)?'Important':(tiers.strongly.includes(s)?'Important':'Useful')}</span></div>`).join('')}
    <button class="btn btn-ghost btn-sm" style="margin-top:10px;" onclick="navigate('report','subjects')">See full subject guidance</button>
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
      ${careers.length?`<div class="pill-list">${careers.map(c=>`<span class="tag" style="cursor:pointer;" onclick="navigate('career',{id:'${c.id}',from:'report'})">${esc(c.name)}</span>`).join('')}</div>`:''}
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
      <button class="btn btn-primary btn-sm" onclick="navigate('career',{id:'${c.id}',from:'report'})">${icon('chevron')} View Career</button>
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
  const tiers = buildSubjectRelevanceTiers(l);
  const hasAny = Object.values(tiers).some(arr=>arr.length);
  if(!hasAny){
    return `<div class="empty-state">${icon('compass')}<p>Complete the <a href="#" onclick="navigate('assessment');return false;">assessment</a> to see which subjects matter for your pathways.</p></div>`;
  }
  const pathways = computePathwayMatches(l).filter(p=>p.alignment!=null && p.alignment>=50).slice(0,5);
  const conflicts = pathways
    .map(p=>({ pathway:p, conflict: subjectConflictForFaculty(l, p.faculty.id) }))
    .filter(x=>x.conflict && x.conflict.hasConflict);
  const allSubjects = [...new Set(Object.values(tiers).flat().map(s=>s.subject))]
    .filter(s=>s!=='Mathematics' && s!=='Mathematical Literacy');

  return `
  ${conflicts.map(x=>`
  <div class="disclaimer warn" style="margin-bottom:16px;">${icon('warn','ic')}<div><b>Subject Choice Needs Attention</b><br/>${esc(x.conflict.reason)}<br/><br/><b>Discuss this with your teacher, parent or career adviser before finalising your subjects.</b></div></div>`).join('')}

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
