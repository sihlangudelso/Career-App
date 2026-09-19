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
  ${pageHeadHTML('Institute overview', 'A snapshot of every learner using this Iroli Career Pathway workspace.')}
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${s.total}</div><div class="l">Total learners</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--grass)"></div><div><div class="n">${s.active}</div><div class="l">Active licences</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--coral)"></div><div><div class="n">${s.trial}</div><div class="l">Trial access</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${CLASSES.length}</div><div class="l">Classes</div></div></div>
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
    <button class="tile" style="border-top-color:var(--amber)" onclick="navigate('admin-classes')">${icon('users','tico')}<h3>Create a class</h3><p>Set up classes and licence seats for your learners.</p></button>
    <button class="tile" style="border-top-color:var(--indigo)" onclick="navigate('admin-cohort')">${icon('chart','tico')}<h3>View cohort data</h3><p>See every learner\u2019s profile, matches and personality — export anytime.</p></button>
    <button class="tile" style="border-top-color:var(--teal)" onclick="App.togglePreview()">${icon('spark','tico')}<h3>Preview learner view</h3><p>See exactly what your learners experience.</p></button>
  </div>
  <div style="margin-top:24px;">${disclaimerHTML('This workspace is shared with everyone who opens this link. Give the general link (Can interact) to learners, and grant "Can edit" to fellow Institute staff who should see admin tools like this one.')}</div>
  `;
}

function viewAdminClasses(){
  return `
  ${pageHeadHTML('Classes & licences', 'Create classes, generate join codes, and manage licence seats.')}
  <div class="card" style="margin-bottom:20px;">
    <h3>Create a new class</h3>
    <div class="grid grid-3">
      <div class="form-row"><label>Class name</label><input type="text" id="newClassName" placeholder="e.g. Grade 10A 2026"/></div>
      <div class="form-row"><label>Licence seats</label><input type="number" id="newClassSeats" value="35" min="1"/></div>
      <div class="form-row" style="display:flex;align-items:flex-end;"><button class="btn btn-primary" onclick="App.createClass()">${icon('plus')} Create class</button></div>
    </div>
  </div>
  ${CLASSES.length? CLASSES.map(c=>{
    const members = COHORT.filter(l=>l.classId===c.id);
    const licensed = members.filter(l=>l.licenseStatus==='active').length;
    return `
    <div class="card" style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <h3 style="margin-bottom:4px;">${esc(c.name)}</h3>
          <div class="page-sub">Code <span class="class-code">${esc(c.code)}</span> · ${members.length} learner(s) · ${licensed}/${c.seatLimit||'∞'} licensed seats used</div>
        </div>
        <div style="display:flex;gap:8px;align-self:flex-start;">
          <button class="btn btn-ghost btn-sm" onclick="navigate('admin-cohort','${c.id}')">View learners</button>
          <button class="btn btn-ghost btn-sm" onclick="App.deleteClass('${c.id}')">${icon('trash')}</button>
        </div>
      </div>
    </div>`;
  }).join('') : `<div class="empty-state">${icon('users')}<p>No classes yet — create your first class above.</p></div>`}
  <div style="margin-top:10px;">${disclaimerHTML('Licence seats are tracked here for planning; Iroli Career Pathway does not process payments in-app. Activate a learner\u2019s seat from the Cohort tab once payment/invoicing has been arranged with your Iroli account manager.')}</div>
  `;
}

function viewAdminCohort(){
  const filterClass = ROUTE_PARAM || 'all';
  const search = (window.__cohortSearch||'').toLowerCase();
  let rows = COHORT.slice();
  if(filterClass!=='all') rows = rows.filter(l=>l.classId===filterClass);
  if(search) rows = rows.filter(l=> cohortLearnerName(l.id).toLowerCase().includes(search));
  return `
  ${pageHeadHTML('Cohort data', 'Every learner\u2019s profile, personality, career matches and licence status — export any time.')}
  <div class="filter-bar" style="justify-content:space-between;">
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="chip-select ${filterClass==='all'?'on':''}" onclick="navigate('admin-cohort','all')">All classes</button>
      ${CLASSES.map(c=>`<button class="chip-select ${filterClass===c.id?'on':''}" onclick="navigate('admin-cohort','${c.id}')">${esc(c.name)}</button>`).join('')}
    </div>
    <button class="btn btn-amber" onclick="App.exportCohortCSV('${filterClass}')">${icon('download')} Export CSV</button>
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
          <td>${hollandCode(l.riasec)}</td>
          <td style="max-width:220px;">${esc(top)}</td>
          <td>${(l.favourites||[]).length}</td>
          <td><span class="badge ${l.licenseStatus==='active'?'badge-strong':'badge-good'}">${l.licenseStatus==='active'?'Active':'Trial'}</span></td>
          <td><button class="btn btn-ghost btn-sm" onclick="App.toggleLicense('${l.id}')">${l.licenseStatus==='active'?'Deactivate':'Activate'}</button></td>
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
      <div class="kv"><b>Maths track</b><span>${l.mathType||'—'}</span></div>
      <div class="kv"><b>Subjects</b><span>${(l.subjects||[]).join(', ')||'—'}</span></div>
      <div class="kv"><b>Personality (Holland code)</b><span>${hollandCode(l.riasec)}</span></div>
      <div class="kv"><b>Licence</b><span>${l.licenseStatus==='active'?'Active':'Trial'}</span></div>
      <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="App.toggleLicense('${l.id}')">${l.licenseStatus==='active'?'Deactivate licence':'Activate licence'}</button>
    </div>
    <div class="card">
      <h3>Interest profile</h3>
      ${l.riasec ? RIASEC.map(d=>`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:600;"><span>${d.name}</span><span>${Math.round(l.riasec[d.id]||0)}%</span></div><div class="aps-bar"><div style="width:${Math.round(l.riasec[d.id]||0)}%"></div></div></div>`).join('') : '<p class="page-sub">Assessment not yet completed.</p>'}
    </div>
  </div>
  <div class="card" style="margin-bottom:18px;">
    <h3>Top career matches</h3>
    ${matches.length? matches.map(m=>careerRowHTML(m.career,m.score,l)).join('') : '<p class="page-sub">No assessment data yet.</p>'}
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
