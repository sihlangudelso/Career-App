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
let EXPLORE_FILTERS = {};
let CLASSES = [];
let COHORT = [];
let ASSESSMENT_DRAFT = null;
let GUIDE_DRAFT = null;
let APS_DRAFT = null;
let GRADE9_DRAFT = null;
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
function subjectMarkPct(learner, subjectName){
  const marks = learner.subjectMarks || {};
  if(subjectName === 'Mathematics' || subjectName === 'Mathematical Literacy'){
    const key = learner.mathType === 'MathLit' ? 'Mathematical Literacy' : 'Mathematics';
    if(subjectName !== key) return null; // no mark to report for the track they didn't take
    return marks[key] && marks[key].pct != null ? marks[key].pct : null;
  }
  let key = subjectName;
  if(subjectName.includes('Home Language')) key = 'Home Language';
  else if(subjectName.includes('Additional Language')) key = 'First Additional Language';
  return marks[key] && marks[key].pct != null ? marks[key].pct : null;
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

const MATCH_CATEGORIES = {
  strong:   { label:'Strong match',               badge:'badge-strong' },
  academic: { label:'Academic strength match',    badge:'badge-good' },
  interest: { label:'Interest match',             badge:'badge-explore' },
  possible: { label:'Possible pathway',           badge:'badge-explore' },
  low:      { label:'Less aligned',               badge:'badge-low' },
};
// Centralised, named weighting -- not scattered magic numbers. Two
// unrelated tables: careerFit drives evaluateCareer's per-career 0-100
// score; grade9Type drives computeStrengthDomains' primary/secondary
// learner-profile domains. Deliberately namespaced with different key
// names (not a shared "workStyle" key reused at two different
// percentages) so the two never get confused with each other.
//
// careerFit currently only wires up 4 of its eventual factors, at
// today's original 30/20/20/30 proportions renamed into this shape --
// workStyle/statedPreference are added in a later phase together with a
// deliberate re-balance toward interest 30 / aptitude 20 / academic 20 /
// subjectAlignment 15 / workStyle 10 / statedPreference 5. Not yet active.
const MATCH_WEIGHTS = {
  careerFit: { interest:30, aptitude:20, academic:30, subjectAlignment:20 },
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
function evaluateCareer(learner, career){
  const riasec = learner.riasec || {};
  const strengths = learner.strengths || {};
  const hasAssessment = !!learner.assessmentCompletedAt;

  const interestFit = career.riasec.length ? avg(career.riasec.map(d=> riasec[d]!=null? riasec[d]:50)) : 50;
  const strengthFit = career.strengths.length ? avg(career.strengths.map(k=> strengths[k]!=null? strengths[k]:50)) : 50;
  const subjectFitRaw = subjectAlignmentFit(learner, career);
  const subjectFit = subjectFitRaw==null ? 50 : subjectFitRaw;
  const academicFitRaw = hasAssessment ? academicPerformanceFit(learner, career) : null;

  let score;
  if(!hasAssessment){
    score = 0.6*subjectFit + 0.4*50; // least-informed state, unchanged from before
  } else {
    score = blend(MATCH_WEIGHTS.careerFit, { interest:interestFit, aptitude:strengthFit, subjectAlignment:subjectFit, academic:academicFitRaw });
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
  return { score, category, interestFit, strengthFit, subjectFit, academicFit:academicFitRaw };
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
function computeMatches(learner){
  return CAREERS.map(c=>{
    const ev = evaluateCareer(learner, c);
    return { career:c, score:ev.score, category:ev.category, eval:ev };
  }).sort((a,b)=>b.score-a.score);
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
function buildAcademicProfile(learner){
  const marks = learner.subjectMarks || {};
  const entries = Object.entries(marks)
    .filter(([,v]) => v && v.pct!=null && v.pct!=='')
    .map(([subject,v]) => ({ subject, pct: Number(v.pct) }));
  if(!entries.length) return null;
  entries.sort((a,b)=>b.pct-a.pct);
  const strongest = entries.slice(0,3);
  const toStrengthen = entries.filter(e=>e.pct<50).sort((a,b)=>a.pct-b.pct).slice(0,3);
  const areasOfStrength = [...new Set(strongest.map(e=>subjectDomain(e.subject)))];
  return { entries, strongest, toStrengthen, areasOfStrength };
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
