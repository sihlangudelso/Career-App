/* ============================================================
   ANSWER INPUTS -- how an answer *feels* when it is given.

   Every question in the app (personality assessment, Subject Choice,
   the Grade 9 work-style sliders, the 4-question quick start) goes
   through here, so they all behave the same way:

     1. The chosen option animates (a pop and a ring) so the learner
        SEES what they picked.
     2. Where the app moves on by itself, it waits a moment first
        (ANSWER_HOLD_MS) and only then slides to the next question.
     3. Sliders are a touch-first "snap slider": the thumb follows the
        finger smoothly, snaps to the nearest of five stops with a
        spring when let go, and TAPPING any stop -- including the
        parked middle one -- selects it. (A native range input only
        reports a change, so an untouched slider could never be
        answered "3" without dragging away and back.)

   Nothing here decides what an answer MEANS: the handlers in
   app_handlers.js still store each answer exactly as before.
   The look lives in style.css under "Answer feedback" / "Snap slider".
   ============================================================ */

// How long a chosen answer stays on screen, animating, before the app moves
// on by itself. Long enough to see what was picked, short enough that a
// full assessment does not drag. (A `let` so a test can slow it right down.)
let ANSWER_HOLD_MS = 480;
let ANSWER_LOCK = false;     // a pick is animating: further answer taps wait
let ANSWER_TIMER = null;
let ANSWER_SCROLL_TIMER = null;

function prefersReducedMotion(){
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(e){ return false; }
}
// People who ask their phone for less motion still get a (short) pause so the
// choice is confirmed, just without the movement.
function answerHoldMs(){ return prefersReducedMotion() ? Math.min(200, ANSWER_HOLD_MS) : ANSWER_HOLD_MS; }

// Run `then` once the pick has had its moment, unless something cancels it
// first (Back, Continue, leaving the screen).
function afterAnswerHold(then){
  ANSWER_LOCK = true;
  clearTimeout(ANSWER_TIMER);
  ANSWER_TIMER = setTimeout(function(){
    ANSWER_TIMER = null; ANSWER_LOCK = false;
    then();
  }, answerHoldMs());
}
function cancelPendingAnswer(){
  clearTimeout(ANSWER_TIMER); ANSWER_TIMER = null; ANSWER_LOCK = false;
}

/* ---------------- tap answers (buttons) ---------------- */

// Mark `btn` as the chosen answer in its group and play the pick animation.
// Every option carries data-v (its value); the group they sit in carries
// data-answer-group, plus data-cumulative="1" for star ratings (picking 4
// lights stars 1-4) and data-dim="1" where the other options should fade
// while the choice is confirmed (the one-question-at-a-time screens).
function pickAnswer(btn){
  const group = btn && btn.closest ? btn.closest('[data-answer-group]') : null;
  if(!group) return;
  const val = Number(btn.dataset.v);
  const cumulative = group.dataset.cumulative === '1';
  group.classList.add('has-pick');
  group.querySelectorAll('[data-v]').forEach(function(b){
    const n = Number(b.dataset.v);
    const lit = cumulative ? n <= val : b === btn;
    b.classList.remove('picked', 'pop');
    b.classList.toggle('on', lit);
    b.setAttribute('aria-pressed', lit ? 'true' : 'false');
    if(cumulative){
      b.textContent = lit ? '★' : '☆';
      b.style.setProperty('--i', String(n - 1));
    }
  });
  void group.offsetWidth;           // restart the animation if the same answer is tapped again
  btn.classList.add('picked');
  if(cumulative) group.querySelectorAll('[data-v].on').forEach(function(b){ b.classList.add('pop'); });
}

// On a long page of questions (Subject Choice), glide to the next unanswered
// one after an answer has been confirmed -- or to the Next button when the
// page is complete. Only called for a first-time answer, so changing an
// earlier answer never moves the page under the learner's thumb.
function scrollToNextQuestion(row){
  clearTimeout(ANSWER_SCROLL_TIMER);
  ANSWER_SCROLL_TIMER = setTimeout(function(){
    const questions = Array.prototype.slice.call(document.querySelectorAll('#app .sc-q'));
    const open = questions.filter(function(q){ return !q.querySelector('.sc-scale button.on'); });
    let target = open.filter(function(q){ return row.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING; })[0] || open[0];
    const isButton = !target;
    if(isButton) target = document.getElementById('scNext');
    if(!target) return;
    const bar = document.getElementById('topbarEl'), nav = document.getElementById('bottomNavEl');
    const topSafe = (bar && bar.offsetHeight) || 0, bottomSafe = (nav && nav.offsetHeight) || 0;
    const r = target.getBoundingClientRect(), vh = window.innerHeight;
    if(r.top >= topSafe + 8 && r.bottom <= vh - bottomSafe - 8) return;       // already comfortably in view
    const top = window.scrollY + r.top - (isButton ? vh * 0.55 : topSafe + 24);
    window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, prefersReducedMotion() ? 100 : 380);
}

/* ---------------- the snap slider ---------------- */
// Five stops, values 1-5. `data-value` holds the chosen stop (0 = not answered
// yet: the thumb is "parked" on the middle stop, drawn hollow, and tapping it
// or any stop answers). Markup comes from snapSliderHTML(); behaviour from the
// document-level pointer/keyboard handlers below, so a re-render needs no re-wiring.

const SNAP_MAX = 5;
function attrEsc(s){ return esc(s).replace(/"/g, '&quot;'); }
function snapPct(v){ return (v - 1) / (SNAP_MAX - 1) * 100; }

// o: { kind:'assess'|'g9', id, value (0 = unanswered), label (for screen readers),
//      texts:[5 strings] (spoken value, and the caption when showCaption), showCaption, bipolar }
// `bipolar` sliders run between two opposite ends (no filled bar: the stop
// itself is the answer); the others fill from the left like a rating scale.
function snapSliderHTML(o){
  const v = Number(o.value) || 0;
  const answered = v >= 1;
  const texts = o.texts || [];
  const spoken = answered ? (texts[v - 1] || String(v)) : 'Not answered yet';
  return `<div class="snap ${answered ? '' : 'unanswered'} ${o.bipolar ? 'bipolar' : ''}" role="slider" tabindex="0"
      data-kind="${attrEsc(o.kind)}" data-id="${attrEsc(o.id)}" data-value="${answered ? v : 0}" data-texts="${attrEsc(JSON.stringify(texts))}"
      aria-label="${attrEsc(o.label)}" aria-valuemin="1" aria-valuemax="${SNAP_MAX}" aria-valuenow="${answered ? v : 3}" aria-valuetext="${attrEsc(spoken)}"
      style="--p:${snapPct(answered ? v : 3)}">
    <div class="snap-track">
      <div class="snap-fill"></div>
      ${[0, 1, 2, 3, 4].map(function(i){
        const reached = answered && (o.bipolar ? i === v - 1 : i < v);
        return `<span class="snap-stop ${reached ? 'reached' : ''}" style="left:${i * 25}%"></span>`;
      }).join('')}
      <div class="snap-thumb"></div>
    </div>
    <div class="snap-ticks" aria-hidden="true">${[1, 2, 3, 4, 5].map(function(n){
      return `<span class="${answered && n === v ? 'on' : ''}" style="left:${(n - 1) * 25}%">${n}</span>`;
    }).join('')}</div>
    ${o.showCaption ? `<div class="snap-cap" aria-hidden="true">${esc(answered ? (texts[v - 1] || '') : 'Tap or drag to answer')}</div>` : ''}
  </div>`;
}

function snapTexts(el){
  try { return JSON.parse(el.dataset.texts || '[]'); } catch(e){ return []; }
}
// Where is the finger, as a position on the track (0-100) and the stop it is nearest?
function snapFromX(el, clientX){
  const r = el.querySelector('.snap-track').getBoundingClientRect();
  const f = r.width > 0 ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0.5;
  return { pct: f * 100, v: Math.round(f * (SNAP_MAX - 1)) + 1 };
}
// Draw the slider with its thumb at `pct`, showing stop `v` as the current choice.
function snapPaint(el, pct, v){
  el.style.setProperty('--p', String(pct));
  const bipolar = el.classList.contains('bipolar');
  el.querySelectorAll('.snap-stop').forEach(function(s, i){ s.classList.toggle('reached', bipolar ? i === v - 1 : i < v); });
  el.querySelectorAll('.snap-ticks span').forEach(function(t, i){ t.classList.toggle('on', i + 1 === v); });
  const texts = snapTexts(el);
  el.setAttribute('aria-valuenow', String(v));
  el.setAttribute('aria-valuetext', texts[v - 1] || String(v));
  const cap = el.querySelector('.snap-cap');
  if(cap && texts[v - 1] && cap.textContent !== texts[v - 1]){
    cap.textContent = texts[v - 1];
    cap.classList.remove('flip'); void cap.offsetWidth; cap.classList.add('flip');
  }
  el.classList.remove('unanswered');
}
function snapSet(el, v){ snapPaint(el, snapPct(v), v); el.dataset.value = String(v); }
// Back to "not answered yet": hollow thumb parked on the middle stop.
function snapParked(el){
  el.dataset.value = '0';
  el.classList.add('unanswered');
  el.style.setProperty('--p', String(snapPct(3)));
  el.querySelectorAll('.snap-stop').forEach(function(s){ s.classList.remove('reached'); });
  el.querySelectorAll('.snap-ticks span').forEach(function(t){ t.classList.remove('on'); });
  el.setAttribute('aria-valuenow', '3'); el.setAttribute('aria-valuetext', 'Not answered yet');
  const cap = el.querySelector('.snap-cap');
  if(cap) cap.textContent = 'Tap or drag to answer';
}
function snapRestore(el, v){ if(v >= 1) snapSet(el, v); else snapParked(el); }

// Hand the value to the handler for this slider's kind. `commit` is the
// learner's final choice (finger lifted / Enter), as opposed to a keyboard
// arrow that is still adjusting.
function snapStore(el, v, commit){
  const kind = el.dataset.kind;
  if(kind === 'g9'){
    App.grade9SetWorkStyle(el.dataset.id, v, el);
  } else if(kind === 'assess'){
    const step = Number(el.dataset.id);
    App.assessSlide(step, v, el);
    if(commit) App.assessSlideCommit(step, v, el);
  }
}
function snapCommit(el, v){
  el.classList.remove('picked'); void el.offsetWidth;
  snapSet(el, v);
  el.classList.add('picked');
  snapStore(el, v, true);
}
// A save in flight, or an answer already confirming, means this slider must not change.
function snapBusy(el){
  const kind = el.dataset.kind;
  return (kind === 'g9' && SAVING.g9) || (kind === 'assess' && (SAVING.assess || ANSWER_LOCK));
}

let SNAP_ACTIVE = null;
function snapEnd(e, cancelled){
  const a = SNAP_ACTIVE;
  if(!a || (e && a.id !== e.pointerId)) return;
  SNAP_ACTIVE = null;
  a.el.classList.remove('pressing', 'dragging');
  try { a.el.releasePointerCapture(a.id); } catch(err){ /* no capture to release */ }
  if(cancelled || !e){ snapRestore(a.el, a.startValue); return; }     // the browser took the gesture (a scroll): no answer
  snapCommit(a.el, snapFromX(a.el, e.clientX).v);
}

document.addEventListener('pointerdown', function(e){
  if(e.pointerType === 'mouse' && e.button !== 0) return;
  const el = e.target && e.target.closest ? e.target.closest('.snap') : null;
  if(!el || snapBusy(el)) return;
  if(SNAP_ACTIVE) snapEnd(null, true);                       // a stale gesture: settle it first
  SNAP_ACTIVE = { el: el, id: e.pointerId, x0: e.clientX, dragging: false, startValue: Number(el.dataset.value) || 0 };
  // Keep receiving the finger's moves even if it leaves the slider. (A synthetic
  // event has no real pointer to capture, which is fine.)
  try { el.setPointerCapture(e.pointerId); } catch(err){ /* not capturable */ }
  el.classList.add('pressing');
});
document.addEventListener('pointermove', function(e){
  const a = SNAP_ACTIVE;
  if(!a || a.id !== e.pointerId) return;
  if(!a.dragging){
    if(Math.abs(e.clientX - a.x0) < 4) return;               // still just a tap
    a.dragging = true; a.el.classList.add('dragging');       // follow the finger exactly, no easing
  }
  const r = snapFromX(a.el, e.clientX);
  snapPaint(a.el, r.pct, r.v);
});
document.addEventListener('pointerup', function(e){ snapEnd(e, false); });
document.addEventListener('pointercancel', function(e){ snapEnd(e, true); });

// Keyboard: arrows move one stop (like a native slider), Home/End jump to the
// ends, Enter or Space confirm. Moving does not advance a one-at-a-time screen
// by itself; confirming does.
document.addEventListener('keydown', function(e){
  const el = e.target;
  if(!el || !el.classList || !el.classList.contains('snap') || snapBusy(el)) return;
  const cur = Number(el.dataset.value) || 0;
  const from = cur || 3;
  let v = null, confirm = false;
  if(e.key === 'ArrowRight' || e.key === 'ArrowUp') v = Math.min(SNAP_MAX, from + 1);
  else if(e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = Math.max(1, from - 1);
  else if(e.key === 'Home') v = 1;
  else if(e.key === 'End') v = SNAP_MAX;
  else if(e.key === 'Enter' || e.key === ' '){ v = from; confirm = true; }
  if(v === null) return;
  e.preventDefault();
  if(confirm){ snapCommit(el, v); return; }
  snapSet(el, v);
  snapStore(el, v, false);
});
