/* ============================================================
   IROLI CAREER PATHWAY — APPLICATION STATE (Supabase build)
   ============================================================ */

let ME = { id:null, name:'', email:'', avatarUrl:'' };
// IS_ADMIN is true for either admin tier (shows the admin shell/nav to
// both); IS_SUPER_ADMIN is the narrower "my team" tier -- gates class
// creation/deletion, licence toggling, dashboard snapshots, and assigning
// class admins. A class admin (IS_ADMIN && !IS_SUPER_ADMIN) is read-only,
// scoped by RLS to the class(es) classes.classAdminId assigns them.
let IS_ADMIN = false;
let IS_SUPER_ADMIN = false;
let PREVIEW_MODE = false;
let LEARNER = null;
let ROUTE = 'home';
let ROUTE_PARAM = null;
let EXPLORE_SEARCH = '';
let EXPLORE_FILTERS = {};
let CLASSES = [];
let COHORT = [];
let SNAPSHOTS = [];
let CLASS_ADMINS = [];
let ASSESSMENT_DRAFT = null;
let GUIDE_DRAFT = null;
let APS_DRAFT = null;
let GRADE9_DRAFT = null;
let MINI_DRAFT = null;
let AUTH_READY = false;
let learnerChannel = null;
let JUST_CONFIRMED_EMAIL = false;
let AUTH_RECOVERY_MODE = false;

function esc(s){ const d=document.createElement('div'); d.textContent = (s==null?'':String(s)); return d.innerHTML; }
function avg(arr){ if(!arr.length) return 50; return arr.reduce((a,b)=>a+b,0)/arr.length; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function todayISO(){ return new Date().toISOString(); }
// Joins short phrases into one natural sentence fragment -- "a", "a and b",
// "a, b and c" -- used to synthesize a "You tend to enjoy X, Y and Z"
// sentence from a learner's top strength-domain/RIASEC blend phrases.
function joinBlends(list){
  if(!list.length) return '';
  if(list.length===1) return list[0];
  if(list.length===2) return list[0]+', and '+list[1];
  return list.slice(0,-1).join(', ')+', and '+list[list.length-1];
}
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
  const user = session && session.user;
  if(!user){
    if(learnerChannel){ sb.removeChannel(learnerChannel); learnerChannel = null; }
    ME = { id:null, name:'', email:'', avatarUrl:'' };
    IS_ADMIN = false; IS_SUPER_ADMIN = false; LEARNER = null;
    // Decide the anonymous mini-assessment's state once, the same way
    // AUTH_RECOVERY_MODE is decided once -- but only if it isn't already
    // set, so a re-fire of this listener (e.g. on tab refocus, same as the
    // signed-in case above) never wipes out-of-progress answers.
    if(!MINI_DRAFT){
      // `answers` (a completed result) and `declined` (an explicit "I
      // already have an account") are independent facts, not one status
      // enum -- a visitor can decline the invitation to sign up right now
      // and still have their answers preserved for later, and `declined`
      // is only ever a *default-routing* preference: it must never cause a
      // real completed result to be discarded (see declineAnonFlow).
      const saved = readMiniAssessment();
      if(saved && saved.declined) MINI_DRAFT = null;
      else if(saved && saved.answers) MINI_DRAFT = { step:'results', answers: saved.answers };
      else MINI_DRAFT = { step:'intro', answers:{interest:null,strength:null,motivation:null,activity:null} };
    }
    (MINI_DRAFT ? renderAnonymousOnly() : renderAuthGateOnly());
    return;
  }
  if(AUTH_RECOVERY_MODE){
    ME = { id:user.id, name:'', email:user.email, avatarUrl:'' };
    renderRecoveryOnly();
    return;
  }
  // Supabase re-fires onAuthStateChange (e.g. TOKEN_REFRESHED) whenever the
  // browser tab regains focus/visibility, not just on a genuine new
  // sign-in. For the *same* already-signed-in user, just refresh the
  // identity fields in place and stop -- otherwise switching back to this
  // tab would reset ROUTE to the dashboard and blow away whatever the
  // learner was in the middle of (an assessment, a form, etc).
  const alreadySignedIn = ME.id === user.id && LEARNER;
  ME = {
    id: user.id,
    name: (user.user_metadata && user.user_metadata.display_name) || user.email,
    email: user.email,
    avatarUrl: (user.user_metadata && user.user_metadata.avatar_url) || '',
  };
  if(alreadySignedIn) return;

  if(learnerChannel){ sb.removeChannel(learnerChannel); learnerChannel = null; }
  if(JUST_CONFIRMED_EMAIL){
    JUST_CONFIRMED_EMAIL = false;
    toast('Email verified! Welcome to Iroli Career Pathway.');
  }
  const profile = await ensureProfile(user);
  IS_SUPER_ADMIN = profile.role === 'admin';
  IS_ADMIN = IS_SUPER_ADMIN || profile.role === 'class_admin';
  renderShell();
  await loadClasses();
  if(IS_ADMIN){
    ROUTE='admin-home'; await loadCohort(); await loadDashboardSnapshots();
    if(IS_SUPER_ADMIN) await loadClassAdmins();
  }
  else { ROUTE='home'; await loadLearner(); }
  render();
}

function renderAuthGateOnly(){
  document.getElementById('root').innerHTML = `<div id="app-auth"></div>`;
  document.getElementById('app-auth').innerHTML = viewAuthGate();
}

function renderAnonymousOnly(){
  document.getElementById('root').innerHTML = `<div id="app-anon"></div>`;
  document.getElementById('app-anon').innerHTML = viewAnonMini();
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

  // Carry a completed pre-registration mini-assessment into a genuinely
  // brand-new account only -- gated on !exists (not "just signed up"),
  // since the default email-confirmation signup flow means this is the
  // first loadLearner() call for this account, possibly minutes or hours
  // after the mini-assessment itself. An existing learner's real profile
  // is never touched by a stray localStorage blob on this device.
  if(!LEARNER.exists){
    const mini = readMiniAssessment();
    if(mini && mini.answers){
      await saveLearner({ miniAssessment: { answers: mini.answers, completedAt: mini.completedAt } });
      clearMiniAssessment();
    }
  }

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

// classes_select_authenticated lets every signed-in user read every class
// row (the learner join-by-code flow depends on this), so CLASSES itself
// is never scoped -- any admin view that should only show a class admin's
// own class(es) must filter through this instead of reading CLASSES raw.
function myClasses(){
  return IS_SUPER_ADMIN ? CLASSES : CLASSES.filter(c=>c.classAdminId===ME.id);
}

async function loadCohort(){
  const { data, error } = await sb.from('learners').select('*');
  COHORT = error ? [] : (data || []);
}

// Only loaded for super admins, so Classes & Licences can show who already
// manages each class without an extra query per card (same reasoning as
// mirroring displayName/email onto `learners` itself -- see schema.sql).
async function loadClassAdmins(){
  const { data, error } = await sb.from('profiles').select('id,email,role').eq('role', 'class_admin');
  CLASS_ADMINS = error ? [] : (data || []);
}

async function loadDashboardSnapshots(){
  const { data, error } = await sb.from('dashboard_snapshots').select('*').order('created_at', { ascending:false });
  SNAPSHOTS = error ? [] : (data || []);
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
// Structural (enrollment) fit for a single named subject, 0-100 -- not
// aware of tiers, that's handled by the tier-weighted combiners below.
// "X Home Language"/"X First Additional Language" resolve as fully met
// for anyone, since onboarding tracks that every learner takes *some*
// home language and FAL without asking which -- the skill a career
// actually wants is strong literacy, not a specific language.
function subjectScore(learner, subjectName){
  if(subjectName === 'Mathematics'){
    if(learner.mathType === 'Mathematics') return 100;
    if(learner.mathType === 'MathLit') return 25;
    return 50;
  }
  if(subjectName === 'Mathematical Literacy'){
    if(learner.mathType === 'MathLit') return 100;
    if(learner.mathType === 'Mathematics') return 70;
    return 50;
  }
  // Structurally neutral, not a reward: every learner takes *some* home
  // language and FAL, but onboarding doesn't ask which, so there's no real
  // per-learner enrollment signal here -- treating it as 100 would let a
  // career anchored only on "English Home Language (recommended)" score
  // maximally for a learner about whom nothing else is known. The real
  // signal, once it exists, comes from their entered mark (see
  // subjectMarkPct/academicPerformanceFit), not from this structural check.
  if(subjectName.includes('Home Language') || subjectName.includes('Additional Language')) return 50;
  const subs = learner.subjects || [];
  if(!subs.length && (!learner.grade || learner.grade===9)) return 50;
  return subs.includes(subjectName) ? 100 : 20;
}

// A learner's actual entered percentage for a named subject, or null if
// they haven't entered one (never fabricated -- see academicPerformanceFit).
// FET subject -> its possible Grade 9 antecedent name(s), derived from
// GRADE9_TO_FET (js/data.js) rather than a second hand-authored map, so
// the two directions of the same fact can't drift apart.
const FET_TO_GRADE9 = {};
Object.entries(GRADE9_TO_FET).forEach(([g9subject, fetSubjects])=>{
  fetSubjects.forEach(fet=>{ (FET_TO_GRADE9[fet] = FET_TO_GRADE9[fet]||[]).push(g9subject); });
});
// Only ever used to fill a gap -- see subjectMarkPct, which always checks
// the learner's real, current subjectMarks first.
function grade9AntecedentPct(learner, fetSubject){
  const g9 = (learner.grade9Report && learner.grade9Report.subjects) || {};
  const candidates = FET_TO_GRADE9[fetSubject] || [];
  for(const c of candidates){ if(g9[c] && g9[c].pct!=null) return g9[c].pct; }
  return null;
}
function subjectMarkPct(learner, subjectName){
  const marks = learner.subjectMarks || {};
  if(subjectName === 'Mathematics' || subjectName === 'Mathematical Literacy'){
    const key = learner.mathType === 'MathLit' ? 'Mathematical Literacy' : 'Mathematics';
    if(subjectName !== key) return null; // no mark to report for the track they didn't take
    if(marks[key] && marks[key].pct != null) return marks[key].pct;
    return grade9AntecedentPct(learner, subjectName);
  }
  let key = subjectName;
  if(subjectName.includes('Home Language')) key = 'Home Language';
  else if(subjectName.includes('Additional Language')) key = 'First Additional Language';
  if(marks[key] && marks[key].pct != null) return marks[key].pct;
  return grade9AntecedentPct(learner, key);
}

const TIER_WEIGHT = { required:1, recommended:0.4, related:0.08 };
function careerSubjectTiers(career){
  return [
    ['required', career.requiredSubjects||[]],
    ['recommended', career.recommendedSubjects||[]],
    ['related', career.relatedSubjects||[]],
  ];
}
// Structural subject-alignment fit, tier-weighted so a merely "related"
// subject barely moves the needle next to a missing "required" one.
// Returns null only when a career lists no subjects in any tier.
function subjectAlignmentFit(learner, career){
  let sumWeighted=0, sumWeight=0;
  careerSubjectTiers(career).forEach(([tier,subs])=>{
    const w = TIER_WEIGHT[tier];
    subs.forEach(subject=>{ sumWeighted += w*subjectScore(learner,subject); sumWeight += w; });
  });
  return sumWeight>0 ? sumWeighted/sumWeight : null;
}
// Marks-based academic-performance fit for this career specifically,
// same tier weights as subjectAlignmentFit (so a strong mark in a
// "related" subject can't mask a weak one in a "required" subject).
// Skips any subject the learner hasn't entered a mark for -- a
// percentage has no honest neutral default the way a self-rating does,
// so a missing mark is omitted rather than imputed to 50. Returns null
// when there are no relevant marks yet at all (e.g. Grade 9, or the
// learner simply hasn't entered marks for subjects this career cares about).
function academicPerformanceFit(learner, career){
  let sumWeighted=0, sumWeight=0;
  careerSubjectTiers(career).forEach(([tier,subs])=>{
    const w = TIER_WEIGHT[tier];
    subs.forEach(subject=>{
      const pct = subjectMarkPct(learner, subject);
      if(pct!=null){ sumWeighted += w*pct; sumWeight += w; }
    });
  });
  return sumWeight>0 ? sumWeighted/sumWeight : null;
}

// A faculty's single most representative required/recommended subject,
// derived from its own careers rather than hand-authored -- used by the
// report's Academic Readiness section, the subject-conflict check, and
// the school dashboard's readiness cross-tab, so all three agree on "the
// one subject that matters most for this pathway". Generic subjects every
// learner takes (a home language, an additional language, Life
// Orientation) are excluded since they're not pathway-specific signal.
// Returns null when no subject is genuinely representative (required/
// recommended by at least 40% of the faculty's careers) -- several
// faculties (humanities, law, education, media-arts, tourism, trades)
// don't gate on one hard NSC subject the way engineering or health do,
// and that's a real, honest absence, not a bug to paper over.
function keySubjectFor(facultyId){
  const careers = CAREERS.filter(c=>c.faculty===facultyId);
  if(!careers.length) return null;
  const GENERIC = s => /Home Language|Additional Language|Life Orientation/.test(s);
  for(const tier of ['requiredSubjects','recommendedSubjects']){
    const freq = {};
    careers.forEach(c=>(c[tier]||[]).forEach(s=>{ if(!GENERIC(s)) freq[s]=(freq[s]||0)+1; }));
    const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    if(sorted.length && sorted[0][1]/careers.length >= 0.4) return sorted[0][0];
  }
  return null;
}
// Tallies which subjects a list of careers requires/recommends, keyed by
// subject name -> the set of career names citing it at each tier. Shared
// by the Subject Choice Guidance quiz (buildGuidanceResult) and the
// report's automatic per-pathway subject tiering (buildSubjectRelevanceTiers),
// so there's one implementation of "which subjects matter for these
// careers and why", not two that could quietly disagree.
function tallySubjectsAcrossCareers(careers){
  const info = {};
  function touch(s, tier, name){
    info[s] = info[s] || { required:new Set(), recommended:new Set() };
    info[s][tier].add(name);
  }
  careers.forEach(c=>{
    (c.requiredSubjects||[]).forEach(s=>touch(s,'required',c.name));
    (c.recommendedSubjects||[]).forEach(s=>touch(s,'recommended',c.name));
  });
  return info;
}

const MATCH_CATEGORIES = {
  strong:   { label:'Strong match',               badge:'badge-strong' },
  academic: { label:'Academic strength match',    badge:'badge-good' },
  interest: { label:'Interest match',             badge:'badge-explore' },
  possible: { label:'Possible pathway',           badge:'badge-explore' },
  low:      { label:'Less aligned',               badge:'badge-low' },
};
// Centralised, named weighting -- not scattered magic numbers. Two
// unrelated tables: careerFit drives evaluateCareer's per-career 0-100
// score; grade9Type-flavoured blending lives directly in
// computeStrengthDomains (marks+interest, 50/50) since that function
// only ever has 2 possible factors, not 6 -- blend() is reserved for
// careerFit where the factor count actually varies. Deliberately
// namespaced key names (not a shared "workStyle" key reused at a
// different percentage elsewhere) so the two concepts never get confused.
const MATCH_WEIGHTS = {
  careerFit: { interest:30, aptitude:20, academic:20, subjectAlignment:15, workStyle:10, statedPreference:5 },
};

// Generic weighted blend: factors[key] may be null/undefined to mean "no
// data for this factor yet" -- it's omitted and the remaining weights are
// renormalised to still sum to 100%, the same graceful-degradation
// approach academicPerformanceFit already uses, generalised so adding
// more optional factors doesn't require a new hand-written branch every
// time. Falls back to a neutral 50 only when every factor is missing.
function blend(weights, factors){
  let sumW=0, sumWV=0;
  Object.keys(weights).forEach(k=>{
    const v = factors[k];
    if(v!=null){ sumW += weights[k]; sumWV += weights[k]*v; }
  });
  return sumW>0 ? sumWV/sumW : 50;
}

// Single source of truth for a learner/career pairing: computes every
// component factor once, the blended score, and (once an assessment
// exists) which of the four match categories it falls into. Everything
// else (scoreCareer, computeMatches, the career-detail explanation) reads
// from this instead of recomputing the same factors separately.
// A career's work-style profile isn't hand-authored (re-tagging 77+
// careers for one new factor doesn't scale) -- it's derived from fields
// that already exist: its RIASEC letters and its pathway shape. A
// reasonable proxy, not a precise measurement.
function careerWorkStyleProfile(career){
  const has = d => career.riasec.includes(d);
  const structured = career.pathways.some(p=>p.type==='Apprenticeship'||p.type==='TVET') || !!career.institutions.tvet;
  return {
    teamVsSolo: has('S')||has('E') ? 70 : 40,
    structureVsFlexible: structured ? 30 : (has('A')||has('E') ? 65 : 50),
    leadVsSupport: has('E') ? 70 : (has('S') ? 45 : 50),
    detailVsBigPicture: has('C') ? 30 : (has('A')||has('E') ? 65 : 50),
    routineVsVariety: has('E')||has('A') ? 65 : (structured ? 35 : 50),
  };
}
// ---- Pre-registration mini-assessment (see js/views_anon.js) ----
// Deliberately separate from the real matching engine above: these two
// functions turn 4 single-tap answers into two broad "career directions"
// for an anonymous visitor. Never reads or writes learner.riasec/
// strengths/assessmentCompletedAt, and no real scoring function
// (evaluateCareer, computeMatches, computeStrengthDomains) ever reads
// their output -- a coarse 4-tap guess must never masquerade as, or
// contaminate, the real assessment's evidence.

// A cluster's RIASEC profile isn't hand-authored (20 more entries to
// maintain and keep in sync) -- derived from its own exampleCareerIds'
// real riasec letters, the same "derive, don't hand-author" precedent as
// careerWorkStyleProfile above. Normalized to proportions so a cluster
// with more example careers isn't systematically favoured over one with
// fewer.
function clusterRiasecProfile(cluster){
  const tally = { R:0,I:0,A:0,S:0,E:0,C:0 };
  let total = 0;
  cluster.exampleCareerIds.forEach(id=>{
    const c = CAREERS.find(x=>x.id===id);
    if(!c) return;
    c.riasec.forEach(letter=>{ tally[letter] = (tally[letter]||0) + 1; total++; });
  });
  if(total===0) return tally;
  Object.keys(tally).forEach(k=> tally[k] = tally[k]/total);
  return tally;
}
// answers: {interest, strength, motivation, activity} -- option ids from
// RIASEC/STRENGTH_DOMAINS/MINI_MOTIVATION_OPTIONS/MINI_ACTIVITY_OPTIONS.
// Each question contributes equally regardless of how many RIASEC letters
// its chosen option carries (a 2-letter answer splits 0.5/0.5, not 1/1),
// so no single question silently outweighs the others. Returns the top 2
// CLUSTERS by a normalized dot-product against clusterRiasecProfile --
// stable order on ties, no diversity/faculty tie-break (the real
// career-riasec data already differentiates clusters reasonably well).
function computeMiniDirections(answers){
  const tally = { R:0,I:0,A:0,S:0,E:0,C:0 };
  function addLetters(letters){
    if(!letters || !letters.length) return;
    const share = 1/letters.length;
    letters.forEach(l=>{ tally[l] = (tally[l]||0) + share; });
  }
  addLetters(answers.interest ? [answers.interest] : null);
  const strengthDomain = STRENGTH_DOMAINS.find(d=>d.id===answers.strength);
  addLetters(strengthDomain && strengthDomain.riasec);
  const motivation = MINI_MOTIVATION_OPTIONS.find(o=>o.id===answers.motivation);
  addLetters(motivation && motivation.riasec);
  const activity = MINI_ACTIVITY_OPTIONS.find(o=>o.id===answers.activity);
  addLetters(activity && activity.riasec);

  const total = Object.values(tally).reduce((s,v)=>s+v,0) || 1;
  const learnerProfile = {};
  Object.keys(tally).forEach(k=> learnerProfile[k] = tally[k]/total);

  const scored = CLUSTERS.map(cluster=>{
    const cp = clusterRiasecProfile(cluster);
    const score = Object.keys(learnerProfile).reduce((s,k)=> s + learnerProfile[k]*cp[k], 0);
    return { cluster, score };
  });
  scored.sort((a,b)=> b.score-a.score);
  return scored.slice(0,2).map(s=>s.cluster);
}

// How closely a learner's stated work-style preferences match a career's
// derived profile, 0-100 (100 = identical). Null (omit from the blend)
// until the learner has completed the work-style mini-survey.
function workStyleFit(learner, career){
  if(!learner.workStyle) return null;
  const cw = careerWorkStyleProfile(career);
  return avg(WORK_STYLE_QUESTIONS.map(q => 100 - Math.abs((learner.workStyle[q.key]!=null?learner.workStyle[q.key]:50) - cw[q.key])));
}
// A small, real signal: has the learner already favourited this career?
// Null (omit) until they've favourited anything at all -- once they have,
// every career gets a determinate value (100 if favourited, a neutral 50
// otherwise) so this factor only ever helps a career, never penalises one
// just for not having been browsed yet.
function statedPreferenceFit(learner, career){
  if(!learner.favourites || !learner.favourites.length) return null;
  return learner.favourites.includes(career.id) ? 100 : 50;
}

function evaluateCareer(learner, career){
  const riasec = learner.riasec || {};
  const strengths = learner.strengths || {};
  const hasAssessment = !!learner.assessmentCompletedAt;

  const interestFit = career.riasec.length ? avg(career.riasec.map(d=> riasec[d]!=null? riasec[d]:50)) : 50;
  const strengthFit = career.strengths.length ? avg(career.strengths.map(k=> strengths[k]!=null? strengths[k]:50)) : 50;
  const subjectFitRaw = subjectAlignmentFit(learner, career);
  const subjectFit = subjectFitRaw==null ? 50 : subjectFitRaw;
  const academicFitRaw = hasAssessment ? academicPerformanceFit(learner, career) : null;
  const workStyleFitRaw = hasAssessment ? workStyleFit(learner, career) : null;
  const statedPreferenceFitRaw = hasAssessment ? statedPreferenceFit(learner, career) : null;

  let score;
  if(!hasAssessment){
    score = 0.6*subjectFit + 0.4*50; // least-informed state, unchanged from before
  } else {
    score = blend(MATCH_WEIGHTS.careerFit, {
      interest:interestFit, aptitude:strengthFit, subjectAlignment:subjectFit, academic:academicFitRaw,
      workStyle:workStyleFitRaw, statedPreference:statedPreferenceFitRaw,
    });
  }
  score = Math.round(clamp(score,0,100));

  let category = null;
  if(hasAssessment){
    const best = academicFitRaw==null ? subjectFit : Math.max(subjectFit, academicFitRaw);
    if(interestFit>=65 && best>=65) category = 'strong';
    else if(best>=65) category = 'academic';
    else if(interestFit>=65) category = 'interest';
    else if(score>=40) category = 'possible';
    else category = 'low';
  }
  return { score, category, interestFit, strengthFit, subjectFit, academicFit:academicFitRaw, workStyleFit:workStyleFitRaw, statedPreferenceFit:statedPreferenceFitRaw };
}
function scoreCareer(learner, career){ return evaluateCareer(learner, career).score; }
function matchLabel(score){
  if(score>=78) return {t:'Strong match', c:'badge-strong'};
  if(score>=58) return {t:'Good match', c:'badge-good'};
  if(score>=38) return {t:'Worth exploring', c:'badge-explore'};
  return {t:'Less aligned', c:'badge-low'};
}
// Computed on the fly from shared faculty + overlapping interest dimensions,
// rather than a hand-authored relatedCareers list on every career -- keeps
// "you might also like" correct automatically as careers get added, at the
// cost of being a heuristic rather than a curated editorial choice.
function relatedCareersFor(career, limit){
  limit = limit || 4;
  return CAREERS
    .filter(c=>c.id!==career.id)
    .map(c=>({ career:c, score:(c.faculty===career.faculty?2:0) + c.riasec.filter(d=>career.riasec.includes(d)).length }))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>x.career);
}
// Faculties (used for pathway alignment/readiness) and CLUSTERS (the
// Subject Choice Guidance tool's richer, more-detailed field groupings)
// are two separate taxonomies with no declared mapping between them --
// derived here, not hand-authored, by finding which cluster's own
// exampleCareerIds overlap most with a faculty's real careers. Lets a
// Career Pathway card link into a cluster's richer detail page (study
// routes, qualification options) without maintaining a second, parallel
// 15-to-20 mapping table that could silently drift out of date.
function clustersForFaculty(facultyId, limit){
  limit = limit || 1;
  const facultyCareerIds = new Set(CAREERS.filter(c=>c.faculty===facultyId).map(c=>c.id));
  return CLUSTERS
    .map(cl=>({ cluster:cl, overlap: cl.exampleCareerIds.filter(id=>facultyCareerIds.has(id)).length }))
    .filter(x=>x.overlap>0)
    .sort((a,b)=>b.overlap-a.overlap)
    .slice(0,limit)
    .map(x=>x.cluster);
}
function computeMatches(learner){
  return CAREERS.map(c=>{
    const ev = evaluateCareer(learner, c);
    return { career:c, score:ev.score, category:ev.category, eval:ev };
  }).sort((a,b)=>b.score-a.score);
}

// A faculty/pathway's Alignment ("does this fit your interests and
// strengths") and Readiness ("do your current results/subjects support
// it right now") -- a pure aggregation over evaluateCareer for that
// faculty's own careers, the same "derive from real per-career data,
// don't hand-author a parallel model" precedent as
// clusterRiasecProfile/careerWorkStyleProfile. Deliberately two separate
// numbers, never collapsed into one blended "pathway match %" -- a
// learner can have Strong Alignment with Developing Readiness, and that's
// shown as exactly that, not hidden behind one misleading percentage.
function facultyAlignmentFit(learner, facultyId){
  const careers = CAREERS.filter(c=>c.faculty===facultyId);
  if(!careers.length) return { alignment:null, readiness:null };
  const evals = careers.map(c=>evaluateCareer(learner, c));
  const alignment = avg(evals.map(e=>e.interestFit));
  const readiness = avg(evals.map(e=>e.academicFit==null ? e.subjectFit : Math.max(e.subjectFit, e.academicFit)));
  return { alignment, readiness };
}
// Same 65/50 thresholds evaluateCareer's own category already uses for
// "strong" -- these are a presentation split of that existing logic, not
// a new scoring model. Never "badge-low" for either axis: low
// alignment/readiness should read as "worth exploring further", not as a
// dead end (this pathway is never hidden just because one axis is weak).
function alignmentLabel(score){
  if(score==null) return { t:'Not yet assessed', c:'badge-explore' };
  if(score>=65) return { t:'Strong Alignment', c:'badge-strong' };
  if(score>=50) return { t:'Good Alignment', c:'badge-good' };
  return { t:'Explore Further', c:'badge-explore' };
}
// Readiness reuses markBandLabel's existing "current performance, not a
// verdict" phrasing directly, rather than inventing new readiness wording.
function readinessLabel(pct){
  if(pct==null) return { t:'Not yet assessed', c:'badge-explore' };
  return { t:markBandLabel(pct), c: pct>=65?'badge-strong':(pct>=50?'badge-good':'badge-explore') };
}
// The pathway-level analogue of computeMatches -- every FACULTY (not
// CLUSTERS, which has no exhaustive reverse mapping from career to
// cluster) scored and sorted by Alignment.
function computePathwayMatches(learner){
  return FACULTIES.map(f=>{
    const fit = facultyAlignmentFit(learner, f.id);
    return { faculty:f, alignment:fit.alignment, readiness:fit.readiness };
  }).sort((a,b)=>{
    const av = a.alignment==null?-1:a.alignment, bv = b.alignment==null?-1:b.alignment;
    return bv-av;
  });
}
// "Why this pathway appears" -- transparent, template-based reasoning
// mirroring careerExplanationHTML's own pattern below, so both read
// consistently. Never asserts a claim the learner's own data doesn't
// support; returns an array of plain-language bullet strings.
function pathwayReasoningHTML(learner, faculty){
  const why = [];
  const careers = CAREERS.filter(c=>c.faculty===faculty.id);
  const facultyRiasec = new Set(careers.flatMap(c=>c.riasec));
  const riasec = learner.riasec || {};
  const strongDims = RIASEC.filter(d=>facultyRiasec.has(d.id) && (riasec[d.id]||0)>=65);
  if(strongDims.length) why.push(`You show strong interest in work where you ${strongDims.map(d=>d.blend).join(', and where you ')}.`);

  const domains = computeStrengthDomains(learner);
  const topMatchingDomain = domains.find(d=>d.hasEvidence && d.domain.riasec.some(r=>facultyRiasec.has(r)));
  if(topMatchingDomain) why.push(`Your strongest profile area, ${topMatchingDomain.domain.name}, connects naturally to this field.`);

  const subject = keySubjectFor(faculty.id);
  if(subject){
    const pct = subjectMarkPct(learner, subject);
    if(pct!=null && pct>=60) why.push(`${subject} is currently ${markBandLabel(pct)} for you (${pct}%), which supports this pathway.`);
  }
  if(!why.length) why.push('This pathway doesn’t yet have a strong signal from your interests or results — still worth exploring rather than ruling out.');
  return why;
}

// Template-based (not free-text) "why this might suit you" explanation --
// deterministic and debuggable, only asserts what the actual component
// scores and entered marks back up.
function careerExplanationHTML(learner, career, ev){
  if(!learner.assessmentCompletedAt){
    return `<p class="page-sub">Complete the assessment to see a personalised explanation of why this career might suit you.</p>`;
  }
  const why = [];
  if(ev.interestFit>=65 && career.riasec.length){
    const dims = career.riasec.map(d=>{ const r=RIASEC.find(x=>x.id===d); return r?r.name.toLowerCase():null; }).filter(Boolean);
    if(dims.length) why.push(`Your interests align well with ${dims.join(' and ')}.`);
  }
  if(ev.strengthFit>=65 && career.strengths.length){
    const labels = career.strengths.map(k=>{ const s=STRENGTH_KEYS.find(x=>x.id===k); return s?s.label:null; }).filter(Boolean);
    if(labels.length) why.push(`You rate yourself strongly on ${labels.join(', ')}.`);
  }
  const strongRequired = career.requiredSubjects.filter(s=>{ const pct=subjectMarkPct(learner,s); return pct!=null && pct>=60; });
  if(strongRequired.length) why.push(`${strongRequired.join(' and ')} — among your stronger subjects — directly supports this pathway.`);
  if(!why.length) why.push('This career doesn’t have a strong signal either way yet from your interests or strengths — its details below may still be worth exploring.');

  const toImprove = career.requiredSubjects.filter(s=>{
    const pct = subjectMarkPct(learner,s);
    return (pct!=null && pct<50) || (pct==null && subjectScore(learner,s)<60);
  });
  const nextSteps = [];
  if(toImprove.length) nextSteps.push(`Strengthen ${toImprove.join(' and ')}`);
  nextSteps.push('Check individual university/programme requirements');
  if(career.pathways.some(p=>p.type==='TVET')) nextSteps.push('Explore the diploma/University of Technology or TVET route as an alternative entry point');

  return `
    <p><b>Why it may suit you:</b></p><ul>${why.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>
    ${toImprove.length? `<p>${esc(toImprove.join(' and '))} may need improvement — most programmes in this field expect a solid result here.</p>`:''}
    <p><b>Possible next steps:</b></p><ul>${nextSteps.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
  `;
}
function hollandCode(riasec){
  if(!riasec) return '—';
  return Object.entries(riasec).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]).join('');
}

// Turns raw entered marks into "strongest subjects / areas of strength /
// subjects to strengthen" — display only for now (not yet fed into
// scoreCareer). Frames marks as current readiness, never as a judgement of
// ability: no subject is ever hidden here, "to strengthen" is just the
// lowest-scoring entries below 50%.
// Scores all 8 STRENGTH_DOMAINS for a learner, blending marks evidence
// (never the only factor -- interests always still count) with interest
// signal (RIASEC). A subject's evidence is only ever counted once per
// domain: a current FET subjectMarks entry always wins over a Grade 9
// report antecedent for the same underlying subject, so a learner who
// has since entered real Grade 10+ marks never has a two-year-old Grade
// 9 result quietly averaged in alongside it. Sorted best-first; the
// caller decides whether there's enough evidence to call the top two
// "primary"/"secondary" (see hasEvidence on each result).
function computeStrengthDomains(learner){
  const riasec = learner.riasec || {};
  const g9 = (learner.grade9Report && learner.grade9Report.subjects) || {};
  const fet = learner.subjectMarks || {};

  return STRENGTH_DOMAINS.map(domain=>{
    const evidence = [];
    const coveredFet = new Set();
    domain.fet.forEach(subject=>{
      if(fet[subject] && fet[subject].pct!=null){
        evidence.push({ subject, pct:fet[subject].pct, source:'current' });
        coveredFet.add(subject);
      }
    });
    domain.grade9.forEach(subject=>{
      if(!(g9[subject] && g9[subject].pct!=null)) return;
      const antecedents = GRADE9_TO_FET[subject] || [];
      if(antecedents.some(f=>coveredFet.has(f))) return; // a current FET mark already covers this evidence slot
      evidence.push({ subject, pct:g9[subject].pct, source:'grade9' });
    });
    const markFit = evidence.length ? avg(evidence.map(e=>e.pct)) : null;
    const interestFit = domain.riasec.length ? avg(domain.riasec.map(d=> riasec[d]!=null? riasec[d]:50)) : 50;
    const score = markFit==null ? interestFit : 0.5*interestFit + 0.5*markFit;
    return { domain, score, markFit, interestFit, evidence, hasEvidence: markFit!=null || Object.keys(riasec).length>0 };
  }).sort((a,b)=>b.score-a.score);
}

function buildAcademicProfile(learner){
  const fetMarks = learner.subjectMarks || {};
  const fetEntries = Object.entries(fetMarks)
    .filter(([,v]) => v && v.pct!=null && v.pct!=='')
    .map(([subject,v]) => ({ subject, pct: Number(v.pct) }));
  const g9Marks = (learner.grade9Report && learner.grade9Report.subjects) || {};
  const g9Entries = Object.entries(g9Marks)
    .filter(([,v]) => v && v.pct!=null && v.pct!=='')
    .map(([subject,v]) => ({ subject, pct: Number(v.pct) }));
  // FET marks are the primary subject-level display source; a Grade 9
  // report is shown here only until real FET marks exist.
  const entries = fetEntries.length ? fetEntries : g9Entries;
  const hasInterestEvidence = !!learner.assessmentCompletedAt;
  if(!entries.length && !hasInterestEvidence) return null;

  entries.sort((a,b)=>b.pct-a.pct);
  const strongest = entries.slice(0,3);
  const toStrengthen = entries.filter(e=>e.pct<50).sort((a,b)=>a.pct-b.pct).slice(0,3);
  const areasOfStrength = [...new Set(strongest.map(e=>subjectDomain(e.subject)))];
  const domains = computeStrengthDomains(learner);
  const showDomains = domains[0] && domains[0].hasEvidence;
  return { entries, strongest, toStrengthen, areasOfStrength, primaryDomain: showDomains?domains[0]:null, secondaryDomain: showDomains?domains[1]:null };
}

// A learner's current result in whatever single subject is most
// representative of a faculty (see keySubjectFor) -- the school
// dashboard's readiness cross-tab buckets learners by this; returns null
// when the faculty has no derivable key subject (the cross-tab correctly
// omits those faculties rather than showing a bogus one) or the learner
// hasn't entered a mark for it yet.
function academicReadinessFor(learner, facultyId){
  const subject = keySubjectFor(facultyId);
  if(!subject) return null;
  const pct = subjectMarkPct(learner, subject);
  return { subject, pct };
}

/* ---------------- subject-career conflict detection + report helpers ---------------- */
// One shared conflict-detection function, used both by the learner's own
// report (checked across their own top aligned pathways) and the school
// dashboard (checked once, for a learner's single top pathway) -- so
// there's exactly one definition of "conflict", never two that could
// disagree. Returns null until the learner has declared any intended
// subjects/maths track -- no conflict is ever inferred from silence, and
// {hasConflict:false} once they have but nothing looks mismatched.
// Never says "you cannot become X" -- only that a specific, named subject
// may not currently be covered, and that it's worth a conversation.
function subjectConflictForFaculty(learner, facultyId){
  if((!learner.intendedSubjects || !learner.intendedSubjects.length) && !learner.intendedMathType) return null;
  const subject = keySubjectFor(facultyId);
  if(!subject) return { hasConflict:false };
  const hypothetical = { ...learner, subjects: learner.intendedSubjects||[], mathType: learner.intendedMathType||learner.mathType };
  if(subjectScore(hypothetical, subject) >= 50) return { hasConflict:false };
  const planned = (subject==='Mathematics' || subject==='Mathematical Literacy')
    ? (hypothetical.mathType==='MathLit' ? 'Mathematical Literacy' : hypothetical.mathType==='Mathematics' ? 'Mathematics' : 'not yet decided')
    : (hypothetical.subjects.length ? 'not currently on your list' : 'not yet specified');
  return {
    hasConflict: true,
    requiredSubject: subject,
    plannedSubject: planned,
    reason: `Many ${facultyById(facultyId).name} careers rely on ${subject}. Your current subject leaning may not fully support this pathway — worth reviewing with a teacher, parent or career adviser before finalising your subjects.`,
  };
}
// 4-tier "Subjects to Consider for Grade 10" (Required for many programmes
// / Strongly recommended / Useful / Optional-complementary), built from
// the learner's own top-aligned pathways' real career subject
// requirements -- never implies an optional subject is compulsory. A
// strong current subject not otherwise cited is still surfaced (bottom
// tier) so a good mark is never simply overruled by interests alone.
function buildSubjectRelevanceTiers(learner){
  const pathways = computePathwayMatches(learner).filter(p=>p.alignment!=null && p.alignment>=50).slice(0,5);
  const careers = pathways.flatMap(p=>CAREERS.filter(c=>c.faculty===p.faculty.id));
  const info = tallySubjectsAcrossCareers(careers);
  const tiers = { required:[], strongly:[], useful:[], complementary:[] };
  const seen = new Set();
  Object.keys(info).forEach(subject=>{
    const { required, recommended } = info[subject];
    seen.add(subject);
    if(required.size) tiers.required.push({ subject, explanation: `Required for ${[...required].slice(0,3).join(', ')}${required.size>3?' and other careers':''} in your top pathways.` });
    else if(recommended.size>=2) tiers.strongly.push({ subject, explanation: `Strongly recommended for ${[...recommended].slice(0,3).join(', ')}.` });
    else if(recommended.size) tiers.useful.push({ subject, explanation: `Useful for ${[...recommended].join(', ')}.` });
  });
  const profile = buildAcademicProfile(learner);
  if(profile){
    profile.strongest.filter(e=>e.pct>=60 && !seen.has(e.subject)).forEach(e=>{
      tiers.complementary.push({ subject:e.subject, explanation: `${e.subject} is currently ${markBandLabel(e.pct)} for you (${e.pct}%) and could keep additional pathways open.` });
    });
  }
  return tiers;
}
// Shared "does this learner need extra guidance right now" check -- used
// both by the learner's own Overview ("1 area needs your attention") and
// the school dashboard's per-learner flag, so there's one definition, not
// two. Never fires before the assessment is done -- that's a
// data-completeness gap, not a guidance one; there's nothing concrete to
// flag yet.
function isGuidanceRequired(learner){
  if(!learner.assessmentCompletedAt) return false;
  const top = computePathwayMatches(learner)[0];
  if(!top || top.alignment==null) return false;
  const conflict = subjectConflictForFaculty(learner, top.faculty.id);
  if(conflict && conflict.hasConflict) return true;
  if(top.alignment>=65 && top.readiness!=null && top.readiness<50) return true;
  if(!learner.intendedSubjects || !learner.intendedSubjects.length) return true;
  return false;
}
// Personalised, always-actionable "what should I do next" list -- built
// from the same computed data as the rest of the report, never generic
// boilerplate.
function buildNextSteps(learner){
  const steps = [];
  const pathways = computePathwayMatches(learner).filter(p=>p.alignment!=null).slice(0,3);
  if(pathways.length) steps.push(`Explore your top ${pathways.length===1?'pathway':'pathways'}: ${pathways.map(p=>p.faculty.name).join(', ')}.`);
  const matches = computeMatches(learner).slice(0,3);
  if(matches.length) steps.push(`Read more about ${matches.map(m=>m.career.name).join(', ')} in Careers Worth Exploring.`);
  if(learner.intendedSubjects && learner.intendedSubjects.length) steps.push('Review your intended Grade 10 subjects against the pathways above.');
  else steps.push('Note down which Grade 10 subjects you’re currently leaning toward, in the Subjects section.');
  const conflict = pathways[0] && subjectConflictForFaculty(learner, pathways[0].faculty.id);
  if(conflict && conflict.hasConflict) steps.push('Discuss your subject choice with a teacher, parent or career adviser before finalising it.');
  const profile = buildAcademicProfile(learner);
  if(profile && profile.toStrengthen.length) steps.push(`Consider extra support in ${profile.toStrengthen.map(e=>e.subject).join(' and ')} to keep more pathways open.`);
  return steps;
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
