const App = {
  // ---- explore ----
  filterExplore(value){
    EXPLORE_SEARCH = value;
    const fac = ROUTE_PARAM && typeof ROUTE_PARAM==='object' ? ROUTE_PARAM.fac : (ROUTE_PARAM||'all');
    document.getElementById('exploreResults').innerHTML = exploreResultsHTML(fac, ensureLearnerObj());
  },
  setExploreFilter(key,value){ EXPLORE_FILTERS[key] = value || null; render(); },
  toggleExploreFilter(key){ EXPLORE_FILTERS[key] = !EXPLORE_FILTERS[key]; render(); },
  clearExploreFilters(){ EXPLORE_FILTERS = {}; render(); },
  // ---- anonymous mini-assessment ----
  startAnonFlow(){ MINI_DRAFT.step = 0; MINI_DRAFT.dir = 'fwd'; render(); },
  miniChoose(key, optionId){
    MINI_DRAFT.answers[key] = optionId;
    MINI_DRAFT.dir = 'fwd';
    const idx = MINI_QUESTIONS.findIndex(q=>q.key===key);
    const next = idx + 1;
    if(next >= MINI_QUESTIONS.length){
      MINI_DRAFT.step = 'results';
      writeMiniAssessment({ answers: MINI_DRAFT.answers, completedAt: todayISO() });
    } else {
      MINI_DRAFT.step = next;
    }
    render();
  },
  miniBack(){
    MINI_DRAFT.dir = 'back';
    if(MINI_DRAFT.step==='results') MINI_DRAFT.step = MINI_QUESTIONS.length - 1;
    else if(MINI_DRAFT.step===0) MINI_DRAFT.step = 'intro';
    else MINI_DRAFT.step = MINI_DRAFT.step - 1;
    render();
  },
  // A visitor who already has an account shouldn't be forced through this
  // every time they land here signed-out -- remember the decline so
  // handleSession() goes straight to the familiar sign-in card next time.
  // `declined` is a routing preference only -- it's set alongside any
  // existing completed `answers`, never replacing them, since a later
  // signup should still be able to carry those forward.
  declineAnonFlow(){
    const saved = readMiniAssessment() || {};
    writeMiniAssessment(Object.assign({}, saved, { declined:true }));
    MINI_DRAFT = null;
    render();
  },
  // From the sign-in card's reciprocal link: an explicit request overrides
  // any earlier decline. A previously completed mini-assessment is shown
  // again rather than re-asked.
  showAnonFlow(){
    const saved = readMiniAssessment();
    MINI_DRAFT = (saved && saved.answers)
      ? { step:'results', answers: saved.answers }
      : { step:'intro', answers:{interest:null,strength:null,motivation:null,activity:null} };
    render();
  },
  // Switches to the (existing) signup form. The completed mini-assessment
  // stays in localStorage untouched -- loadLearner() merges it into the
  // real account once signup actually succeeds, which for the default
  // email-confirmation flow may be minutes away. Clearing MINI_DRAFT itself
  // (not the stored data) is what makes render() show the auth gate now.
  miniContinueToSignup(){ MINI_DRAFT = null; AUTH_MODE = 'signup'; AUTH_ERROR = ''; render(); },
  // ---- auth ----
  setAuthMode(m){ AUTH_MODE = m; AUTH_ERROR=''; AUTH_SHOW_RESET=false; render(); },
  authSubmitOnEnter(){
    if(AUTH_MODE==='signin') App.authSignIn();
    else if(AUTH_MODE==='signup') App.authSignUp();
    else if(AUTH_MODE==='reset') App.authReset();
  },
  async authSignIn(){
    const email = (document.getElementById('auth_email')||{}).value.trim()||'';
    const pass = (document.getElementById('auth_pass')||{}).value||'';
    if(!email || !pass){ AUTH_ERROR='Please enter your email and password.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; AUTH_SHOW_RESET=false; render();
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error) AUTH_ERROR = friendlyAuthError(error);
    AUTH_BUSY = false; render();
  },
  async authSignUp(){
    const name = (document.getElementById('auth_name')||{}).value||'';
    const email = (document.getElementById('auth_email')||{}).value.trim()||'';
    const pass = (document.getElementById('auth_pass')||{}).value||'';
    if(!name.trim()){ AUTH_ERROR='Please enter your name.'; render(); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ AUTH_ERROR='Please enter a valid email address.'; render(); return; }
    if(pass.length < 6){ AUTH_ERROR='Please use at least 6 characters for your password.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; AUTH_SHOW_RESET=false; render();
    const { data, error } = await sb.auth.signUp({
      email, password: pass,
      options: {
        data: { display_name: name.trim() },
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    if(error){ AUTH_ERROR = friendlyAuthError(error); AUTH_BUSY=false; render(); return; }
    AUTH_BUSY = false;
    if(data.user && data.user.identities && data.user.identities.length === 0){
      // Supabase returns no error for a duplicate email, to avoid leaking
      // which addresses are registered -- an empty identities array is its
      // documented signal that this email already has a confirmed account.
      AUTH_ERROR = 'An account already exists with that email.';
      AUTH_SHOW_RESET = true;
      render();
      return;
    }
    if(!data.session){
      // Email confirmation is required (the default) — no session yet.
      toast('Check your email to confirm your account, then sign in.');
      App.setAuthMode('signin');
    } else {
      render(); // onAuthStateChange will take it from here
    }
  },
  async authReset(){
    const email = (document.getElementById('auth_email')||{}).value.trim()||'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ AUTH_ERROR='Please enter a valid email address.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    AUTH_BUSY = false;
    if(error){ AUTH_ERROR = friendlyAuthError(error); render(); return; }
    toast('Password reset email sent.');
    App.setAuthMode('signin');
  },
  async authGoogle(){
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin + window.location.pathname } });
    if(error){ AUTH_ERROR = friendlyAuthError(error); AUTH_BUSY=false; render(); }
    // On success the browser navigates away to Google and back — no further code runs here.
  },
  async authUpdatePassword(){
    const pass = (document.getElementById('newpass1')||{}).value||'';
    const pass2 = (document.getElementById('newpass2')||{}).value||'';
    if(pass.length < 6){ AUTH_ERROR='Please use at least 6 characters.'; render(); return; }
    if(pass !== pass2){ AUTH_ERROR='Those passwords don’t match.'; render(); return; }
    AUTH_BUSY = true; AUTH_ERROR=''; render();
    const { error } = await sb.auth.updateUser({ password: pass });
    AUTH_BUSY = false;
    if(error){ AUTH_ERROR = friendlyAuthError(error); render(); return; }
    AUTH_RECOVERY_MODE = false;
    toast('Password updated — you’re signed in.');
    const { data } = await sb.auth.getSession();
    await handleSession(data.session);
  },
  // ---- my profile (name/cell/email/password, while already signed in --
  // distinct from authUpdatePassword above, which is the recovery-link flow) ----
  async saveMyDetails(){
    const name = ((document.getElementById('myName')||{}).value||'').trim();
    const cellNumber = ((document.getElementById('myCell')||{}).value||'').trim();
    if(!name){ toast('Enter your name.'); return; }
    // { data:{...} } merges into existing user_metadata (e.g. a Google
    // avatar_url survives), it doesn't replace it -- same call shape
    // signUp() already uses for this same field.
    const { error } = await sb.auth.updateUser({ data: { display_name: name } });
    if(error){ toast('Could not save — '+friendlyAuthError(error)); console.error(error); return; }
    ME.name = name;
    await saveLearner({ cellNumber });
    toast('Details saved.');
    render();
  },
  async changeEmail(){
    const newEmail = ((document.getElementById('myEmail')||{}).value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)){ toast('Please enter a valid email address.'); return; }
    const { error } = await sb.auth.updateUser({ email: newEmail });
    if(error){ toast('Could not update email — '+friendlyAuthError(error)); console.error(error); return; }
    // Deliberately no optimistic update to ME/learners/profiles here --
    // the real auth email hasn't changed yet. handle_user_updated()
    // (supabase/add_profile_editing.sql) syncs profiles/learners once
    // they actually confirm it, and the next session refresh picks up
    // the new ME.email automatically.
    toast('Check your new email address for a confirmation link — the change applies once you click it.');
    render();
  },
  async changePassword(){
    const current = (document.getElementById('curPass')||{}).value||'';
    const next1 = (document.getElementById('newPass1')||{}).value||'';
    const next2 = (document.getElementById('newPass2')||{}).value||'';
    if(!current){ toast('Enter your current password.'); return; }
    if(next1.length < 6){ toast('New password must be at least 6 characters.'); return; }
    if(next1 !== next2){ toast('Those new passwords don’t match.'); return; }
    // Re-verifies the current password before allowing a change -- these
    // are minors' accounts, often on shared school computers; without
    // this, anyone left on an unlocked, already-signed-in session could
    // lock the real owner out with no proof of identity at all. A failed
    // attempt here doesn't disturb the existing valid session.
    const { error: verifyError } = await sb.auth.signInWithPassword({ email: ME.email, password: current });
    if(verifyError){ toast('Current password is incorrect.'); return; }
    const { error } = await sb.auth.updateUser({ password: next1 });
    if(error){ toast('Could not update password — '+friendlyAuthError(error)); console.error(error); return; }
    toast('Password updated.');
    render();
  },
  async signOut(){ await sb.auth.signOut(); },
  async cancelRecovery(){
    AUTH_RECOVERY_MODE = false;
    AUTH_ERROR = '';
    await sb.auth.signOut();
  },

  // ---- onboarding ----
  setGrade(g){
    const l = ensureLearnerObj();
    captureOnboardingForm(l.grade);
    LEARNER.grade = g;
    if(g===9){ LEARNER.mathType=null; LEARNER.subjects=[]; }
    render();
  },
  setMathType(t){
    const l = ensureLearnerObj();
    captureOnboardingForm(l.grade);
    LEARNER.mathType = t;
    render();
  },
  chooseOnboardingPath(isExploring){
    ensureLearnerObj();
    LEARNER.exploringOnly = isExploring;
    if(isExploring){ LEARNER.grade = null; LEARNER.school = null; LEARNER.mathType = null; LEARNER.subjects = []; }
    render();
  },
  startExploring(route){
    ensureLearnerObj();
    if(LEARNER.exploringOnly !== false){
      LEARNER.exploringOnly = true;
      // Fire-and-forget: the in-memory state above is already enough for
      // this session's own gating/nav checks, so a second rapid click on a
      // different tile doesn't race this save to decide which route "wins".
      saveLearner({ exploringOnly:true, grade:null, school:null, mathType:null, subjects:[], licenseStatus: LEARNER.licenseStatus||'trial' });
    }
    navigate(route);
  },
  async saveOnboarding(){
    const l = ensureLearnerObj();
    if(l.exploringOnly){
      await saveLearner({ exploringOnly:true, grade:null, school:null, mathType:null, subjects:[], licenseStatus: l.licenseStatus||'trial' });
      toast('Profile saved.');
      // A mini-assessment-driven signup lands straight in the real
      // assessment instead of the dashboard -- the invitation they just
      // accepted should be an immediate continuation, not a link to find.
      navigate(l.miniAssessment ? 'assessment' : 'home');
      return;
    }
    if(!l.grade){ toast('Please select your grade.'); return; }
    const { school, subjects, subjectMarks } = readOnboardingForm(l.grade);
    if(!school || !school.trim()){ toast('Please add your school name.'); return; }
    await saveLearner({ exploringOnly:false, grade:l.grade, school:school.trim(), mathType: l.grade>9? l.mathType:null, subjects: subjects||[], subjectMarks: l.grade>9?(subjectMarks||{}):null, licenseStatus: l.licenseStatus||'trial' });
    toast('Profile saved.');
    navigate(l.miniAssessment ? 'assessment' : 'home');
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
  guideConf(key,val,el){
    const d = ensureGuideDraft();
    d.conf[key] = Number(val);
    const s = document.getElementById('val_'+key);
    if(s) s.textContent = val+'/5';
    if(!el) return;
    const row = el.closest('.slider-row');
    if(row) row.classList.remove('unanswered');
    const card = el.closest('.card');
    const btn = card && card.querySelector('.btn-primary');
    if(btn) btn.disabled = !STRENGTH_DOMAINS.every(dm=>d.conf[dm.id]>0);
  },
  async guideSubmit(){
    const d = ensureGuideDraft();
    const l = ensureLearnerObj();
    // Defence in depth: the Step 2 button already enforces this via
    // disabled/relabeling, but guard the save path itself in case this
    // is ever reached another way (e.g. a stale render).
    if(!STRENGTH_DOMAINS.every(dm=>d.conf[dm.id]>0)){ toast('Please rate every domain first.'); return; }
    if(!l.assessmentCompletedAt){ navigate('assessment'); return; }
    const result = buildGuidanceResult(d);
    await saveLearner({ subjectGuidance: result });
    d.step = 3;
    render();
    toast('Recommendation saved.');
  },
  guideRetake(){ GUIDE_DRAFT = null; ensureGuideDraft().step = 1; render(); },
  guideViewSaved(){ const d = ensureGuideDraft(); d.step = 3; render(); },

  // ---- Grade 9 Subject Choice Assessment ----
  subjectChoiceStart(){ SUBJECT_CHOICE_DRAFT = newSubjectChoiceDraft(); render(); window.scrollTo(0,0); },
  subjectChoiceRetake(){ SUBJECT_CHOICE_DRAFT = newSubjectChoiceDraft(); render(); window.scrollTo(0,0); },
  subjectChoiceStartOver(){
    if(!confirm('Start over? The answers on this attempt will be cleared.')) return;
    SUBJECT_CHOICE_DRAFT = null; render(); window.scrollTo(0,0);
  },
  // Patches the page in place (no full re-render) so the learner's scroll
  // position doesn't jump after every tap -- same approach as guideConf.
  subjectChoiceAnswer(qid, v, el){
    const d = SUBJECT_CHOICE_DRAFT; if(!d) return;
    v = Number(v);
    d.answers[qid] = v;
    persistDrafts();
    const row = el && el.closest('.sc-q');
    if(row) row.querySelectorAll('.sc-scale button').forEach((b,i)=>{ b.classList.toggle('on', i+1===v); b.setAttribute('aria-pressed', i+1===v ? 'true' : 'false'); });
    const total = d.order.length, answered = Object.keys(d.answers).length;
    const bar = document.getElementById('scBar'); if(bar) bar.style.width = Math.round(answered/total*100)+'%';
    const cnt = document.getElementById('scCount'); if(cnt) cnt.textContent = answered;
    const btn = document.getElementById('scNext');
    if(btn){
      const isLast = d.page === scPageCount(d) - 1;
      btn.disabled = isLast ? answered < total : !scPageIds(d).every(id=>d.answers[id]);
    }
  },
  subjectChoicePage(delta){
    const d = SUBJECT_CHOICE_DRAFT; if(!d) return;
    d.page = clamp(d.page + delta, 0, scPageCount(d) - 1);
    d.dir = delta < 0 ? 'back' : 'fwd';
    render(); window.scrollTo(0,0);
  },
  async subjectChoiceFinish(){
    const d = SUBJECT_CHOICE_DRAFT; if(!d) return;
    scSanitizeDraft(d);
    if(Object.keys(d.answers).length < SC_QUESTIONS.length){ toast('Please answer every question first.'); return; }
    const l = ensureLearnerObj();
    await saveLearner({ subjectChoice: { answers: d.answers, completedAt: todayISO(), bankVersion: SC_CONFIG.bankVersion } });
    SUBJECT_CHOICE_DRAFT = null;
    if(!l.assessmentCompletedAt){
      toast('Answers saved — now a quick look at how you naturally work.');
      navigate('assessment');
      return;
    }
    toast('Your subject results are ready!');
    navigate('subject-choice');
  },

  // ---- Grade 9 report results + work style ----
  grade9SetTerm(v){ ensureGrade9Draft().term = v; },
  grade9SetSocialSplit(v){ const d=ensureGrade9Draft(); d.socialSciencesSplit = v; render(); },
  grade9SetMark(subject, val){ ensureGrade9Draft().marks[subject] = val; },
  grade9ToggleCreativeFocus(area){
    const d = ensureGrade9Draft();
    if(d.creativeArtsFocus.includes(area)) d.creativeArtsFocus = d.creativeArtsFocus.filter(a=>a!==area);
    else if(d.creativeArtsFocus.length<2) d.creativeArtsFocus = [...d.creativeArtsFocus, area];
    else { toast('Pick up to 2 focus areas.'); return; }
    render();
  },
  grade9Step(n){ ensureGrade9Draft().step = n; render(); },
  grade9SetWorkStyle(key, val, el){
    const d = ensureGrade9Draft();
    d.workStyle[key] = Number(val);
    if(!el) return;
    const row = el.closest('.slider-row');
    if(row) row.classList.remove('unanswered');
    const card = el.closest('.card');
    const saveBtn = card && card.querySelector('.btn-primary');
    if(saveBtn) saveBtn.disabled = !WORK_STYLE_QUESTIONS.every(q=>d.workStyle[q.key]>0);
  },
  async grade9Submit(){
    const d = ensureGrade9Draft();
    const subjects = {};
    // clamp(...,0,100): found accepting out-of-range input (150, -20) in
    // the pre-launch audit -- this feeds academic-fit scoring directly.
    Object.keys(d.marks).forEach(k=>{ if(d.marks[k]!=null && d.marks[k]!=='') subjects[k] = { pct: clamp(Number(d.marks[k]),0,100) }; });
    const workStyle = {};
    WORK_STYLE_QUESTIONS.forEach(q=>{ workStyle[q.key] = clamp((d.workStyle[q.key]-1)/4*100, 0, 100); });
    await saveLearner({
      grade9Report: { term: d.term, grade: 9, subjects, socialSciencesSplit: d.socialSciencesSplit, creativeArtsFocus: d.creativeArtsFocus },
      workStyle,
    });
    GRADE9_DRAFT = null;
    toast('Grade 9 report results saved.');
    navigate('learner-profile');
  },

  // ---- assessment ----
  assessGoto(step,dir){
    const d = ensureAssessDraft();
    d.retaking = true;
    d.dir = dir || 'fwd';
    d.step = Math.max(0, step);
    render();
  },
  assessBack(){ const d=ensureAssessDraft(); App.assessGoto(d.step-1,'back'); },
  assessNext(){
    const d = ensureAssessDraft();
    App.assessGoto(d.step+1,'fwd');
  },
  assessChoose(step,val){
    const d = ensureAssessDraft();
    if(step<RIASEC_QUESTIONS.length) d.answers[step]=val; else d.strengths[step-RIASEC_QUESTIONS.length]=val;
    App.assessGoto(step+1,'fwd');
  },
  assessSlide(step,val){
    const d = ensureAssessDraft();
    const isRiasec = step<RIASEC_QUESTIONS.length;
    if(isRiasec) d.answers[step]=Number(val); else d.strengths[step-RIASEC_QUESTIONS.length]=Number(val);
    const labels = isRiasec ? RIASEC_SCALE : STRENGTH_SCALE;
    const elLabel = document.getElementById('qval_'+step);
    if(elLabel) elLabel.textContent = labels[Number(val)-1];
    const row = elLabel && elLabel.closest('.slider-row');
    if(row){
      row.classList.remove('unanswered');
      row.querySelectorAll('.slider-ticks span').forEach((el,i)=>el.classList.toggle('on', i+1===Number(val)));
    }
    const continueBtn = row && row.closest('.card') && row.closest('.card').querySelector('.btn-primary');
    if(continueBtn) continueBtn.disabled = false;
  },
  assessSlideCommit(step,val){ App.assessChoose(step, Number(val)); },
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
    const firstCompletion = !LEARNER || !LEARNER.assessmentCompletedAt;
    await saveLearner({ riasec, strengths, riasecRaw:d.answers, strengthsRaw:d.strengths, assessmentCompletedAt: todayISO() });
    ASSESSMENT_DRAFT = null;
    // The Subject Choice report needs this assessment -- if they were sent
    // here from it, take them straight back to their subject results.
    if(firstCompletion && LEARNER && LEARNER.subjectChoice && LEARNER.subjectChoice.completedAt){
      toast('Assessment complete — here are your subject results!');
      navigate('subject-choice');
      return;
    }
    render();
    toast('Assessment complete!');
  },
  assessRetake(){ ASSESSMENT_DRAFT=null; const d=ensureAssessDraft(); d.retaking=true; d.step=0; render(); },

  // ---- report: intended subjects ----
  async toggleIntendedSubject(subject){
    const l = ensureLearnerObj();
    let subs = l.intendedSubjects || [];
    subs = subs.includes(subject) ? subs.filter(x=>x!==subject) : [...subs, subject];
    await saveLearner({ intendedSubjects: subs });
    render();
  },
  async setIntendedMathType(type){
    await saveLearner({ intendedMathType: type });
    render();
  },

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
    // Resolved server-side by join_class_by_code(), not by matching
    // against the client's own full CLASSES array -- found in the
    // pre-launch audit that the old client-side-only match let a learner
    // set classId to ANY class's id directly, skipping the "must know
    // the code" step entirely (classes_select_authenticated hands every
    // signed-in user the full table, by design, so CLASSES.find() alone
    // never actually verified anything).
    const { data, error } = await sb.rpc('join_class_by_code', { p_code: code });
    if(error){
      // join_class_by_code() raises two distinct messages server-side --
      // tell them apart so "this class is full" doesn't look identical
      // to "that code doesn't exist".
      const msg = (error.message||'').toLowerCase();
      toast(msg.includes('seat limit') ? 'This class has reached its seat limit — ask your school admin for help.' : 'No class found with that code.');
      console.error(error);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if(!row){ toast('No class found with that code.'); return; }
    // Mirrors what join_class_by_code() just did server-side, so the UI
    // reflects activation immediately instead of waiting for a reload.
    LEARNER.classId = row.class_id;
    LEARNER.licenseStatus = 'active';
    LEARNER.licenseSource = 'class';
    toast('Joined '+row.class_name+' — your account is now active!');
    navigate('home');
  },
  async leaveClass(){
    // Mirrors what the server-side trigger will enforce regardless (a
    // class-granted licence always reverts when classId changes) -- this
    // is immediate-UI-feedback polish, not the real enforcement point.
    if(LEARNER && LEARNER.licenseSource==='class'){ LEARNER.licenseStatus='trial'; LEARNER.licenseSource=null; }
    await saveLearner({ classId: null });
    render();
  },

  // ---- admin: preview mode ----
  togglePreview(){
    PREVIEW_MODE = !PREVIEW_MODE;
    if(PREVIEW_MODE){
      // Needs grade+school set, or render()'s needsOnboarding check (it
      // can't tell this object apart from a real new signup) force-routes
      // straight to the onboarding wizard instead of the dashboard this
      // feature exists to preview -- found in the pre-launch audit.
      LEARNER = {
        id:'preview', exists:false, grade:9, school:'Preview School',
        exploringOnly:false, licenseStatus:'active',
        subjects:[], subjectMarks:{}, intendedSubjects:[],
        favourites:[], compare:[], viewedMatches:false,
      };
    } else { LEARNER = null; }
    navigate(PREVIEW_MODE ? 'home' : 'admin-home');
  },

  // ---- admin: classes ----
  async createClass(){
    const name = (document.getElementById('newClassName')||{}).value || '';
    // ||null, not ||0: a blank/0 seat count means "unlimited" everywhere
    // else (the admin UI already displays a falsy seatLimit as '∞'), and
    // join_class_by_code()'s seat-limit check now matches that same
    // convention -- inserting a literal 0 here would silently create a
    // class no one could ever join.
    const seats = Number((document.getElementById('newClassSeats')||{}).value) || null;
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
    if(error){ toast('Could not delete class — check your connection and try again.'); console.error(error); return; }
    CLASSES = CLASSES.filter(c=>c.id!==id);
    render();
  },
  // ||null, not ||0: matches createClass's own "blank/0 = unlimited"
  // convention, which join_class_by_code()'s seat-limit check already
  // relies on (supabase/add_payment_verification.sql) -- a class can be
  // increased (or decreased) at any time, including after learners have
  // already joined; decreasing below the current active count doesn't
  // remove anyone, it just blocks further joins until the count drops.
  async updateClassSeats(id, rawValue){
    const seatLimit = Number(rawValue) || null;
    const { error } = await sb.from('classes').update({ seatLimit }).eq('id', id);
    if(error){ toast('Could not update seats — check your connection and try again.'); console.error(error); return; }
    const cls = CLASSES.find(c=>c.id===id);
    if(cls) cls.seatLimit = seatLimit;
    toast('Seats updated.');
    render();
  },
  // Assigns an existing account as the class admin for one class, by email
  // -- mirrors this app's existing "promote by hand" assumption (README
  // Phase 2/5): the target must already have signed up. Refuses to
  // silently demote an existing super admin to class_admin.
  async assignClassAdmin(classId, email){
    const trimmed = (email||'').trim().toLowerCase();
    if(!trimmed){ toast('Enter the class admin’s email.'); return; }
    const { data: found, error: lookupError } = await sb.from('profiles')
      .select('id,email,role').eq('email', trimmed).maybeSingle();
    if(lookupError){ toast('Could not look up that account.'); console.error(lookupError); return; }
    if(!found){ toast('No account found with that email — ask them to sign up first, then try again.'); return; }
    if(found.role==='admin'){ toast(found.email+' is already an Institute Admin — not changing their role.'); return; }
    if(found.role!=='class_admin'){
      const { error } = await sb.from('profiles').update({ role:'class_admin' }).eq('id', found.id);
      if(error){ toast('Could not update that account’s role.'); console.error(error); return; }
      CLASS_ADMINS.push({ id:found.id, email:found.email, role:'class_admin' });
    }
    const { error } = await sb.from('classes').update({ classAdminId: found.id }).eq('id', classId);
    if(error){ toast('Could not assign class admin — check you’re a super admin.'); console.error(error); return; }
    const cls = CLASSES.find(c=>c.id===classId);
    if(cls) cls.classAdminId = found.id;
    toast(found.email+' is now the class admin for this class.');
    render();
  },

  // ---- admin: cohort ----
  setCohortSearch(v){ window.__cohortSearch = v; render(); },
  async toggleLicense(id){
    const l = COHORT.find(c=>c.id===id);
    if(!l) return;
    const prev = l.licenseStatus;
    const next = prev==='active' ? 'trial' : 'active';
    // licenseSource:'admin' marks this as persisting regardless of class
    // changes (unlike a 'class'-sourced activation, which auto-reverts if
    // the learner later leaves/loses that class -- see
    // protect_license_status() in supabase/schema.sql).
    const nextSource = next==='active' ? 'admin' : null;
    const { error } = await sb.from('learners').update({ licenseStatus: next, licenseSource: nextSource, updatedAt: todayISO() }).eq('id', id);
    // Only reflect the change locally once it's actually confirmed saved --
    // flipping the badge first and leaving it flipped on error (found in
    // the pre-launch audit) showed a success state in the same breath as
    // the failure toast.
    if(error){ toast('Could not update licence — check your connection and try again.'); console.error(error); return; }
    l.licenseStatus = next;
    l.licenseSource = nextSource;
    render();
  },
  // One combined CSV for the whole Grade 9 Dashboard (overview numbers,
  // pathway distribution, subject demand, readiness cross-tab, guidance
  // table) as a single file with a header row per section -- mirrors
  // exportCohortCSV's own Blob/download pattern exactly, just with
  // several small tables instead of one.
  exportDashboardCSV(filterClass){
    const d = buildSchoolDashboardData(filterClass);
    const lines = [];
    const section = (title, headers, rows)=>{
      lines.push(csvEscape(title));
      lines.push(headers.map(csvEscape).join(','));
      rows.forEach(r=>lines.push(r.map(csvEscape).join(',')));
      lines.push('');
    };
    section('Grade 9 Dashboard Overview', ['Metric','Value'], [
      ['Grade 9 learners', d.overview.totalLearners],
      ['Assessment completion', d.overview.completionRate+'%'],
      ['Learners requiring guidance', d.overview.guidanceRequired],
      ['Subject-career conflicts', d.overview.conflictCount],
    ]);
    section('Career Pathway Distribution', ['Pathway','Learner Count','Percentage'],
      d.pathwayDistribution.map(p=>[p.name, p.count, p.pct+'%']));
    section('Grade 10 Subject Demand', ['Subject','Learner Count','Percentage'],
      d.subjectDemand.list.map(s=>[s.subject, s.count, s.pct+'%']));
    section('Academic Readiness by Pathway', ['Pathway','Key Subject','Interested','>=70%','50-69%','<50%'],
      d.readinessByPathway.map(r=>[r.pathwayName, r.subject, r.interested, r.above70, r.mid, r.below50]));
    section('Learners Requiring Guidance', ['Learner','Career Pathway','Career Interest','Current Academic Concern','Planned Subject','Potential Conflict','Recommended Action'],
      d.guidanceRows.map(r=>[r.learnerName, r.pathway, r.interest, r.concern, r.planned, r.conflict, r.action]));

    const csv = lines.join('\r\n');
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'iroli-grade9-dashboard-export.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Dashboard export downloaded.');
  },
  // A deliberate, admin-triggered point-in-time copy of the dashboard's
  // aggregate numbers -- never a silent background snapshot, mirroring
  // how apsLast/subjectGuidance are saved elsewhere in this app. Only
  // cohort-level aggregates are stored, never per-learner rows. Always
  // whole-cohort (ignores any active class-filter chip) -- this feature
  // is specifically for whole-school term-over-term trend tracking, and
  // is super-admin-only regardless, so a per-class snapshot dimension
  // isn't needed.
  async saveDashboardSnapshot(){
    const d = buildSchoolDashboardData();
    const label = (prompt('Label this snapshot (e.g. "Term 3 2026") -- optional:') || '').trim() || null;
    const payload = { overview: d.overview, pathwayDistribution: d.pathwayDistribution, subjectDemand: d.subjectDemand.list };
    const { error } = await sb.from('dashboard_snapshots').insert({ label, data: payload, created_by: ME.id });
    if(error){ toast('Could not save snapshot — check your connection.'); console.error(error); return; }
    await loadDashboardSnapshots();
    toast('Snapshot saved.');
    render();
  },
  exportCohortCSV(filterClass, facFilter){
    const search = (window.__cohortSearch||'').toLowerCase();
    const rows = cohortRowsFiltered(facFilter||null, filterClass||'all', search);
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
    const blob = new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' });
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

// Reads the onboarding form's live DOM values (school name, and for
// Grade 10+ the checked subjects/marks) given the grade whose form shape
// is currently on screen -- shared by saveOnboarding's final submit and
// captureOnboardingForm below, so there's exactly one place that knows
// how to read this form.
function readOnboardingForm(gradeOnScreen){
  const schoolEl = document.getElementById('ob_school');
  const school = schoolEl ? schoolEl.value : undefined;
  let subjects, subjectMarks;
  if(gradeOnScreen>9){
    subjects = Array.from(document.querySelectorAll('.subject-check:checked')).map(el=>el.value);
    subjectMarks = {};
    document.querySelectorAll('.subject-mark:not(:disabled)').forEach(el=>{
      // clamp(...,0,100): found accepting out-of-range input (150, -20) in
      // the pre-launch audit -- this feeds academic-fit scoring directly.
      if(el.value!=='') subjectMarks[el.dataset.subject] = { pct: clamp(Number(el.value),0,100), term: todayISO() };
    });
  }
  return { school, subjects, subjectMarks };
}
// Commits the onboarding form's live DOM values into LEARNER before a
// Grade/Maths chip click re-renders viewOnboarding() from LEARNER's
// fields -- otherwise a school name already typed, or subjects/marks
// already checked in, was silently wiped on every such click (found in
// the pre-launch audit). Takes the grade whose form is CURRENTLY on
// screen (i.e. the old grade, read before it's changed).
function captureOnboardingForm(gradeOnScreen){
  if(!LEARNER || LEARNER.exploringOnly) return;
  const { school, subjects, subjectMarks } = readOnboardingForm(gradeOnScreen);
  if(school!==undefined) LEARNER.school = school;
  if(gradeOnScreen>9){ LEARNER.subjects = subjects; LEARNER.subjectMarks = subjectMarks; }
}

function csvEscape(v){
  let s = v==null ? '' : String(v);
  // A free-text field (learner name, school) starting with =/+/-/@ opens
  // as a live formula in Excel/Sheets -- prefix a guard quote so it's
  // read back as plain text instead (classic CSV/formula injection).
  if(/^[=+\-@\t\r]/.test(s)) s = "'"+s;
  if(/[",\r\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
  return s;
}
