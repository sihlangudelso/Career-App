/* ============================================================
   THE LEARNER REPORT -- one short report, six core sections.

   A headline summary table (best-fit subjects, academic readiness,
   interest alignment, personality alignment, overall recommendation),
   then:
     1  Learner Profile                    4  Recommended Subject Combination
     2  Academic Snapshot                  5  Career Pathways
     3  Subject Fit                        6  Final Recommendation & Action
   About 2-3 pages when printed -- a short report, not a psychometric one.

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
  careerAreas: { min: 3, max: 5 },  // broad career areas listed
  nextSteps: 3,                     // next steps listed
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

// How the learner tends to work, in the learner's own answers to the Grade 9
// work-style sliders: only the preferences they leaned clearly towards.
function lrWorkStyle(l){
  const ws = l.workStyle;
  if(!ws || typeof ws !== 'object') return null;
  const picks = [];
  let any = false;
  WORK_STYLE_QUESTIONS.forEach(function(q){
    if(ws[q.key] == null) return;
    const v = Number(ws[q.key]);
    if(isNaN(v)) return;
    any = true;
    const d = v - 50;
    if(Math.abs(d) >= 25) picks.push({ d: Math.abs(d), text: lrLower(d > 0 ? q.right : q.left) });
  });
  if(!any) return null;
  if(!picks.length) return 'Your answers show a flexible style — you can adapt to what a task needs.';
  picks.sort(function(a, b){ return b.d - a.d; });
  return 'You tend to prefer ' + scJoin(picks.slice(0, 3).map(function(p){ return p.text; })) + '.';
}
// The two clearest working-style traits (from the personality assessment).
function lrTraits(rep){
  if(!rep || !rep.traits) return null;
  const top = Object.keys(rep.traits)
    .filter(function(t){ return rep.traits[t] != null && rep.traits[t] >= 65 && SC_TRAITS[t]; })
    .sort(function(a, b){ return rep.traits[b] - rep.traits[a]; })
    .slice(0, 2);
  return top.length ? 'Your strongest working-style traits are ' + scJoin(top.map(function(t){ return SC_TRAITS[t].phrase; })) + '.' : null;
}
function lrInterests(l, rep){
  if(rep && rep.profile && rep.profile.summary && rep.profile.summary.length) return rep.profile.summary.slice(0, 2).join(' ');
  const doms = computeStrengthDomains(l).filter(function(d){ return d.hasEvidence; }).slice(0, 3);
  return doms.length ? 'You tend to enjoy ' + joinBlends(doms.map(function(d){ return d.domain.blend; })) + '.' : null;
}

function lrProfile(l, rep){
  const p = personalityTypeInfo(l);
  if(!p) return { available:false };
  return {
    available: true,
    code: p.code, names: p.top.map(function(t){ return t.name; }),
    personality: p.summary,
    interests: lrInterests(l, rep),
    work: [lrWorkStyle(l), lrTraits(rep)].filter(Boolean).join(' ') || null,
    strengths: p.strengths.map(function(s){ return s.label; }),
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
function lrComboView(c){
  const labels = c.labels.map(lrShort);
  return { id: c.id, name: c.name, labels: labels, fit: lrFit(c.score), why: c.why, eitherMaths: c.labels.indexOf('Mathematics or Mathematical Literacy') !== -1 };
}

// One row of the Subject Fit table.
function lrFitRow(r, extra){
  const academic = lrLevel(r.academic.score, 'academic'), interest = lrLevel(r.interest.normalised), personality = lrLevel(r.personality.score);
  return {
    id: r.id, label: lrShort(r.label), extra: extra || null,
    academic: Object.assign({ score: r.academic.score }, academic),
    interest: Object.assign({ score: r.interest.normalised }, interest),
    personality: Object.assign({ score: r.personality.score }, personality),
    overall: Object.assign({ score: r.fit.overall }, lrOverall(r.fit.overall, [academic, interest, personality])),
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
  const strong = rows.filter(function(r){ return r.overall.key === 's'; }).slice(0, 3);
  if(strong.length){
    const hasMarks = strong.every(function(r){ return r.academic.key !== 'na'; });
    return 'You are likely to thrive in ' + scJoin(strong.map(function(r){ return r.label; })) + ', where ' + (hasMarks ? 'your interests, working style and results' : 'your interests and working style') + ' line up well.';
  }
  const best = rows.slice(0, 2);
  return best.length ? 'Your closest matches are ' + scJoin(best.map(function(r){ return r.label; })) + ' — worth exploring what each involves day to day before you decide.' : null;
}
// Where extra effort may be needed: results first, then interest. (The practice
// tips themselves are next steps, so they are not repeated here.)
function lrEffort(rows, rep){
  const out = [];
  const dev = rows.filter(function(r){ return r.academic.key === 'l'; });
  const tips = (rep && rep.workOnTips) || [];
  if(dev.length){
    out.push(scJoin(dev.slice(0, 3).map(function(r){ return r.label; })) + ' may need regular practice at first — your current results in the areas ' + (dev.length === 1 ? 'it builds' : 'they build') + ' on are still developing.');
  } else if(tips.length){
    out.push('Some of your results are still developing in areas these subjects build on — a little regular practice will help.');
  }
  rows.filter(function(r){ return (r.interest.key === 'l' || r.personality.key === 'l') && r.academic.key !== 'l'; }).slice(0, 1).forEach(function(r){
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
function buildLearnerReport(l){
  const grade9 = isGrade9Learner(l);
  const src = reportSubjectSource(l);
  const rep = src.kind === 'assessment' ? src.report : null;
  const p = personalityTypeInfo(l);
  const matches = l.assessmentCompletedAt ? bestSuitedCareers(l, CAREERS.length) : [];
  const academic = lrAcademic(l);
  const profile = lrProfile(l, rep);
  const R = { grade9: grade9, mode: rep ? 'subjects' : 'general', src: src.kind, profile: profile, academic: academic };

  // ---- 3 + 4: subject fit and the recommended combination (Grade 9, report done)
  let rows = [], comboIds = [], best = null, alt = null, also = [];
  if(rep){
    const pair = lrCombos(rep);
    if(pair.best){
      const byId = {}; rep.results.forEach(function(r){ byId[r.id] = r; });
      best = lrComboView(pair.best); alt = pair.alt ? lrComboView(pair.alt) : null;
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
   the on-screen report and the printed copy.
   ============================================================ */

function lrPill(lv){ return `<span class="lr-pill lr-${lv.key}">${esc(lv.label)}</span>`; }
function lrButton(label, onclick, cls){ return `<button class="btn ${cls || 'btn-ghost'} btn-sm" onclick="${onclick}">${esc(label)}</button>`; }

// The headline. The most important part of the report.
function lrSummaryHTML(R, l){
  const rows = R.summary.rows;
  // Nothing known yet (a "to do" prompt is not a result): say where to begin instead.
  if(!rows.some(function(r){ return r.kind !== 'todo'; })) return lrStartHereHTML(R, l);
  const body = rows.map(function(r){
    let val;
    if(r.kind === 'level') val = lrPill(r.level);
    else if(r.kind === 'fit') val = `<span class="lr-pill lr-fit lr-${r.fit.key}">${esc(r.fit.word)}</span>`;
    else if(r.kind === 'todo') val = `<span class="lr-todo">${esc(r.result)}</span>`;
    else val = esc(r.result);
    return `<tr class="${r.kind === 'fit' ? 'lr-overall' : ''}"><th scope="row">${esc(r.area)}</th><td>${val}${r.note ? `<div class="lr-note">${esc(r.note)}</div>` : ''}</td></tr>`;
  }).join('');
  return `
  <section class="lr-sum" aria-label="Summary">
    <h2>Your summary</h2>
    <table class="lr-sumtable"><tbody>${body}</tbody></table>
    <p class="lr-foot">${R.summary.complete ? 'Based on what you enjoy, how you like to work and how you are doing at school.' : 'What we know so far — the steps at the end of this report fill in the rest.'}</p>
  </section>`;
}
// A learner with nothing done yet: where to begin, instead of an empty table.
function lrStartHereHTML(R, l){
  const steps = [];
  steps.push(['Take the personality assessment', 'Shows your personality type, interests and best-suited careers.', "navigate('assessment')"]);
  if(R.grade9){
    steps.push(['Enter your Grade 9 report results', 'So we can see how ready you are for each subject.', "navigate('grade9-report')"]);
    steps.push(['Take the Subject Choice Assessment', 'Shows which Grade 10 subjects fit you best.', "navigate('subject-choice')"]);
  }
  return `
  <section class="lr-sum lr-start" aria-label="Start here">
    <h2>Start here</h2>
    <p class="page-sub" style="margin:0 0 12px;">Your report builds as you go. ${steps.length > 1 ? steps.length + ' quick steps unlock it:' : 'One quick step unlocks it:'}</p>
    <ol class="lr-startlist">${steps.map(function(s){ return `<li><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>${lrButton('Start', s[2], 'btn-primary')}</li>`; }).join('')}</ol>
  </section>`;
}

function lrProfileHTML(R){
  const pr = R.profile;
  if(!pr.available){
    return `<div class="card lr-card"><p class="page-sub" style="margin:0 0 10px;">Take the personality assessment to see your personality type, your interests and how you tend to work.</p>${lrButton('Take the personality assessment', "navigate('assessment')", 'btn-primary')}</div>`;
  }
  return `
  <div class="card lr-card">
    <div class="lr-type">
      <div class="lr-code" aria-label="Personality type ${esc(pr.code)}">${esc(pr.code)}</div>
      <div class="lr-typebody"><div class="lr-typenames">${esc(pr.names.join(' · '))}</div><p>${esc(pr.personality)}</p></div>
    </div>
    <dl class="lr-dl">
      ${pr.interests ? `<div><dt>Your interests</dt><dd>${esc(pr.interests)}</dd></div>` : ''}
      ${pr.work ? `<div><dt>How you tend to work</dt><dd>${esc(pr.work)}</dd></div>` : ''}
      ${pr.strengths.length ? `<div><dt>Your top strengths</dt><dd><div class="pill-list">${pr.strengths.map(function(s){ return `<span class="pill rec">${esc(s)}</span>`; }).join('')}</div></dd></div>` : ''}
    </dl>
  </div>`;
}

function lrAcademicHTML(R, l){
  const a = R.academic;
  if(!a.has){
    const entry = resultsEntryLinkHTML(l);
    return `<div class="card lr-card"><p class="page-sub" style="margin:0;">${entry ? 'Enter your ' + entry + ' to see your key results, strongest areas and areas to strengthen here.' : 'School marks are not needed to explore careers.'}</p></div>`;
  }
  const top = {}, low = {};
  a.strongest.forEach(function(e){ top[e.subject] = true; });
  a.toStrengthen.forEach(function(e){ low[e.subject] = true; });
  const pct = function(e){ return e.subject + ' (' + e.pct + '%)'; };
  return `
  <div class="card lr-card">
    <div class="lr-src">Based on ${esc(a.source)}</div>
    <div class="lr-bars ${a.entries.length > 6 ? 'many' : ''}" role="list">
      ${a.entries.map(function(e){
        const cls = top[e.subject] ? 'top' : (low[e.subject] ? 'low' : '');
        return `<div class="lr-bar ${cls}" role="listitem"><span class="lr-bn">${esc(e.subject)}</span><span class="lr-bt"><i style="width:${Math.max(2, Math.min(100, e.pct))}%"></i></span><span class="lr-bp">${e.pct}%</span></div>`;
      }).join('')}
    </div>
    <div class="grid grid-2 lr-two">
      <div><div class="lr-k">Strongest areas</div><div>${esc(a.strongest.map(pct).join(' · '))}</div></div>
      <div><div class="lr-k">Areas to strengthen</div><div>${a.toStrengthen.length ? esc(a.toStrengthen.map(pct).join(' · ')) : 'None below ' + LR_CONFIG.weakBelow + '% — nice work.'}</div></div>
    </div>
  </div>`;
}

function lrFitHTML(R, l){
  const f = R.fit;
  if(f.state === 'ready'){
    const W = SC_CONFIG.weights, p = function(x){ return Math.round(x * 100); };
    return `
    <div class="card lr-card">
      <table class="lr-table">
        <thead><tr><th scope="col">Subject</th><th scope="col">Academic readiness</th><th scope="col">Interest alignment</th><th scope="col">Personality alignment</th><th scope="col">Overall fit</th></tr></thead>
        <tbody>${f.rows.map(function(r){
          return `<tr>
            <td class="lr-subject" data-label="Subject"><b>${esc(r.label)}</b>${r.extra ? ' <span class="lr-tag">alternative</span>' : ''}${r.note ? `<div class="lr-note">${esc(r.note)}</div>` : ''}</td>
            <td data-label="Academic readiness">${lrPill(r.academic)}</td>
            <td data-label="Interest alignment">${lrPill(r.interest)}</td>
            <td data-label="Personality alignment">${lrPill(r.personality)}</td>
            <td data-label="Overall fit">${lrPill(r.overall)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>
      ${f.also.length ? `<p class="lr-foot">Also scoring well: ${esc(f.also.join(', '))}.</p>` : ''}
      <p class="lr-foot">Overall fit blends interest (${p(W.interest)}%), personality alignment (${p(W.personality)}%) and academic readiness (${p(W.academic)}%).${R.combo.mathLine ? ' Mathematics or Mathematical Literacy: ' + esc(lrLower(R.combo.mathLine)) + '.' : ''}</p>
      <div class="lr-actions">${lrButton('See the full subject-by-subject breakdown', "navigate('subject-choice')")}</div>
    </div>`;
  }
  if(f.state === 'needsPersonality'){
    return `<div class="card lr-card"><p style="margin:0 0 10px;">Your Subject Choice answers are saved. Take the personality assessment to see how each subject fits you — it only takes a few minutes.</p>${lrButton('Take the personality assessment', "navigate('assessment')", 'btn-primary')}</div>`;
  }
  if(f.state === 'needsSubjectChoice'){
    return `<div class="card lr-card"><p style="margin:0 0 10px;">The Subject Choice Assessment shows how each Grade 10 subject fits you — what you enjoy, how you like to work and how you are doing.</p>${lrButton('Take the Subject Choice Assessment', "navigate('subject-choice')", 'btn-primary')}</div>`;
  }
  // other grades / exploring: the subjects their best careers lean on (not a personal ranking)
  if(f.provisional && f.provisional.length){
    return `
    <div class="card lr-card">
      <div class="pill-list">${f.provisional.map(function(s){ return `<span class="pill rec">${esc(s.subject)}</span>`; }).join('')}</div>
      <p class="lr-foot">These are the subjects your strongest career areas lean on — they describe the careers, not a personal ranking.</p>
    </div>`;
  }
  return `<div class="card lr-card"><p class="page-sub" style="margin:0;">Take the personality assessment to see which subjects your best-suited careers rely on.</p></div>`;
}

function lrComboCard(c, kind){
  if(!c) return '';
  return `
  <div class="lr-combo ${kind}">
    <div class="lr-combo-h"><span class="lr-combo-k">${kind === 'best' ? 'Best-fit combination' : 'Alternative'}</span>${lrPill(c.fit)}</div>
    <div class="lr-combo-n">${esc(c.name)}</div>
    <div class="pill-list lr-combo-s">${c.labels.map(function(s){ return `<span class="pill rec">${esc(s)}</span>`; }).join('')}</div>
    <p class="lr-why">${esc(c.why)}</p>
  </div>`;
}
function lrComboHTML(R){
  const c = R.combo;
  if(c.state !== 'ready'){
    return `<div class="card lr-card"><p class="page-sub" style="margin:0;">Your best-fit combination, and one alternative, will appear here once you have taken the ${c.state === 'needsPersonality' ? 'personality' : 'Subject Choice'} assessment.</p></div>`;
  }
  if(!c.best) return `<div class="card lr-card"><p class="page-sub" style="margin:0;">No subject combination stood out strongly this time — talk through the subjects above with your teacher.</p></div>`;
  return `
  <div class="card lr-card">
    <div class="grid grid-2 lr-combos">${lrComboCard(c.best, 'best')}${c.alt ? lrComboCard(c.alt, 'alt') : ''}</div>
    <p class="lr-foot">You will also take Home Language, First Additional Language and Life Orientation. Check which combinations your school offers.</p>
  </div>`;
}

function lrAreasHTML(R){
  const A = R.areas;
  if(!A.ready){
    return `<div class="card lr-card"><p class="page-sub" style="margin:0 0 10px;">Take the personality assessment to see which broad career areas fit you.</p>${lrButton('Take the personality assessment', "navigate('assessment')", 'btn-primary')}</div>`;
  }
  const intro = A.basis === 'recommended' ? 'Broad areas that fit your personality and the subjects recommended above.'
    : (A.basis === 'current' ? 'Broad areas that fit your personality and the subjects you are taking.' : 'Broad areas that fit your personality.');
  return `
  <p class="page-sub lr-intro">${esc(intro)}</p>
  <div class="lr-areas">
  ${A.list.map(function(a){
    const careers = a.careers.map(function(c){ return `<a href="#" onclick="navigate('career',{id:'${c.id}',from:{route:'report',param:'overview'}});return false;">${esc(c.name)}</a>`; }).join(', ');
    return `
    <div class="card lr-area">
      <div class="lr-area-h"><b>${esc(a.faculty.name)}</b><span class="badge ${a.label.c}">${esc(a.label.t)}</span></div>
      <p class="lr-area-o">${esc(a.faculty.overview)}</p>
      ${A.basis !== 'none' && a.draws.length ? `<div class="lr-area-m"><span>${A.basis === 'recommended' ? 'Draws on your recommended subjects' : 'Draws on your subjects'}</span> ${esc(a.draws.join(', '))}</div>` : ''}
      ${a.gaps.length ? `<div class="lr-area-m"><span>${A.basis === 'none' ? 'Typically needs' : 'Often also needs'}</span> ${esc(a.gaps.join(', '))}</div>` : ''}
      <div class="lr-area-m"><span>Careers to explore</span> ${careers}</div>
    </div>`;
  }).join('')}
  </div>`;
}

function lrFinalHTML(R){
  const f = R.final;
  const steps = f.steps.map(function(s){ return `<li>${esc(s.text)}${s.action ? ` <span class="lr-act">${lrButton(s.action.label, s.action.onclick)}</span>` : ''}</li>`; }).join('');
  return `
  <div class="card lr-card lr-final">
    ${f.thrive ? `<div class="lr-fin"><div class="lr-k">Where you are likely to thrive</div><p>${esc(f.thrive)}</p></div>` : ''}
    ${f.effort.length ? `<div class="lr-fin"><div class="lr-k">Where you may need extra effort</div>${f.effort.map(function(e){ return `<p>${esc(e)}</p>`; }).join('')}</div>` : ''}
    <div class="lr-fin"><div class="lr-k">${R.grade9 ? 'Next steps before you choose your subjects' : 'Your next steps'}</div><ol class="lr-steps">${steps}</ol></div>
    <p class="lr-foot">${esc(SC_COPY.finalDecision)}</p>
  </div>`;
}

// The whole report: the summary, then the sections that apply to this learner,
// numbered in order (a learner who is not choosing Grade 10 subjects has no
// "Recommended Subject Combination", so the numbers simply close up).
function learnerReportHTML(l, R, opts){
  opts = opts || {};
  const secs = [];
  secs.push(['Learner Profile', lrProfileHTML(R)]);
  secs.push(['Academic Snapshot', lrAcademicHTML(R, l)]);
  secs.push([R.fit.state === 'general' ? 'Subjects Your Careers Rely On' : 'Subject Fit', lrFitHTML(R, l)]);
  if(R.fit.state !== 'general') secs.push(['Recommended Subject Combination', lrComboHTML(R)]);
  secs.push(['Career Pathways', lrAreasHTML(R)]);
  secs.push(['Final Recommendation & Action', lrFinalHTML(R)]);
  return `
  <div class="lr ${opts.print ? 'lr-print' : ''}">
    ${lrSummaryHTML(R, l)}
    ${secs.map(function(s, i){ return `<section class="lr-sec"><h2><span class="lr-n">${i + 1}</span>${esc(s[0])}</h2>${s[1]}</section>`; }).join('')}
    ${disclaimerHTML()}
  </div>`;
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
