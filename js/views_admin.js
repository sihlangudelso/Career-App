function cohortStats(){
  const total = COHORT.length;
  const active = COHORT.filter(c=>c.licenseStatus==='active').length;
  const trial = total-active;
  const byGrade = {9:0,10:0,11:0,12:0};
  COHORT.forEach(c=>{ if(byGrade[c.grade]!=null) byGrade[c.grade]++; });
  const facCount = {}; FACULTIES.forEach(f=>facCount[f.id]=0);
  COHORT.forEach(c=>{
    if(c.assessmentCompletedAt){
      const top = computeMatches(c)[0];
      if(top) facCount[top.career.faculty] = (facCount[top.career.faculty]||0)+1;
    }
  });
  return { total, active, trial, byGrade, facCount };
}

function viewAdminHome(){
  const s = cohortStats();
  const maxFac = Math.max(1,...Object.values(s.facCount));
  return `
  ${pageHeadHTML(IS_SUPER_ADMIN?'Institute overview':'Class overview', IS_SUPER_ADMIN?'A snapshot of every learner using this Iroli Career Pathway workspace.':'A snapshot of the learners in your class(es).')}
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${s.total}</div><div class="l">Total learners</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--grass)"></div><div><div class="n">${s.active}</div><div class="l">Active licences</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--coral)"></div><div><div class="n">${s.trial}</div><div class="l">Trial access</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${myClasses().length}</div><div class="l">${IS_SUPER_ADMIN?'Classes':'Your classes'}</div></div></div>
  </div>
  <div class="grid grid-2">
    <div class="card">
      <h3>Learners by grade</h3>
      ${[9,10,11,12].map(g=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>Grade ${g}</span><span>${s.byGrade[g]}</span></div>
          <div class="aps-bar"><div style="width:${s.total? Math.round(s.byGrade[g]/s.total*100):0}%"></div></div>
        </div>`).join('')}
    </div>
    <div class="card">
      <h3>Top career-faculty interest (assessed learners)</h3>
      ${FACULTIES.map(f=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>${f.name}</span><span>${s.facCount[f.id]||0}</span></div>
          <div class="aps-bar"><div style="width:${Math.round((s.facCount[f.id]||0)/maxFac*100)}%;background:${f.color};"></div></div>
        </div>`).join('')}
    </div>
  </div>
  <div class="section-title"><h2>Get started</h2></div>
  <div class="grid grid-3">
    <button class="tile" style="border-top-color:var(--amber)" onclick="navigate('admin-classes')">${icon('users','tico')}<h3>${IS_SUPER_ADMIN?'Create a class':'Your classes'}</h3><p>${IS_SUPER_ADMIN?'Set up classes and licence seats for your learners.':'View your class codes and learner counts.'}</p></button>
    <button class="tile" style="border-top-color:var(--indigo)" onclick="navigate('admin-cohort')">${icon('chart','tico')}<h3>View cohort data</h3><p>See every learner\u2019s profile, matches and personality — export anytime.</p></button>
    <button class="tile" style="border-top-color:var(--teal)" onclick="App.togglePreview()">${icon('spark','tico')}<h3>Preview learner view</h3><p>See exactly what your learners experience.</p></button>
  </div>
  <div style="margin-top:24px;">${disclaimerHTML('Access requires signing in — nobody can see learner data or admin tools just by opening a link. Learners create their own account; Institute Admin and Class Admin access is granted separately, not by link-sharing (assign a class admin by email from Classes & Licences, or promote a super admin from the Supabase dashboard).')}</div>
  `;
}

function viewAdminClasses(){
  const mine = myClasses();
  return `
  ${pageHeadHTML('Classes & licences', IS_SUPER_ADMIN?'Create classes, generate join codes, manage licence seats, and assign class admins.':'Your classes, join codes, and licence seats.')}
  ${IS_SUPER_ADMIN? `
  <div class="card" style="margin-bottom:20px;">
    <h3>Create a new class</h3>
    <div class="grid grid-3">
      <div class="form-row"><label>Class name</label><input type="text" id="newClassName" placeholder="e.g. Grade 10A 2026"/></div>
      <div class="form-row"><label>Licence seats</label><input type="number" id="newClassSeats" value="35" min="1"/></div>
      <div class="form-row" style="display:flex;align-items:flex-end;"><button class="btn btn-primary" onclick="App.createClass()">${icon('plus')} Create class</button></div>
    </div>
  </div>` : ''}
  ${mine.length? mine.map(c=>{
    const members = COHORT.filter(l=>l.classId===c.id);
    const licensed = members.filter(l=>l.licenseStatus==='active').length;
    const classAdmin = CLASS_ADMINS.find(a=>a.id===c.classAdminId);
    return `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin-bottom:4px;">${esc(c.name)}</h3>
          <div class="page-sub">Code <span class="class-code">${esc(c.code)}</span> · ${members.length} learner(s) · ${licensed}/${c.seatLimit||'∞'} licensed seats used</div>
        </div>
        <div style="display:flex;gap:8px;align-self:flex-start;">
          <button class="btn btn-ghost btn-sm" onclick="navigate('admin-cohort','${c.id}')">View learners</button>
          ${IS_SUPER_ADMIN? `<button class="btn btn-ghost btn-sm" onclick="App.deleteClass('${c.id}')">${icon('trash')}</button>` : ''}
        </div>
      </div>
      ${IS_SUPER_ADMIN? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border,#eee);">
        <div class="page-sub" style="margin-bottom:6px;">Licence seats (blank = unlimited)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input type="number" id="seats-${c.id}" min="1" placeholder="Unlimited" value="${c.seatLimit||''}" style="width:120px;"/>
          <button class="btn btn-ghost btn-sm" onclick="App.updateClassSeats('${c.id}', (document.getElementById('seats-${c.id}')||{}).value)">Update seats</button>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border,#eee);">
        <div class="page-sub" style="margin-bottom:6px;">${classAdmin? `Class admin: <b>${esc(classAdmin.email)}</b>` : 'No class admin assigned yet.'}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <input type="email" id="assignEmail-${c.id}" placeholder="teacher@school.co.za" style="flex:1;min-width:200px;"/>
          <button class="btn btn-ghost btn-sm" onclick="App.assignClassAdmin('${c.id}', (document.getElementById('assignEmail-${c.id}')||{}).value)">${classAdmin?'Reassign':'Assign'} class admin</button>
        </div>
      </div>` : ''}
    </div>`;
  }).join('') : `<div class="empty-state">${icon('users')}<p>${IS_SUPER_ADMIN?'No classes yet — create your first class above.':'No classes assigned to you yet — ask your Institute Admin.'}</p></div>`}
  <div style="margin-top:10px;">${disclaimerHTML('Licence seats are tracked here for planning; Iroli Career Pathway does not process payments in-app. Activate a learner\u2019s seat from the Cohort tab once payment/invoicing has been arranged with your Iroli account manager.')}</div>
  `;
}

// Shared by viewAdminCohort() and App.exportCohortCSV() so the export can
// never drift from whatever's actually narrowed on screen (found in the
// pre-launch audit: the export used to ignore the search box and the
// faculty drill-through filter entirely).
function cohortRowsFiltered(facFilter, filterClass, search){
  let rows = COHORT.slice();
  if(facFilter){
    rows = rows.filter(l=>{
      if(l.grade!==9 || !l.assessmentCompletedAt) return false;
      const top = computeMatches(l)[0];
      return top && top.career.faculty===facFilter;
    });
  }
  // Composes with the faculty filter above rather than replacing it, so a
  // drill-through from an already class-filtered Dashboard stays scoped
  // to that class (found dropping it silently in the pre-launch audit).
  if(filterClass && filterClass!=='all') rows = rows.filter(l=>l.classId===filterClass);
  if(search) rows = rows.filter(l=> cohortLearnerName(l.id).toLowerCase().includes(search));
  return rows;
}

function viewAdminCohort(){
  // Accepts a plain classId/'all' (every existing call site) or an object
  // {fac, classId?} (the Grade 9 Dashboard's pathway-bar drill-through,
  // which carries its own active class filter alongside the faculty) --
  // same object-ROUTE_PARAM convention viewExplore/viewCareerDetail use.
  const facFilter = (ROUTE_PARAM && typeof ROUTE_PARAM==='object') ? ROUTE_PARAM.fac : null;
  const filterClass = (ROUTE_PARAM && typeof ROUTE_PARAM==='object') ? (ROUTE_PARAM.classId || 'all') : (ROUTE_PARAM || 'all');
  const search = (window.__cohortSearch||'').toLowerCase();
  let rows = cohortRowsFiltered(facFilter, filterClass, search);
  return `
  ${pageHeadHTML('Cohort data', 'Every learner\u2019s profile, personality, career matches and licence status — export any time.')}
  ${facFilter ? `<div class="disclaimer" style="margin-bottom:14px;">${icon('info','ic')}<div>Showing learners whose top career match is in <b>${esc(facultyById(facFilter).name)}</b>. <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="navigate('admin-cohort','all')">Clear filter</button></div></div>` : ''}
  <div class="filter-bar" style="justify-content:space-between;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="chip-select ${filterClass==='all'&&!facFilter?'on':''}" onclick="navigate('admin-cohort','all')">All classes</button>
      ${myClasses().map(c=>`<button class="chip-select ${filterClass===c.id?'on':''}" onclick="navigate('admin-cohort','${c.id}')">${esc(c.name)}</button>`).join('')}
    </div>
    <button class="btn btn-amber" onclick="App.exportCohortCSV('${filterClass}', ${facFilter?`'${facFilter}'`:'null'})">${icon('download')} Export CSV</button>
  </div>
  <div class="form-row" style="max-width:280px;"><input type="text" placeholder="Search learner name… (press Enter)" value="${esc(window.__cohortSearch||'')}" onchange="App.setCohortSearch(this.value)"/></div>
  <div class="table-wrap"><table>
    <thead><tr>
      <th>Name</th><th>Grade</th><th>School</th><th>Class</th><th>Maths track</th><th>Personality</th><th>Top matches</th><th>Favourites</th><th>Licence</th><th></th>
    </tr></thead>
    <tbody>
      ${rows.length? rows.map(l=>{
        const cls = CLASSES.find(c=>c.id===l.classId);
        const top = l.assessmentCompletedAt ? computeMatches(l).slice(0,3).map(m=>m.career.name).join(', ') : '—';
        return `<tr>
          <td><a href="#" onclick="navigate('admin-learner','${l.id}');return false;"><b>${esc(cohortLearnerName(l.id))}</b></a></td>
          <td>${l.grade||'—'}</td>
          <td>${esc(l.school||'—')}</td>
          <td>${cls?esc(cls.name):'—'}</td>
          <td>${l.mathType==='Mathematics'?'Maths':(l.mathType==='MathLit'?'Maths Lit':'—')}</td>
          <td>${esc(hollandCode(l.riasec))}</td>
          <td style="max-width:220px;">${esc(top)}</td>
          <td>${(l.favourites||[]).length}</td>
          <td><span class="badge ${l.licenseStatus==='active'?'badge-strong':'badge-good'}">${l.licenseStatus==='active'?'Active':'Trial'}</span></td>
          <td>${IS_SUPER_ADMIN? `<button class="btn btn-ghost btn-sm" onclick="App.toggleLicense('${l.id}')">${l.licenseStatus==='active'?'Deactivate':'Activate'}</button>` : ''}</td>
        </tr>`;
      }).join('') : `<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:30px;">No learners match yet.</td></tr>`}
    </tbody>
  </table></div>
  `;
}

function viewAdminLearnerDetail(id){
  const l = COHORT.find(c=>c.id===id);
  if(!l) return `${pageHeadHTML('Learner not found')}<div class="empty-state">${icon('users')}<p>This learner record could not be found.</p></div>`;
  const cls = CLASSES.find(c=>c.id===l.classId);
  const matches = l.assessmentCompletedAt ? computeMatches(l).slice(0,5) : [];
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:16px;" onclick="navigate('admin-cohort')">${icon('chevron')} Back to cohort</button>
  ${pageHeadHTML(cohortLearnerName(l.id), `Grade ${l.grade||'—'} · ${esc(l.school||'No school set')}`)}
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Profile</h3>
      <div class="kv"><b>Class</b><span>${cls?esc(cls.name):'Not in a class'}</span></div>
      <div class="kv"><b>Maths track</b><span>${esc(l.mathType)||'—'}</span></div>
      <div class="kv"><b>Subjects</b><span>${esc((l.subjects||[]).join(', '))||'—'}</span></div>
      <div class="kv"><b>Personality (Holland code)</b><span>${esc(hollandCode(l.riasec))}</span></div>
      <div class="kv"><b>Licence</b><span>${l.licenseStatus==='active'?'Active':'Trial'}</span></div>
      ${IS_SUPER_ADMIN? `<button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="App.toggleLicense('${l.id}')">${l.licenseStatus==='active'?'Deactivate licence':'Activate licence'}</button>` : ''}
    </div>
    <div class="card">
      <h3>Interest profile</h3>
      ${l.riasec ? RIASEC.map(d=>`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;"><span>${d.name}</span><span>${Math.round(l.riasec[d.id]||0)}%</span></div><div class="aps-bar"><div style="width:${Math.round(l.riasec[d.id]||0)}%"></div></div></div>`).join('') : '<p class="page-sub">Assessment not yet completed.</p>'}
    </div>
  </div>
  <div class="card" style="margin-bottom:18px;">
    <h3>Top career matches</h3>
    ${matches.length? matches.map(m=>careerRowHTML(m.career,m.score,l,m.category)).join('') : '<p class="page-sub">No assessment data yet.</p>'}
  </div>
  <div class="card">
    <h3>Saved favourites</h3>
    <div class="pill-list">${(l.favourites||[]).map(id=>{const c=CAREERS.find(x=>x.id===id);return c?`<span class="tag">${esc(c.name)}</span>`:'';}).join('') || '<span class="page-sub">None yet.</span>'}</div>
  </div>
  `;
}

function viewAdminCareers(){
  return `
  ${pageHeadHTML('Career library', `${CAREERS.length} careers seeded across ${FACULTIES.length} faculties. The data model supports adding more faculties, careers and real per-institution admission data later.`)}
  ${FACULTIES.map(f=>{
    const list = CAREERS.filter(c=>c.faculty===f.id);
    return `<div class="section-title"><h2>${f.name} <span class="tag" style="background:${f.color};color:#fff;">${list.length}</span></h2></div>
    ${list.map(c=>careerRowHTML(c,null,{favourites:[]})).join('') || '<p class="page-sub">No careers yet in this faculty — add some in the data model.</p>'}`;
  }).join('')}
  `;
}

/* ---------------- Grade 9 school dashboard ---------------- */
// One aggregation pass over the Grade 9 slice of COHORT, computed fresh
// on every render (same convention as cohortStats() above and the
// existing CSV export -- nothing here is persisted; guidance_required/
// subject_conflict/academic_readiness are always-live computed values,
// never cached columns). Every dashboard section reads from this SAME
// object, so the overview tiles, the pathway bars, and the guidance table
// can never disagree with each other.
function buildSchoolDashboardData(classFilter){
  const rows = COHORT.filter(l=>l.grade===9 && (!classFilter || classFilter==='all' || l.classId===classFilter));
  const assessed = rows.filter(l=>l.assessmentCompletedAt);

  const enriched = assessed.map(l=>{
    const top = computeMatches(l)[0];
    const faculty = top ? facultyById(top.career.faculty) : null;
    if(!faculty) return null;
    return {
      learner: l, top, faculty,
      readiness: academicReadinessFor(l, faculty.id),
      conflict: subjectConflictForFaculty(l, faculty.id),
    };
  }).filter(Boolean);

  const pathwayDistribution = pathwayDistributionFrom(enriched, assessed.length);
  const subjectDemand = subjectDemandFrom(rows);
  const guidanceRows = guidanceRowsFrom(enriched);
  const readinessByPathway = readinessCrossTabFrom(enriched);

  const overview = {
    totalLearners: rows.length,
    learnersAssessed: assessed.length,
    completionRate: rows.length ? Math.round(100*assessed.length/rows.length) : 0,
    guidanceRequired: rows.filter(l=>isGuidanceRequired(l)).length,
    conflictCount: enriched.filter(e=>e.conflict && e.conflict.hasConflict).length,
  };

  const insights = generateSchoolInsights({ overview, pathwayDistribution, subjectDemand, readinessByPathway, enriched });

  return { rows, assessed, enriched, overview, pathwayDistribution, subjectDemand, guidanceRows, readinessByPathway, insights };
}

function pathwayDistributionFrom(enriched, assessedCount){
  const counts = {};
  enriched.forEach(e=>{ counts[e.faculty.id] = (counts[e.faculty.id]||0)+1; });
  const total = assessedCount || 1;
  return FACULTIES.map(f=>({ id:f.id, name:f.name, color:f.color, count: counts[f.id]||0 }))
    .filter(p=>p.count>0)
    .map(p=>({ ...p, pct: Math.round(100*p.count/total) }))
    .sort((a,b)=>b.count-a.count);
}

function subjectDemandFrom(rows){
  const withIntended = rows.filter(l=>l.intendedSubjects && l.intendedSubjects.length);
  const freq = {};
  withIntended.forEach(l=>l.intendedSubjects.forEach(s=>{ freq[s]=(freq[s]||0)+1; }));
  const list = Object.entries(freq).map(([subject,count])=>({
    subject, count, pct: withIntended.length ? Math.round(100*count/withIntended.length) : 0,
  }));
  // Maths track is tracked separately from intendedSubjects (mirroring
  // mathType's own split from `subjects`), but belongs in the same
  // "what are learners leaning toward" list the user asked for.
  const withMathIntent = rows.filter(l=>l.intendedMathType).length;
  const mathCounts = { Mathematics:0, 'Mathematical Literacy':0 };
  rows.forEach(l=>{ if(l.intendedMathType==='Mathematics') mathCounts.Mathematics++; else if(l.intendedMathType==='MathLit') mathCounts['Mathematical Literacy']++; });
  Object.entries(mathCounts).forEach(([subject,count])=>{
    if(count>0) list.push({ subject, count, pct: withMathIntent ? Math.round(100*count/withMathIntent) : 0 });
  });
  list.sort((a,b)=>b.count-a.count);
  const notYetSpecifiedCount = rows.filter(l=>(!l.intendedSubjects || !l.intendedSubjects.length) && !l.intendedMathType).length;
  return { list, withIntendedCount: withIntended.length, notYetSpecifiedCount };
}

function guidanceRowsFrom(enriched){
  return enriched.map(e=>{
    const concern = (e.readiness && e.readiness.pct!=null && e.readiness.pct<50)
      ? `${e.readiness.subject} currently ${markBandLabel(e.readiness.pct)} (${e.readiness.pct}%)` : null;
    const hasIntended = e.learner.intendedSubjects && e.learner.intendedSubjects.length;
    const action = (e.conflict && e.conflict.hasConflict) ? 'Discuss subject choice vs. stated career interest'
      : concern ? 'Consider additional academic support'
      : !hasIntended ? 'Confirm Grade 10 subject choices'
      : null;
    if(!action) return null;
    return {
      learnerId: e.learner.id,
      learnerName: cohortLearnerName(e.learner.id),
      pathway: e.faculty.name,
      interest: e.top.career.name,
      concern: concern || '—',
      planned: (e.conflict && e.conflict.hasConflict) ? e.conflict.plannedSubject : (hasIntended ? e.learner.intendedSubjects.join(', ') : 'Not yet specified'),
      conflict: (e.conflict && e.conflict.hasConflict) ? e.conflict.reason : '—',
      action,
    };
  }).filter(Boolean);
}

function readinessCrossTabFrom(enriched){
  const byFaculty = {};
  enriched.forEach(e=>{ (byFaculty[e.faculty.id] = byFaculty[e.faculty.id]||[]).push(e); });
  return FACULTIES.map(f=>{
    const subject = keySubjectFor(f.id);
    const list = byFaculty[f.id] || [];
    if(!subject || !list.length) return null; // no single representative subject, or no interested learners -- correctly omitted, not shown with a bogus row
    const withMark = list.map(e=>subjectMarkPct(e.learner, subject)).filter(p=>p!=null);
    return {
      pathwayName: f.name, subject, interested: list.length,
      above70: withMark.filter(p=>p>=70).length,
      mid: withMark.filter(p=>p>=50 && p<70).length,
      below50: withMark.filter(p=>p<50).length,
    };
  }).filter(Boolean);
}

// Every sentence here is built from the live `d` object computed above --
// never a hard-coded statement. A minimum-count guard (>=5) on the
// pathway-specific readiness insight avoids a dignity-sensitive "1
// learner has weak marks" sentence in a small cohort.
function generateSchoolInsights(d){
  const out = [];
  if(d.pathwayDistribution.length){
    const top = d.pathwayDistribution[0];
    out.push(`${esc(top.name)} is the most common career pathway among assessed Grade 9 learners, matching ${top.count} learner${top.count===1?'':'s'} (${top.pct}%).`);
  }
  if(d.overview.conflictCount>0){
    const byFacultyName = {};
    d.enriched.forEach(e=>{ if(e.conflict && e.conflict.hasConflict) byFacultyName[e.faculty.name] = (byFacultyName[e.faculty.name]||0)+1; });
    const worst = Object.entries(byFacultyName).sort((a,b)=>b[1]-a[1])[0];
    out.push(`${d.overview.conflictCount} learner${d.overview.conflictCount===1?'':'s'} currently show a potential subject-career conflict${worst?` — most concentrated in ${esc(worst[0])} (${worst[1]} learner${worst[1]===1?'':'s'})`:''}.`);
  }
  if(d.subjectDemand.list.length){
    const top = d.subjectDemand.list[0];
    out.push(`${esc(top.subject)} is the most in-demand Grade 10 subject choice among learners who have specified their subjects, selected by ${top.count} (${top.pct}%).`);
  }
  d.readinessByPathway.forEach(r=>{
    if(r.below50>=5) out.push(`${r.below50} learners interested in ${esc(r.pathwayName)} currently have ${esc(r.subject)} results below 50% and may benefit from targeted support.`);
  });
  return out;
}

function viewAdminDashboard(){
  // Plain classId/'all' route param, same convention as viewAdminCohort's
  // own filter (this route never receives the {fac} object form). Chips
  // only render once there's more than one class to choose between.
  const filterClass = ROUTE_PARAM || 'all';
  const mine = myClasses();
  const d = buildSchoolDashboardData(filterClass);
  return `
  ${pageHeadHTML('Grade 9 Dashboard', 'An aggregate view of your Grade 9 cohort — patterns and learners who may benefit from extra guidance, never final decisions.')}
  ${mine.length>1 ? `
  <div class="filter-bar">
    <button class="chip-select ${filterClass==='all'?'on':''}" onclick="navigate('admin-dashboard','all')">All classes</button>
    ${mine.map(c=>`<button class="chip-select ${filterClass===c.id?'on':''}" onclick="navigate('admin-dashboard','${c.id}')">${esc(c.name)}</button>`).join('')}
  </div>` : ''}
  ${IS_SUPER_ADMIN? `
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
    <button class="btn btn-amber" onclick="App.exportDashboardCSV('${filterClass}')">${icon('download')} Export CSV</button>
    <button class="btn btn-ghost" onclick="App.saveDashboardSnapshot()">${icon('check')} Save Snapshot</button>
  </div>` : ''}
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${d.overview.totalLearners}</div><div class="l">Grade 9 learners</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--grass)"></div><div><div class="n">${d.overview.completionRate}%</div><div class="l">Assessment completion</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${d.overview.guidanceRequired}</div><div class="l">Learners requiring guidance</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--coral)"></div><div><div class="n">${d.overview.conflictCount}</div><div class="l">Subject-career conflicts</div></div></div>
  </div>

  ${snapshotComparisonHTML(d.overview)}

  ${d.insights.length ? `
  <div class="section-title" style="margin-top:0;"><h2>School Insights</h2></div>
  ${d.insights.map(txt=>`<div class="disclaimer" style="margin-bottom:12px;">${icon('info','ic')}<div>${txt}</div></div>`).join('')}
  ` : ''}

  <div class="grid grid-2" style="margin-bottom:20px;">
    <div class="card">
      <h3>Career Pathway Distribution</h3>
      <p class="page-sub">Click a pathway to see its learners.</p>
      ${d.pathwayDistribution.length ? d.pathwayDistribution.map(p=>`
        <div style="margin-bottom:10px;cursor:pointer;" onclick="navigate('admin-cohort',{fac:'${p.id}', classId:'${filterClass}'})">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>${esc(p.name)}</span><span>${p.count} (${p.pct}%)</span></div>
          <div class="aps-bar"><div style="width:${p.pct}%;background:${p.color};"></div></div>
        </div>`).join('') : `<p class="page-sub">No assessed Grade 9 learners yet.</p>`}
    </div>
    <div class="card">
      <h3>Grade 10 Subject Demand</h3>
      <p class="page-sub">${d.subjectDemand.withIntendedCount} of ${d.overview.totalLearners} learners have specified intended subjects${d.subjectDemand.notYetSpecifiedCount?` — ${d.subjectDemand.notYetSpecifiedCount} not yet`:''}.</p>
      ${d.subjectDemand.list.length ? d.subjectDemand.list.slice(0,10).map(s=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;"><span>${esc(s.subject)}</span><span>${s.count} (${s.pct}%)</span></div>
          <div class="aps-bar"><div style="width:${s.pct}%"></div></div>
        </div>`).join('') : `<p class="page-sub">No subject intentions recorded yet.</p>`}
    </div>
  </div>

  ${d.readinessByPathway.length ? `
  <div class="card" style="margin-bottom:20px;">
    <h3>Academic Readiness by Pathway</h3>
    <p class="page-sub">How interested learners’ current results in each pathway’s key subject break down. Pathways with no single representative subject are omitted here, not shown with a misleading one.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Pathway</th><th>Key subject</th><th>Interested</th><th>≥70%</th><th>50–69%</th><th>&lt;50%</th></tr></thead>
      <tbody>
        ${d.readinessByPathway.map(r=>`<tr><td>${esc(r.pathwayName)}</td><td>${esc(r.subject)}</td><td>${r.interested}</td><td>${r.above70}</td><td>${r.mid}</td><td>${r.below50}</td></tr>`).join('')}
      </tbody>
    </table></div>
  </div>` : ''}

  <div class="section-title"><h2>Learners Requiring Guidance</h2></div>
  <div class="table-wrap"><table>
    <thead><tr><th>Learner</th><th>Career Pathway</th><th>Career Interest</th><th>Current Academic Concern</th><th>Planned Subject</th><th>Potential Conflict</th><th>Recommended Action</th></tr></thead>
    <tbody>
      ${d.guidanceRows.length ? d.guidanceRows.map(r=>`
        <tr style="cursor:pointer;" onclick="navigate('admin-learner','${r.learnerId}')">
          <td><a href="#" onclick="event.preventDefault();navigate('admin-learner','${r.learnerId}');"><b>${esc(r.learnerName)}</b></a></td>
          <td>${esc(r.pathway)}</td>
          <td>${esc(r.interest)}</td>
          <td>${esc(r.concern)}</td>
          <td>${esc(r.planned)}</td>
          <td>${esc(r.conflict)}</td>
          <td>${esc(r.action)}</td>
        </tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">No learners currently flagged for guidance.</td></tr>`}
    </tbody>
  </table></div>
  ${disclaimerHTML('This view surfaces support opportunities based on current results and stated interests — it never makes final career or subject decisions for a learner.')}

  ${SNAPSHOTS.length ? `
  <div class="section-title"><h2>Snapshot History</h2></div>
  <div class="card">
    ${SNAPSHOTS.map(s=>{ const so = (s.data && s.data.overview) || {}; return `<div class="kv"><b>${s.label?esc(s.label):'Untitled snapshot'}</b><span>${esc(new Date(s.created_at).toLocaleDateString('en-ZA',{year:'numeric',month:'long',day:'numeric'}))} — ${so.totalLearners||0} learners, ${so.conflictCount||0} conflicts</span></div>`; }).join('')}
  </div>` : ''}
  `;
}

// Compares the live overview numbers against the most recent saved
// snapshot (SNAPSHOTS is sorted newest-first by loadDashboardSnapshots'
// own query). Renders nothing until at least one snapshot exists --
// there's nothing to compare yet otherwise.
function snapshotComparisonHTML(current){
  if(!SNAPSHOTS.length) return '';
  const prev = SNAPSHOTS[0];
  const po = prev.data.overview || {};
  const delta = (curr, old)=>{
    if(old==null) return '';
    const diff = curr - old;
    if(diff===0) return ' (no change)';
    return ` (${diff>0?'+':''}${diff} since last snapshot)`;
  };
  const dateStr = new Date(prev.created_at).toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' });
  return `
  <div class="card" style="margin-bottom:20px;">
    <h3>Compared to your last snapshot${prev.label?` — "${esc(prev.label)}"`:''} (${esc(dateStr)})</h3>
    <div class="grid grid-2">
      <div class="kv"><b>Grade 9 learners</b><span>${current.totalLearners}${delta(current.totalLearners, po.totalLearners)}</span></div>
      <div class="kv"><b>Assessment completion</b><span>${current.completionRate}%${delta(current.completionRate, po.completionRate)}</span></div>
      <div class="kv"><b>Learners requiring guidance</b><span>${current.guidanceRequired}${delta(current.guidanceRequired, po.guidanceRequired)}</span></div>
      <div class="kv"><b>Subject-career conflicts</b><span>${current.conflictCount}${delta(current.conflictCount, po.conflictCount)}</span></div>
    </div>
  </div>`;
}
