/* ============================================================
   IROLI CAREER PATHWAY — APPLICATION STATE (Supabase build)
   ============================================================ */

let ME = { id:null, name:'', email:'', avatarUrl:'' };
let IS_ADMIN = false;
let PREVIEW_MODE = false;
let LEARNER = null;
let ROUTE = 'home';
let ROUTE_PARAM = null;
let EXPLORE_SEARCH = '';
let CLASSES = [];
let COHORT = [];
let ASSESSMENT_DRAFT = null;
let GUIDE_DRAFT = null;
let APS_DRAFT = null;
let AUTH_READY = false;
let learnerChannel = null;
let JUST_CONFIRMED_EMAIL = false;
let AUTH_RECOVERY_MODE = false;

function esc(s){ const d=document.createElement('div'); d.textContent = (s==null?'':String(s)); return d.innerHTML; }
function avg(arr){ if(!arr.length) return 50; return arr.reduce((a,b)=>a+b,0)/arr.length; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function todayISO(){ return new Date().toISOString(); }
function genCode(){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s; }

function toast(msg){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const el = document.createElement('div');
  el.className='toast'; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2600);
}

/* ---------------- boot / auth ---------------- */
function boot(){
  if(SUPABASE_NOT_CONFIGURED){
    renderAuthGateOnly();
    return;
  }
  // Supabase's email-confirmation link redirects back here with the new
  // session in the URL hash (e.g. #access_token=...&type=signup). Read
  // that marker before the client consumes/strips the hash, so we can
  // greet a just-verified learner instead of silently signing them in.
  JUST_CONFIRMED_EMAIL = /type=signup/.test(window.location.hash);
  // A password-reset link also signs the person in via the URL hash (same
  // mechanism as email confirmation) -- intercept it so they land on a
  // "set a new password" screen instead of silently back in the app with
  // their old password unchanged.
  AUTH_RECOVERY_MODE = /type=recovery/.test(window.location.hash);
  sb.auth.onAuthStateChange((_event, session)=>{ handleSession(session); });
  sb.auth.getSession().then(({data})=> handleSession(data.session));
}

async function handleSession(session){
  AUTH_READY = true;
  if(learnerChannel){ sb.removeChannel(learnerChannel); learnerChannel = null; }
  const user = session && session.user;
  if(!user){
    ME = { id:null, name:'', email:'', avatarUrl:'' };
    IS_ADMIN = false; LEARNER = null;
    renderAuthGateOnly();
    return;
  }
  if(AUTH_RECOVERY_MODE){
    ME = { id:user.id, name:'', email:user.email, avatarUrl:'' };
    renderRecoveryOnly();
    return;
  }
  ME = {
    id: user.id,
    name: (user.user_metadata && user.user_metadata.display_name) || user.email,
    email: user.email,
    avatarUrl: (user.user_metadata && user.user_metadata.avatar_url) || '',
  };
  if(JUST_CONFIRMED_EMAIL){
    JUST_CONFIRMED_EMAIL = false;
    toast('Email verified! Welcome to Iroli Career Pathway.');
  }
  const profile = await ensureProfile(user);
  IS_ADMIN = profile.role === 'admin';
  renderShell();
  await loadClasses();
  if(IS_ADMIN){ ROUTE='admin-home'; await loadCohort(); }
  else { ROUTE='home'; await loadLearner(); }
  render();
}

function renderAuthGateOnly(){
  document.getElementById('root').innerHTML = `<div id="app-auth"></div>`;
  document.getElementById('app-auth').innerHTML = viewAuthGate();
}

function renderRecoveryOnly(){
  document.getElementById('root').innerHTML = `<div id="app-auth"></div>`;
  document.getElementById('app-auth').innerHTML = viewSetNewPassword();
}

async function ensureProfile(user){
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if(data) return data;
  // The profiles row should already exist via the on_auth_user_created
  // trigger (see supabase/schema.sql). If it's missing, the trigger
  // probably hasn't been installed yet — see README.md Phase 1/2.
  console.warn('No profile row found for this user — did you run supabase/schema.sql?');
  return { id: user.id, role: 'learner' };
}

/* ---------------- data loading ---------------- */
async function loadLearner(){
  if(!ME.id){ LEARNER = null; return; }
  const { data } = await sb.from('learners').select('*').eq('id', ME.id).maybeSingle();
  LEARNER = data ? { ...data, exists:true } : { id: ME.id, exists:false };

  // Live updates (e.g. an admin activates your licence while you're on
  // the page). Needs Realtime turned on for the "learners" table in the
  // Supabase dashboard (Database → Replication) — see README Phase 1.
  // Harmless if it's not enabled: this just quietly does nothing then.
  learnerChannel = sb
    .channel('learner-'+ME.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'learners', filter:`id=eq.${ME.id}` }, (payload)=>{
      if(payload.eventType === 'DELETE') return;
      LEARNER = { ...payload.new, exists:true };
      if(['home','matches','favourites','compare','class'].includes(ROUTE)) render();
    })
    .subscribe();
}

async function loadClasses(){
  const { data, error } = await sb.from('classes').select('*').order('createdAt', { ascending:false });
  CLASSES = error ? [] : (data || []);
}

async function loadCohort(){
  const { data, error } = await sb.from('learners').select('*');
  COHORT = error ? [] : (data || []);
}

function cohortLearnerName(id){
  const l = COHORT.find(c=>c.id===id);
  return (l && (l.displayName || l.email)) || 'Unnamed learner';
}

function ensureLearnerObj(){
  if(!LEARNER) LEARNER = { id: ME.id || 'local', exists:false };
  return LEARNER;
}

async function saveLearner(partial){
  ensureLearnerObj();
  Object.assign(LEARNER, partial);
  LEARNER.updatedAt = todayISO();
  if(PREVIEW_MODE || !ME.id) return; // memory-only in preview
  try{
    if(!LEARNER.createdAt) LEARNER.createdAt = todayISO();
    const body = { ...LEARNER, id: ME.id, displayName: ME.name, email: ME.email };
    delete body.exists;
    const { error } = await sb.from('learners').upsert(body, { onConflict:'id' });
    if(error) throw error;
    LEARNER.exists = true;
  }catch(e){ toast('Could not save — check your connection and try again.'); console.error(e); }
}

/* ---------------- matching engine ---------------- */
function subjectScore(learner, subjectName){
  if(subjectName === 'Mathematics'){
    if(learner.mathType === 'Mathematics') return 100;
    if(learner.mathType === 'MathLit') return 25;
    return 50;
  }
  const subs = learner.subjects || [];
  if(!subs.length && (!learner.grade || learner.grade===9)) return 50;
  return subs.includes(subjectName) ? 100 : 20;
}
function scoreCareer(learner, career){
  const riasec = learner.riasec || {};
  const strengths = learner.strengths || {};
  const interestFit = career.riasec.length ? avg(career.riasec.map(d=> riasec[d]!=null? riasec[d]:50)) : 50;
  const strengthFit = career.strengths.length ? avg(career.strengths.map(k=> strengths[k]!=null? strengths[k]:50)) : 50;
  const subjectFit = career.requiredSubjects.length ? avg(career.requiredSubjects.map(rs=>subjectScore(learner, rs.subject))) : 50;
  const hasAssessment = learner.assessmentCompletedAt;
  let score = hasAssessment ? (0.4*interestFit + 0.35*subjectFit + 0.25*strengthFit) : (0.6*subjectFit + 0.4*50);
  return Math.round(clamp(score,0,100));
}
function matchLabel(score){
  if(score>=78) return {t:'Strong match', c:'badge-strong'};
  if(score>=58) return {t:'Good match', c:'badge-good'};
  if(score>=38) return {t:'Worth exploring', c:'badge-explore'};
  return {t:'Less aligned', c:'badge-low'};
}
function computeMatches(learner){
  return CAREERS.map(c=>({career:c, score:scoreCareer(learner,c)})).sort((a,b)=>b.score-a.score);
}
function hollandCode(riasec){
  if(!riasec) return '—';
  return Object.entries(riasec).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]).join('');
}

/* ---------------- APS ---------------- */
function computeAPSFromMarks(marks){
  const rows = Object.entries(marks).filter(([s,p])=> p!=null && p!=='').map(([s,p])=>({subject:s, pct:Number(p), level:nscLevel(Number(p))}));
  const nonLO = rows.filter(r=>r.subject!=='Life Orientation').sort((a,b)=>b.level-a.level);
  const top6 = nonLO.slice(0,6);
  const aps = top6.reduce((s,r)=>s+r.level,0);
  return { rows, aps, count: top6.length };
}

/* ---------------- progress ---------------- */
function progressState(l){
  const steps = [
    { key:'profile', done: !!(l && (l.exploringOnly || (l.grade && l.school))) },
    { key:'subjects', done: !!(l && (l.exploringOnly || (l.grade===9 && l.subjectGuidance) || (l.grade>9 && l.subjects && l.subjects.length))) },
    { key:'assessment', done: !!(l && l.assessmentCompletedAt) },
    { key:'explore', done: !!(l && l.viewedMatches) },
  ];
  const pct = Math.round(100*steps.filter(s=>s.done).length/steps.length);
  return { steps, pct };
}
