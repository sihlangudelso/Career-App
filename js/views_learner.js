function markRowHTML(subjectKey, label, saved){
  const pct = saved && saved.pct;
  return `<div class="mark-row"><span>${esc(label)}</span><input type="number" class="subject-mark" data-subject="${esc(subjectKey)}" min="0" max="100" placeholder="%" value="${pct!=null?pct:''}"/></div>`;
}

function viewOnboarding(isEdit){
  const l = ensureLearnerObj();
  const grade = l.grade || '';
  const mathType = l.mathType || '';
  const subjects = l.subjects || [];
  const marks = l.subjectMarks || {};
  const pathChosen = l.exploringOnly === true || l.exploringOnly === false;
  return `
  <div style="max-width:640px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:26px;">
      <img class="brand-mark-img" src="assets/logo-mark.png" alt="Iroli"/>
      <h1>${isEdit?'Update your profile':'Welcome to Iroli Career Pathway'}</h1>
      <p class="page-sub" style="margin:0 auto;">Discover careers that match who you are, see what your results reveal about your strengths, and find the subjects and pathways to get there — whether or not you’re currently at school.</p>
    </div>

    ${l.exploringOnly !== false ? `
    <div class="grid grid-2" style="margin-bottom:22px;gap:12px;">
      <button class="tile" style="border-top-color:var(--indigo);padding:16px;" onclick="App.startExploring('assessment')">${icon('spark','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Career Interest Assessment</h3><p class="page-sub" style="margin:0;">${RIASEC_QUESTIONS.length + STRENGTH_KEYS.length} quick questions to find your interests and strengths.</p></button>
      <button class="tile" style="border-top-color:var(--teal);padding:16px;" onclick="App.startExploring('matches')">${icon('target','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Career Matching</h3><p class="page-sub" style="margin:0;">See which careers fit you best, ranked by fit.</p></button>
      <button class="tile" style="border-top-color:var(--sky);padding:16px;" onclick="App.startExploring('explore')">${icon('search','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">Explore Careers</h3><p class="page-sub" style="margin:0;">Browse every career, with real degree requirements.</p></button>
      <button class="tile" style="border-top-color:var(--coral);padding:16px;" onclick="App.startExploring('aps')">${icon('calc','tico')}<h3 style="font-size:14px;margin:8px 0 4px;">APS Calculator</h3><p class="page-sub" style="margin:0;">Estimate your university admission score from your marks.</p></button>
    </div>
    ` : ''}

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
        ${SUBJECT_GROUPS.map(g=>`
          <div style="margin:12px 0 6px;font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;">${g.group}</div>
          <div class="check-grid">
            ${g.subjects.map(s=>{
              const checked = subjects.includes(s);
              const pct = marks[s] && marks[s].pct;
              return `<label class="check-item">
                <input type="checkbox" class="subject-check" value="${esc(s)}" ${checked?'checked':''} onchange="this.closest('.check-item').querySelector('.subject-mark').disabled=!this.checked"/>
                <span style="flex:1;">${esc(s)}</span>
                <input type="number" class="subject-mark" data-subject="${esc(s)}" min="0" max="100" placeholder="%" style="width:56px;margin-left:auto;" ${checked?'':'disabled'} value="${pct!=null?pct:''}"/>
              </label>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
      <div class="form-row">
        <label>Your latest report marks (optional)</label>
        <div class="hint" style="margin-bottom:8px;">This helps us match you more accurately — skip anything you don’t have to hand yet.</div>
        ${markRowHTML(mathType==='MathLit'?'Mathematical Literacy':'Mathematics', mathType==='MathLit'?'Mathematical Literacy':'Mathematics', marks[mathType==='MathLit'?'Mathematical Literacy':'Mathematics'])}
        ${markRowHTML('Home Language','Home Language', marks['Home Language'])}
        ${markRowHTML('First Additional Language','First Additional Language', marks['First Additional Language'])}
        ${markRowHTML('Life Orientation','Life Orientation', marks['Life Orientation'])}
      </div>` : `
      <div class="disclaimer">${icon('info','ic')}<div>Grade 9 learners choose subjects for Grade 10 soon. Use the <b>Subject Choice Guidance</b> tool on your dashboard after saving your profile — no need to pick subjects here yet.</div></div>
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
  ${PREVIEW_MODE?`<div class="disclaimer" style="margin-bottom:18px;">${icon('info','ic')}<div>You\u2019re previewing the learner experience as an admin. Nothing here is saved to shared learner data.</div></div>`:''}
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

  ${gradeTipHTML(l)}
  ${academicProfileHTML(l)}

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
  ${matches.length ? matches.map(m=>careerRowHTML(m.career, m.score, l, m.category)).join('') : `<div class="empty-state">${icon('target')}<p>Complete the assessment to see personalised matches.</p></div>`}

  ${cls ? `<div class="section-title"><h2>Your class</h2></div><div class="card"><b>${esc(cls.name)}</b><div class="page-sub">Class code: <span class="class-code">${esc(cls.code)}</span></div></div>` : ''}
  `;
}
// Grade-specific framing per the request: 9 = exploration, 10-11 = current
// subjects & marks, 12 = APS/eligibility. Absent for exploring-only
// learners, who aren't tied to a grade at all.
function gradeTipHTML(l){
  if(l.exploringOnly) return '';
  const g = l.grade;
  if(g===9) return `<div class="disclaimer" style="margin-bottom:20px;">${icon('info','ic')}<div><b>Grade 9 — this is exploration time.</b> Nothing is locked in yet. Try the <a href="#" onclick="navigate('guidance');return false;">Subject Choice Guidance</a> tool and the assessment to see what excites you before choosing Grade 10 subjects.</div></div>`;
  if(g===10 || g===11) return `<div class="disclaimer" style="margin-bottom:20px;">${icon('info','ic')}<div><b>Grade ${g} — your subjects and marks now shape your matches.</b> Keep your <a href="#" onclick="navigate('profile');return false;">profile</a> updated as you get new results, so your career matches stay accurate.</div></div>`;
  if(g===12) return `<div class="disclaimer" style="margin-bottom:20px;">${icon('info','ic')}<div><b>Grade 12 — check real eligibility, not just fit.</b> Use the <a href="#" onclick="navigate('aps');return false;">APS Calculator</a> alongside your matches — a high match score reflects fit with your profile, not a guarantee of admission.</div></div>`;
  return '';
}
function academicProfileHTML(l){
  const p = buildAcademicProfile(l);
  if(!p) return '';
  return `
  <div class="card" style="margin-bottom:20px;">
    <h3>Your academic profile</h3>
    <p class="page-sub">Based on your latest entered marks — this reflects where you are right now, not what you’re capable of.</p>
    <div class="grid grid-2" style="margin-top:10px;">
      <div>
        <h4 style="margin-bottom:8px;">Strongest subjects</h4>
        ${p.strongest.map((e,i)=>`<div class="kv"><b>${i+1}. ${esc(e.subject)}</b><span>${e.pct}%</span></div>`).join('')}
        ${p.areasOfStrength.length? `<div class="pill-list" style="margin-top:10px;">${p.areasOfStrength.map(a=>`<span class="pill rec">${esc(a)}</span>`).join('')}</div>` : ''}
      </div>
      <div>
        <h4 style="margin-bottom:8px;">${p.toStrengthen.length? 'Subjects to strengthen' : 'Keep it up'}</h4>
        ${p.toStrengthen.length
          ? p.toStrengthen.map(e=>`<div class="kv"><b>${esc(e.subject)}</b><span>${e.pct}%</span></div>`).join('')
          : `<p class="page-sub">No subjects currently below 50% — nice work.</p>`}
      </div>
    </div>
  </div>`;
}
function labelStep(label, done){
  return `<div style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:${done?'var(--grass)':'var(--muted)'};font-weight:600;">${icon('check','ic')} ${label}</div>`;
}

/* ---------------- Grade 9 subject guidance ---------------- */
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
  ${pageHeadHTML('Subject Choice Guidance', 'Mainly built for Grade 9 learners choosing subjects for Grade 10, but useful any time you’re weighing up a subject change — 2 quick steps.')}
  ${l.subjectGuidance? `<div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>You\u2019ve already completed this. Saving again will replace your previous recommendation. <button class="btn btn-ghost btn-sm" style="margin-left:8px;" onclick="App.guideViewSaved()">View saved result</button></div></div>`:''}
  <div class="card">
    ${d.step===1 ? `
      <h3>Step 1 — Which fields excite you?</h3>
      <p class="page-sub">Pick up to 3 — these aren’t final, just a starting point.</p>
      <div class="filter-bar">
        ${CLUSTERS.map(cl=>`<button class="chip-select ${d.tags.includes(cl.id)?'on':''}" onclick="App.guideToggleTag('${cl.id}')">${esc(cl.name)}</button>`).join('')}
      </div>
      <div style="margin-top:20px;"><button class="btn btn-primary" ${d.tags.length?'':'disabled'} onclick="App.guideStep(2)">Next</button></div>
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
// Grounded in the real career database rather than a hardcoded tag->subject
// table: for every career example under the learner's selected clusters,
// tally which subjects are actually required/recommended, so "why" can
// name real careers instead of a generic sentence.
function buildGuidanceResult(d){
  const tags = d.tags; // cluster ids
  const selectedClusters = tags.map(function(id){ return clusterById(id); }).filter(Boolean);
  const subjectInfo = {}; // subject -> { required:Set<careerName>, recommended:Set<careerName> }
  function touch(s, tier, name){
    subjectInfo[s] = subjectInfo[s] || { required:new Set(), recommended:new Set() };
    subjectInfo[s][tier].add(name);
  }
  selectedClusters.forEach(function(cl){
    cl.exampleCareerIds.forEach(function(cid){
      const c = CAREERS.find(function(x){ return x.id===cid; });
      if(!c) return;
      c.requiredSubjects.forEach(function(s){ touch(s,'required',c.name); });
      c.recommendedSubjects.forEach(function(s){ touch(s,'recommended',c.name); });
    });
  });

  const rec = [];
  const reasoning = [];
  function nameList(set,max){
    max = max||3;
    const arr=[...set];
    return arr.length>max ? (arr.slice(0,max).join(', ')+' and '+(arr.length-max)+' other career'+(arr.length-max>1?'s':'')) : arr.join(', ');
  }

  const math = subjectInfo['Mathematics'];
  if(math && math.required.size){
    rec.push('Mathematics');
    reasoning.push('Mathematics is required for '+nameList(math.required)+' among your selected interests.');
  } else if((math && math.recommended.size) || d.conf.maths>=4){
    rec.push('Mathematics');
    reasoning.push(math ? ('Mathematics isn’t strictly required for your selected interests, but it’s recommended for '+nameList(math.recommended)+' and generally keeps more doors open.') : 'Mathematics isn’t required by your selected interests specifically, but it keeps the widest range of future options open.');
  } else {
    rec.push('Mathematics or Mathematical Literacy — discuss with your teacher');
    reasoning.push('None of your selected interests strictly need Mathematics, so Mathematical Literacy is a reasonable option — but talk this through with your subject counsellor, since switching back later is hard if your interests change.');
  }

  Object.keys(subjectInfo).filter(function(s){ return s!=='Mathematics'; }).forEach(function(s){
    const info = subjectInfo[s];
    if(info.required.size){ rec.push(s); reasoning.push(s+' is required for '+nameList(info.required)+' among your selected interests.'); }
    else if(info.recommended.size>=2){ rec.push(s); reasoning.push(s+' is recommended for '+nameList(info.recommended)+'.'); }
  });

  selectedClusters.forEach(function(cl){
    if(cl.usefulSubjects.length && !cl.usefulSubjects.some(function(s){ return rec.includes(s); })){
      rec.push(cl.usefulSubjects[0]);
      reasoning.push(cl.usefulSubjects[0]+' is a useful foundation subject for '+cl.name+'.');
    }
  });
  if(!selectedClusters.length) reasoning.push('Pick at least one field you’re curious about to get a grounded recommendation.');

  return { tags: tags, conf:d.conf, recommendedSubjects:[...new Set(rec)], reasoning: reasoning, completedAt: todayISO() };
}
function guidanceResultsHTML(res){
  const selectedClusters = (res.tags||[]).map(function(id){ return clusterById(id); }).filter(Boolean);
  return `
  ${pageHeadHTML('Your subject recommendation', 'A starting point for your Grade 10 subject choice conversation — grounded in real careers, not just a guess.')}
  <div class="card" style="margin-bottom:18px;">
    <h3>Suggested subject focus</h3>
    <div class="pill-list" style="margin-bottom:16px;">
      ${res.recommendedSubjects.map(s=>`<span class="pill req">${esc(s)}</span>`).join('')}
    </div>
    <h3>Why</h3>
    <ul>${res.reasoning.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>
    ${disclaimerHTML('This is guidance to support a conversation with your school’s Life Orientation teacher or subject counsellor — final subject choice depends on your school’s offering and timetable.')}
  </div>
  ${selectedClusters.length? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Your selected fields</h3>
    <div class="pill-list">${selectedClusters.map(cl=>`<span class="tag" style="cursor:pointer;" onclick="navigate('cluster','${cl.id}')">${esc(cl.name)}</span>`).join('')}</div>
    <p class="page-sub" style="margin-top:10px;">Click any field above to see real example careers and how they connect to these subjects.</p>
  </div>` : ''}
  <div style="display:flex;gap:10px;">
    <button class="btn btn-ghost" onclick="App.guideRetake()">Retake</button>
    <button class="btn btn-primary" onclick="navigate('matches')">See career matches</button>
  </div>`;
}

/* ---------------- Assessment ---------------- */
const ASSESS_STYLES = ['likert','dots','slider','emoji'];
function assessStyleFor(step){ return ASSESS_STYLES[step % ASSESS_STYLES.length]; }
const RIASEC_SCALE = ['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'];
const STRENGTH_SCALE = ['Not a strength','A little','Somewhat','Strong','A real strength'];
const RIASEC_EMOJI = ['😠','🙁','😐','🙂','😄'];

function assessWidgetHTML(step, kind, value){
  const style = assessStyleFor(step);
  const labels = kind==='strength' ? STRENGTH_SCALE : RIASEC_SCALE;
  if(style==='dots'){
    return `<div class="scale-dots">
      <div class="scale-dots-row">${[1,2,3,4,5].map(n=>`<button class="dot-btn ${value===n?'on':''}" onclick="App.assessChoose(${step},${n})">${n}</button>`).join('')}</div>
      <div class="scale-dots-caps"><span>${labels[0]}</span><span>${labels[4]}</span></div>
    </div>`;
  }
  if(style==='slider'){
    const v = value || 3;
    return `<div class="slider-row">
      <input type="range" min="1" max="5" value="${v}" oninput="App.assessSlide(${step},this.value)" onchange="App.assessSlideCommit(${step},this.value)"/>
      <div class="slider-ticks">${[1,2,3,4,5].map(n=>`<span class="${v===n?'on':''}">${n}</span>`).join('')}</div>
      <div class="sl-top" style="justify-content:center;"><span id="qval_${step}">${esc(labels[v-1])}</span></div>
    </div>`;
  }
  if(style==='emoji'){
    if(kind==='strength'){
      // A conventional cumulative star rating (button N fills stars 1..N) --
      // one glyph per hit target, not a 5-glyph string per button, so
      // nothing overflows/overlaps at any button size.
      return `<div class="star-scale">${[1,2,3,4,5].map(n=>`<button class="star-btn ${value>=n?'on':''}" onclick="App.assessChoose(${step},${n})" aria-label="${esc(labels[n-1])}">${value>=n?'★':'☆'}</button>`).join('')}</div>`;
    }
    return `<div class="emoji-scale">${RIASEC_EMOJI.map((e,i)=>`<button class="emoji-btn ${value===i+1?'on':''}" onclick="App.assessChoose(${step},${i+1})" title="${esc(labels[i])}"><span>${e}</span></button>`).join('')}</div>`;
  }
  return `<div class="likert">${labels.map((lb,i)=>`<button class="${value===i+1?'on':''}" onclick="App.assessChoose(${step},${i+1})">${lb}</button>`).join('')}</div>`;
}

function ensureAssessDraft(){
  const l = ensureLearnerObj();
  if(!ASSESSMENT_DRAFT){
    ASSESSMENT_DRAFT = {
      step:0, dir:'fwd',
      answers: l.riasecRaw ? [...l.riasecRaw] : Array(RIASEC_QUESTIONS.length).fill(0),
      // Mapped (not spread) so a learner whose saved strengthsRaw predates a
      // STRENGTH_KEYS expansion gets the new trailing categories padded to
      // the default 3, instead of leaving them undefined -- STRENGTH_KEYS
      // is append-only specifically so this positional padding stays safe.
      strengths: STRENGTH_KEYS.map((_,i)=> (l.strengthsRaw && l.strengthsRaw[i]!=null) ? l.strengthsRaw[i] : 3),
    };
  }
  return ASSESSMENT_DRAFT;
}
function viewAssessment(){
  const l = ensureLearnerObj();
  const d = ensureAssessDraft();
  if(l.assessmentCompletedAt && d.step===0 && !d.retaking){
    return assessmentResultsHTML(l);
  }
  const TOTAL_R = RIASEC_QUESTIONS.length, TOTAL_S = STRENGTH_KEYS.length, TOTAL = TOTAL_R + TOTAL_S;
  const step = d.step;

  if(step >= TOTAL){
    return `
    ${pageHeadHTML('Nice work!', 'You’ve answered every question.')}
    <div class="card q-anim" style="text-align:center;padding:40px 24px;">
      ${icon('trophy')}
      <h3 style="margin-top:10px;">All ${TOTAL} questions done</h3>
      <p class="page-sub">Ready to see how your interests, personality and strengths line up with real careers?</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;">
        <button class="btn btn-ghost" onclick="App.assessGoto(${TOTAL-1},'back')">Back</button>
        <button class="btn btn-primary" onclick="App.assessSubmit()">${icon('check')} See my results</button>
      </div>
    </div>`;
  }

  const inStrengths = step >= TOTAL_R;
  const pct = Math.round(step/TOTAL*100);
  const animClass = 'q-anim' + (d.dir==='back' ? ' back' : '');
  const headTitle = inStrengths ? 'Rate your strengths' : 'Interests & personality assessment';
  const headSub = inStrengths
    ? `Strength ${step-TOTAL_R+1} of ${TOTAL_S} — rate yourself honestly, from not a strength to a real strength.`
    : `Question ${step+1} of ${TOTAL_R} — answer honestly, there are no wrong answers.`;
  const qLabel = inStrengths ? `STRENGTH ${step-TOTAL_R+1} OF ${TOTAL_S}` : `QUESTION ${step+1} OF ${TOTAL_R}`;
  const qText = inStrengths ? STRENGTH_KEYS[step-TOTAL_R].label : RIASEC_QUESTIONS[step].text;
  const value = inStrengths ? d.strengths[step-TOTAL_R] : d.answers[step];
  const kind = inStrengths ? 'strength' : 'riasec';
  const isSlider = assessStyleFor(step)==='slider';
  const canContinue = inStrengths || isSlider ? true : !!value;

  return `
  ${pageHeadHTML(headTitle, headSub)}
  ${step===0 ? `
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
    <p style="font-size:15px;">${TOTAL} quick questions (about 6 minutes) — ${TOTAL_R} using the RIASEC framework (Realistic, Investigative, Artistic, Social, Enterprising, Conventional) and ${TOTAL_S} rating your strengths. Your answers directly shape your career matches.</p>
  </div>
  ` : ''}
  ${step===TOTAL_R ? `
  <div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>Nice progress — interest questions done. Just ${TOTAL_S} quick strength ratings to go.</div></div>
  ` : ''}
  <div class="aps-bar" style="margin-bottom:18px;"><div style="width:${pct}%"></div></div>
  <div class="card ${animClass}">
    <div class="qcard" style="margin-bottom:8px;">
      <div class="qn">${qLabel}</div>
      <div class="qt" style="font-size:19px;margin:10px 0 4px;">${esc(qText)}</div>
    </div>
    ${assessWidgetHTML(step, kind, value)}
    <div style="display:flex;gap:10px;margin-top:22px;justify-content:center;">
      ${step>0?`<button class="btn btn-ghost" onclick="App.assessBack()">Back</button>`:''}
      <button class="btn btn-primary" ${canContinue?'':'disabled'} onclick="App.assessNext()">Continue</button>
    </div>
  </div>`;
}
function assessmentResultsHTML(l){
  const dims = RIASEC.map(d=>({...d, val: l.riasec? l.riasec[d.id]:0}));
  const top2 = hollandCode(l.riasec);
  const topDims = [...dims].sort((a,b)=>b.val-a.val).slice(0,2);
  const topMatches = computeMatches(l).slice(0,3);
  return `
  ${pageHeadHTML('Your type is '+esc(top2), 'Here’s what that means, and a first look at where it points you.')}
  <div class="card" style="margin-bottom:18px;">
    <h3>What ${esc(top2)} means</h3>
    ${topDims.map(d=>`<p style="margin-bottom:10px;"><b>${esc(d.name)}</b> — ${esc(d.desc)}</p>`).join('')}
    <p class="page-sub" style="margin-bottom:0;">This comes from your two strongest RIASEC dimensions below — a starting point for exploring careers, not a fixed label.</p>
  </div>
  <div class="section-title" style="margin-top:0;"><h2>Your top career matches</h2></div>
  ${topMatches.length ? topMatches.map(m=>careerRowHTML(m.career,m.score,l,m.category)).join('') : `<div class="empty-state">${icon('target')}<p>Complete your profile for personalised matches.</p></div>`}
  <div class="card" style="margin:18px 0;">
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
    <button class="btn btn-primary" onclick="navigate('matches')">See all career matches</button>
  </div>`;
}

/* ---------------- Career list / matches / explore ---------------- */
function careerRowHTML(career, score, l, category){
  const fac = facultyById(career.faculty);
  const isFav = (l.favourites||[]).includes(career.id);
  const meta = category ? MATCH_CATEGORIES[category] : null;
  const label = meta ? {t:meta.label, c:meta.badge} : (score!=null ? matchLabel(score) : null);
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
const MATCH_GROUP_ORDER = [
  ['strong', 'Strong matches', 'Your interests, strengths and current academic performance all line up with these.'],
  ['academic', 'Academic strength matches', 'You’re already performing well in subjects these careers value, even if you hadn’t considered them yet.'],
  ['interest', 'Interest matches', 'You show strong interest here — your subjects or marks may need some development to fully back it up.'],
  ['possible', 'Possible pathways', 'Not a clear match yet on interest or academics — still genuinely worth exploring, especially this early on.'],
  ['low', 'Also worth browsing', 'Less aligned with your profile today, but never hidden — every career here is worth a look.'],
];
function viewMatches(){
  const l = ensureLearnerObj();
  const fac = ROUTE_PARAM || 'all';
  let matches = computeMatches(l);
  if(fac!=='all') matches = matches.filter(m=>m.career.faculty===fac);
  const grouped = l.assessmentCompletedAt;
  return `
  ${pageHeadHTML('Career matches', l.assessmentCompletedAt? 'Grouped by how your interests, strengths, subjects and marks line up.':'Complete the assessment for personalised ranking — showing subject-based fit for now.')}
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
    <p style="font-size:15px;">Every one of the ${CAREERS.length} seeded careers, ranked by fit with your interest profile, strengths, subjects and marks. Filter by faculty below, or open any career to see real degree programmes and entry requirements.</p>
  </div>
  ${!l.assessmentCompletedAt?`<div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>Your matches will be far more accurate once you <a href="#" onclick="navigate('assessment');return false;">complete the assessment</a>.</div></div>`:''}
  <div class="disclaimer" style="margin-bottom:16px;">${icon('info','ic')}<div>A match score reflects <b>fit</b> with your interests, strengths, subjects and marks — it is not a guarantee of admission. Meeting a programme’s minimum requirements doesn’t guarantee acceptance, especially for competitive programmes — always confirm on the institution’s own site.</div></div>
  <div class="filter-bar">
    <button class="chip-select ${fac==='all'?'on':''}" onclick="navigate('matches','all')">All faculties</button>
    ${FACULTIES.map(f=>`<button class="chip-select ${fac===f.id?'on':''}" onclick="navigate('matches','${f.id}')">${f.name}</button>`).join('')}
  </div>
  ${grouped
    ? MATCH_GROUP_ORDER.map(([key,title,sub])=>{
        const list = matches.filter(m=>m.category===key);
        if(!list.length) return '';
        return `<div class="section-title"><h2>${title}</h2></div><p class="page-sub" style="margin-top:-10px;margin-bottom:12px;">${sub}</p>${list.map(m=>careerRowHTML(m.career,m.score,l,m.category)).join('')}`;
      }).join('')
    : matches.map(m=>careerRowHTML(m.career,m.score,l)).join('')}
  `;
}
function viewExplore(){
  const l = ensureLearnerObj();
  const fac = ROUTE_PARAM && typeof ROUTE_PARAM==='object' ? ROUTE_PARAM.fac : (ROUTE_PARAM||'all');
  return `
  ${pageHeadHTML('Explore careers', 'Browse every seeded career — no assessment needed.')}
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
    <p style="font-size:15px;">Browse all ${CAREERS.length} careers across ${FACULTIES.length} faculties, search by name, or filter to one faculty — no assessment required. Many careers also show real degree programmes and entry requirements pulled from actual South African institutions.</p>
  </div>
  <button class="btn btn-ghost btn-sm" style="margin-bottom:14px;" onclick="navigate('clusters')">${icon('layers')} Not sure where to start? Browse by career cluster instead</button>
  <div class="filter-bar">
    <button class="chip-select ${fac==='all'?'on':''}" onclick="navigate('explore','all')">All faculties</button>
    ${FACULTIES.map(f=>`<button class="chip-select ${fac===f.id?'on':''}" onclick="navigate('explore','${f.id}')">${f.name}</button>`).join('')}
    <input type="text" id="exploreSearch" placeholder="Search careers by name…" value="${esc(EXPLORE_SEARCH)}" oninput="App.filterExplore(this.value)"/>
  </div>
  <div class="filter-bar">
    <select style="width:auto;min-width:170px;" onchange="App.setExploreFilter('pathway',this.value)">
      <option value="">Any pathway type</option>
      ${PATHWAY_TYPES.map(t=>`<option value="${esc(t)}" ${EXPLORE_FILTERS.pathway===t?'selected':''}>${esc(t)}</option>`).join('')}
    </select>
    <button class="chip-select ${EXPLORE_FILTERS.mathRequired?'on':''}" onclick="App.toggleExploreFilter('mathRequired')">Maths required</button>
    <button class="chip-select ${EXPLORE_FILTERS.mathLitOk?'on':''}" onclick="App.toggleExploreFilter('mathLitOk')">Maths Lit accepted</button>
    <button class="chip-select ${EXPLORE_FILTERS.physSciRequired?'on':''}" onclick="App.toggleExploreFilter('physSciRequired')">Physical Sciences required</button>
    <button class="chip-select ${EXPLORE_FILTERS.uot?'on':''}" onclick="App.toggleExploreFilter('uot')">University of Technology option</button>
    ${(EXPLORE_FILTERS.pathway||EXPLORE_FILTERS.mathRequired||EXPLORE_FILTERS.mathLitOk||EXPLORE_FILTERS.physSciRequired||EXPLORE_FILTERS.uot) ? `<button class="btn btn-ghost btn-sm" onclick="App.clearExploreFilters()">${icon('close')} Clear filters</button>` : ''}
  </div>
  <div id="exploreResults">${exploreResultsHTML(fac, l)}</div>
  `;
}
function viewClusters(){
  return `
  ${pageHeadHTML('Explore career clusters', 'Twenty broad fields of work — a different way to browse than by faculty, useful if you don’t know where to start.')}
  <div class="grid grid-3">
    ${CLUSTERS.map(cl=>`
      <button class="tile" style="border-top-color:var(--indigo);" onclick="navigate('cluster','${cl.id}')">
        <h3 style="font-size:15px;">${esc(cl.name)}</h3>
        <p style="font-size:12.5px;">${esc(cl.overview)}</p>
      </button>`).join('')}
  </div>
  `;
}
function viewClusterDetail(id){
  const cl = clusterById(id);
  const l = ensureLearnerObj();
  if(!cl) return `${pageHeadHTML('Cluster not found')}<div class="empty-state">${icon('search')}<p>That cluster couldn’t be found.</p></div>`;
  const careers = cl.exampleCareerIds.map(cid=>CAREERS.find(c=>c.id===cid)).filter(Boolean);
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:16px;" onclick="navigate('clusters')">${icon('chevron')} Back</button>
  ${pageHeadHTML(cl.name, cl.overview)}
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Common interests</h3>
      <div class="pill-list">${cl.commonInterests.map(x=>`<span class="pill">${esc(x)}</span>`).join('')}</div>
    </div>
    <div class="card">
      <h3>Useful school subjects</h3>
      <div class="pill-list">${cl.usefulSubjects.map(x=>`<span class="pill rec">${esc(x)}</span>`).join('')}</div>
    </div>
  </div>
  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>Typical study routes</h3>
      <ul>${cl.studyRoutes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <h3>Qualification options</h3>
      <ul>${cl.qualificationOptions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    </div>
  </div>
  <div class="section-title"><h2>Example careers</h2></div>
  ${careers.map(c=>careerRowHTML(c,null,l)).join('')}
  `;
}
function exploreResultsHTML(fac, l){
  let list = CAREERS.slice();
  if(fac && fac!=='all') list = list.filter(c=>c.faculty===fac);
  const f = EXPLORE_FILTERS;
  if(f.pathway) list = list.filter(c=>c.pathways.some(p=>p.type===f.pathway));
  if(f.mathRequired) list = list.filter(c=>c.requiredSubjects.includes('Mathematics'));
  if(f.mathLitOk) list = list.filter(c=>!c.requiredSubjects.includes('Mathematics'));
  if(f.physSciRequired) list = list.filter(c=>c.requiredSubjects.includes('Physical Sciences'));
  if(f.uot) list = list.filter(c=>(c.institutions.utech||[]).length>0);
  const q = EXPLORE_SEARCH.trim().toLowerCase();
  if(q) list = list.filter(c=>c.name.toLowerCase().includes(q) || c.blurb.toLowerCase().includes(q) || c.applicationNotes.toLowerCase().includes(q));
  if(!list.length) return `<div class="empty-state">${icon('search')}<p>No careers match ${q?`“${esc(EXPLORE_SEARCH)}”`:'these filters'}.</p><button class="btn btn-ghost btn-sm" onclick="App.clearExploreFilters()">Clear filters</button></div>`;
  return list.map(c=>careerRowHTML(c,null,l)).join('');
}

function viewCareerDetail(id){
  const career = CAREERS.find(c=>c.id===id);
  const l = ensureLearnerObj();
  if(!career) return `${pageHeadHTML('Career not found')}<div class="empty-state">${icon('search')}<p>That career couldn\u2019t be found.</p></div>`;
  const fac = facultyById(career.faculty);
  const ev = evaluateCareer(l, career);
  const score = ev.score;
  const meta = ev.category ? MATCH_CATEGORIES[ev.category] : null;
  const label = meta ? {t:meta.label, c:meta.badge} : matchLabel(score);
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

  <div class="card" style="margin-bottom:18px;">
    <h3>Why this may (or may not) suit you</h3>
    ${careerExplanationHTML(l, career, ev)}
  </div>

  <div class="grid grid-2" style="margin-bottom:18px;">
    <div class="card">
      <h3>A day in the life</h3>
      <p>${esc(career.dayInLife)}</p>
    </div>
    <div class="card">
      <h3>Required, recommended & related NSC subjects</h3>
      <div class="pill-list">
        ${career.requiredSubjects.map(s=>`<span class="pill req">${esc(s)} (required)</span>`).join('')}
        ${career.recommendedSubjects.map(s=>`<span class="pill rec">${esc(s)} (recommended)</span>`).join('')}
        ${(career.relatedSubjects||[]).map(s=>`<span class="pill">${esc(s)} (related)</span>`).join('')}
      </div>
      ${!career.requiredSubjects.length ? `<p class="page-sub" style="margin-top:8px;">No specific NSC subject is a strict requirement for this pathway — check individual programme/employer requirements.</p>` : ''}
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

  ${(()=>{ const related = relatedCareersFor(career); return related.length ? `
  <div class="card" style="margin-bottom:18px;">
    <h3>Related careers</h3>
    <div class="pill-list">${related.map(c=>`<span class="tag" style="cursor:pointer;" onclick="navigate('career','${c.id}')">${esc(c.name)}</span>`).join('')}</div>
  </div>` : ''; })()}

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
  <div class="detail-hero" style="background:linear-gradient(135deg, var(--indigo), #14172A);">
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
  ${favs.length? favs.map(c=>{const ev=evaluateCareer(l,c); return careerRowHTML(c, ev.score, l, ev.category);}).join('') : `<div class="empty-state">${icon('heart')}<p>No saved careers yet. Explore careers and tap the heart icon to save them here.</p></div>`}
  ${favs.length? `<button class="btn btn-primary" style="margin-top:10px;" onclick="App.compareFromFavs()">${icon('layers')} Compare all saved</button>`:''}
  `;
}
function viewCompare(){
  const l = ensureLearnerObj();
  const items = (l.compare||[]).map(id=>CAREERS.find(c=>c.id===id)).filter(Boolean);
  if(!items.length) return `${pageHeadHTML('Compare careers')}<div class="empty-state">${icon('layers')}<p>Add up to 3 careers to compare from Explore, Matches or Favourites.</p><button class="btn btn-primary" style="margin-top:12px;" onclick="navigate('explore')">Explore careers</button></div>`;
  const rows = [
    ['Faculty', c=>facultyById(c.faculty).name],
    ['Required subjects', c=>[...c.requiredSubjects.map(s=>s+' (required)'), ...c.recommendedSubjects.map(s=>s+' (rec.)')].join(', ') || '—'],
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
