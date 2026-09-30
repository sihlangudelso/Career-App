/* ---------------- Your Career & Subject Choice Report ---------------- */
// One report, organised as in-page tabs (not six separate nav items),
// matching the navigation structure asked for: Overview / My Profile /
// Career Pathways / Careers / Subjects / Next Steps. Each tab is added in
// its own phase as it's built -- REPORT_TABS grows as the report does.
const REPORT_TABS = [
  { id:'overview', label:'Overview' },
  { id:'profile', label:'My Profile' },
];

function viewReport(){
  const l = ensureLearnerObj();
  const tab = (ROUTE_PARAM && REPORT_TABS.some(t=>t.id===ROUTE_PARAM)) ? ROUTE_PARAM : 'overview';
  const body =
    tab==='overview' ? reportOverviewHTML(l) :
    tab==='profile' ? learnerProfileBodyHTML(l) :
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
