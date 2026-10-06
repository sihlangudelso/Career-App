/* ============================================================
   THE LEARNER REPORT -- one short report, five sections, laid out like the
   owner's mock-up and drawn in the iroli brand colours:

     1  Your Learner Profile                 4  Career Pathways
     2  Subject Fit                          5  Your Final Recommendation & Next Steps
     3  Recommended Subject Combination         (the summary table + three next steps)

   The Academic Snapshot (key results, strongest and weakest areas) sits
   under the Subject Fit table, where those results are used.
   About 2 pages when printed -- a short report, not a psychometric one.

   Nothing in this file scores anything. Every number and ranking comes
   from the one place that already owns it (personalityTypeInfo,
   buildAcademicProfile, buildSubjectChoiceReport, bestSuitedCareers ...),
   so this report can never disagree with the rest of the app.
   buildLearnerReport() gathers all of that into one plain object, and
   learnerReportHTML() draws it -- on screen and in the printed copy.

   Learners who are not Grade 9 (or who have not finished the Subject
   Choice Assessment yet) get the same report with the subject sections
   replaced by what applies to them, never an empty or misleading table.
   ============================================================ */

const LR_CONFIG = {
  // Words for interest alignment, personality alignment and overall fit (0-100).
  level: { veryStrong: 80, strong: 65, moderate: 45 },
  // Words for academic readiness (a mark, 0-100).
  academic: { veryStrong: 80, strong: 70, moderate: 55 },
  // An entered result under this is listed as an area to strengthen -- the
  // same line the Subject Choice report uses for its "work on" tips.
  weakBelow: SC_CONFIG.report.workOnBelow,
  fitRows: 6,                       // most subjects listed under Subject Fit
  careerAreas: { min: 3, max: 4 },  // broad career areas listed
  nextSteps: 3,                     // next steps listed
  trait: { max: 5, min: 55, least: 3 },  // key traits: up to 5 scoring 55+, never fewer than 3
  interests: 5,                     // interest areas shown (of the six the assessment scores)
};

/* ---------------- small helpers ---------------- */
function lrAvg(list){
  const v = list.filter(function(x){ return x != null && !isNaN(x); });
  return v.length ? v.reduce(function(a, b){ return a + b; }, 0) / v.length : null;
}
function lrLower(s){ return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
// The report says "Maths", like learners do; the rest of the app keeps the full name.
function lrShort(label){ return String(label).replace('Mathematical Literacy', 'Maths Literacy').replace('Mathematics', 'Maths'); }

// Strong-ish words for a 0-100 score. `key` drives the colour of the pill.
function lrLevel(score, kind){
  if(score == null || isNaN(score)) return { key:'na', label:'Not yet available' };
  const t = kind === 'academic' ? LR_CONFIG.academic : LR_CONFIG.level;
  if(score >= t.veryStrong) return { key:'vs', label:'Very Strong' };
  if(score >= t.strong) return { key:'s', label:'Strong' };
  if(score >= t.moderate) return { key:'m', label:'Moderate' };
  return { key:'l', label: kind === 'academic' ? 'Developing' : 'Low' };
}
function lrFit(score){
  if(score == null || isNaN(score)) return { key:'na', label:'Not yet available', word:'Not yet available' };
  const t = LR_CONFIG.level;
  if(score >= t.strong) return { key:'s', label:'Strong', word:'Strong Fit' };
  if(score >= t.moderate) return { key:'m', label:'Moderate', word:'Moderate Fit' };
  return { key:'l', label:'Low', word:'Low Fit' };
}

// "Strong" overall needs no side to be Low/Developing: a strong blend can hide
// one weak part (strong interest with results still developing is "build the
// foundation", not a plain strong fit). Capped to Moderate, and flagged.
function lrOverall(score, parts){
  const f = lrFit(score);
  if(f.key === 's' && parts.some(function(p){ return p && p.key === 'l'; })) return { key:'m', label:'Moderate', word:'Moderate Fit', capped:true };
  return f;
}

// A career's required / helpful subject names -> Subject Choice subject ids.
// Languages, Life Orientation and unassessed technical subjects have no id:
// everyone takes the first two, and the rest are not part of this assessment.
function lrCareerSubjectIds(names){
  const out = [];
  (names || []).forEach(function(n){
    const id = SC_CAREER_SUBJECT_IDS[n];
    if(id && out.indexOf(id) === -1) out.push(id);
  });
  return out;
}

/* ---------------- section content ---------------- */

// "Analytical & logical" -> "Analytical": the first part of the trait's own label.
function lrTraitWord(id){ return SC_TRAITS[id].label.split(' & ')[0]; }

// The learner's clearest traits (the same eight the Subject Choice report
// scores for personality alignment), strongest first.
function lrKeyTraits(l){
  const scores = scTraitScores(l);
  const all = Object.keys(SC_TRAITS)
    .filter(function(id){ return scores[id] != null; })
    .map(function(id, i){ return { id: id, word: lrTraitWord(id), phrase: SC_TRAITS[id].phrase, score: scores[id], i: i }; })
    .sort(function(a, b){ return (b.score - a.score) || (a.i - b.i); });
  const T = LR_CONFIG.trait;
  const picked = all.filter(function(t){ return t.score >= T.min; }).slice(0, T.max);
  return picked.length >= T.least ? picked : all.slice(0, T.least);
}

// Interest areas: the personality assessment's own six dimensions (the ones
// behind the learner's personality type), strongest first. Ties keep the
// fixed RIASEC order, exactly as the personality type does.
function lrInterestBars(l){
  const r = l.riasec || {};
  return RIASEC
    .map(function(d, i){ return { id: d.id, name: d.name, score: r[d.id] == null || r[d.id] === '' ? NaN : Math.max(0, Math.min(100, Number(r[d.id]))), i: i }; })
    .filter(function(d){ return !isNaN(d.score); })
    .sort(function(a, b){ return (b.score - a.score) || (a.i - b.i); })
    .slice(0, LR_CONFIG.interests);
}

// How the learner tends to learn: short "you can ..." phrases, each tied to a
// clear leaning in their own answers -- a trait score, or a working-style
// slider pushed towards one end. They are tendencies read from the personality
// assessment, not a measured learning style, and the report says so.
const LR_LEARN = [
  { group:'why',     trait:'analytical',    text:'understand why something works' },
  { group:'explore', trait:'investigative', text:'explore and ask questions' },
  { group:'apply',   trait:'practical',     text:'apply what you learn to real problems' },
  { group:'create',  trait:'creative',      text:'try out your own ideas' },
  { group:'plan',    trait:'organised',     text:'follow a clear plan' },
  { group:'people',  trait:'people',        text:'talk ideas through with other people' },
  { group:'debate',  trait:'persuasive',    text:'discuss and debate ideas' },
  { group:'think',   trait:'reflective',    text:'take time to think things through' },
  { group:'people',  slider:'teamVsSolo',           dir:'high', text:'work with other people' },
  { group:'solo',    slider:'teamVsSolo',           dir:'low',  text:'work on your own' },
  { group:'plan',    slider:'structureVsFlexible',  dir:'low',  text:'follow a clear plan' },
  { group:'flex',    slider:'structureVsFlexible',  dir:'high', text:'adapt as things change' },
  { group:'detail',  slider:'detailVsBigPicture',   dir:'low',  text:'get the details exactly right' },
  { group:'big',     slider:'detailVsBigPicture',   dir:'high', text:'see the big picture first' },
  { group:'steady',  slider:'routineVsVariety',     dir:'low',  text:'settle into a steady routine' },
  { group:'variety', slider:'routineVsVariety',     dir:'high', text:'switch between different kinds of tasks' },
];
const LR_LEARN_OPPOSITE = { plan:'flex', flex:'plan', detail:'big', big:'detail', steady:'variety', variety:'steady', people:'solo', solo:'people' };
function lrLearnBest(l){
  const scores = scTraitScores(l), ws = (l.workStyle && typeof l.workStyle === 'object') ? l.workStyle : {};
  let any = false;
  const cands = [];
  LR_LEARN.forEach(function(c, i){
    let strength = null;
    if(c.trait){
      const s = scores[c.trait];
      if(s == null) return;
      any = true;
      if(s >= 60) strength = (s - 50) / 50;
    } else {
      if(ws[c.slider] == null) return;
      const v = Number(ws[c.slider]);
      if(isNaN(v)) return;
      any = true;
      const d = c.dir === 'high' ? v - 50 : 50 - v;
      if(d >= 25) strength = d / 50;     // a clear lean (2/5 or 4/5 on the slider, or further)
    }
    if(strength != null) cands.push({ c: c, strength: strength, i: i });
  });
  if(!any) return null;
  cands.sort(function(a, b){ return (b.strength - a.strength) || (a.i - b.i); });
  const picked = [], groups = {};
  cands.forEach(function(x){
    if(picked.length >= 3 || groups[x.c.group] || groups[LR_LEARN_OPPOSITE[x.c.group]]) return;
    groups[x.c.group] = true; picked.push(x.c.text);
  });
  return picked.length ? 'You tend to learn best when you can ' + scJoin(picked) + '.' : 'Your answers show a flexible style — you can adapt to how a topic is taught.';
}

function lrProfile(l){
  const p = personalityTypeInfo(l);
  if(!p) return { available:false };
  return {
    available: true,
    code: p.code, names: p.top.map(function(t){ return t.name; }),
    traits: lrKeyTraits(l),
    interests: lrInterestBars(l),
    learn: lrLearnBest(l),
  };
}

// The learner's entered results, strongest first, with the areas to strengthen.
function lrAcademic(l){
  const p = buildAcademicProfile(l);
  const entries = p ? p.entries : [];
  if(!entries.length) return { has:false };
  const hasCurrent = l.subjectMarks && Object.keys(l.subjectMarks).some(function(k){ const m = l.subjectMarks[k]; return m && m.pct != null && m.pct !== ''; });
  const strongest = entries.slice(0, 3);
  const taken = {}; strongest.forEach(function(e){ taken[e.subject] = true; });
  const toStrengthen = entries.filter(function(e){ return e.pct < LR_CONFIG.weakBelow && !taken[e.subject]; })
    .sort(function(a, b){ return a.pct - b.pct; }).slice(0, 3);
  const term = (l.grade9Report && l.grade9Report.term) || null;
  return {
    has: true, entries: entries, strongest: strongest, toStrengthen: toStrengthen,
    average: lrAvg(entries.map(function(e){ return e.pct; })),
    source: hasCurrent ? 'your current subject marks' : ('your Grade 9 report' + (term ? ' (' + term + ')' : '')),
  };
}

// The best-fit combination and ONE alternative that points a different way.
function lrCombos(rep){
  const combos = (rep && rep.combos) || [];
  const best = combos[0] || null;
  let alt = null;
  if(best){
    const inBest = {}; best.subjects.forEach(function(id){ inBest[id] = true; });
    const shared = function(c){ return c.subjects.filter(function(id){ return inBest[id]; }).length; };
    const rest = combos.slice(1);
    alt = rest.filter(function(c){ return shared(c) <= 1; })[0]
       || rest.filter(function(c){ return shared(c) < Math.min(c.subjects.length, best.subjects.length); })[0]
       || null;
  }
  return { best: best, alt: alt };
}
// Everyone takes Mathematics or Mathematical Literacy, two languages and Life
// Orientation; the rest of a combination is the electives. When a combination
// has no Maths slot (humanities, creative ...), the core Maths line follows
// the report's own Maths lean.
function lrIsMaths(label){ return label.indexOf('Mathematics') === 0 || label.indexOf('Mathematical Literacy') === 0; }
function lrComboView(c, rep){
  const labels = c.labels.map(lrShort);
  const maths = c.labels.filter(lrIsMaths)[0]
    || (rep && rep.mathChoice && rep.mathChoice.recommended === 'mathematics' ? 'Mathematics'
      : (rep && rep.mathChoice && rep.mathChoice.recommended === 'mathematicalLiteracy' ? 'Mathematical Literacy' : 'Mathematics or Mathematical Literacy'));
  return {
    id: c.id, name: c.name, labels: labels, why: c.why,
    eitherMaths: c.labels.indexOf('Mathematics or Mathematical Literacy') !== -1,
    core: [lrShort(maths), 'Home Language and First Additional Language', 'Life Orientation'],
    electives: c.labels.filter(function(x){ return !lrIsMaths(x); }).map(lrShort),
  };
}

// The verdict beside each subject. Recommended = a strong match on every side;
// "May require more effort" = high interest with results still developing, or
// lower natural alignment; everything in between is worth a conversation.
function lrRecommend(r, overall){
  const k = r.category.key;
  if(k === 'lower' || k === 'foundation') return { key:'effort', label:'May require more effort' };
  if(k === 'strong' && !overall.capped) return { key:'rec', label:'Recommended' };
  return { key:'consider', label:'Consider' };
}

// One row of the Subject Fit table.
function lrFitRow(r, extra){
  const academic = lrLevel(r.academic.score, 'academic'), interest = lrLevel(r.interest.normalised), personality = lrLevel(r.personality.score);
  const overall = Object.assign({ score: r.fit.overall }, lrOverall(r.fit.overall, [academic, interest, personality]));
  return {
    id: r.id, label: lrShort(r.label), extra: extra || null, category: r.category.key,
    academic: Object.assign({ score: r.academic.score }, academic),
    interest: Object.assign({ score: r.interest.normalised }, interest),
    personality: Object.assign({ score: r.personality.score }, personality),
    overall: overall,
    rec: lrRecommend(r, overall),
    // "build the foundation" / "academically strong -- check your interest" are worth a word.
    note: r.category.key === 'foundation' ? 'High interest — build the foundation'
        : (r.category.key === 'academic' ? 'Academically strong — check your interest' : null),
  };
}

// The subjects a Grade 10-12 learner is actually taking, as Subject Choice ids.
function lrOwnSubjectIds(l){
  const out = [];
  const add = function(n){ const id = SC_CAREER_SUBJECT_IDS[n]; if(id && out.indexOf(id) === -1) out.push(id); };
  (l.subjects || []).forEach(add);
  if(l.mathType === 'Mathematics') add('Mathematics'); else if(l.mathType === 'MathLit') add('Mathematical Literacy');
  return out;
}

// Broad career areas that match BOTH the learner's personality (the same
// alignment the Career Pathways page uses) and the recommended subjects.
function lrCareerAreas(l, matches, comboIds){
  if(!l.assessmentCompletedAt || !matches.length) return { ready:false, list:[], haveCombo:false };
  const comboSet = {}; (comboIds || []).forEach(function(id){ comboSet[id] = true; });
  const haveCombo = Object.keys(comboSet).length > 0;
  const byFac = {};
  matches.forEach(function(m){ (byFac[m.career.faculty] || (byFac[m.career.faculty] = [])).push(m); });
  const all = [];
  FACULTIES.forEach(function(f){
    const ms = byFac[f.id] || [];
    if(!ms.length) return;
    const alignment = lrAvg(ms.map(function(m){ return m.eval.interestFit; }));
    let covered = 0;
    const drawn = {}, missing = {};
    ms.forEach(function(m){
      const req = lrCareerSubjectIds(m.career.requiredSubjects), rec = lrCareerSubjectIds(m.career.recommendedSubjects);
      if(req.every(function(id){ return comboSet[id]; })) covered++;
      req.concat(rec).forEach(function(id){ if(comboSet[id]) drawn[id] = (drawn[id] || 0) + 1; });
      req.forEach(function(id){ if(!comboSet[id]) missing[id] = (missing[id] || 0) + 1; });
    });
    const coverage = covered / ms.length;
    const need = Math.max(1, Math.ceil(ms.length * 0.4));
    const byCount = function(map){ return function(a, b){ return map[b] - map[a]; }; };
    all.push({
      faculty: f, alignment: alignment, coverage: coverage,
      score: haveCombo ? 0.5 * alignment + 0.5 * coverage * 100 : alignment,
      draws: Object.keys(drawn).sort(byCount(drawn)).slice(0, 3).map(function(id){ return lrShort(SC_SUBJECTS[id].label); }),
      gaps: Object.keys(missing).filter(function(id){ return missing[id] >= need; }).sort(byCount(missing)).slice(0, 2).map(function(id){ return lrShort(SC_SUBJECTS[id].label); }),
      // Same order as the Career Matches page (matches is already in that order).
      careers: ms.slice(0, 3).map(function(m){ return { id: m.career.id, name: m.career.name }; }),
      label: alignmentLabel(alignment),
    });
  });
  all.sort(function(a, b){ return b.score - a.score; });
  const good = all.filter(function(a){ return a.score >= 50; });
  const list = (good.length >= LR_CONFIG.careerAreas.min ? good : all).slice(0, LR_CONFIG.careerAreas.max);
  return { ready: true, list: list, haveCombo: haveCombo };
}

// Where the learner is likely to thrive, in one honest sentence.
function lrThrive(rows){
  // Exactly the subjects the table marks "Recommended", so the two can never disagree.
  const strong = rows.filter(function(r){ return r.rec.key === 'rec'; }).slice(0, 3);
  if(strong.length){
    const hasMarks = strong.every(function(r){ return r.academic.key !== 'na'; });
    return 'You are likely to thrive in ' + scJoin(strong.map(function(r){ return r.label; })) + ', where ' + (hasMarks ? 'your interests, working style and results' : 'your interests and working style') + ' line up well.';
  }
  const best = rows.slice(0, 2);
  return best.length ? 'Your closest matches are ' + scJoin(best.map(function(r){ return r.label; })) + ' — worth exploring what each involves day to day before you decide.' : null;
}
// Where extra effort may be needed: results first (the subjects the table marks
// "build the foundation", or whose results are Developing), then interest. (The
// practice tips themselves are next steps, so they are not repeated here.)
function lrEffort(rows, rep){
  const out = [];
  const dev = rows.filter(function(r){ return r.academic.key === 'l' || r.category === 'foundation'; });
  const tips = (rep && rep.workOnTips) || [];
  if(dev.length){
    out.push(scJoin(dev.slice(0, 3).map(function(r){ return r.label; })) + ' may need regular practice at first — your current results in the areas ' + (dev.length === 1 ? 'it builds' : 'they build') + ' on are still developing.');
  } else if(tips.length){
    out.push('Some of your results are still developing in areas these subjects build on — a little regular practice will help.');
  }
  rows.filter(function(r){ return (r.category === 'lower' || r.interest.key === 'l' || r.personality.key === 'l') && dev.indexOf(r) === -1; }).slice(0, 1).forEach(function(r){
    out.push(r.label + ' shows less alignment with what you enjoy — think about whether you would enjoy it for three years.');
  });
  if(out.length) return out.slice(0, 2);
  const hasMarks = rows.some(function(r){ return r.academic.key !== 'na'; });
  return [hasMarks
    ? 'Nothing in your recommended subjects stands out as needing extra effort right now — keep up your regular study habits.'
    : 'Add your Grade 9 marks to see where extra effort could help.'];
}
// For a learner without a Subject Choice report (other grades, or not done yet):
// the same two questions answered from their career areas and results.
function lrThriveAreas(areas){
  const strong = areas.filter(function(a){ return a.label.t === 'Strong Alignment'; }).slice(0, 2);
  const pick = strong.length ? strong : areas.slice(0, 2);
  return pick.length ? 'You are likely to thrive in ' + scJoin(pick.map(function(a){ return a.faculty.name; })) + ', where your interests line up ' + (strong.length ? 'strongly' : 'well') + ' with the work.' : null;
}
function lrEffortGeneral(academic, canAddMarks){
  if(academic.has){
    return academic.toStrengthen.length
      ? ['Your current ' + scJoin(academic.toStrengthen.map(function(e){ return e.subject; })) + ' results are still developing — regular practice keeps more pathways open.']
      : ['None of your entered results is below ' + LR_CONFIG.weakBelow + '% — keep up your regular study habits.'];
  }
  return canAddMarks ? ['Add your marks to see where extra effort could help.'] : [];
}

// 2-3 things to do before choosing subjects: gaps in the report first, then
// the personalised tips, then the two steps that always apply.
function lrNextSteps(l, ctx){
  const steps = [];
  const go = function(label, route){ return { label: label, onclick: "navigate('" + route + "')" }; };
  if(!ctx.p) steps.push({ text:'Take the personality assessment — it unlocks your personality type, subject fit and career areas.', action: go('Take the personality assessment', 'assessment') });
  if(ctx.grade9 && ctx.p && !ctx.rep){
    if(!hasEnteredResults(l)) steps.push({ text:'Add your Grade 9 report marks so we can see how ready you are for each subject.', action: go('Enter my Grade 9 results', 'grade9-report') });
    else steps.push({ text:'Take the Subject Choice Assessment to see how each Grade 10 subject fits you.', action: go('Take the Subject Choice Assessment', 'subject-choice') });
  }
  if(ctx.grade9 && ctx.rep && !ctx.rep.ready.results) steps.push({ text:'Add your Grade 9 report marks to see how ready you are for each subject — until then this report uses your interests and working style only.', action: go('Enter my Grade 9 results', 'grade9-report') });
  const top = ctx.p ? computePathwayMatches(l)[0] : null;
  const conflict = top && top.alignment != null ? subjectConflictForFaculty(l, top.faculty.id) : null;
  if(conflict && conflict.hasConflict) steps.push({ text:'Discuss your subject choice with a teacher, parent or career adviser before finalising it.' });
  if(ctx.rep && ctx.rep.workOnTips && ctx.rep.workOnTips.length) steps.push({ text: ctx.rep.workOnTips[0] });
  steps.push({ text: 'Talk this report through with your Life Orientation teacher, a subject counsellor or a parent.' });
  steps.push({ text: ctx.grade9
    ? 'Check which subject combinations your school offers, and the subject and APS requirements of the careers you like.'
    : 'Check the admission requirements of the careers you like, and which subjects they rely on.' });
  if(ctx.rep) steps.push({ text: 'See which careers your recommended subjects keep open on the Career Matches page.', action: go('See career matches', 'matches') });
  return steps.slice(0, LR_CONFIG.nextSteps);
}

/* ---------------- the model ---------------- */
// The header band and info bar: who the report is for, and what it is called.
function lrMeta(l, grade9){
  return {
    name: (typeof ME !== 'undefined' && ME && ME.name) ? ME.name : 'You',
    grade: l.grade ? String(l.grade) : null,
    school: l.school || null,
    date: new Date().toLocaleDateString('en-ZA', { year:'numeric', month:'long', day:'numeric' }),
    title: grade9 ? 'Grade 9 Subject Choice Report' : (l.grade ? 'Grade ' + l.grade + ' Career Report' : 'Career Report'),
  };
}
function buildLearnerReport(l){
  const grade9 = isGrade9Learner(l);
  const src = reportSubjectSource(l);
  const rep = src.kind === 'assessment' ? src.report : null;
  const p = personalityTypeInfo(l);
  const matches = l.assessmentCompletedAt ? bestSuitedCareers(l, CAREERS.length) : [];
  const academic = lrAcademic(l);
  const profile = lrProfile(l, rep);
  const R = { grade9: grade9, mode: rep ? 'subjects' : 'general', src: src.kind, meta: lrMeta(l, grade9), profile: profile, academic: academic };

  // ---- 3 + 4: subject fit and the recommended combination (Grade 9, report done)
  let rows = [], comboIds = [], best = null, alt = null, also = [];
  if(rep){
    const pair = lrCombos(rep);
    if(pair.best){
      const byId = {}; rep.results.forEach(function(r){ byId[r.id] = r; });
      best = lrComboView(pair.best, rep); alt = pair.alt ? lrComboView(pair.alt, rep) : null;
      comboIds = pair.best.subjects.slice();
      // "Mathematics or Maths Literacy" is an open question: show both rows, each its own scores.
      const ids = [];
      const add = function(id){ if(byId[id] && ids.indexOf(id) === -1) ids.push(id); };
      pair.best.subjects.forEach(function(id){
        add(id);
        if(best.eitherMaths && (id === 'mathematics' || id === 'mathematicalLiteracy')){ add('mathematics'); add('mathematicalLiteracy'); comboIds = comboIds.concat(['mathematics', 'mathematicalLiteracy']); }
      });
      if(pair.alt) pair.alt.subjects.forEach(add);
      rows = ids.slice(0, LR_CONFIG.fitRows).map(function(id){
        const isAlt = pair.best.subjects.indexOf(id) === -1 && !(best.eitherMaths && (id === 'mathematics' || id === 'mathematicalLiteracy'));
        return lrFitRow(byId[id], isAlt ? 'alternative' : null);
      });
      // Best match first (stable: equal scores keep the combination's own order).
      rows = rows.map(function(r, i){ return { r: r, i: i }; })
        .sort(function(a, b){ return ((b.r.overall.score || 0) - (a.r.overall.score || 0)) || (a.i - b.i); })
        .map(function(x){ return x.r; });
      // Strong matches that are not in either combination: say so, instead of leaving them out silently.
      also = rep.top.filter(function(r){ return ids.indexOf(r.id) === -1; }).slice(0, 2).map(function(r){ return lrShort(r.label); });
    } else {
      // No combination could be built: fall back to the strongest individual matches.
      rows = rep.top.slice(0, LR_CONFIG.fitRows).map(function(r){ return lrFitRow(r); });
      comboIds = rep.top.slice(0, 3).map(function(r){ return r.id; });
    }
  }
  R.fit = { rows: rows, also: also, rep: !!rep, state: rep ? 'ready' : (src.kind === 'needsPersonality' ? 'needsPersonality' : (grade9 ? 'needsSubjectChoice' : 'general')) };
  R.combo = { best: best, alt: alt, rep: !!rep, mathLine: rep ? scMathLeanLabel(rep.mathChoice) : null, state: R.fit.state };
  if(!rep && !grade9){
    // Not a Grade 9 learner: the subjects their best careers rely on stand in for Subject Fit.
    const tiers = buildSubjectRelevanceTiers(l), list = [];
    ['required', 'strongly', 'useful'].forEach(function(t){ tiers[t].forEach(function(s){ list.push({ subject: lrShort(s.subject), tier: SUBJECT_TIER_META[t].label }); }); });
    R.fit.provisional = list.slice(0, 6);
    // Career areas are then judged against the subjects they are really taking.
    const own = lrOwnSubjectIds(l);
    if(own.length) comboIds = own;
  }

  // ---- 5: career areas (judged against the recommended subjects, or the learner's own)
  R.areas = lrCareerAreas(l, matches, comboIds);
  R.areas.basis = !R.areas.haveCombo ? 'none' : (rep ? 'recommended' : 'current');

  // ---- 6: conclusion and next steps
  const ctx = { l: l, p: p, rep: rep, grade9: grade9 };
  const bestRows = rows.filter(function(r){ return !r.extra; });   // the recommendation, not the alternative
  R.final = {
    thrive: rows.length ? lrThrive(bestRows) : lrThriveAreas(R.areas.list),
    effort: rows.length ? lrEffort(bestRows, rep) : lrEffortGeneral(academic, !l.exploringOnly),
    steps: lrNextSteps(l, ctx),
  };

  // ---- the headline table
  R.summary = lrSummary(l, { p: p, rep: rep, best: best, pairBest: rep ? lrCombos(rep).best : null, rows: rows, academic: academic, matches: matches, grade9: grade9 });
  return R;
}

// The five-line headline. With a finished Subject Choice report: best-fit
// subjects + three alignment words + the overall recommendation. Otherwise:
// whatever is known so far, with a prompt for what is missing.
function lrSummary(l, c){
  const rows = [];
  const text = function(area, result){ return { area: area, kind:'text', result: result }; };
  const level = function(area, lv, note){ return { area: area, kind:'level', level: lv, note: note || null }; };
  if(c.rep && c.pairBest){
    const res = c.pairBest.subjects.map(function(id){ return c.rep.results.filter(function(r){ return r.id === id; })[0]; }).filter(Boolean);
    const academic = lrAvg(res.map(function(r){ return r.academic.score; }));
    const noMarks = academic == null;
    const acLv = lrLevel(academic, 'academic');
    const inLv = lrLevel(lrAvg(res.map(function(r){ return r.interest.normalised; })));
    const peLv = lrLevel(lrAvg(res.map(function(r){ return r.personality.score; })));
    const overall = lrOverall(lrAvg(res.map(function(r){ return r.fit.overall; })), [acLv, inLv, peLv]);
    let note = null;
    if(overall.capped) note = acLv.key === 'l' ? 'Your interests and working style fit well — your current results are still developing.' : 'One part of this fit is lower than the others — see Subject Fit below.';
    else if(noMarks) note = 'Based on your interests and working style so far.';
    rows.push(text('Best-fit subjects', c.best.labels.join(', ')));
    rows.push(level('Academic readiness', acLv, noMarks ? 'Add your Grade 9 marks to see this.' : null));
    rows.push(level('Interest alignment', inLv));
    rows.push(level('Personality alignment', peLv));
    rows.push({ area: 'Overall recommendation', kind:'fit', fit: overall, note: note });
    return { complete: true, rows: rows };
  }
  if(c.p) rows.push(text('Personality type', c.p.code + ' — ' + c.p.top.map(function(t){ return t.name; }).join(' · ')));
  if(c.matches.length) rows.push(text('Best-suited careers', c.matches.slice(0, 3).map(function(m){ return m.career.name; }).join(', ')));
  if(c.academic.has) rows.push(level('Academic readiness', lrLevel(c.academic.average, 'academic'), 'Average of your entered results.'));
  if(c.grade9) rows.push({ area:'Best-fit subjects', kind:'todo', result: !c.p ? 'Take the personality assessment first' : 'Take the Subject Choice Assessment to see them' });
  return { complete: false, rows: rows };
}

/* ============================================================
   Drawing it. Everything below reads the object buildLearnerReport()
   returns -- no scoring, no new wording rules -- and is used for both
   the on-screen report and the printed copy. The layout follows the
   owner's mock-up; the colours are the iroli brand's (see .rp in
   style.css): the logo's blue -> violet -> pink gradient, in five steps.
   ============================================================ */

// One icon per personality trait and per career area (icons.js).
const LR_TRAIT_ICON = { analytical:'brain', investigative:'search', creative:'bulb', organised:'checklist', people:'users', persuasive:'flag', practical:'gear', reflective:'eye' };
const LR_AREA_ICON = { engineering:'gear', ict:'laptop', health:'stethoscope', natsci:'flask', built:'building', agri:'leaf', finance:'chart', business:'briefcase', humanities:'globe', 'law-public':'scale', education:'cap', 'media-arts':'spark', tourism:'compass', trades:'wrench', sport:'trophy' };

function lrButton(label, onclick, cls){ return `<button class="btn ${cls || 'btn-ghost'} btn-sm" onclick="${onclick}">${esc(label)}</button>`; }
function rpBar(v){ return `<span class="rp-bar" aria-hidden="true"><i style="width:${Math.max(3, Math.min(100, Math.round(v)))}%"></i></span>`; }
function rpPct(v){ return v == null || isNaN(v) ? '—' : Math.round(v) + '%'; }
// A prompt inside a section (text is trusted markup written in this file).
function rpEmpty(text, label, onclick){
  return `<div class="rp-empty"><p>${text}</p>${label ? lrButton(label, onclick, 'btn-primary') : ''}</div>`;
}
// Which of the five brand steps (blue ... pink) each section takes: always
// from blue to pink, however many sections this learner's report has.
function rpTones(n){
  const out = [];
  for(let i = 0; i < n; i++) out.push(n === 1 ? 1 : Math.round(1 + i * 4 / (n - 1)));
  return out;
}

function rpSection(o){
  const badge = o.n == null ? icon(o.icon || 'compass', 'rp-ic') : o.n;
  return `
  <section class="rp-sec rp-t${o.tone} ${o.cls || ''}" aria-labelledby="${o.id}">
    <div class="rp-sechead"><span class="rp-num" aria-hidden="true">${badge}</span><div class="rp-sectext"><h2 id="${o.id}">${esc(o.title)}</h2>${o.sub ? `<p>${esc(o.sub)}</p>` : ''}</div></div>
    <div class="rp-secbody">${o.body}</div>
  </section>`;
}

// The branded header band.
function rpHeadHTML(R){
  const m = R.meta;
  return `
  <header class="rp-head">
    <div class="rp-brand">
      <span class="rp-logo"><img src="assets/logo-wordmark.png" alt="iroli"/></span>
      <p class="rp-tag">Discover your path.<br>Choose with confidence.</p>
    </div>
    <div class="rp-titleblock">
      <h1 class="rp-title">${esc(m.title)}</h1>
      <p class="rp-motto">Insights today. More opportunities tomorrow.</p>
    </div>
  </header>`;
}
// Name / grade / school / date, on the white sheet under the header.
function rpInfoHTML(R){
  const m = R.meta;
  const cells = [['Name', m.name], ['Grade', m.grade], ['School', m.school], ['Date', m.date]].filter(function(c){ return c[1]; });
  return `<dl class="rp-info">${cells.map(function(c){ return `<div><dt>${esc(c[0])}</dt><dd>${esc(c[1])}</dd></div>`; }).join('')}</dl>`;
}

// A learner with nothing done yet: where to begin, instead of empty sections.
function rpStartHTML(R, idp){
  const steps = [['Take the personality assessment', 'Shows your personality type, interests and best-suited careers.', "navigate('assessment')"]];
  if(R.grade9){
    steps.push(['Enter your Grade 9 report results', 'So we can see how ready you are for each subject.', "navigate('grade9-report')"]);
    steps.push(['Take the Subject Choice Assessment', 'Shows which Grade 10 subjects fit you best.', "navigate('subject-choice')"]);
  }
  return rpSection({
    id: idp + '-start', n: null, icon: 'compass', tone: 1, title: 'Start here',
    sub: 'Your report builds as you go. ' + (steps.length > 1 ? steps.length + ' quick steps unlock it.' : 'One quick step unlocks it.'),
    body: `<ol class="rp-startlist">${steps.map(function(x){ return `<li><div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>${lrButton('Start', x[2], 'btn-primary')}</li>`; }).join('')}</ol>`,
  });
}

/* ---- 1: profile ---- */
function rpProfileHTML(R){
  const pr = R.profile;
  if(!pr.available) return rpEmpty('Take the personality assessment to see your key traits, your interests and how you tend to work.', 'Take the personality assessment', "navigate('assessment')");
  const traits = pr.traits.map(function(t, i){
    return `<li class="rp-t${i + 1}"><span class="rp-dot">${icon(LR_TRAIT_ICON[t.id] || 'spark', 'rp-ic')}</span><span>${esc(t.word)}</span></li>`;
  }).join('');
  const bars = pr.interests.map(function(x, i){
    return `<li class="rp-t${i + 1}"><span class="rp-iname">${esc(x.name)}</span>${rpBar(x.score)}<b class="rp-ipct">${rpPct(x.score)}</b></li>`;
  }).join('');
  return `
  <div class="rp-profile">
    <div class="rp-pcol">
      <h3 class="rp-h3">Your key traits</h3>
      <ul class="rp-traits">${traits}</ul>
      ${pr.learn ? `<div class="rp-learn"><span class="rp-learn-ic">${icon('cap', 'rp-ic')}</span><div><h3 class="rp-h3">How you learn best</h3><p>${esc(pr.learn)}</p><small>Read from your personality and work-style answers.</small></div></div>` : ''}
    </div>
    <div class="rp-pcol rp-pint">
      <h3 class="rp-h3">Your interests</h3>
      <ul class="rp-ibars">${bars}</ul>
      <p class="rp-type">Your personality type: <b>${esc(pr.code)}</b> — ${esc(pr.names.join(' · '))}</p>
    </div>
  </div>`;
}

/* ---- 2: subject fit (with the academic snapshot beneath it) ---- */
function rpAcademicHTML(R, l){
  const a = R.academic;
  if(!a.has){
    const entry = resultsEntryLinkHTML(l);
    return entry ? `<p class="rp-foot">Enter your ${entry} to see your strongest results and the areas to strengthen here.</p>` : '';
  }
  const pct = function(e){ return e.subject + ' ' + e.pct + '%'; };
  return `
  <div class="rp-acad">
    <div><span class="rp-k">Strongest results</span> ${esc(a.strongest.map(pct).join(' · '))}</div>
    <div><span class="rp-k">To strengthen</span> ${a.toStrengthen.length ? esc(a.toStrengthen.map(pct).join(' · ')) : 'None below ' + LR_CONFIG.weakBelow + '% — nice work.'}</div>
    <small>Based on ${esc(a.source)}.</small>
  </div>`;
}

function rpFitTableHTML(R){
  const f = R.fit, W = SC_CONFIG.weights, pc = function(x){ return Math.round(x * 100); };
  const cell = function(m, cls, label){
    return `<td data-label="${label}"><div class="rp-cell ${cls}">${m.score == null ? '<span class="rp-nodata">No marks yet</span>' : rpBar(m.score) + '<b class="rp-pct">' + rpPct(m.score) + '</b>'}</div></td>`;
  };
  const rows = f.rows.map(function(r){
    return `<tr>
      <th scope="row" class="rp-subj"><span>${esc(r.label)}</span>${r.note ? `<small>${esc(r.note)}</small>` : ''}${r.extra ? '<small class="rp-alt">In the alternative combination</small>' : ''}</th>
      ${cell(r.academic, 'm-ac', 'Academic')}
      ${cell(r.interest, 'm-in', 'Interest')}
      ${cell(r.personality, 'm-pe', 'Personality')}
      <td class="rp-overall" data-label="Overall fit"><b class="rp-ov rp-ov-${r.overall.key}">${rpPct(r.overall.score)}</b></td>
      <td class="rp-recwrap" data-label="Recommendation"><span class="rp-chip rp-chip-${r.rec.key}">${esc(r.rec.label)}</span></td>
    </tr>`;
  }).join('');
  return `
  <table class="rp-table">
    <thead><tr>
      <th scope="col">Subject</th>
      <th scope="col" class="h-ac">Academic Readiness</th>
      <th scope="col" class="h-in">Interest Alignment</th>
      <th scope="col" class="h-pe">Personality Alignment</th>
      <th scope="col">Overall Fit</th>
      <th scope="col">Recommendation</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${f.also.length ? `<p class="rp-foot">Also scoring well: ${esc(f.also.join(', '))}.</p>` : ''}
  <p class="rp-foot">Overall fit blends interest (${pc(W.interest)}%), personality alignment (${pc(W.personality)}%) and academic readiness (${pc(W.academic)}%).${R.combo.mathLine ? ' Mathematics or Mathematical Literacy: ' + esc(lrLower(R.combo.mathLine)) + '.' : ''}</p>`;
}
function rpFitHTML(R, l){
  const f = R.fit;
  if(f.state === 'ready'){
    return rpFitTableHTML(R) + rpAcademicHTML(R, l) + `<div class="rp-actions">${lrButton('See the full subject-by-subject breakdown', "navigate('subject-choice')")}</div>`;
  }
  if(f.state === 'needsPersonality'){
    return rpEmpty('Your Subject Choice answers are saved. Take the personality assessment to see how each subject fits you — it only takes a few minutes.', 'Take the personality assessment', "navigate('assessment')") + rpAcademicHTML(R, l);
  }
  if(f.state === 'needsSubjectChoice'){
    return rpEmpty('The Subject Choice Assessment shows how each Grade 10 subject fits you — what you enjoy, how you like to work and how you are doing.', 'Take the Subject Choice Assessment', "navigate('subject-choice')") + rpAcademicHTML(R, l);
  }
  // other grades / exploring: the subjects their best careers lean on (not a personal ranking)
  if(f.provisional && f.provisional.length){
    return `
    <div class="rp-pills">${f.provisional.map(function(s){ return `<span class="rp-chip rp-chip-consider">${esc(s.subject)}</span>`; }).join('')}</div>
    <p class="rp-foot">These are the subjects your strongest career areas lean on — they describe the careers, not a personal ranking.</p>${rpAcademicHTML(R, l)}`;
  }
  return rpEmpty('Take the personality assessment to see which subjects your best-suited careers rely on.', 'Take the personality assessment', "navigate('assessment')") + rpAcademicHTML(R, l);
}

/* ---- 3: recommended subject combination ---- */
function rpComboCard(c, kind){
  if(!c) return '';
  const best = kind === 'best';
  const list = function(items){ return `<ul>${items.map(function(x){ return `<li>${esc(x)}</li>`; }).join('')}</ul>`; };
  return `
  <div class="rp-combo ${kind}">
    <div class="rp-combo-h"><span class="rp-sq">${icon(best ? 'check' : 'switch', 'rp-ic')}</span><div><b>${best ? 'Best-fit combination' : 'Alternative combination'}</b><small>${esc(c.name)}</small></div></div>
    <div class="rp-combo-b">
      <h4>Core subjects</h4>${list(c.core)}
      ${c.electives.length ? `<h4>${best ? 'Recommended electives' : 'Electives'}</h4>${list(c.electives)}` : ''}
      <p class="rp-why">${esc(c.why)}</p>
    </div>
  </div>`;
}
function rpComboHTML(R){
  const c = R.combo;
  if(c.state !== 'ready'){
    return `<p class="rp-muted">Your best-fit combination, and one alternative, will appear here once you have taken the ${c.state === 'needsPersonality' ? 'personality' : 'Subject Choice'} assessment.</p>`;
  }
  if(!c.best) return `<p class="rp-muted">No subject combination stood out strongly this time — talk through the subjects above with your teacher.</p>`;
  return `
  <div class="rp-combos">${rpComboCard(c.best, 'best')}${c.alt ? rpComboCard(c.alt, 'alt') : ''}</div>
  <p class="rp-foot">Check which combinations your school offers.</p>`;
}

/* ---- 4: career pathways ---- */
function rpAreasHTML(R){
  const A = R.areas;
  if(!A.ready) return rpEmpty('Take the personality assessment to see which broad career areas fit you.', 'Take the personality assessment', "navigate('assessment')");
  return `<ul class="rp-areas">${A.list.map(function(a, i){
    const careers = a.careers.map(function(c){ return `<a href="#" onclick="navigate('career',{id:'${c.id}',from:{route:'report',param:'overview'}});return false;">${esc(c.name)}</a>`; }).join(', ');
    const uses = [
      A.basis !== 'none' && a.draws.length ? `<b>Builds on</b> ${esc(a.draws.join(', '))}` : '',
      a.gaps.length ? `<b>${A.basis === 'none' ? 'Typically needs' : 'Often also needs'}</b> ${esc(a.gaps.join(', '))}` : '',
    ].filter(Boolean).join(' · ');
    return `
    <li class="rp-area rp-t${i + 1}">
      <span class="rp-dot rp-dot-lg">${icon(LR_AREA_ICON[a.faculty.id] || 'compass', 'rp-ic')}</span>
      <div>
        <h3 title="${esc(a.faculty.overview)}">${esc(a.faculty.name)} <span class="badge ${a.label.c}">${esc(a.label.t)}</span></h3>
        <p><b>Careers to explore</b> ${careers}</p>
        ${uses ? `<p class="rp-areamore">${uses}</p>` : ''}
      </div>
    </li>`;
  }).join('')}</ul>`;
}

/* ---- 5: final recommendation, summary table and next steps ---- */
function rpFinalHTML(R){
  const f = R.final, S = R.summary;
  const concl = [];
  if(f.thrive) concl.push(['star', 'Where you are likely to thrive', [f.thrive]]);
  if(f.effort.length) concl.push(['flag', 'Where extra effort may be needed', f.effort]);
  const rows = S.rows.map(function(r){
    let val;
    if(r.kind === 'level') val = `<span class="rp-lv rp-lv-${r.level.key}">${esc(r.level.label)}</span>`;
    else if(r.kind === 'fit') val = `<span class="rp-chip rp-chip-fit rp-fit-${r.fit.key}">${esc(r.fit.word)}</span>`;
    else if(r.kind === 'todo') val = `<span class="rp-todo">${esc(r.result)}</span>`;
    else val = esc(r.result);
    return `<tr class="${r.kind === 'fit' ? 'rp-sum-main' : ''}"><th scope="row">${esc(r.area)}</th><td>${val}${r.note ? `<div class="rp-note">${esc(r.note)}</div>` : ''}</td></tr>`;
  }).join('');
  const steps = f.steps.map(function(s){ return `<li><span>${esc(s.text)}${s.action ? ` <span class="rp-act">${lrButton(s.action.label, s.action.onclick)}</span>` : ''}</span></li>`; }).join('');
  return `
  ${concl.length ? `<div class="rp-concl${concl.length === 1 ? ' rp-concl-one' : ''}">${concl.map(function(c){ return `<div class="rp-concl-i"><span class="rp-concl-ic">${icon(c[0], 'rp-ic')}</span><div><h3>${esc(c[1])}</h3>${c[2].map(function(t){ return `<p>${esc(t)}</p>`; }).join('')}</div></div>`; }).join('')}</div>` : ''}
  <div class="rp-final">
    <div class="rp-card rp-card-sum">
      <div class="rp-card-h"><span class="rp-sq">${icon('star', 'rp-ic')}</span><h3>${S.complete ? (R.grade9 ? 'Your subject choice summary' : 'Your summary') : 'Your summary so far'}</h3></div>
      <table class="rp-sumtable"><tbody>${rows}</tbody></table>
    </div>
    <div class="rp-card rp-card-steps">
      <div class="rp-card-h"><span class="rp-sq">${icon('clipboard', 'rp-ic')}</span><h3>Your next steps</h3></div>
      <ol class="rp-steps">${steps}</ol>
    </div>
  </div>
  <p class="rp-foot">${esc(SC_COPY.finalDecision)}</p>`;
}

// The whole report: header, then the sections that apply to this learner,
// numbered in order (a learner who is not choosing Grade 10 subjects has no
// "Recommended Subject Combination", so the numbers simply close up).
function learnerReportHTML(l, R, opts){
  opts = opts || {};
  const idp = opts.print ? 'rpp' : 'rps';
  const known = R.summary.rows.some(function(r){ return r.kind !== 'todo'; });
  let main;
  if(!known){
    main = rpStartHTML(R, idp);
  } else {
    const general = R.fit.state === 'general';
    const secs = [
      { key:'profile', title:'Your Learner Profile', sub:'How you naturally work, learn and what interests you.', body: rpProfileHTML(R) },
      { key:'fit', title: general ? 'Subjects Your Careers Rely On' : 'Subject Fit', cls:'rp-fit',
        sub: general ? 'The subjects your strongest career areas lean on.' : 'How well each subject matches your results, interests and personality.', body: rpFitHTML(R, l) },
    ];
    // Side by side only when there is a combination to show; otherwise each section stands alone, full width.
    const sideBySide = !general && R.combo.state === 'ready' && !!R.combo.best;
    if(!general) secs.push({ key:'combo', title:'Recommended Subject Combination', sub:'Your best-fit Grade 10 subjects based on your overall profile.', body: rpComboHTML(R), cls: sideBySide ? 'rp-half' : '' });
    const A = R.areas;
    secs.push({ key:'areas', title:'Career Pathways', cls: sideBySide ? 'rp-half' : '',
      sub: A.basis === 'recommended' ? 'Your recommended subjects can support these career areas.' : (A.basis === 'current' ? 'These career areas fit your personality and the subjects you are taking.' : 'These career areas fit your personality.'),
      body: rpAreasHTML(R) });
    secs.push({ key:'final', title:'Your Final Recommendation & Next Steps', sub:'A summary of your results and what to do next.', body: rpFinalHTML(R) });
    const tones = rpTones(secs.length);
    const html = secs.map(function(s, i){
      return rpSection({ id: idp + '-' + s.key, n: i + 1, tone: tones[i], title: s.title, sub: s.sub, body: s.body, cls: s.cls });
    });
    // The combination and the career areas sit side by side, as in the mock-up.
    const ci = secs.findIndex(function(s){ return s.key === 'combo'; });
    if(ci !== -1 && sideBySide) html.splice(ci, 2, `<div class="rp-duo">${html[ci]}${html[ci + 1]}</div>`);
    main = html.join('');
  }
  return `
  <article class="rp ${opts.print ? 'rp-print' : ''}" aria-label="${esc(R.meta.title)}">
    ${rpHeadHTML(R)}
    <div class="rp-main">
      ${rpInfoHTML(R)}
      ${main}
      ${disclaimerHTML()}
    </div>
  </article>`;
}

// Screen only: the longer views, one step away, for anyone who wants more.
function reportMoreDetailHTML(l, R){
  const links = [
    ['Career matches', "navigate('matches')"],
    R.fit.state === 'ready' ? ['Full subject breakdown', "navigate('subject-choice')"] : null,
    ['Career pathways', "navigate('report','pathways')"],
    ['Careers worth exploring', "navigate('report','careers')"],
    ['Academic strengths', "navigate('report','academic')"],
    ['Subjects & your intended subjects', "navigate('report','subjects')"],
    ['My profile', "navigate('report','profile')"],
    ['Full list of next steps', "navigate('report','next-steps')"],
  ].filter(Boolean);
  return `
  <div class="lr-more">
    <div class="lr-k">Want more detail?</div>
    <div class="lr-morelinks">${links.map(function(k){ return `<button class="chip-select" onclick="${k[1]}">${esc(k[0])}</button>`; }).join('')}</div>
  </div>`;
}
