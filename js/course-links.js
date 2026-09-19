/* ============================================================
   COURSE LINKS — real degree programmes & entry requirements
   Pulled from Supabase (courseRequirements + careerCourseLinks),
   which was loaded separately from the cleaned national course
   requirements dataset. This is additive to the free-text
   career.institutions lists already in data.js — it doesn't
   replace them.
   ============================================================ */

// careerId -> undefined (not started) | null (loading) | 'error' | array of rows
let COURSE_LINKS_CACHE = {};

async function loadCourseLinks(careerId){
  if(COURSE_LINKS_CACHE[careerId] !== undefined) return; // already loading or loaded
  COURSE_LINKS_CACHE[careerId] = null; // mark as in-flight

  if(!sb){
    COURSE_LINKS_CACHE[careerId] = 'error';
    return;
  }

  try{
    const { data, error } = await sb
      .from('careerCourseLinks')
      .select('matchType, matchedKeywords, courseRequirements(institution, courseName, faculty, apsScore, closingDate, subjectRequirements)')
      .eq('careerId', careerId);
    if(error) throw error;
    COURSE_LINKS_CACHE[careerId] = data || [];
  }catch(err){
    console.error('loadCourseLinks failed for', careerId, err);
    COURSE_LINKS_CACHE[careerId] = 'error';
  }

  // Only re-render if the learner hasn't navigated away from this career's page
  if(typeof ROUTE !== 'undefined' && ROUTE === 'career' && ROUTE_PARAM === careerId){
    render();
  }
}

function courseLinksSectionHTML(careerId){
  const state = COURSE_LINKS_CACHE[careerId];

  if(state === undefined){
    loadCourseLinks(careerId); // fire the fetch, render loading state for now
    return courseLinksCardHTML('<p class="page-sub">Loading real degree programmes…</p>');
  }
  if(state === null){
    return courseLinksCardHTML('<p class="page-sub">Loading real degree programmes…</p>');
  }
  if(state === 'error'){
    return courseLinksCardHTML('<p class="page-sub">Couldn\u2019t load live course matches right now — the lists above are still accurate.</p>');
  }
  if(!state.length){
    return ''; // nothing linked yet for this career — the free-text section above still covers it
  }

  const byInstitution = {};
  state.forEach(row => {
    const c = row.courseRequirements;
    if(!c) return;
    (byInstitution[c.institution] = byInstitution[c.institution] || []).push({ ...c, matchType: row.matchType });
  });

  const institutionBlocks = Object.keys(byInstitution).sort().map(inst => {
    const courses = byInstitution[inst];
    const courseRows = courses.map(c => {
      const reqParts = c.subjectRequirements
        ? Object.entries(c.subjectRequirements).map(([subj, lvl]) => `${esc(subj)}: Level ${lvl}`).join(' \u00b7 ')
        : '';
      const apsPart = c.apsScore ? `APS ${c.apsScore}` : '';
      const detail = [apsPart, reqParts].filter(Boolean).join(' \u2014 ') || 'See institution for entry requirements';
      const approxTag = c.matchType === 'approximate'
        ? ' <span class="page-sub">(closest related programme)</span>'
        : '';
      return `<div class="kv"><b>${esc(c.courseName)}${approxTag}</b><span>${detail}</span></div>`;
    }).join('');
    return `<div style="margin-bottom:14px;"><h4 style="margin-bottom:6px;">${esc(inst)}</h4>${courseRows}</div>`;
  }).join('');

  return courseLinksCardHTML(`
    <p class="page-sub">From our national course-requirements database \u2014 always confirm current numbers on the institution\u2019s own site before applying.</p>
    ${institutionBlocks}
  `);
}

function courseLinksCardHTML(innerHTML){
  return `<div class="card" style="margin-bottom:18px;">
    <h3>Real degree programmes & entry requirements</h3>
    ${innerHTML}
  </div>`;
}
