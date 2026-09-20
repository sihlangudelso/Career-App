function viewOnboarding(isEdit){
  const l = ensureLearnerObj();
  const grade = l.grade || '';
  const mathType = l.mathType || '';
  const subjects = l.subjects || [];
  const pathChosen = l.exploringOnly === true || l.exploringOnly === false;
  return `
  <div style="max-width:640px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:26px;">
      <div class="brand-mark" style="margin:0 auto 14px;width:52px;height:52px;font-size:22px;">I</div>
      <h1>${isEdit?'Update your profile':'Welcome to Iroli Career Pathway'}</h1>
      <p class="page-sub" style="margin:0 auto;">Here’s what’s here — whether or not you’re currently at school.</p>
    </div>

    <div class="grid grid-2" style="margin-bottom:22px;gap:12px;">
      <button class="tile" style="border-top-color:var(--indigo);padding:16px;" onclick="App.startExploring('assessment')">${icon('spark','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Career Interest Assessment</h3><p class="page-sub" style="margin:0;">24 quick questions to find your interest profile.</p></button>
      <button class="tile" style="border-top-color:var(--teal);padding:16px;" onclick="App.startExploring('matches')">${icon('target','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Career Matching</h3><p class="page-sub" style="margin:0;">See which careers fit you best, ranked by fit.</p></button>
      <button class="tile" style="border-top-color:var(--sky);padding:16px;" onclick="App.startExploring('explore')">${icon('search','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Explore Careers</h3><p class="page-sub" style="margin:0;">Browse every career, with real degree requirements.</p></button>
      <button class="tile" style="border-top-color:var(--coral);padding:16px;" onclick="App.startExploring('aps')">${icon('calc','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">APS Calculator</h3><p class="page-sub" style="margin:0;">Estimate your university admission score from your marks.</p></button>
    </div>

    ${!pathChosen ? `
    <div class="card">
      <h3 style="margin-bottom:4px;">Are you currently a Grade 9–12 learner at school?</h3>
      <p class="page-sub" style="margin-bottom:14px;">This just tailors subject guidance and your school’s class view — everything above works either way.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="App.chooseOnboardingPath(false)">Yes, I’m a school learner</button>
        <button class="btn btn-ghost" onclick="App.chooseOnboardingPath(true)">No — I’m just exploring</button>
      </div>
    </div>
    ` : l.exploringOnly ? `
    <div class="card">
      <h3>You’re all set</h3>
      <p class="page-sub" style="margin-bottom:14px;">No school details needed — jump straight into the assessment or start exploring careers. You can add a school later from your dashboard if that changes.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="App.chooseOnboardingPath(false)">Actually, I’m a school learner</button>
        <button class="btn btn-primary" onclick="App.saveOnboarding()">${icon('check')} Continue</button>
      </div>
    </div>
    ` : `
    <div class="card">
      <div class="form-row">
        <label>Your name</label>
        <input type="text" value="${esc(ME.name)||'Learner'}" disabled/>
        <div class="hint">Pulled from your Claude account. Only your Institute admin can see the real names of learners in their classes.</div>
      </div>
      <div class="form-row">
        <label>Grade</label>
        <div class="filter-bar">
          ${[9,10,11,12].map(g=>`<button class="chip-select ${grade===g?'on':''}" onclick="App.setGrade(${g})">Grade ${g}</button>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <label>School name</label>
        <input type="text" id="ob_school" placeholder="e.g. Iroli High School" value="${esc(l.school||'')}"/>
      </div>
      ${grade>9 ? `
      <div class="form-row">
        <label>Mathematics or Mathematical Literacy?</label>
        <div class="filter-bar">
          <button class="chip-select ${mathType==='Mathematics'?'on':''}" onclick="App.setMathType('Mathematics')">Mathematics</button>
          <button class="chip-select ${mathType==='MathLit'?'on':''}" onclick="App.setMathType('MathLit')">Mathematical Literacy</button>
        </div>
      </div>
      <div class="form-row">
        <label>Your other NSC subjects (besides Home Language, First Additional Language, Life Orientation & Maths)</label>
        <div class="check-grid">
          ${CORE_ELECTIVES.map(s=>`
            <label class="check-item"><input type="checkbox" class="subject-check" value="${esc(s)}" ${subjects.includes(s)?'checked':''}/> ${s}</label>
          `).join('')}
        </div>
      </div>` : `
      <div class="disclaimer">${icon('warn','ic')}<div>Grade 9 learners choose subjects for Grade 10 soon. Use the <b>Subject Choice Guidance</b> tool on your dashboard after saving your profile — no need to pick subjects here yet.</div></div>
      `}
      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-ghost btn-sm" onclick="App.chooseOnboardingPath(true)">Actually, I’m just exploring</button>
        <button class="btn btn-primary" onclick="App.saveOnboarding()">${icon('check')} Save & continue</button>
      </div>
    </div>
    `}
  </div>`;
}

function viewHome(){
  const l = ensureLearnerObj();
  const { steps, pct } = progressState(l);
  const matches = computeMatches(l).slice(0,3);
  const r = 42, circ = 2*Math.PI*r;
  const cls = CLASSES.find(c=>c.id===l.classId);
  return `
  ${pageHeadHTML('Your dashboard', `Welcome back, ${esc(ME.name)||'there'}. Here\u2019s where your career pathway stands.`)}
  ${PREVIEW_MODE?`<div class="disclaimer" style="margin-bottom:18px;">${icon('warn','ic')}<div>You\u2019re previewing the learner experience as an admin. Nothing here is saved to shared learner data.</div></div>`:''}
  <div class="card" style="margin-bottom:20px;">
    <div class="progress-ring-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle class="progress-track" cx="50" cy="50" r="${r}" fill="none" stroke-width="10"/>
        <circle class="progress-fill" cx="50" cy="50" r="${r}" fill="none" stroke-width="10"
          stroke-dasharray="${circ}" stroke-dashoffset="${circ*(1-pct/100)}" transform="rotate(-90 50 50)"/>
        <text x="50" y="55" text-anchor="middle" font-family="Sora" font-weight="700" font-size="20" fill="var(--ink)">${pct}%</text>
      </svg>
      <div style="flex:1;">
        <h3 style="margin-bottom:10px;">Pathway progress</h3>
        <div class="grid grid-2" style="gap:8px;">
          ${labelStep('Profile complete', steps[0].done)}
          ${labelStep('Subjects locked in', steps[1].done)}
          ${labelStep('Assessment done', steps[2].done)}
          ${labelStep('Explored matches', steps[3].done)}
        </div>
      </div>
    </div>
  </div>
  <div class="grid grid-4" style="margin-bottom:26px;">
    <div class="stat-pill"><div class="dot" style="background:var(--indigo)"></div><div><div class="n">${l.exploringOnly?'Exploring':'Grade '+(l.grade||'—')}</div><div class="l">${l.exploringOnly?'Not currently in school':esc(l.school||'No school set')}</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--teal)"></div><div><div class="n">${l.mathType==='Mathematics'?'Maths':(l.mathType==='MathLit'?'Maths Lit':'—')}</div><div class="l">Mathematics track</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:var(--amber)"></div><div><div class="n">${(l.favourites||[]).length}</div><div class="l">Saved careers</div></div></div>
    <div class="stat-pill"><div class="dot" style="background:${l.licenseStatus==='active'?'var(--grass)':'var(--coral)'}"></div><div><div class="n">${l.licenseStatus==='active'?'Active':'Trial'}</div><div class="l">Licence status</div></div></div>
  </div>

  <div class="section-title"><h2>Quick actions</h2></div>
  <div class="grid grid-3">
    ${!l.exploringOnly ? `<button class="tile" style="border-top-color:var(--amber)" onclick="navigate('guidance')">${icon('compass','tico')}<h3>Subject Choice Guidance</h3><p>Grade 9 tool: find the right subject combination for your goals.</p></button>` : ''}
    <button class="tile" style="border-top-color:var(--indigo)" onclick="navigate('assessment')">${icon('spark','tico')}<h3>${l.assessmentCompletedAt?'Retake assessment':'Take your assessment'}</h3><p>Discover your interests, personality style and strengths.</p></button>
    <button class="tile" style="border-top-color:var(--teal)" onclick="navigate('matches')">${icon('target','tico')}<h3>Career Matches</h3><p>See careers ranked by fit with your profile.</p></button>
    <button class="tile" style="border-top-color:var(--sky)" onclick="navigate('explore')">${icon('search','tico')}<h3>Explore Careers</h3><p>Browse all seeded careers across every faculty.</p></button>
    <button class="tile" style="border-top-color:var(--coral)" onclick="navigate('aps')">${icon('calc','tico')}<h3>APS Calculator</h3><p>Estimate your Admission Point Score from your marks.</p></button>
    <button class="tile" style="border-top-color:var(--olive)" onclick="navigate('favourites')">${icon('heart','tico')}<h3>Favourites & Compare</h3><p>Review saved careers and compare them side by side.</p></button>
  </div>

  <div class="section-title"><h2>Your top career matches</h2><button class="btn btn-ghost btn-sm" onclick="navigate('matches')">See all</button></div>
  ${matches.length ? matches.map(m=>careerRowHTML(m.career, m.score, l)).join('') : `<div class="empty-state">${icon('target')}<p>Complete the assessment to see personalised matches.</p></div>`}

  ${cls ? `<div class="section-title"><h2>Your class</h2></div><div class="card"><b>${esc(cls.name)}</b><div class="page-sub">Class code: <span class="class-code">${esc(cls.code)}</span></div></div>` : ''}
  `;
}
function labelStep(label, done){
  return `<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:${done?'var(--grass)':'var(--muted)'};font-weight:600;">${icon('check','ic')} ${label}</div>`;
}

/* ---------------- Grade 9 subject guidance ---------------- */
const GUIDE_TAGS = [
  {k:'stem', l:'STEM experiments & how things work'},
  {k:'biz', l:'Numbers, money & business'},
  {k:'health', l:'Helping people & health'},
  {k:'build', l:'Building, designing & making things'},
  {k:'nature', l:'Nature, animals & the environment'},
  {k:'tech', l:'Technology & computers'},
];
function ensureGuideDraft(){
  const l = ensureLearnerObj();
  if(!GUIDE_DRAFT){
    const g = l.subjectGuidance;
    GUIDE_DRAFT = { step:1, tags: g?g.tags:[], conf: g?g.conf:{maths:3,science:3,language:3,practical:3} };
  }
  return GUIDE_DRAFT;
}
function viewGuidance(){
  const d = ensureGuideDraft();
  const l = ensureLearnerObj();
  if(d.step===3 || (l.subjectGuidance && d.step===1 && d.justViewing)) return guidanceResultsHTML(l.subjectGuidance || buildGuidanceResult(d));
  return `
  ${pageHeadHTML('Subject Choice Guidance', 'Built for Grade 9 learners choosing subjects for Grade 10 — 2 quick steps.')}
  ${l.subjectGuidance? `<div class="disclaimer" style="margin-bottom:16px;">${icon('warn','ic')}<div>You\u2019ve already completed this. Saving again will replace your previous recommendation. <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="App.guideViewSaved()">View saved result</button></div></div>`:''}
  <div class="card">
    ${d.step===1 ? `
      <h3>Step 1 — What excites you most?</h3>
      <p class="page-sub">Pick up to 3.</p>
      <div class="filter-bar">
        ${GUIDE_TAGS.map(t=>`<button class="chip-select ${d.tags.includes(t.k)?'on':''}" onclick="App.guideToggleTag('${t.k}')">${t.l}</button>`).join('')}
      </div>
      <div style="margin-top:20px;"><button class="btn btn-primary" onclick="App.guideStep(2)">Next</button></div>
    ` : `
      <h3>Step 2 — Rate your confidence</h3>
      <p class="page-sub">Be honest — this just helps guide the suggestion.</p>
      ${confSlider('maths','Mathematics & numbers',d.conf.maths)}
      ${confSlider('science','Science & experiments',d.conf.science)}
      ${confSlider('language','Languages & writing',d.conf.language)}
      ${confSlider('practical','Hands-on & practical tasks',d.conf.practical)}
      <div style="margin-top:10px;display:flex;gap:10px;">
        <button class="btn btn-ghost" onclick="App.guideStep(1)">Back</button>
        <button class="btn btn-primary" onclick="App.guideSubmit()">See my recommendation</button>
      </div>
    `}
  </div>`;
}
function confSlider(key,label,val){
  return `<div class="slider-row"><div class="sl-top"><span>${label}</span><span id="val_${key}">${val}/5</span></div>
    <input type="range" min="1" max="5" value="${val}" oninput="App.guideConf('${key}',this.value)"/></div>`;
}
function buildGuidanceResult(d){
  const tags = d.tags;
  const rec = [];
  const reasoning = [];
  const mathsStrong = d.conf.maths>=3 || tags.some(t=>['stem','biz','tech','build'].includes(t));
  if(mathsStrong){ rec.push('Mathematics'); reasoning.push('Mathematics keeps STEM, health, IT, engineering and finance careers open.'); }
  else { rec.push('Mathematics or Mathematical Literacy — discuss with your teacher'); reasoning.push('Mathematical Literacy can suit you if you\u2019re not aiming at STEM, health or finance careers, but it closes off many of them — talk this through with your subject counsellor.'); }
  if(tags.includes('stem')||tags.includes('build')){ rec.push('Physical Sciences'); reasoning.push('Physical Sciences is required for most engineering, built-environment and physical-science careers.'); }
  if(tags.includes('health')||tags.includes('nature')){ rec.push('Life Sciences'); reasoning.push('Life Sciences is required for health, agricultural and biological science careers.'); }
  if(tags.includes('biz')){ rec.push('Accounting', 'Business Studies'); reasoning.push('Accounting and Business Studies build a strong base for finance, accounting and business careers.'); }
  if(tags.includes('tech')){ rec.push('Information Technology'); reasoning.push('Information Technology gives you a head start for software, data and IT careers.'); }
  if(tags.includes('nature')){ rec.push('Geography','Agricultural Sciences'); reasoning.push('Geography and Agricultural Sciences support environmental, agricultural and earth-science careers.'); }
  if(!rec.includes('Mathematics') && d.conf.practical>=4 && !tags.includes('stem')){ reasoning.push('Your practical strengths suggest exploring built-environment or engineering-aligned TVET/technical pathways too.'); }
  return { tags, conf:d.conf, recommendedSubjects:[...new Set(rec)], reasoning, completedAt: todayISO() };
}
function guidanceResultsHTML(res){
  return `
  ${pageHeadHTML('Your subject recommendation', 'A starting point for your Grade 10 subject choice conversation.')}
  <div class="card">
    <h3>Suggested subject focus</h3>
    <div class="pill-list" style="margin-bottom:16px;">
      ${res.recommendedSubjects.map(s=>`<span class="pill req">${esc(s)}</span>`).join('')}
    </div>
    <h3>Why</h3>
    <ul>${res.reasoning.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>
    ${disclaimerHTML('This is guidance to support a conversation with your school\u2019s Life Orientation teacher or subject counsellor — final subject choice depends on your school\u2019s offering and timetable.')}
    <div style="margin-top:16px;display:flex;gap:10px;">
      <button class="btn btn-ghost" onclick="App.guideRetake()">Retake</button>
      <button class="btn btn-primary" onclick="navigate('matches')">See career matches</button>
    </div>
  </div>`;
}

/* ---------------- Assessment ---------------- */
function ensureAssessDraft(){
  const l = ensureLearnerObj();
  if(!ASSESSMENT_DRAFT){
    ASSESSMENT_DRAFT = {
      page:0,
      answers: l.riasecRaw ? [...l.riasecRaw] : Array(RIASEC_QUESTIONS.length).fill(0),
      strengths: l.strengthsRaw ? [...l.strengthsRaw] : Array(STRENGTH_KEYS.length).fill(3),
    };
  }
  return ASSESSMENT_DRAFT;
}
function viewAssessment(){
  const l = ensureLearnerObj();
  const d = ensureAssessDraft();
  if(l.assessmentCompletedAt && d.page===0 && !d.retaking){
    return assessmentResultsHTML(l);
  }
  const totalPages = 5; // 4 pages of 6 riasec Qs + 1 strengths page
  if(d.page < 4){
    const qs = RIASEC_QUESTIONS.slice(d.page*6, d.page*6+6);
    return `
    ${pageHeadHTML('Interests & personality assessment', `Page ${d.page+1} of ${totalPages} — answer honestly, there are no wrong answers.`)}
    ${d.page===0 ? `
    <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
      <p style="font-size:15px;">24 quick questions (about 5 minutes) using the RIASEC framework — Realistic, Investigative, Artistic, Social, Enterprising, Conventional. Your answers directly shape your career matches and how closely each career’s profile lines up with yours.</p>
    </div>
    ` : ''}
    <div class="card">
      ${qs.map((q,i)=>{
        const idx = d.page*6+i;
        return `<div class="qcard"><div class="qn">QUESTION ${idx+1} OF ${RIASEC_QUESTIONS.length}</div><div class="qt">${esc(q.text)}</div>
        <div class="likert">
          ${['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'].map((lb,li)=>`<button class="${d.answers[idx]===li+1?'on':''}" onclick="App.assessAnswer(${idx},${li+1})">${lb}</button>`).join('')}
        </div></div>`;
      }).join('')}
      <div style="display:flex;gap:10px;margin-top:6px;">
        ${d.page>0?`<button class="btn btn-ghost" onclick="App.assessPage(${d.page-1})">Back</button>`:''}
        <button class="btn btn-primary" ${qs.some((q,i)=>!d.answers[d.page*6+i])?'disabled':''} onclick="App.assessPage(${d.page+1})">Continue</button>
      </div>
    </div>`;
  }
  // strengths page
  return `
  ${pageHeadHTML('Rate your strengths', `Page 5 of ${totalPages} — slide to rate yourself from 1 (not a strength) to 5 (a real strength).`)}
  <div class="card">
    ${STRENGTH_KEYS.map((s,i)=>confSlider('str_'+i, s.label, d.strengths[i]).replace(`App.guideConf('str_${i}'`, `App.assessStrength(${i}`)).join('')}
    <div style="display:flex;gap:10px;margin-top:6px;">
      <button class="btn btn-ghost" onclick="App.assessPage(3)">Back</button>
      <button class="btn btn-primary" onclick="App.assessSubmit()">See my results</button>
    </div>
  </div>`;
}
function assessmentResultsHTML(l){
  const dims = RIASEC.map(d=>({...d, val: l.riasec? l.riasec[d.id]:0}));
  const top2 = hollandCode(l.riasec);
  return `
  ${pageHeadHTML('Your assessment results', `Your interest style: ${top2}`)}
  <div class="card" style="margin-bottom:18px;">
    <h3>Interest profile</h3>
    ${dims.map(d=>`
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:4px;"><span>${d.name}</span><span>${Math.round(d.val)}%</span></div>
        <div class="aps-bar"><div style="width:${Math.round(d.val)}%"></div></div>
      </div>`).join('')}
  </div>
  <div class="card" style="margin-bottom:18px;">
    <h3>Strengths</h3>
    <div class="grid grid-2">
    ${STRENGTH_KEYS.map(s=>`<div><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:600;margin-bottom:4px;"><span>${s.label}</span><span>${Math.round((l.strengths||{})[s.id]||0)}%</span></div><div class="aps-bar"><div style="width:${Math.round((l.strengths||{})[s.id]||0)}%;background:var(--amber);"></div></div></div>`).join('')}
    </div>
  </div>
  <div style="display:flex;gap:10px;">
    <button class="btn btn-ghost" onclick="App.assessRetake()">Retake assessment</button>
    <button class="btn btn-primary" onclick="navigate('matches')">See career matches</button>
  </div>`;
}

/* ---------------- Career list / matches / explore ---------------- */
function careerRowHTML(career, score, l){
  const fac = facultyById(career.faculty);
  const isFav = (l.favourites||[]).includes(career.id);
  const label = score!=null ? matchLabel(score) : null;
  return `
  <div class="career-row">
    <div class="left">
      <div class="fac-dot" style="background:${fac.color}">${fac.tag}</div>
      <div style="min-width:0;">
        <h4>${esc(career.name)}</h4>
        <div class="sub">${fac.name}</div>
      </div>
    </div>
    <div class="right">
      ${label?`<span class="badge ${label.c}">${score}% · ${label.t}</span>`:''}
      <button class="btn btn-ghost btn-sm" title="${isFav?'Remove from favourites':'Save'}" onclick="App.toggleFav('${career.id}',event)">${icon('heart', isFav?'ic fav-on':'ic')}</button>
      <button class="btn btn-primary btn-sm" onclick="navigate('career','${career.id}')">View</button>
    </div>
  </div>`;
}
function viewMatches(){
  const l = ensureLearnerObj();
  const fac = ROUTE_PARAM || 'all';
  let matches = computeMatches(l);
  if(fac!=='all') matches = matches.filter(m=>m.career.faculty===fac);
  return `
  ${pageHeadHTML('Career matches', l.assessmentCompletedAt? 'Ranked by fit with your interests, strengths and subjects.':'Complete the assessment for personalised ranking — showing subject-based fit for now.')}
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--teal), #14172A);">
    <p style="font-size:15px;">Every one of the ${CAREERS.length} seeded careers, ranked by fit with your interest profile, strengths and subjects. Filter by faculty below, or open any career to see real degree programmes and entry requirements.</p>
  </div>
  ${!l.assessmentCompletedAt?`<div class="disclaimer" style="margin-bottom:16px;">${icon('warn','ic')}<div>Your matches will be far more accurate once you <a href="#" onclick="navigate('assessment');return false;">complete the assessment</a>.</div></div>`:''}
  <div class="filter-bar">
    <button class="chip-select ${fac==='all'?'on':''}" onclick="navigate('matches','all')">All faculties</button>
    ${FACULTIES.map(f=>`<button class="chip-select ${fac===f.id?'on':''}" onclick="navigate('matches','${f.id}')">${f.name}</button>`).join('')}
  </div>
  ${matches.map(m=>careerRowHTML(m.career,m.score,l)).join('')}
  `;
}
function viewExplore(){
  const l = ensureLearnerObj();
  const fac = ROUTE_PARAM && typeof ROUTE_PARAM==='object' ? ROUTE_PARAM.fac : (ROUTE_PARAM||'all');
  return `
  ${pageHeadHTML('Explore careers', 'Browse every seeded career — no assessment needed.')}
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--sky), #14172A);">
    <p style="font-size:15px;">Browse all ${CAREERS.length} careers across ${FACULTIES.length} faculties, search by name, or filter to one faculty — no assessment required. Many careers also show real degree programmes and entry requirements pulled from actual South African institutions.</p>
  </div>
  <div class="filter-bar">
    <button class="chip-select ${fac==='all'?'on':''}" onclick="navigate('explore','all')">All faculties</button>
    ${FACULTIES.map(f=>`<button class="chip-select ${fac===f.id?'on':''}" onclick="navigate('explore','${f.id}')">${f.name}</button>`).join('')}
    <input type="text" id="exploreSearch" placeholder="Search careers by name…" value="${esc(EXPLORE_SEARCH)}" oninput="App.filterExplore(this.value)"/>
  </div>
  <div id="exploreResults">${exploreResultsHTML(fac, l)}</div>
  `;
}
function exploreResultsHTML(fac, l){
  let list = CAREERS.slice();
  if(fac && fac!=='all') list = list.filter(c=>c.faculty===fac);
  const q = EXPLORE_SEARCH.trim().toLowerCase();
  if(q) list = list.filter(c=>c.name.toLowerCase().includes(q) || c.blurb.toLowerCase().includes(q));
  if(!list.length) return `<div class="empty-state">${icon('search')}<p>No careers match “${esc(EXPLORE_SEARCH)}”.</p></div>`;
  return list.map(c=>careerRowHTML(c,null,l)).join('');
}

function viewCareerDetail(id){
  const career = CAREERS.find(c=>c.id===id);
  const l = ensureLearnerObj();
  if(!career) return `${pageHeadHTML('Career not found')}<div class="empty-state">${icon('search')}<p>That career couldn\u2019t be found.</p></div>`;
  const fac = facultyById(career.faculty);
  const score = scoreCareer(l, career);
  const label = matchLabel(score);
  const isFav = (l.favourites||[]).includes(career.id);
  const inCompare = (l.compare||[]).includes(career.id);
  const ytUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(career.videoQuery);
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:16px;" onclick="navigate('explore')">${icon('chevron')} Back</button>
  <div class="detail-hero" style="background:linear-gradient(135deg, ${fac.color}, #14172A);">
    <span class="badge badge-faculty" style="background:rgba(255,255,255,.18);">${fac.name}</span>
    <h1>${esc(career.name)}</h1>
    <p>${esc(career.blurb)}</p>
    <span class="badge ${label.c}" style="background:rgba(255,255,255,.9);">${score}% · ${label.t} for you</span>
  </div>

  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>A day in the life</h3>
      <p>${esc(career.dayInLife)}</p>
    </div>
    <div class="card">
      <h3>Required & recommended NSC subjects</h3>
      <div class="pill-list">
        ${career.requiredSubjects.map(s=>`<span class="pill ${s.necessity==='required'?'req':'rec'}">${esc(s.subject)} ${s.necessity==='required'?'(required)':'(recommended)'}</span>`).join('')}
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Recommended marks</h3>
    ${career.recommendedMarks.map(m=>`<div class="kv"><b>${esc(m.subject)}</b><span>${m.pct}%+ recommended</span></div>`).join('')}
    <h3 style="margin-top:16px;">APS guidance</h3>
    <div class="kv"><b>Typical APS range</b><span>${career.apsGuidance.typical}</span></div>
    <p class="page-sub">${esc(career.apsGuidance.note)}</p>
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Qualification pathways</h3>
    ${career.pathways.map(p=>`<div class="kv"><b>${p.type}</b><span>${esc(p.qualification)} — ${esc(p.duration)}</span></div>`).join('')}
  </div>

  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Universities commonly offering this</h3>
      <div class="pill-list">${career.institutions.universities.map(u=>`<span class="tag">${esc(u)}</span>`).join('') || '<span class="page-sub">See TVET note.</span>'}</div>
      ${career.institutions.utech.length?`<h4 style="margin-top:14px;">Universities of Technology</h4><div class="pill-list">${career.institutions.utech.map(u=>`<span class="tag">${esc(u)}</span>`).join('')}</div>`:''}
    </div>
    <div class="card">
      <h3>TVET college route</h3>
      <p class="page-sub">${career.institutions.tvet ? TVET_NOTE : 'This career pathway is primarily university-based, though bridging certificates may exist at some TVET colleges.'}</p>
    </div>
  </div>

  ${courseLinksSectionHTML(career.id)}

  <div class="card" style="margin-bottom:18px;">
    <h3>Application requirements</h3>
    <p>${esc(career.applicationNotes)}</p>
    ${disclaimerHTML()}
  </div>

  <div class="card" style="margin-bottom:18px;">
    <h3>Videos & resources</h3>
    <div class="pill-list">
      <a class="btn btn-ghost btn-sm" href="${ytUrl}" target="_blank" rel="noopener">${icon('search')} Search career videos</a>
      <a class="btn btn-ghost btn-sm" href="https://www.dhet.gov.za" target="_blank" rel="noopener">${icon('building')} Dept. of Higher Education & Training</a>
      <a class="btn btn-ghost btn-sm" href="https://www.nsfas.org.za" target="_blank" rel="noopener">${icon('coin')} NSFAS funding info</a>
    </div>
  </div>

  <div style="display:flex;gap:10px;">
    <button class="btn ${isFav?'btn-primary':'btn-ghost'}" onclick="App.toggleFav('${career.id}')">${icon('heart')} ${isFav?'Saved':'Save career'}</button>
    <button class="btn ${inCompare?'btn-primary':'btn-ghost'}" onclick="App.toggleCompare('${career.id}')">${icon('layers')} ${inCompare?'In compare':'Add to compare'}</button>
  </div>
  `;
}

/* ---------------- APS Calculator ---------------- */
function ensureApsDraft(){
  const l = ensureLearnerObj();
  if(!APS_DRAFT){
    const subs = ['Life Orientation', l.mathType || 'Mathematics', 'English Home Language', ...(l.subjects||[])];
    const uniq = [...new Set(subs)].slice(0,7);
    const marks = {};
    (l.apsLast?.marksMap ? Object.keys(l.apsLast.marksMap) : uniq).forEach(s=> marks[s] = l.apsLast?.marksMap?.[s] ?? '');
    APS_DRAFT = { subjects: l.apsLast?.marksMap ? Object.keys(l.apsLast.marksMap) : uniq, marks, extra:'' };
  }
  return APS_DRAFT;
}
function viewAPS(){
  const d = ensureApsDraft();
  const l = ensureLearnerObj();
  const result = l.apsLast && l.apsLast.aps!=null ? l.apsLast : null;
  return `
  ${pageHeadHTML('APS Calculator', 'Estimate your Admission Point Score from the National Senior Certificate 7-point scale.')}
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--coral), #14172A);">
    <p style="font-size:15px;">Enter your subject marks below to estimate your APS out of 42, using the common "best 6 subjects, excluding Life Orientation" method most South African universities start from. Every university has its own exact rules, so always confirm on their official calculator too.</p>
  </div>
  <div class="card" style="margin-bottom:18px;">
    <h3>Enter your subject marks (%)</h3>
    ${d.subjects.map((s,i)=>`
      <div class="form-row" style="display:flex;gap:10px;align-items:center;">
        <div style="flex:1;">${esc(s)}</div>
        <input type="number" min="0" max="100" style="width:100px;" value="${d.marks[s]}" onchange="App.apsSetMark('${s.replace(/'/g,"\\'")}', this.value)"/>
        <button class="btn btn-ghost btn-sm" onclick="App.apsRemoveSubject('${s.replace(/'/g,"\\'")}')">${icon('close')}</button>
      </div>`).join('')}
    <div class="form-row" style="display:flex;gap:10px;">
      <select id="apsAddSelect" style="flex:1;">
        <option value="">Add another subject…</option>
        ${SA_SUBJECTS.filter(s=>!d.subjects.includes(s)).map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}
      </select>
      <button class="btn btn-ghost btn-sm" onclick="App.apsAddSubject()">${icon('plus')} Add</button>
    </div>
    <button class="btn btn-primary" style="margin-top:8px;" onclick="App.apsCompute()">Calculate my APS</button>
  </div>
  ${result ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your estimated APS: <span style="color:var(--indigo);">${result.aps} / 42</span></h3>
    <div class="aps-bar" style="margin:10px 0 16px;"><div style="width:${Math.round(result.aps/42*100)}%"></div></div>
    <div class="table-wrap"><table><thead><tr><th>Subject</th><th>%</th><th>NSC Level</th><th>Counted?</th></tr></thead><tbody>
      ${result.rows.sort((a,b)=>b.level-a.level).map(r=>`<tr><td>${esc(r.subject)}</td><td>${r.pct}%</td><td>${r.level}</td><td>${r.subject!=='Life Orientation'?'Yes':'Excluded from most APS totals'}</td></tr>`).join('')}
    </tbody></table></div>
    ${disclaimerHTML('This APS uses the common "best 6 subjects excluding Life Orientation" method. Some universities include Life Orientation at reduced weight, use an 8-subject total, or run their own points scale (often out of a different maximum) — always confirm on the specific university\u2019s official APS/points calculator.')}
    <h4 style="margin-top:16px;">Careers your APS estimate may support</h4>
    ${CAREERS.filter(c=>{
      const lo = parseInt(c.apsGuidance.typical); return !isNaN(lo) && result.aps >= lo-4;
    }).slice(0,6).map(c=>careerRowHTML(c,null,l)).join('') || '<p class="page-sub">Add more subject marks to see suggestions.</p>'}
  </div>` : ''}
  `;
}

/* ---------------- Favourites / Compare ---------------- */
function viewFavourites(){
  const l = ensureLearnerObj();
  const favs = (l.favourites||[]).map(id=>CAREERS.find(c=>c.id===id)).filter(Boolean);
  return `
  ${pageHeadHTML('Favourites', 'Careers you\u2019ve saved for later.')}
  ${favs.length? favs.map(c=>careerRowHTML(c, scoreCareer(l,c), l)).join('') : `<div class="empty-state">${icon('heart')}<p>No saved careers yet. Explore careers and tap the heart icon to save them here.</p></div>`}
  ${favs.length? `<button class="btn btn-primary" style="margin-top:10px;" onclick="App.compareFromFavs()">${icon('layers')} Compare all saved</button>`:''}
  `;
}
function viewCompare(){
  const l = ensureLearnerObj();
  const items = (l.compare||[]).map(id=>CAREERS.find(c=>c.id===id)).filter(Boolean);
  if(!items.length) return `${pageHeadHTML('Compare careers')}<div class="empty-state">${icon('layers')}<p>Add up to 3 careers to compare from Explore, Matches or Favourites.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="navigate('explore')">Explore careers</button></div>`;
  const rows = [
    ['Faculty', c=>facultyById(c.faculty).name],
    ['Required subjects', c=>c.requiredSubjects.map(s=>s.subject+(s.necessity==='required'?' (required)':' (rec.)')).join(', ')],
    ['Typical APS', c=>c.apsGuidance.typical],
    ['Main qualification', c=>c.pathways[0].qualification+' — '+c.pathways[0].duration],
    ['TVET route?', c=>c.institutions.tvet?'Yes':'Mainly university'],
    ['Your match score', c=>scoreCareer(l,c)+'%'],
  ];
  return `
  ${pageHeadHTML('Compare careers', 'Side-by-side view of your selected careers.')}
  <div class="table-wrap"><table>
    <thead><tr><th></th>${items.map(c=>`<th>${esc(c.name)} <button class="btn btn-ghost btn-sm" onclick="App.toggleCompare('${c.id}')">${icon('close')}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map(([label,fn])=>`<tr><td><b>${label}</b></td>${items.map(c=>`<td>${esc(fn(c))}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>
  `;
}

/* ---------------- Class / Licence ---------------- */
function viewClass(){
  const l = ensureLearnerObj();
  const cls = CLASSES.find(c=>c.id===l.classId);
  return `
  ${pageHeadHTML('My class & licence')}
  <div class="grid grid-2">
    <div class="card">
      <h3>Class</h3>
      ${cls ? `
        <p><b>${esc(cls.name)}</b></p>
        <div class="page-sub" style="margin-bottom:14px;">Class code: <span class="class-code">${esc(cls.code)}</span></div>
        <button class="btn btn-ghost btn-sm" onclick="App.leaveClass()">Leave class</button>
      ` : `
        <p class="page-sub">Ask your teacher or Iroli admin for your class code.</p>
        <div class="form-row"><input type="text" id="joinCode" placeholder="e.g. 7F3KQ" style="text-transform:uppercase;"/></div>
        <button class="btn btn-primary" onclick="App.joinClass()">Join class</button>
      `}
    </div>
    <div class="card">
      <h3>Licence status</h3>
      <span class="badge ${l.licenseStatus==='active'?'badge-strong':'badge-good'}">${l.licenseStatus==='active'?'Active licence':'Trial access'}</span>
      <p class="page-sub" style="margin-top:12px;">Full Iroli Career Pathway access is provided through your school or institute\u2019s licence. If your access shows as trial, ask your school\u2019s admin to activate your licence.</p>
    </div>
  </div>`;
}
