/* ============================================================
   GRADE 9 SUBJECT CHOICE ASSESSMENT -- ENGINE (pure logic, no DOM)
   All numbers and wording you may want to tune are in
   js/subject_choice_config.js. Entry point for the UI:
   buildSubjectChoiceReport(learner).
   ============================================================ */

/* ---------------- small helpers ---------------- */
function scJoin(list){
  if(!list.length) return '';
  if(list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}
function scCap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function scPhrase(trait){ return SC_TRAIT_PHRASES[trait] || String(trait).toLowerCase(); }
function scMean(arr){ return arr.length ? arr.reduce(function(a, b){ return a + b; }, 0) / arr.length : null; }
function scLevel(score){
  if(score == null) return null;
  const L = SC_CONFIG.levels;
  return score >= L.high ? 'High' : (score >= L.moderate ? 'Moderate' : 'Low');
}
function scReadinessBand(score){
  if(score == null) return null;
  const bands = SC_CONFIG.readinessBands;
  return bands.find(function(b){ return score >= b.min; }) || bands[bands.length - 1];
}
function scAreaName(area){
  const names = { 'Economic and Management Sciences': 'EMS', 'Language': 'language', 'Overall': 'overall' };
  return names[area] || area;
}

/* ---------------- question order (anti-gaming shuffle) ---------------- */
function scHashString(s){
  let h = 2166136261;
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function scMulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Picks questions one at a time from a seeded random draw, never reusing a
// subject within SC_SHUFFLE_COOLDOWN questions (subjects with more questions
// left are favoured, so the extras don't pile up at the end). Questions
// about the same subject therefore never sit together. Same seed -> same
// order, so a resumed attempt looks identical.
const SC_SHUFFLE_COOLDOWN = 10;
function scBuildQuestionOrder(seed){
  const rand = scMulberry32(seed);
  const groups = {};
  SC_QUESTIONS.forEach(function(q){ (groups[q.primary] = groups[q.primary] || []).push(q.id); });
  const primaryOf = {};
  SC_QUESTIONS.forEach(function(q){ primaryOf[q.id] = q.primary; });
  const keys = Object.keys(groups);
  keys.forEach(function(k){
    const a = groups[k];
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
  });
  const lastUsed = {};
  keys.forEach(function(k){ lastUsed[k] = -1000; });
  const order = [];
  for(let step = 0; step < SC_QUESTIONS.length; step++){
    let cands = keys.filter(function(k){ return groups[k].length && step - lastUsed[k] > SC_SHUFFLE_COOLDOWN; });
    if(!cands.length){
      // Everything left is still cooling down: take whichever was used longest ago.
      const left = keys.filter(function(k){ return groups[k].length; });
      const oldest = Math.min.apply(null, left.map(function(k){ return lastUsed[k]; }));
      cands = left.filter(function(k){ return lastUsed[k] === oldest; });
    }
    let total = 0;
    const ws = cands.map(function(k){ const w = groups[k].length * groups[k].length; total += w; return w; });
    let r = rand() * total, pick = cands[cands.length - 1];
    for(let i = 0; i < cands.length; i++){ r -= ws[i]; if(r <= 0){ pick = cands[i]; break; } }
    order.push(groups[pick].shift());
    lastUsed[pick] = step;
  }
  // Safety net: if the tail ever forced two of the same subject together,
  // swap the later one with a question further along, as long as the swap
  // doesn't create a new clash at either end.
  function clashesAt(k){
    return (k > 0 && primaryOf[order[k]] === primaryOf[order[k - 1]]) ||
           (k < order.length - 1 && primaryOf[order[k]] === primaryOf[order[k + 1]]);
  }
  for(let i = 1; i < order.length; i++){
    if(primaryOf[order[i]] !== primaryOf[order[i - 1]]) continue;
    for(let j = i + 1; j < order.length; j++){
      let t = order[i]; order[i] = order[j]; order[j] = t;
      if(!clashesAt(i) && !clashesAt(j)) break;
      t = order[i]; order[i] = order[j]; order[j] = t;
    }
  }
  return order;
}

/* ---------------- A. interest ---------------- */
// answers: { questionId: 1..5 }. Returns, per subject, the raw weighted
// total, the minimum/maximum it could have been, and a 0-100 normalised
// score, plus which underlying traits drove it.
function calculateSubjectInterestScores(answers){
  const out = {};
  Object.keys(SC_SUBJECTS).forEach(function(id){
    out[id] = { raw: 0, min: 0, max: 0, weightSum: 0, count: 0, normalised: null, traits: {}, traitList: [] };
  });
  SC_QUESTIONS.forEach(function(q){
    const a = Number(answers && answers[q.id]);
    if(!(a >= 1 && a <= 5)) return;
    Object.keys(q.weights).forEach(function(sid){
      const w = q.weights[sid], o = out[sid];
      if(!o || !(w > 0)) return;
      o.raw += w * a; o.min += w; o.max += w * 5; o.weightSum += w; o.count++;
      // Only count a trait towards a subject that actually lists it, so a
      // lightly-weighted question from another subject can't headline the
      // explanation.
      if(SC_SUBJECTS[sid].interestTraits.indexOf(q.trait) !== -1){
        const t = o.traits[q.trait] || (o.traits[q.trait] = { sum: 0, w: 0 });
        t.sum += w * a; t.w += w;
      }
    });
  });
  Object.keys(out).forEach(function(id){
    const o = out[id];
    o.normalised = o.weightSum > 0 ? clamp((o.raw - o.min) / (o.max - o.min) * 100, 0, 100) : null;
    o.traitList = Object.keys(o.traits).map(function(label){
      const t = o.traits[label];
      return { trait: label, score: (t.sum / t.w - 1) / 4 * 100, weight: t.w };
    }).sort(function(a, b){ return b.score - a.score; });
  });
  return out;
}

/* ---------------- B. personality / work-style ---------------- */
// 0-100 score for each of the 8 traits, from the existing assessment data.
function scTraitScores(learner){
  const src = { riasec: learner.riasec || {}, strengths: learner.strengths || {}, workStyle: learner.workStyle || {} };
  const out = {};
  Object.keys(SC_TRAITS).forEach(function(tid){
    let num = 0, den = 0;
    SC_TRAITS[tid].sources.forEach(function(s){
      const raw = src[s.from] ? src[s.from][s.key] : null;
      const v = raw == null || raw === '' ? NaN : Number(raw);
      if(isNaN(v)) return;
      num += s.w * clamp(s.invert ? 100 - v : v, 0, 100); den += s.w;
    });
    out[tid] = den > 0 ? num / den : null;
  });
  return out;
}
function calculateSubjectPersonalityAlignment(learner){
  const traits = scTraitScores(learner);
  const subjects = {};
  Object.keys(SC_SUBJECTS).forEach(function(id){
    const pt = SC_SUBJECTS[id].personalityTraits || {};
    let num = 0, den = 0;
    const parts = [];
    Object.keys(pt).forEach(function(t){
      const s = traits[t];
      if(s == null) return;
      num += pt[t] * s; den += pt[t];
      parts.push({ trait: t, score: s, weight: pt[t] });
    });
    subjects[id] = den > 0 ? { score: num / den, parts: parts.sort(function(a, b){ return b.score - a.score; }) } : null;
  });
  return { traits: traits, subjects: subjects };
}

/* ---------------- C. academic readiness ---------------- */
function scMarkNum(v){
  if(v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : clamp(n, 0, 100);
}
const SC_CORE_AREAS = ['Home Language', 'First Additional Language', 'Mathematics', 'Natural Sciences', 'Social Sciences', 'Economic and Management Sciences', 'Technology', 'Creative Arts'];
// A learner's result for one Grade 9 learning area: current Grade 10+
// marks for the matching subjects if they have them, otherwise the Grade 9
// report. Never invented -- null when there is nothing to go on.
function scAreaPct(learner, area){
  if(SC_AREA_ALIASES[area]){
    const vals = SC_AREA_ALIASES[area].map(function(a){ return scAreaPct(learner, a); }).filter(function(v){ return v != null; });
    return scMean(vals);
  }
  if(area === 'Overall'){
    return scMean(SC_CORE_AREAS.map(function(a){ return scAreaPct(learner, a); }).filter(function(v){ return v != null; }));
  }
  const fet = learner.subjectMarks || {};
  const g9 = (learner.grade9Report && learner.grade9Report.subjects) || {};
  const fetVals = (GRADE9_TO_FET[area] || []).map(function(s){ return fet[s] ? scMarkNum(fet[s].pct) : null; }).filter(function(v){ return v != null; });
  if(fetVals.length) return scMean(fetVals);
  const direct = g9[area] ? scMarkNum(g9[area].pct) : null;
  if(direct != null) return direct;
  if(area === 'Social Sciences'){ // Geography/History entered separately
    const split = ['Geography', 'History'].map(function(k){ return g9[k] ? scMarkNum(g9[k].pct) : null; }).filter(function(v){ return v != null; });
    if(split.length) return scMean(split);
  }
  return null;
}
function calculateAcademicReadiness(learner){
  const out = {};
  Object.keys(SC_SUBJECTS).forEach(function(id){
    let num = 0, den = 0, totalW = 0;
    const used = [];
    (SC_SUBJECTS[id].academicInputs || []).forEach(function(inp){
      totalW += inp.w;
      const pct = scAreaPct(learner, inp.area);
      if(pct != null){ num += inp.w * pct; den += inp.w; used.push({ area: inp.area, pct: Math.round(pct), w: inp.w }); }
    });
    const coverage = totalW > 0 ? den / totalW : 0;
    const score = (den > 0 && coverage >= SC_CONFIG.minAcademicCoverage) ? num / den : null;
    out[id] = {
      score: score, band: scReadinessBand(score), inputs: score == null ? [] : used, coverage: coverage,
      weakAreas: score == null ? [] : used.filter(function(u){ return u.pct < SC_CONFIG.report.workOnBelow; }),
    };
  });
  return out;
}

/* ---------------- overall fit + category ---------------- */
// comp = { interest, personality, academic } (each 0-100 or null). Missing
// components are left out and the remaining weights re-scaled.
function calculateSubjectFit(comp){
  const W = SC_CONFIG.weights;
  let num = 0, den = 0;
  const basis = [];
  ['interest', 'personality', 'academic'].forEach(function(k){
    if(comp[k] != null){ num += W[k] * comp[k]; den += W[k]; basis.push(k); }
  });
  let naturalFit = null;
  if(comp.interest != null && comp.personality != null) naturalFit = (W.interest * comp.interest + W.personality * comp.personality) / (W.interest + W.personality);
  else naturalFit = comp.interest != null ? comp.interest : comp.personality;
  return { overall: den > 0 ? num / den : null, basis: basis, naturalFit: naturalFit, naturalFitLevel: scLevel(naturalFit) };
}
function classifySubjectRecommendation(comp){
  const C = SC_CONFIG.category;
  const i = comp.interest, p = comp.personality, a = comp.academic;
  const pAtLeast = function(min){ return p == null || p >= min; };
  const iAtLeast = function(min){ return i != null && i >= min; };
  let key = 'possible';
  if(iAtLeast(C.strong.interestMin) && pAtLeast(C.strong.personalityMin) && (a == null || a >= C.strong.academicMin)) key = 'strong';
  else if(iAtLeast(C.foundation.interestMin) && pAtLeast(C.foundation.personalityMin) && a != null && a < C.foundation.academicBelow) key = 'foundation';
  else if(a != null && a >= C.academic.academicMin && (i == null || i < C.academic.interestBelow)) key = 'academic';
  else if(i != null && i < C.lower.interestBelow && (p == null || p < C.lower.personalityBelow)) key = 'lower';
  return { key: key, label: SC_CATEGORIES[key].label, badge: SC_CATEGORIES[key].badge };
}

/* ---------------- feedback ---------------- */
function scInterestPhrases(res, which, n){
  const list = res.interest.traits;
  const pick = which === 'high'
    ? list.filter(function(t){ return t.score >= SC_CONFIG.profile.traitMin; })
    : list.slice().reverse().filter(function(t){ return t.score < 50; });
  return pick.slice(0, n).map(function(t){ return scPhrase(t.trait); });
}
function scPersonalityPhrase(res){
  const parts = res.personality.parts.filter(function(p){ return p.score >= 55; }).slice(0, 2);
  return parts.map(function(p){ return SC_TRAITS[p.trait].phrase; });
}
function scAcademicAreas(res){
  return scJoin(res.academic.inputs.slice().sort(function(a, b){ return b.w - a.w; }).map(function(i){ return scAreaName(i.area); }));
}
// e.g. "Mathematics results (84%)" or, when several marks are blended,
// "Mathematics and Natural Sciences results (averaging 45%)".
function scAcademicEvidence(res){
  const multi = res.academic.inputs.length > 1;
  return scAcademicAreas(res) + ' results (' + (multi ? 'averaging ' : '') + Math.round(res.academic.score) + '%)';
}
function scFoundationPhrase(band){
  if(band.key === 'strong' || band.key === 'good') return 'a solid foundation';
  if(band.key === 'reasonable') return 'a reasonable foundation';
  if(band.key === 'developing') return 'a foundation that is still developing';
  return 'a foundation that extra support could help build';
}
// Short fragments (no leading capital, no full stop) the sentences below
// are stitched from.
function scFragments(res){
  const lvlI = res.interest.level, lvlP = res.personality.level;
  const hi = scInterestPhrases(res, 'high', 2), lo = scInterestPhrases(res, 'low', 2);
  let interest;
  if(lvlI === 'High') interest = hi.length ? 'you enjoy ' + scJoin(hi) : 'you show strong interest in the kind of work this subject involves';
  else if(lvlI === 'Moderate') interest = hi.length ? 'you show some interest in ' + scJoin(hi) : 'you show some interest in this subject';
  else interest = lo.length ? 'your answers show less interest so far in ' + scJoin(lo) : 'your answers show less interest in this subject so far';
  const pp = scPersonalityPhrase(res);
  let personality;
  if(lvlP === 'High') personality = pp.length ? 'your working style (' + scJoin(pp) + ') suits how this subject is usually studied' : 'your working style suits how this subject is usually studied';
  else if(lvlP === 'Moderate') personality = 'your working style is partly aligned with this subject';
  else personality = 'your preferred way of working is a little different from how this subject is usually studied';
  let academic;
  const band = res.academic.band;
  if(!band) academic = 'we do not yet have a result that maps directly onto this subject';
  else {
    academic = 'your current ' + scAcademicEvidence(res) + ' suggest ' + scFoundationPhrase(band);
  }
  return { interest: interest, personality: personality, academic: academic };
}
function scThrive(res){
  const s = SC_SUBJECTS[res.id], label = s.label;
  const nf = res.fit.naturalFitLevel, band = res.academic.band;
  const tier = band ? band.tier : null;
  const weakNames = scJoin(res.academic.weakAreas.slice(0, 2).map(function(w){ return scAreaName(w.area); }));
  const hi = scInterestPhrases(res, 'high', 2);
  let explanation;
  if(nf === 'High'){
    if(tier === 'Strong') explanation = 'Your interests and working style are well aligned with ' + label + ', and your current results suggest you are well placed to feel comfortable in it.';
    else if(tier === null) explanation = 'Your interests and working style are well aligned with ' + label + '. We do not yet have marks that map onto it, so we cannot say how ready you are yet.';
    else explanation = (hi.length ? 'Your interest in ' + hi[0] + ' and your working style are' : 'Your interests and working style are') + ' well aligned with ' + label + '. However, your current ' + (weakNames ? weakNames + ' results' : 'results') + ' suggest some of the work may feel challenging at first. ' + s.foundationTip;
  } else if(nf === 'Moderate'){
    if(tier === 'Strong') explanation = 'Your results are strong for ' + label + '. Your interests and working style are only partly aligned with it, so it is worth finding out what the subject involves day to day.';
    else explanation = label + ' is a reasonable fit: some of your interests and your working style line up' + (band ? ', and your current results suggest ' + scFoundationPhrase(band) : '') + '.';
  } else {
    if(tier === 'Strong') explanation = 'Your results show you could do well in ' + label + ', although it currently shows less alignment with what you enjoy and how you like to work — think about whether you would enjoy it for three years.';
    else explanation = label + ' currently shows less alignment with your interests and preferred way of working, so it may need more deliberate effort than some of your stronger matches.';
  }
  return {
    naturalFit: { level: nf, score: res.fit.naturalFit },
    interest: { level: res.interest.level, score: res.interest.normalised },
    academic: { label: band ? band.tier : 'Not yet available', tier: tier, band: band, score: res.academic.score },
    explanation: explanation,
  };
}
function generateSubjectFeedback(res){
  const s = SC_SUBJECTS[res.id], label = s.label, f = scFragments(res);
  const key = res.category.key;
  const why = [];
  let consider;
  if(key === 'strong'){
    why.push(label + ' looks like a strong match for you.');
    why.push(scCap(f.interest) + ', ' + f.personality + ', and ' + f.academic + '.');
    consider = 'Check that your school offers it and how it fits with your other subject choices.';
  } else if(key === 'foundation'){
    why.push(label + ' appears to match your interests and working style.');
    why.push('Your current ' + scAcademicEvidence(res) + ' suggest you may need to strengthen your foundation before Grade 10.');
    why.push('If you are willing to put in the extra work, this could still be a good option.');
    consider = s.foundationTip;
  } else if(key === 'academic'){
    const lo = scInterestPhrases(res, 'low', 2);
    why.push('You currently perform well in the areas ' + label + ' builds on, but your answers show relatively less interest in ' + (lo.length ? scJoin(lo) : 'this kind of work') + '.');
    why.push('You are capable of taking the subject, but consider whether you would enjoy studying it for the next three years.');
    consider = 'Think about whether you would enjoy it for three years, not just whether you can do it.';
  } else if(key === 'lower'){
    why.push(SC_COPY.lowerAlignment);
    consider = 'If you are drawn to it for other reasons, talk to your teacher about what extra support could help.';
  } else {
    why.push(label + ' could work well for you.');
    if(res.interest.level === 'High' && res.personality.level === 'Low'){
      why.push(scCap(f.interest) + ', but your usual way of working differs a little from how this subject is typically studied, so it may take more deliberate effort day to day.');
    } else {
      why.push(scCap(f.interest) + ', and ' + f.academic + '.');
    }
    consider = 'Explore what the Grade 10 subject covers (' + s.covers + ') before making your final choice.';
  }
  return { why: why, consider: consider, thrive: scThrive(res) };
}

/* ---------------- Mathematics vs Mathematical Literacy ---------------- */
function scMathPathwayNeed(results, learner){
  const M = SC_CONFIG.math;
  let careerNeed = null;
  if(typeof computeMatches === 'function' && typeof CAREERS !== 'undefined'){
    try {
      const top = computeMatches(learner).slice(0, M.careerSample);
      const fav = {};
      (learner.favourites || []).forEach(function(id){ fav[id] = true; });
      let num = 0, den = 0;
      top.forEach(function(m){
        const w = fav[m.career.id] ? 2 : 1;
        den += w; if((m.career.requiredSubjects || []).indexOf('Mathematics') !== -1) num += w;
      });
      (learner.favourites || []).forEach(function(id){
        if(top.some(function(m){ return m.career.id === id; })) return;
        const c = CAREERS.find(function(x){ return x.id === id; });
        if(!c) return;
        den += 2; if((c.requiredSubjects || []).indexOf('Mathematics') !== -1) num += 2;
      });
      careerNeed = den > 0 ? num / den : null;
    } catch(e){ careerNeed = null; }
  }
  const others = results.filter(function(r){ return r.id !== 'mathematics' && r.id !== 'mathematicalLiteracy'; })
    .sort(function(a, b){ return b.fit.overall - a.fit.overall; }).slice(0, 5);
  let sNum = 0, sDen = 0;
  others.forEach(function(r){
    const req = SC_SUBJECTS[r.id].mathRequirement;
    sNum += r.fit.overall * (req ? SC_CONFIG.mathRequirementValue[req] : 0); sDen += r.fit.overall;
  });
  const subjectNeed = sDen > 0 ? sNum / sDen : null;
  const parts = [careerNeed, subjectNeed].filter(function(v){ return v != null; });
  const value = parts.length ? scMean(parts) : null;
  const level = value == null ? 'unknown' : (value >= M.needHigh ? 'high' : (value < M.needLow ? 'low' : 'medium'));
  return { value: value, level: level, careerNeed: careerNeed, subjectNeed: subjectNeed };
}
function decideMathPathway(results, learner){
  const M = SC_CONFIG.math;
  const byId = {};
  results.forEach(function(r){ byId[r.id] = r; });
  const math = byId.mathematics;
  const need = scMathPathwayNeed(results, learner);
  let recommended = 'either', message = SC_COPY.mathEither;
  if(math){
    const readiness = math.academic.score;
    const weak = readiness != null && readiness < M.weakReadiness;
    if(need.level === 'high'){
      recommended = 'mathematics';
      message = weak ? SC_COPY.mathHighNeedWeak : SC_COPY.mathHighNeedOk;
    } else if(math.interest.normalised < M.interestLow && (math.personality.score == null || math.personality.score < M.alignmentLow) && need.level === 'low'){
      recommended = 'mathematicalLiteracy';
      message = SC_COPY.mathLowNeed;
    } else if(math.fit.overall >= M.strongOverall && !weak){
      recommended = 'mathematics';
      message = SC_COPY.mathStrongFit;
    } else if(math.interest.level === 'High' && weak){
      recommended = 'mathematics';
      message = SC_COPY.mathInterestWeak;
    }
  }
  return {
    recommended: recommended, message: message, always: SC_COPY.mathAlways, need: need,
    mathematics: math ? { overall: math.fit.overall, interest: math.interest.normalised, academic: math.academic.score, alignment: math.personality.score } : null,
  };
}

/* ---------------- combinations ---------------- */
function scComboWhy(subjectIds, byId){
  const traits = [];
  subjectIds.forEach(function(id){
    byId[id].interest.traits.forEach(function(t){
      if(t.score >= SC_CONFIG.profile.traitMin && traits.every(function(x){ return x.trait !== t.trait; })) traits.push(t);
    });
  });
  traits.sort(function(a, b){ return b.score - a.score; });
  const phrases = traits.slice(0, 2).map(function(t){ return scPhrase(t.trait); });
  let why = phrases.length
    ? 'Your answers show ' + scJoin(phrases) + ', which fits these subjects well.'
    : 'These subjects line up reasonably well with your interests and how you like to work.';
  const withMarks = subjectIds.filter(function(id){ return byId[id].academic.score != null; });
  if(withMarks.length){
    const weak = withMarks.filter(function(id){ return byId[id].academic.score < SC_CONFIG.report.workOnBelow; });
    why += weak.length
      ? ' Your current results suggest ' + scJoin(weak.map(function(id){ return SC_SUBJECTS[id].label; })) + ' would benefit from some extra attention.'
      : ' Your current results support this combination.';
  }
  return why;
}
function generateSubjectCombinations(results, mathChoice){
  const byId = {};
  results.forEach(function(r){ byId[r.id] = r; });
  const found = [];
  SC_COMBOS.forEach(function(tpl){
    const chosen = [], labels = [], used = {};
    let ok = true;
    tpl.slots.forEach(function(slot){
      if(!ok) return;
      let candidates = slot.slice();
      let eitherMaths = false;
      if(slot.length === 1 && slot[0] === 'mathChoice'){
        const rec = mathChoice ? mathChoice.recommended : 'either';
        if(rec === 'either'){ candidates = ['mathematics', 'mathematicalLiteracy']; eitherMaths = true; }
        else candidates = [rec];
      }
      candidates = candidates.filter(function(id){ return byId[id] && !used[id]; });
      if(!candidates.length){ ok = false; return; }
      candidates.sort(function(a, b){ return byId[b].fit.overall - byId[a].fit.overall; });
      chosen.push(candidates[0]); used[candidates[0]] = true;
      labels.push(eitherMaths ? 'Mathematics or Mathematical Literacy' : SC_SUBJECTS[candidates[0]].label);
    });
    if(!ok) return;
    found.push({ id: tpl.id, name: tpl.name, subjects: chosen, labels: labels, score: scMean(chosen.map(function(id){ return byId[id].fit.overall; })) });
  });
  found.sort(function(a, b){ return b.score - a.score; });
  const seen = {}, unique = [];
  found.forEach(function(c){
    const key = c.subjects.slice().sort().join('|');
    if(!seen[key]){ seen[key] = true; unique.push(c); }
  });
  let picked = unique.filter(function(c){ return c.score >= SC_CONFIG.report.minComboScore; });
  if(!picked.length) picked = unique.slice(0, 1);
  return picked.slice(0, SC_CONFIG.report.combos).map(function(c){
    return { id: c.id, name: c.name, subjects: c.subjects, labels: c.labels, score: c.score, why: scComboWhy(c.subjects, byId) };
  });
}

/* ---------------- career connection ---------------- */
function getCareerPathwaysForSubjects(subjectIds, results){
  const byId = {};
  results.forEach(function(r){ byId[r.id] = r; });
  const tagScore = {};
  const fetWeights = {};
  subjectIds.forEach(function(id){
    const r = byId[id];
    if(!r) return;
    SC_SUBJECTS[id].pathwayTags.forEach(function(t){ tagScore[t] = (tagScore[t] || 0) + r.fit.overall; });
    SC_SUBJECTS[id].fetNames.forEach(function(n){ fetWeights[n] = Math.max(fetWeights[n] || 0, r.fit.overall); });
  });
  const pathways = Object.keys(tagScore).sort(function(a, b){ return tagScore[b] - tagScore[a]; }).slice(0, 8).map(function(t){ return SC_PATHWAYS[t] || t; });
  const clusters = (typeof CLUSTERS !== 'undefined' ? CLUSTERS : []).map(function(cl){
    let s = 0;
    (cl.usefulSubjects || []).forEach(function(n){ if(fetWeights[n]) s += fetWeights[n]; });
    return { cluster: cl, score: s };
  }).filter(function(x){ return x.score > 0; })
    .sort(function(a, b){ return b.score - a.score; })
    .slice(0, SC_CONFIG.report.careerClusters)
    .map(function(x){
      const careers = (x.cluster.exampleCareerIds || []).map(function(id){ return CAREERS.find(function(c){ return c.id === id; }); })
        .filter(Boolean).slice(0, SC_CONFIG.report.careersPerCluster).map(function(c){ return c.name; });
      return { id: x.cluster.id, name: x.cluster.name, careers: careers };
    });
  return { pathways: pathways, clusters: clusters };
}

/* ---------------- profile summary + "what to work on" ---------------- */
function scBuildProfile(answers, results, personality){
  // Learner-level interest traits: average answer per trait across the
  // questions that belong to a specific subject.
  const acc = {};
  SC_QUESTIONS.forEach(function(q){
    const a = Number(answers[q.id]);
    if(q.primary === 'general' || !(a >= 1 && a <= 5)) return;
    const t = acc[q.trait] || (acc[q.trait] = { sum: 0, n: 0 });
    t.sum += (a - 1) / 4 * 100; t.n++;
  });
  const traits = Object.keys(acc).map(function(k){ return { trait: k, score: acc[k].sum / acc[k].n }; })
    .filter(function(t){ return t.score >= SC_CONFIG.profile.traitMin; })
    .sort(function(a, b){ return b.score - a.score; })
    .slice(0, SC_CONFIG.profile.topTraits);
  const famScores = {};
  Object.keys(SC_FAMILIES).forEach(function(f){
    const rs = results.filter(function(r){ return r.family === f; }).sort(function(a, b){ return b.fit.overall - a.fit.overall; }).slice(0, 2);
    if(rs.length) famScores[f] = scMean(rs.map(function(r){ return r.fit.overall; }));
  });
  const fams = Object.keys(famScores).sort(function(a, b){ return famScores[b] - famScores[a]; });
  const persTop = Object.keys(personality.traits).filter(function(t){ return personality.traits[t] != null; })
    .sort(function(a, b){ return personality.traits[b] - personality.traits[a]; }).slice(0, 2);
  const summary = [];
  summary.push(traits.length >= 2
    ? 'You seem to enjoy ' + scJoin(traits.map(function(t){ return scPhrase(t.trait); })) + '.'
    : 'Your answers show a fairly even spread of interests so far, so there is plenty to explore.');
  if(fams.length){
    let s = 'Your strongest alignment is currently with ' + SC_FAMILIES[fams[0]].label;
    if(fams[1] && famScores[fams[1]] >= 55) s += ', although you also show an interest in ' + SC_FAMILIES[fams[1]].label;
    summary.push(s + '.');
  }
  if(persTop.length) summary.push('Your working style leans towards ' + scJoin(persTop.map(function(t){ return SC_TRAITS[t].phrase; })) + '.');
  return {
    summary: summary,
    interestTraits: traits.map(function(t){ return { trait: t.trait, phrase: scPhrase(t.trait), score: t.score }; }),
    personalityTraits: persTop.map(function(t){ return { id: t, label: SC_TRAITS[t].label, score: personality.traits[t] }; }),
    families: fams.map(function(f){ return { id: f, label: SC_FAMILIES[f].label, score: famScores[f] }; }),
  };
}
function scBuildWorkOn(focusResults){
  const byArea = {};
  focusResults.forEach(function(r){
    r.academic.weakAreas.forEach(function(w){
      const a = byArea[w.area] || (byArea[w.area] = { area: w.area, pct: w.pct, subjects: [] });
      if(a.subjects.indexOf(SC_SUBJECTS[r.id].label) === -1) a.subjects.push(SC_SUBJECTS[r.id].label);
    });
  });
  const tips = Object.keys(byArea).map(function(k){ return byArea[k]; })
    .filter(function(a){ return SC_AREA_TIPS[a.area]; })
    .sort(function(a, b){ return a.pct - b.pct; })
    .slice(0, SC_CONFIG.report.workOnMax)
    .map(function(a){ return SC_AREA_TIPS[a.area] + ' This matters for ' + scJoin(a.subjects.slice(0, 3)) + '.'; });
  if(!tips.length) tips.push('Your current results support your strongest matches well — keep up your regular study habits and revisit your results each term.');
  return tips;
}

/* ---------------- orchestrator ---------------- */
function buildSubjectChoiceReport(learner){
  const sc = learner.subjectChoice;
  const answers = (sc && sc.answers) || {};
  const answered = SC_QUESTIONS.filter(function(q){ const a = Number(answers[q.id]); return a >= 1 && a <= 5; }).length;
  const interest = calculateSubjectInterestScores(answers);
  const personality = calculateSubjectPersonalityAlignment(learner);
  const academic = calculateAcademicReadiness(learner);
  const R = SC_CONFIG.report;

  const results = [];
  Object.keys(SC_SUBJECTS).forEach(function(id){
    const i = interest[id];
    if(i.normalised == null) return;
    const s = SC_SUBJECTS[id], p = personality.subjects[id], a = academic[id];
    const comp = { interest: i.normalised, personality: p ? p.score : null, academic: a.score };
    const fit = calculateSubjectFit(comp);
    const category = classifySubjectRecommendation(comp);
    results.push({
      id: id, label: s.label, family: s.family, note: s.note || null, covers: s.covers,
      interest: { raw: i.raw, min: i.min, max: i.max, normalised: i.normalised, level: scLevel(i.normalised), traits: i.traitList, count: i.count },
      personality: { score: p ? p.score : null, level: p ? scLevel(p.score) : null, parts: p ? p.parts : [] },
      academic: a,
      fit: fit, category: category,
      pathways: s.pathwayTags.map(function(t){ return SC_PATHWAYS[t] || t; }),
    });
  });
  results.forEach(function(r){ r.feedback = generateSubjectFeedback(r); });

  const sorted = results.slice().sort(function(a, b){ return b.fit.overall - a.fit.overall; });
  const nonLower = sorted.filter(function(r){ return r.category.key !== 'lower'; });
  const top = nonLower.filter(function(r){ return r.category.key === 'strong' || r.category.key === 'foundation'; }).slice(0, R.topMatches);
  nonLower.forEach(function(r){ if(top.length < R.minTopMatches && top.indexOf(r) === -1) top.push(r); });
  top.sort(function(a, b){ return b.fit.overall - a.fit.overall; });
  const explore = nonLower.filter(function(r){ return top.indexOf(r) === -1; }).slice(0, R.exploreMax);
  const effort = sorted.filter(function(r){ return r.category.key === 'lower'; }).reverse().slice(0, R.effortMax);

  const mathChoice = decideMathPathway(results, learner);
  const combos = generateSubjectCombinations(results, mathChoice);
  const focusIds = [];
  top.forEach(function(r){ if(focusIds.indexOf(r.id) === -1) focusIds.push(r.id); });
  if(combos[0]) combos[0].subjects.forEach(function(id){ if(focusIds.indexOf(id) === -1) focusIds.push(id); });
  const focus = focusIds.map(function(id){ return results.find(function(r){ return r.id === id; }); }).filter(Boolean);

  return {
    ready: {
      answers: answered > 0,
      complete: answered >= SC_QUESTIONS.length,
      personality: !!(learner.assessmentCompletedAt && learner.riasec),
      results: Object.keys(academic).some(function(k){ return academic[k].score != null; }),
    },
    answered: answered, total: SC_QUESTIONS.length,
    results: sorted,
    profile: scBuildProfile(answers, results, personality),
    top: top, explore: explore, effort: effort,
    mathChoice: mathChoice,
    combos: combos,
    workOn: scBuildWorkOn(focus),
    careers: getCareerPathwaysForSubjects(focusIds, results),
    traits: personality.traits,
  };
}
