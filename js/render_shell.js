const LEARNER_NAV = [
  { r:'home', label:'Dashboard', ic:'home' },
  { r:'guidance', label:'Subject Guidance', ic:'compass' },
  { r:'assessment', label:'Assessment', ic:'spark' },
  { r:'matches', label:'Career Matches', ic:'target' },
  { r:'explore', label:'Explore Careers', ic:'search' },
  { r:'aps', label:'APS Calculator', ic:'calc' },
  { r:'favourites', label:'Favourites', ic:'heart' },
  { r:'compare', label:'Compare', ic:'layers' },
  { r:'class', label:'My Class & Licence', ic:'users' },
];
const ADMIN_NAV = [
  { r:'admin-home', label:'Overview', ic:'home' },
  { r:'admin-classes', label:'Classes & Licences', ic:'users' },
  { r:'admin-cohort', label:'Cohort & Export', ic:'chart' },
  { r:'admin-careers', label:'Career Library', ic:'book' },
];

function currentNav(){ return IS_ADMIN && !PREVIEW_MODE ? ADMIN_NAV : LEARNER_NAV; }

function navigate(route, param){
  ROUTE = route; ROUTE_PARAM = param || null;
  window.scrollTo(0,0);
  render();
}

function renderShell(){
  document.getElementById('root').innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebarEl"></aside>
      <div class="topbar" id="topbarEl"></div>
      <main class="main" id="app"></main>
    </div>
    <div class="bottom-nav" id="bottomNavEl"></div>
  `;
}

function sidebarHTML(){
  const nav = currentNav();
  const roleLabel = IS_ADMIN && !PREVIEW_MODE ? 'Institute Admin' : (PREVIEW_MODE ? 'Preview (Learner view)' : 'Learner');
  return `
    <div class="brand">
      <div class="brand-mark">I</div>
      <div class="brand-text"><b>Iroli</b><span>Career Pathway</span></div>
    </div>
    <div class="nav-group">
      ${nav.map(n=>`
        <button class="nav-item ${ROUTE===n.r?'active':''}" onclick="navigate('${n.r}')">
          ${icon(n.ic)}<span>${n.label}</span>
        </button>`).join('')}
    </div>
    <div class="sidebar-foot">
      ${IS_ADMIN ? `<button class="nav-item" onclick="App.togglePreview()">${icon(PREVIEW_MODE?'switch':'spark')}<span>${PREVIEW_MODE?'Exit preview':'Preview learner view'}</span></button>` : ''}
      <div class="role-pill" style="margin-top:8px;">${icon('shield','ic')} ${roleLabel}</div>
      <button class="nav-item" style="margin-top:6px;" onclick="App.signOut()">${icon('logout')}<span>Sign out</span></button>
    </div>
  `;
}

function topbarHTML(){
  return `
    <div class="brand"><div class="brand-mark">I</div><div class="brand-text"><b>Iroli</b><span>Career Pathway</span></div></div>
    <button class="nav-item" style="width:auto;padding:8px;" onclick="App.openMobileMenu()">${icon('menu')}</button>
  `;
}

function bottomNavHTML(){
  const nav = currentNav().slice(0,5);
  return nav.map(n=>`
    <button class="${ROUTE===n.r?'active':''}" onclick="navigate('${n.r}')">
      ${icon(n.ic)}<span>${n.label.split(' ')[0]}</span>
    </button>`).join('');
}

function pageHeadHTML(title, sub){
  return `
  <div class="page-head">
    <div><h1>${title}</h1>${sub?`<div class="page-sub">${sub}</div>`:''}</div>
    ${avatarChipHTML()}
  </div>`;
}

function avatarChipHTML(){
  const av = ME.avatarUrl || '';
  const nm = ME.name || (IS_ADMIN? 'Admin':'Learner');
  return `<div class="avatar-chip">
    <img src="${av}" onerror="this.style.display='none'" alt=""/>
    <div><div class="nm">${esc(nm)||(IS_ADMIN?'Admin':'You')}</div><div class="rl">${IS_ADMIN && !PREVIEW_MODE?'Institute Admin':'Learner'}</div></div>
  </div>`;
}

function disclaimerHTML(text){
  return `<div class="disclaimer">${icon('warn','ic')} <div>${text || 'Admission requirements, APS/points systems and subject rules vary by university, TVET college and year, and change over time. Always confirm current requirements on the institution\'s official website or prospectus before making decisions.'}</div></div>`;
}

function render(){
  if(!ME.id){ renderAuthGateOnly(); return; }
  // refresh nav highlight without full teardown
  document.getElementById('sidebarEl').innerHTML = sidebarHTML();
  document.getElementById('topbarEl').innerHTML = topbarHTML();
  document.getElementById('bottomNavEl').innerHTML = bottomNavHTML();
  const app = document.getElementById('app');

  const effectiveAdmin = IS_ADMIN && !PREVIEW_MODE;

  if(effectiveAdmin){
    if(ROUTE.indexOf('admin')!==0) ROUTE='admin-home';
    if(ROUTE==='admin-home') app.innerHTML = viewAdminHome();
    else if(ROUTE==='admin-classes') app.innerHTML = viewAdminClasses();
    else if(ROUTE==='admin-cohort') app.innerHTML = viewAdminCohort();
    else if(ROUTE==='admin-careers') app.innerHTML = viewAdminCareers();
    else if(ROUTE==='admin-learner') app.innerHTML = viewAdminLearnerDetail(ROUTE_PARAM);
    else app.innerHTML = viewAdminHome();
    return;
  }

  // learner (or preview) flow
  const l = ensureLearnerObj();
  const needsOnboarding = !l.grade || !l.school;
  if(needsOnboarding && ROUTE!=='onboarding'){ ROUTE='onboarding'; }

  if(ROUTE==='onboarding') app.innerHTML = viewOnboarding();
  else if(ROUTE==='home') app.innerHTML = viewHome();
  else if(ROUTE==='guidance') app.innerHTML = viewGuidance();
  else if(ROUTE==='assessment') app.innerHTML = viewAssessment();
  else if(ROUTE==='matches') { l.viewedMatches = true; app.innerHTML = viewMatches(); }
  else if(ROUTE==='explore') app.innerHTML = viewExplore();
  else if(ROUTE==='career') app.innerHTML = viewCareerDetail(ROUTE_PARAM);
  else if(ROUTE==='aps') app.innerHTML = viewAPS();
  else if(ROUTE==='favourites') app.innerHTML = viewFavourites();
  else if(ROUTE==='compare') app.innerHTML = viewCompare();
  else if(ROUTE==='class') app.innerHTML = viewClass();
  else if(ROUTE==='profile') app.innerHTML = viewOnboarding(true);
  else app.innerHTML = viewHome();
}
