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

// The 4 questions, in order. Reuses existing taxonomies as the answer
// options wherever one already exists (RIASEC, STRENGTH_DOMAINS) rather
// than inventing parallel ones -- see MINI_MOTIVATION_OPTIONS/
// MINI_ACTIVITY_OPTIONS in js/data.js for the two that don't.
const MINI_QUESTIONS = [
  { key:'interest', title:'Which of these sounds most like you?',
    options: RIASEC.map(r=>({ id:r.id, label:r.name, desc:r.desc })) },
  { key:'strength', title:'What are you naturally good at?',
    options: STRENGTH_DOMAINS.map(d=>({ id:d.id, label:d.name })) },
  { key:'motivation', title:'What matters most to you in future work?',
    options: MINI_MOTIVATION_OPTIONS.map(o=>({ id:o.id, label:o.label })) },
  { key:'activity', title:'What kind of work do you enjoy day to day?',
    options: MINI_ACTIVITY_OPTIONS.map(o=>({ id:o.id, label:o.label })) },
];
function miniAnswerLabel(key, id){
  if(!id) return '';
  if(key==='interest') return (RIASEC.find(r=>r.id===id)||{}).name || '';
  if(key==='strength') return (STRENGTH_DOMAINS.find(d=>d.id===id)||{}).name || '';
  if(key==='motivation') return (MINI_MOTIVATION_OPTIONS.find(o=>o.id===id)||{}).label || '';
  if(key==='activity') return (MINI_ACTIVITY_OPTIONS.find(o=>o.id===id)||{}).label || '';
  return '';
}

function anonSignInLinkHTML(){
  return `<a href="#" onclick="App.declineAnonFlow();return false;" style="display:block;text-align:center;margin-top:16px;font-size:12.5px;color:var(--muted);">Already have an account? Sign in</a>`;
}

function viewAnonMini(){
  const d = MINI_DRAFT;
  if(d.step==='results') return viewAnonResults();
  if(d.step==='intro') return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div class="card" style="max-width:460px;width:100%;text-align:center;">
      <img class="brand-mark-img" src="assets/logo-mark.png" alt="Iroli"/>
      <h1 style="font-size:24px;margin:10px 0 8px;">Discover your career direction in 60 seconds</h1>
      <p class="page-sub" style="margin:0 auto 18px;">4 quick questions, no right or wrong answers, no account needed to see your result.</p>
      <button class="btn btn-primary" style="width:100%;" onclick="App.startAnonFlow()">Let's go</button>
      ${anonSignInLinkHTML()}
    </div>
  </div>`;

  const total = MINI_QUESTIONS.length;
  const step = d.step;
  const q = MINI_QUESTIONS[step];
  const pct = Math.round(step/total*100);
  const animClass = 'q-anim' + (d.dir==='back' ? ' back' : '');
  return `
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
    <div style="max-width:480px;width:100%;">
      <div style="text-align:center;margin-bottom:18px;">
        <img class="brand-mark-img" src="assets/logo-mark.png" alt="Iroli"/>
        <p class="page-sub" style="margin:8px auto 0;">Question ${step+1} of ${total}</p>
      </div>
      <div class="aps-bar" style="margin-bottom:18px;"><div style="width:${pct}%"></div></div>
      <div class="card ${animClass}">
        <h3 style="margin-bottom:14px;">${esc(q.title)}</h3>
        <div class="grid grid-2" style="gap:10px;">
          ${q.options.map(o=>`
            <button class="tile" style="padding:14px;" onclick="App.miniChoose('${q.key}','${o.id}')">
              <h3 style="font-size:14px;margin:0 0 4px;">${esc(o.label)}</h3>
              ${o.desc?`<p style="margin:0;font-size:12.5px;color:var(--muted);">${esc(o.desc)}</p>`:''}
            </button>`).join('')}
        </div>
        ${step>0?`<div style="margin-top:16px;"><button class="btn btn-ghost btn-sm" onclick="App.miniBack()">Back</button></div>`:''}
      </div>
      ${anonSignInLinkHTML()}
    </div>
  </div>`;
}

function viewAnonResults(){
  const answers = MINI_DRAFT.answers;
  const directions = computeMiniDirections(answers);
  const citePairs = [['interest','strength'], ['motivation','activity']];
  return `
  <div style="min-height:100vh;padding:24px 24px 40px;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:22px;">
        <img class="brand-mark-img" src="assets/logo-mark.png" alt="Iroli"/>
        <h1 style="font-size:24px;margin:10px 0 8px;">Here's a starting point</h1>
        <p class="page-sub" style="margin:0 auto;">Based on your 4 answers, these two directions could be worth exploring.</p>
      </div>
      ${directions.map((cluster,i)=>{
        const [k1,k2] = citePairs[i] || citePairs[0];
        const l1 = miniAnswerLabel(k1, answers[k1]), l2 = miniAnswerLabel(k2, answers[k2]);
        const examples = cluster.exampleCareerIds.slice(0,3).map(id=>CAREERS.find(c=>c.id===id)).filter(Boolean);
        return `
        <div class="card" style="margin-bottom:16px;">
          <div style="font-size:11.5px;color:var(--muted);font-weight:700;letter-spacing:.03em;">DIRECTION ${i+1}</div>
          <h3 style="font-size:19px;margin:4px 0 8px;">${esc(cluster.name)}</h3>
          <p class="page-sub" style="margin-bottom:10px;">${esc(cluster.overview)}</p>
          ${l1&&l2?`<p style="font-size:13.5px;margin-bottom:14px;">Because you're drawn to <strong>${esc(l1)}</strong> and <strong>${esc(l2)}</strong>, this could be worth a look.</p>`:''}
          <div style="font-size:12.5px;font-weight:600;margin-bottom:6px;">A few example careers</div>
          <ul style="margin:0;padding-left:18px;">
            ${examples.map(c=>`<li style="margin-bottom:4px;font-size:13.5px;"><strong>${esc(c.name)}</strong>${c.blurb?` — <span class="page-sub">${esc(c.blurb)}</span>`:''}</li>`).join('')}
          </ul>
        </div>`;
      }).join('')}
      ${disclaimerHTML('This is a quick starting point based on just 4 questions — not a definitive match or a precise score. The full assessment digs much deeper.')}
      <div class="card" style="margin:18px 0;background:linear-gradient(135deg, var(--indigo), #14172A);border:none;">
        <h3 style="color:#fff;">Want a much closer match?</h3>
        <ul style="margin:10px 0;padding-left:18px;font-size:14px;color:#fff;">
          <li>More personalised career matches, ranked by fit</li>
          <li>Recommended school subjects for your grade</li>
          <li>Study and qualification pathways for each career</li>
        </ul>
        <button class="btn btn-primary" style="width:100%;background:#fff;color:var(--indigo);margin-top:6px;" onclick="App.miniContinueToSignup()">Continue to the full assessment</button>
      </div>
      <div style="text-align:center;">
        <button class="btn btn-ghost btn-sm" onclick="App.miniBack()">Back to your answers</button>
        ${anonSignInLinkHTML()}
      </div>
    </div>
  </div>`;
}
