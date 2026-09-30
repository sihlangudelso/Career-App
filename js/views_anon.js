/* ---------------- Pre-registration mini-assessment (anonymous) ---------------- */
// This app's first client-only persistence: there is no Supabase learner
// row yet for a visitor who hasn't signed up, so their 4 mini-assessment
// answers live in localStorage until (and unless) they create an account,
// at which point loadLearner() (js/app.js) merges this into the real
// learner record and clears it. Every call is wrapped in try/catch --
// Safari private mode and storage-disabled contexts must degrade to
// "works for this page view, doesn't persist across a reload" rather than
// throwing.
const MINI_LS_KEY = 'iroli_mini_assessment_v1';

function readMiniAssessment(){
  try{
    const raw = localStorage.getItem(MINI_LS_KEY);
    if(!raw) return null;
    const d = JSON.parse(raw);
    return (d && d.version===1) ? d : null;
  }catch(e){ return null; }
}
function writeMiniAssessment(data){
  try{ localStorage.setItem(MINI_LS_KEY, JSON.stringify(Object.assign({version:1}, data))); }
  catch(e){ /* private mode / storage disabled -- silently no-op */ }
}
function clearMiniAssessment(){
  try{ localStorage.removeItem(MINI_LS_KEY); }catch(e){}
}
