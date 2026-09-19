const App = {
  // ---- auth ----
  setAuthMode(m){ AUTH_MODE = m; AUTH_ERROR=''; render(); },
  async authSignIn(){
    const email = (document.getElementById('auth_email')||{}).value||'';
    const pass = (document.getElementById('auth_pass')||{}).value||'';
    if(!email || !pass){ AUTH_ERROR='Please enter your email and password.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error) AUTH_ERROR = friendlyAuthError(error);
    AUTH_BUSY = false; render();
  },
  async authSignUp(){
    const name = (document.getElementById('auth_name')||{}).value||'';
    const email = (document.getElementById('auth_email')||{}).value||'';
    const pass = (document.getElementById('auth_pass')||{}).value||'';
    if(!name.trim()){ AUTH_ERROR='Please enter your name.'; render(); return; }
    if(!email || !pass){ AUTH_ERROR='Please enter your email and password.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { data, error } = await sb.auth.signUp({
      email, password: pass,
      options: { data: { display_name: name.trim() } },
    });
    if(error){ AUTH_ERROR = friendlyAuthError(error); AUTH_BUSY=false; render(); return; }
    AUTH_BUSY = false;
    if(!data.session){
      // Email confirmation is required (the default) — no session yet.
      toast('Check your email to confirm your account, then sign in.');
      App.setAuthMode('signin');
    } else {
      render(); // onAuthStateChange will take it from here
    }
  },
  async authReset(){
    const email = (document.getElementById('auth_email')||{}).value||'';
    if(!email){ AUTH_ERROR='Enter your email first.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    AUTH_BUSY = false;
    if(error){ AUTH_ERROR = friendlyAuthError(error); render(); return; }
    toast('Password reset email sent.');
    App.setAuthMode('signin');
  },
  async authGoogle(){
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin } });
    if(error){ AUTH_ERROR = friendlyAuthError(error); AUTH_BUSY=false; render(); }
    // On success the browser navigates away to Google and back — no further code runs here.
  },
  async signOut(){ await sb.auth.signOut(); },

  // ---- onboarding ----
  setGrade(g){ ensureLearnerObj(); LEARNER.grade = g; if(g===9){ LEARNER.mathType=null; LEARNER.subjects=[]; } render(); },
  setMathType(t){ ensureLearnerObj(); LEARNER.mathType = t; render(); },
  async saveOnboarding(){
    const l = ensureLearnerObj();
    if(!l.grade){ toast('Please select your grade.'); return; }
    const school = (document.getElementById('ob_school')||{}).value || '';
    if(!school.trim()){ toast('Please add your school name.'); return; }
    const subjects = l.grade>9 ? Array.from(document.querySelectorAll('.subject-check:checked')).map(el=>el.value) : [];
    await saveLearner({ grade:l.grade, school:school.trim(), mathType: l.grade>9? l.mathType:null, subjects, licenseStatus: l.licenseStatus||'trial' });
    toast('Profile saved.');
    navigate('home');
  },

  // ---- grade 9 guidance ----
  guideToggleTag(k){
    const d = ensureGuideDraft();
    if(d.tags.includes(k)) d.tags = d.tags.filter(x=>x!==k);
    else if(d.tags.length<3) d.tags = [...d.tags, k];
    else toast('You can pick up to 3.');
    render();
  },
  guideStep(n){ ensureGuideDraft().step = n; render(); },
  guideConf(key,val){ const d=ensureGuideDraft(); d.conf[key]=Number(val); const s=document.getElementById('val_'+key); if(s) s.textContent = val+'/5'; },
  async guideSubmit(){
    const d = ensureGuideDraft();
    const result = buildGuidanceResult(d);
    await saveLearner({ subjectGuidance: result });
    d.step = 3;
    render();
    toast('Recommendation saved.');
  },
  guideRetake(){ GUIDE_DRAFT = null; ensureGuideDraft().step = 1; render(); },
  guideViewSaved(){ const d = ensureGuideDraft(); d.step = 3; render(); },

  // ---- assessment ----
  assessAnswer(idx,val){ ensureAssessDraft().answers[idx]=val; render(); },
  assessPage(n){ const d=ensureAssessDraft(); d.retaking=true; d.page=n; render(); },
  assessStrength(i,val){ const d=ensureAssessDraft(); d.strengths[i]=Number(val); const s=document.getElementById('val_str_'+i); if(s) s.textContent=val+'/5'; },
  async assessSubmit(){
    const d = ensureAssessDraft();
    const riasec = {};
    RIASEC.forEach(dim=>{
      const idxs = RIASEC_QUESTIONS.map((q,i)=>q.dim===dim.id?i:-1).filter(i=>i>=0);
      const sum = idxs.reduce((s,i)=>s+(d.answers[i]||0),0);
      riasec[dim.id] = clamp((sum-idxs.length)/(idxs.length*4)*100, 0, 100);
    });
    const strengths = {};
    STRENGTH_KEYS.forEach((s,i)=>{ strengths[s.id] = clamp((d.strengths[i]-1)/4*100,0,100); });
    await saveLearner({ riasec, strengths, riasecRaw:d.answers, strengthsRaw:d.strengths, assessmentCompletedAt: todayISO() });
    ASSESSMENT_DRAFT = null;
    render();
    toast('Assessment complete!');
  },
  assessRetake(){ ASSESSMENT_DRAFT=null; const d=ensureAssessDraft(); d.retaking=true; d.page=0; render(); },

  // ---- favourites / compare ----
  async toggleFav(id, ev){
    if(ev && ev.stopPropagation) ev.stopPropagation();
    const l = ensureLearnerObj();
    let favs = l.favourites || [];
    favs = favs.includes(id) ? favs.filter(x=>x!==id) : [...favs, id];
    await saveLearner({ favourites: favs });
    render();
  },
  async toggleCompare(id){
    const l = ensureLearnerObj();
    let cmp = l.compare || [];
    if(cmp.includes(id)) cmp = cmp.filter(x=>x!==id);
    else if(cmp.length<3) cmp = [...cmp, id];
    else { toast('You can compare up to 3 careers at a time.'); return; }
    await saveLearner({ compare: cmp });
    render();
  },
  async compareFromFavs(){
    const l = ensureLearnerObj();
    await saveLearner({ compare: (l.favourites||[]).slice(0,3) });
    navigate('compare');
  },

  // ---- APS ----
  apsSetMark(subject, val){ ensureApsDraft().marks[subject] = val; },
  apsAddSubject(){
    const sel = document.getElementById('apsAddSelect');
    const v = sel && sel.value;
    if(!v) return;
    const d = ensureApsDraft();
    d.subjects.push(v); d.marks[v] = '';
    render();
  },
  apsRemoveSubject(subject){
    const d = ensureApsDraft();
    d.subjects = d.subjects.filter(s=>s!==subject);
    delete d.marks[subject];
    render();
  },
  async apsCompute(){
    const d = ensureApsDraft();
    const { rows, aps } = computeAPSFromMarks(d.marks);
    await saveLearner({ apsLast: { aps, rows, marksMap: {...d.marks}, savedAt: todayISO() } });
    render();
  },

  // ---- class & licence ----
  async joinClass(){
    const code = ((document.getElementById('joinCode')||{}).value||'').trim().toUpperCase();
    if(!code){ toast('Enter a class code.'); return; }
    const cls = CLASSES.find(c=>(c.code||'').toUpperCase()===code);
    if(!cls){ toast('No class found with that code.'); return; }
    await saveLearner({ classId: cls.id });
    toast('Joined '+cls.name+'.');
    render();
  },
  async leaveClass(){
    await saveLearner({ classId: null });
    render();
  },

  // ---- admin: preview mode ----
  togglePreview(){
    PREVIEW_MODE = !PREVIEW_MODE;
    if(PREVIEW_MODE){
      LEARNER = { id:'preview', exists:false, licenseStatus:'active' };
      ROUTE = 'home';
    } else {
      LEARNER = null;
      ROUTE = 'admin-home';
    }
    render();
  },

  // ---- admin: classes ----
  async createClass(){
    const name = (document.getElementById('newClassName')||{}).value || '';
    const seats = Number((document.getElementById('newClassSeats')||{}).value) || 0;
    if(!name.trim()){ toast('Give the class a name.'); return; }
    let code = genCode();
    while(CLASSES.some(c=>c.code===code)) code = genCode();
    const { data, error } = await sb.from('classes')
      .insert({ name:name.trim(), code, seatLimit:seats, createdBy: ME.id||null })
      .select()
      .single();
    if(error){ toast('Could not create class — check you\u2019re an admin and schema.sql has been run.'); console.error(error); return; }
    CLASSES.unshift(data);
    toast('Class created — share code '+code+' with learners.');
    render();
  },
  async deleteClass(id){
    if(!confirm('Delete this class? Learners already assigned will keep their data but lose the class link.')) return;
    const { error } = await sb.from('classes').delete().eq('id', id);
    if(error) console.error(error);
    CLASSES = CLASSES.filter(c=>c.id!==id);
    render();
  },

  // ---- admin: cohort ----
  setCohortSearch(v){ window.__cohortSearch = v; render(); },
  async toggleLicense(id){
    const l = COHORT.find(c=>c.id===id);
    if(!l) return;
    const next = l.licenseStatus==='active' ? 'trial' : 'active';
    l.licenseStatus = next;
    const { error } = await sb.from('learners').update({ licenseStatus: next, updatedAt: todayISO() }).eq('id', id);
    if(error){ toast('Could not update licence — check your admin role.'); console.error(error); }
    render();
  },
  exportCohortCSV(filterClass){
    let rows = COHORT.slice();
    if(filterClass && filterClass!=='all') rows = rows.filter(l=>l.classId===filterClass);
    const headers = ['Name','Grade','School','Class','Maths Track','Subjects','Personality (Holland code)','Assessment Completed','Top 3 Career Matches','Favourites Count','APS Estimate','Licence Status','Last Updated'];
    const lines = [headers.join(',')];
    rows.forEach(l=>{
      const cls = CLASSES.find(c=>c.id===l.classId);
      const top3 = l.assessmentCompletedAt ? computeMatches(l).slice(0,3).map(m=>m.career.name).join('; ') : '';
      const line = [
        cohortLearnerName(l.id), l.grade||'', l.school||'', cls?cls.name:'', l.mathType||'',
        (l.subjects||[]).join('; '), hollandCode(l.riasec), l.assessmentCompletedAt?'Yes':'No',
        top3, (l.favourites||[]).length, l.apsLast?l.apsLast.aps:'', l.licenseStatus||'trial', l.updatedAt||''
      ].map(csvEscape).join(',');
      lines.push(line);
    });
    const csv = lines.join('\r\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'iroli-cohort-export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Export downloaded.');
  },

  // ---- mobile menu ----
  openMobileMenu(){
    const nav = currentNav();
    const el = document.createElement('div');
    el.className = 'mobile-menu-sheet';
    el.id = 'mobileMenuSheet';
    el.onclick = (e)=>{ if(e.target===el) App.closeMobileMenu(); };
    el.innerHTML = `<div class="mobile-menu-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <b>Menu</b><button class="btn btn-ghost btn-sm" onclick="App.closeMobileMenu()">${icon('close')}</button>
      </div>
      ${nav.map(n=>`<button class="nav-item" style="color:var(--ink);" onclick="App.closeMobileMenu();navigate('${n.r}')">${icon(n.ic)}<span>${n.label}</span></button>`).join('')}
      ${IS_ADMIN?`<button class="nav-item" style="color:var(--ink);" onclick="App.closeMobileMenu();App.togglePreview()">${icon('switch')}<span>${PREVIEW_MODE?'Exit preview':'Preview learner view'}</span></button>`:''}
      <button class="nav-item" style="color:var(--ink);" onclick="App.closeMobileMenu();App.signOut()">${icon('logout')}<span>Sign out</span></button>
    </div>`;
    document.body.appendChild(el);
  },
  closeMobileMenu(){ const el = document.getElementById('mobileMenuSheet'); if(el) el.remove(); },
};

function csvEscape(v){
  const s = v==null ? '' : String(v);
  if(/[",\r\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
