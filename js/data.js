/* ============================================================
   IROLI CAREER PATHWAY — DATA MODULE
   Original data model & seed content. Not derived from any
   third-party product's proprietary text or design.
   ============================================================ */

const FACULTIES = [
  { id: 'engineering',   name: 'Engineering',                 color: '#3E4FD6', tag: 'ENG' },
  { id: 'ict',           name: 'ICT & Computer Science',      color: '#5570FF', tag: 'ICT' },
  { id: 'health',        name: 'Health Sciences',             color: '#7A5CF0', tag: 'HLT' },
  { id: 'natsci',        name: 'Natural Sciences',            color: '#9B6FE3', tag: 'SCI' },
  { id: 'built',         name: 'Built Environment',           color: '#B866D6', tag: 'BLT' },
  { id: 'agri',          name: 'Agriculture',                 color: '#C94FB8', tag: 'AGR' },
  { id: 'finance',       name: 'Finance, Actuarial & Quant',  color: '#E0569E', tag: 'FIN' },
  { id: 'humanities',    name: 'Humanities & Social Sciences',color: '#F0508C', tag: 'HUM' },
];

function facultyById(id){ return FACULTIES.find(f=>f.id===id) || FACULTIES[0]; }

// RIASEC-style interest dimensions used for the assessment
const RIASEC = [
  { id:'R', name:'Practical & Hands-on', desc:'Working with tools, machines, the outdoors or your hands.' },
  { id:'I', name:'Investigative & Analytical', desc:'Solving problems, researching, working with data and ideas.' },
  { id:'A', name:'Creative & Expressive', desc:'Designing, creating, imagining new things.' },
  { id:'S', name:'People-focused', desc:'Helping, teaching, caring for or supporting others.' },
  { id:'E', name:'Enterprising & Persuasive', desc:'Leading, selling, starting things, taking initiative.' },
  { id:'C', name:'Organised & Precise', desc:'Working with structure, numbers, records and detail.' },
];

// Append-only: these are positionally persisted in a learner's saved
// strengthsRaw, so existing entries must never be reordered or removed --
// see ensureAssessDraft() in views_learner.js for how an older, shorter
// saved array is padded when this list grows.
const STRENGTH_KEYS = [
  { id:'maths', label:'Mathematics' },
  { id:'sciences', label:'Sciences' },
  { id:'language', label:'Languages & Communication' },
  { id:'problem', label:'Problem-Solving & Logic' },
  { id:'tech', label:'Technology & Computers' },
  { id:'creative', label:'Creativity & Design' },
  { id:'leadership', label:'Leadership & Business' },
  { id:'practical', label:'Hands-on & Practical Skills' },
  { id:'people', label:'People & Care' },
  { id:'organisation', label:'Organisation & Admin' },
  { id:'enterprise', label:'Enterprise & Venture-Building' },
];

// 24 Likert questions (1-5), 4 per RIASEC dimension
const RIASEC_QUESTIONS = [
  { dim:'R', text:'I enjoy building, fixing or taking things apart to see how they work.' },
  { dim:'R', text:'I would rather be outdoors or in a workshop than sitting at a desk all day.' },
  { dim:'R', text:'I like working with tools, machinery or physical materials.' },
  { dim:'R', text:'I prefer clear, practical tasks over long discussions or theory.' },
  { dim:'I', text:'I like figuring out puzzles, patterns or how systems work.' },
  { dim:'I', text:'I enjoy asking "why" and digging into how or why something happens.' },
  { dim:'I', text:'I like working with numbers, data or scientific ideas.' },
  { dim:'I', text:'I enjoy research projects more than repetitive tasks.' },
  { dim:'A', text:'I like coming up with original ideas, designs or ways of doing things.' },
  { dim:'A', text:'I enjoy art, music, writing, design or other creative expression.' },
  { dim:'A', text:'I prefer open-ended tasks where I can be imaginative.' },
  { dim:'A', text:'I like making things look good, not just work well.' },
  { dim:'S', text:'I enjoy helping classmates, friends or family solve problems.' },
  { dim:'S', text:'I would enjoy a career focused on caring for or teaching people.' },
  { dim:'S', text:'People often come to me for advice or support.' },
  { dim:'S', text:'I feel motivated when my work makes a difference to other people.' },
  { dim:'E', text:'I like taking the lead on group projects.' },
  { dim:'E', text:'I enjoy persuading people or pitching an idea.' },
  { dim:'E', text:'I would enjoy starting or running my own business one day.' },
  { dim:'E', text:'I like competition and setting ambitious goals.' },
  { dim:'C', text:'I like things to be organised, accurate and in order.' },
  { dim:'C', text:'I am comfortable working with spreadsheets, records or detailed rules.' },
  { dim:'C', text:'I prefer clear instructions and structured tasks.' },
  { dim:'C', text:'I double-check my work carefully before handing it in.' },
];

// South African NSC subject list (used for subject-selection UI), covering
// all 11 official languages' Home Language offering plus the full CAPS
// elective range — not just the STEM/commerce subset. Grouped below by
// SUBJECT_GROUPS so career-choice guidance can talk about "which group of
// subjects" a career draws on, not just individual subject names.
const SA_SUBJECTS = [
  'English Home Language', 'English First Additional Language',
  'Afrikaans Home Language', 'Afrikaans First Additional Language',
  'isiZulu Home Language', 'isiXhosa Home Language', 'isiNdebele Home Language',
  'Sesotho Home Language', 'Sesotho sa Leboa Home Language', 'Setswana Home Language',
  'siSwati Home Language', 'Tshivenda Home Language', 'Xitsonga Home Language',
  'Life Orientation', 'Mathematics', 'Mathematical Literacy',
  'Physical Sciences', 'Life Sciences', 'Technical Sciences',
  'Accounting', 'Business Studies', 'Economics',
  'Geography', 'History', 'Religion Studies',
  'Information Technology', 'Computer Applications Technology', 'Engineering Graphics and Design',
  'Civil Technology', 'Electrical Technology', 'Mechanical Technology', 'Technical Mathematics',
  'Agricultural Sciences', 'Agricultural Management Practices', 'Agricultural Technology',
  'Tourism', 'Consumer Studies', 'Hospitality Studies',
  'Visual Arts', 'Design', 'Dramatic Arts', 'Dance Studies', 'Music',
];

// Elective subjects grouped for the onboarding subject picker and Grade 9
// guidance — deliberately excludes languages, Life Orientation and Maths/
// Maths Lit, which are handled as their own onboarding fields.
const SUBJECT_GROUPS = [
  { group:'Sciences', subjects:['Physical Sciences','Life Sciences','Technical Sciences'] },
  { group:'Commerce', subjects:['Accounting','Business Studies','Economics'] },
  { group:'Humanities & Social Sciences', subjects:['Geography','History','Religion Studies'] },
  { group:'Technology & Computing', subjects:['Information Technology','Computer Applications Technology','Engineering Graphics and Design'] },
  { group:'Technical', subjects:['Civil Technology','Electrical Technology','Mechanical Technology','Technical Mathematics'] },
  { group:'Agriculture', subjects:['Agricultural Sciences','Agricultural Management Practices','Agricultural Technology'] },
  { group:'Services & Tourism', subjects:['Tourism','Consumer Studies','Hospitality Studies'] },
  { group:'Arts & Design', subjects:['Visual Arts','Design','Dramatic Arts','Dance Studies','Music'] },
];
const CORE_ELECTIVES = SUBJECT_GROUPS.flatMap(g => g.subjects);

// Friendly "area of strength" labels for the academic profile summary —
// display-only, not used for scoring. Falls back to matching "Home
// Language"/"First Additional Language" generically, then the subject's
// own name, so it never breaks on a subject missing from this map.
const SUBJECT_DOMAINS = {
  'Mathematics':'Quantitative reasoning', 'Mathematical Literacy':'Applied numeracy',
  'Life Orientation':'Personal and social wellbeing',
  'Physical Sciences':'Physical sciences', 'Life Sciences':'Biological sciences', 'Technical Sciences':'Applied sciences',
  'Accounting':'Financial reasoning', 'Business Studies':'Business and commerce', 'Economics':'Economic analysis',
  'Geography':'Environmental and human studies', 'History':'Historical and social analysis', 'Religion Studies':'Ethics and social studies',
  'Information Technology':'Computing and programming', 'Computer Applications Technology':'Digital literacy', 'Engineering Graphics and Design':'Technical design',
  'Civil Technology':'Construction and civil trades', 'Electrical Technology':'Electrical trades', 'Mechanical Technology':'Mechanical trades', 'Technical Mathematics':'Applied quantitative reasoning',
  'Agricultural Sciences':'Agricultural science', 'Agricultural Management Practices':'Agribusiness', 'Agricultural Technology':'Agricultural engineering',
  'Tourism':'Tourism and travel', 'Consumer Studies':'Consumer science', 'Hospitality Studies':'Hospitality and food service',
  'Visual Arts':'Visual arts', 'Design':'Design', 'Dramatic Arts':'Performing arts', 'Dance Studies':'Performing arts', 'Music':'Music',
};
function subjectDomain(name){
  if(SUBJECT_DOMAINS[name]) return SUBJECT_DOMAINS[name];
  if(name.includes('Home Language') || name.includes('Additional Language')) return 'Communication';
  return name;
}

// Well-known SA public universities & TVET reference lists (general — always verify)
const UNIVERSITIES = [
  'University of Cape Town (UCT)', 'University of the Witwatersrand (Wits)',
  'Stellenbosch University (SU)', 'University of Pretoria (UP)',
  'University of Johannesburg (UJ)', 'University of KwaZulu-Natal (UKZN)',
  'North-West University (NWU)', 'University of the Free State (UFS)',
  'Rhodes University (RU)', 'Nelson Mandela University (NMU)',
  'University of the Western Cape (UWC)', 'University of South Africa (UNISA)',
  'Sefako Makgatho Health Sciences University (SMU)',
  'University of Limpopo (UL)', 'University of Venda (Univen)',
  'Walter Sisulu University (WSU)', 'University of Zululand (UniZulu)',
  'University of Mpumalanga (UMP)', 'Sol Plaatje University (SPU)',
];
const TVET_NOTE = 'Public TVET colleges (a national network of 50 colleges) offer NCV and Report 191 programmes in this field. Search "TVET colleges near me" via the Department of Higher Education and Training (dhet.gov.za) to find your nearest campus.';
const UOT = [
  'Cape Peninsula University of Technology (CPUT)', 'Tshwane University of Technology (TUT)',
  'Durban University of Technology (DUT)', 'Vaal University of Technology (VUT)',
  'Central University of Technology (CUT)', 'Mangosuthu University of Technology (MUT)',
];

/* ============================================================
   CAREER DATA MODEL
   {
     id, name, faculty, blurb, dayInLife,
     riasec:[dim,dim], strengths:[key,...],           -- keys from STRENGTH_KEYS
     requiredSubjects:[subjectName,...],               -- hard eligibility signal
     recommendedSubjects:[subjectName,...],            -- helpful, not required
     relatedSubjects:[subjectName,...],                -- useful context only, near-zero weight in matching
     recommendedMarks:[{subject, pct}],
     apsGuidance:{typical:'lo-hi', note},
     pathways:[{type:'University'|'TVET'|'Work-integrated'|'Apprenticeship'|'Learnership', qualification, duration}],
     institutions:{universities:[...], utech:[...], tvet: bool},
     applicationNotes,
     videoQuery
   }
   See evaluateCareer() in js/app.js for exactly how these feed matching.
   ============================================================ */
const CAREERS = [
// ---------------- ENGINEERING ----------------
{ id:'civil-engineer', name:'Civil Engineer', faculty:'engineering',
  blurb:'Designs and oversees construction of infrastructure — roads, bridges, water systems, buildings and dams.',
  dayInLife:'Site visits, structural calculations, reviewing drawings, coordinating with contractors and checking safety compliance.',
  riasec:['R','I'], strengths:['maths','sciences','problem','practical'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70},{subject:'Physical Sciences',pct:65}],
  apsGuidance:{typical:'32–40', note:'Highly competitive at top engineering faculties; some universities also use a separate faculty point score.'},
  pathways:[
    {type:'University', qualification:'BEng / BSc (Eng) Civil Engineering', duration:'4 years'},
    {type:'TVET', qualification:'National Diploma: Civil Engineering (Engineering Studies)', duration:'3 years + experiential learning'},
  ],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)','University of KwaZulu-Natal (UKZN)'], utech:['Tshwane University of Technology (TUT)','Cape Peninsula University of Technology (CPUT)'], tvet:true},
  applicationNotes:'Register with ECSA (Engineering Council of South Africa) after graduating. Most engineering faculties require a strong NBT (National Benchmark Test) result alongside NSC marks.',
  videoQuery:'day in the life of a civil engineer South Africa' },

{ id:'mechanical-engineer', name:'Mechanical Engineer', faculty:'engineering',
  blurb:'Designs, builds and maintains machines, engines, vehicles and mechanical systems.',
  dayInLife:'CAD design work, testing prototypes, running simulations, and solving mechanical failures on-site or in a lab.',
  riasec:['R','I'], strengths:['maths','sciences','problem','practical'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70},{subject:'Physical Sciences',pct:70}],
  apsGuidance:{typical:'33–42', note:'Some of the most competitive programmes in the country — check each university\'s specific faculty score.'},
  pathways:[
    {type:'University', qualification:'BEng / BSc (Eng) Mechanical Engineering', duration:'4 years'},
    {type:'TVET', qualification:'National Diploma: Mechanical Engineering', duration:'3 years + experiential learning'},
  ],
  institutions:{universities:['University of the Witwatersrand (Wits)','University of Cape Town (UCT)','University of Pretoria (UP)','Stellenbosch University (SU)','North-West University (NWU)'], utech:['Vaal University of Technology (VUT)','Durban University of Technology (DUT)'], tvet:true},
  applicationNotes:'ECSA registration after graduating (Candidate then Professional Engineer). Engineering Graphics and Design is a helpful (not always required) elective.',
  videoQuery:'day in the life of a mechanical engineer South Africa' },

{ id:'electrical-engineer', name:'Electrical Engineer', faculty:'engineering',
  blurb:'Designs and maintains electrical systems, power networks, control systems and electronics.',
  dayInLife:'Circuit design, testing equipment, project planning, and troubleshooting power or control systems.',
  riasec:['I','R'], strengths:['maths','sciences','problem','tech'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70},{subject:'Physical Sciences',pct:70}],
  apsGuidance:{typical:'32–40', note:'Varies significantly by university and specialisation (power, electronics, computer engineering).'},
  pathways:[
    {type:'University', qualification:'BEng / BSc (Eng) Electrical Engineering', duration:'4 years'},
    {type:'TVET', qualification:'National Diploma: Electrical Engineering', duration:'3 years + experiential learning'},
  ],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','University of Pretoria (UP)','Stellenbosch University (SU)'], utech:['Tshwane University of Technology (TUT)','Cape Peninsula University of Technology (CPUT)'], tvet:true},
  applicationNotes:'ECSA registration path after graduating. Information Technology as an elective can be a helpful bridge into electronics/computer engineering streams.',
  videoQuery:'day in the life of an electrical engineer South Africa' },

{ id:'chemical-engineer', name:'Chemical Engineer', faculty:'engineering',
  blurb:'Designs processes that turn raw materials into useful products — fuels, chemicals, food, pharmaceuticals.',
  dayInLife:'Process design, lab analysis, plant monitoring and improving efficiency/safety of production processes.',
  riasec:['I','R'], strengths:['maths','sciences','problem'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70},{subject:'Physical Sciences',pct:70}],
  apsGuidance:{typical:'34–42', note:'One of the most competitive engineering streams at most universities.'},
  pathways:[{type:'University', qualification:'BEng / BSc (Eng) Chemical Engineering', duration:'4 years'}],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)','North-West University (NWU)'], utech:[], tvet:false},
  applicationNotes:'ECSA registration after graduating. Strong Physical Sciences and Mathematics results are essential for competitive selection.',
  videoQuery:'day in the life of a chemical engineer South Africa' },

{ id:'industrial-engineer', name:'Industrial Engineer', faculty:'engineering',
  blurb:'Improves how systems, factories and organisations work — optimising processes, cost, quality and people.',
  dayInLife:'Analysing workflows, building efficiency models, project management, and process improvement studies.',
  riasec:['I','C'], strengths:['maths','problem','leadership'],
  requiredSubjects:['Mathematics'], recommendedSubjects:['Physical Sciences'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:65},{subject:'Physical Sciences',pct:60}],
  apsGuidance:{typical:'30–38', note:'Slightly more flexible entry than some other engineering streams, but still competitive.'},
  pathways:[{type:'University', qualification:'BEng / BSc (Eng) Industrial Engineering', duration:'4 years'}],
  institutions:{universities:['University of Pretoria (UP)','Stellenbosch University (SU)','University of the Witwatersrand (Wits)','University of Johannesburg (UJ)'], utech:[], tvet:false},
  applicationNotes:'A strong blend of mathematics, logic and business thinking — a good fit for STEM-minded learners who also enjoy leadership and organisation.',
  videoQuery:'what does an industrial engineer do South Africa' },

{ id:'mechatronics-engineer', name:'Mechatronics Engineer', faculty:'engineering',
  blurb:'Combines mechanical, electronic and software engineering to design robots and automated systems.',
  dayInLife:'Designing robotic systems, writing embedded software, and integrating sensors, motors and control logic.',
  riasec:['R','I'], strengths:['maths','sciences','tech','problem'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70},{subject:'Physical Sciences',pct:65}],
  apsGuidance:{typical:'32–40', note:'A newer, growing field — check which universities offer it as a distinct programme vs a specialisation.'},
  pathways:[{type:'University', qualification:'BEng Mechatronics / Electromechanical Engineering', duration:'4 years'}],
  institutions:{universities:['Stellenbosch University (SU)','University of Johannesburg (UJ)','University of Pretoria (UP)'], utech:['Cape Peninsula University of Technology (CPUT)'], tvet:false},
  applicationNotes:'Great fit for learners who enjoy both hardware and coding. Information Technology as an elective is a strong complement.',
  videoQuery:'what is mechatronics engineering' },

// ---------------- ICT / COMPUTER SCIENCE ----------------
{ id:'software-developer', name:'Software Developer', faculty:'ict',
  blurb:'Designs, builds and maintains applications, websites and software systems.',
  dayInLife:'Writing and testing code, fixing bugs, reviewing teammates\' work, and planning new features.',
  riasec:['I','R'], strengths:['tech','problem','maths'],
  requiredSubjects:['Mathematics'], recommendedSubjects:['Information Technology'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:60},{subject:'Information Technology',pct:60}],
  apsGuidance:{typical:'28–36', note:'Entry requirements vary a lot — some diploma/degree routes accept Mathematics without IT as a subject.'},
  pathways:[
    {type:'University', qualification:'BSc Computer Science / BCom Information Systems', duration:'3 years'},
    {type:'TVET', qualification:'National Diploma: Information Technology', duration:'3 years'},
  ],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)','University of Johannesburg (UJ)'], utech:['Durban University of Technology (DUT)','Tshwane University of Technology (TUT)'], tvet:true},
  applicationNotes:'Many successful developers also enter via coding bootcamps or self-teaching plus a portfolio — but a formal qualification widens options and is required for some employers/visas.',
  videoQuery:'day in the life of a software developer South Africa' },

{ id:'data-scientist', name:'Data Scientist', faculty:'ict',
  blurb:'Analyses large datasets to find patterns and insights that guide business or scientific decisions.',
  dayInLife:'Cleaning data, building statistical/ML models, and presenting findings to decision-makers.',
  riasec:['I','C'], strengths:['maths','tech','problem'],
  requiredSubjects:['Mathematics'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:75}],
  apsGuidance:{typical:'32–40', note:'Often entered via Computer Science, Statistics, Mathematics or Actuarial Science degrees.'},
  pathways:[{type:'University', qualification:'BSc Computer Science / Statistics / Data Science', duration:'3 years, often + Honours'}],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)'], utech:[], tvet:false},
  applicationNotes:'Strong Mathematics is essential. An Honours or Master\'s degree is common for senior data science roles.',
  videoQuery:'what does a data scientist do' },

{ id:'network-engineer', name:'Computer / Network Systems Engineer', faculty:'ict',
  blurb:'Designs, builds and maintains the networks and infrastructure that keep organisations connected.',
  dayInLife:'Configuring servers and networks, monitoring systems, and resolving connectivity or security issues.',
  riasec:['R','I'], strengths:['tech','problem'],
  requiredSubjects:[], recommendedSubjects:['Mathematics','Information Technology'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:55}],
  apsGuidance:{typical:'26–32', note:'Diploma and certificate routes (e.g. Cisco, CompTIA) are common alongside formal qualifications.'},
  pathways:[
    {type:'University', qualification:'BSc/BTech Information Technology', duration:'3 years'},
    {type:'TVET', qualification:'National Diploma: Information Technology (Networking stream)', duration:'3 years'},
  ],
  institutions:{universities:['University of Johannesburg (UJ)','North-West University (NWU)'], utech:['Cape Peninsula University of Technology (CPUT)','Tshwane University of Technology (TUT)'], tvet:true},
  applicationNotes:'Industry certifications (Cisco CCNA, CompTIA Network+) are widely recognised alongside a formal qualification.',
  videoQuery:'what does a network engineer do' },

{ id:'cybersecurity-specialist', name:'Cybersecurity Specialist', faculty:'ict',
  blurb:'Protects organisations\' systems and data from hacking, fraud and cyber-attacks.',
  dayInLife:'Monitoring systems for threats, running security tests, and responding to security incidents.',
  riasec:['I','C'], strengths:['tech','problem','maths'],
  requiredSubjects:[], recommendedSubjects:['Mathematics','Information Technology'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:60}],
  apsGuidance:{typical:'28–36', note:'A fast-growing field with routes via Computer Science, IT or specialised cybersecurity diplomas.'},
  pathways:[{type:'University', qualification:'BSc Computer Science / Information Technology (Security stream)', duration:'3 years'}],
  institutions:{universities:['University of Johannesburg (UJ)','University of Pretoria (UP)','Rhodes University (RU)'], utech:['Nelson Mandela University (NMU)'], tvet:true},
  applicationNotes:'Certifications (CompTIA Security+, CEH, CISSP later in career) are highly valued alongside a degree.',
  videoQuery:'what does a cybersecurity analyst do' },

{ id:'it-business-analyst', name:'IT / Systems Business Analyst', faculty:'ict',
  blurb:'Bridges business needs and technology — analysing problems and designing digital solutions.',
  dayInLife:'Interviewing stakeholders, mapping business processes, and writing specifications for developers.',
  riasec:['E','C'], strengths:['problem','language','leadership'],
  requiredSubjects:[], recommendedSubjects:['Mathematics'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:55}],
  apsGuidance:{typical:'28–34', note:'Often entered via a BCom Information Systems or similar business-and-tech degree.'},
  pathways:[{type:'University', qualification:'BCom Information Systems', duration:'3 years'}],
  institutions:{universities:['University of Cape Town (UCT)','University of Pretoria (UP)','University of Johannesburg (UJ)'], utech:[], tvet:false},
  applicationNotes:'A strong choice for learners who like both technology and working with people/business problems.',
  videoQuery:'what does a business analyst do IT' },

// ---------------- HEALTH SCIENCES ----------------
{ id:'medical-doctor', name:'Medical Doctor', faculty:'health',
  blurb:'Diagnoses and treats illness and injury, promoting health across hospitals, clinics and communities.',
  dayInLife:'Consultations, ward rounds, diagnostics, and ongoing study — a demanding but purpose-driven career.',
  riasec:['I','S'], strengths:['sciences','problem','language'],
  requiredSubjects:['Mathematics','Physical Sciences','Life Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70},{subject:'Physical Sciences',pct:70},{subject:'Life Sciences',pct:70}],
  apsGuidance:{typical:'36–42+', note:'Among the most competitive programmes in the country; many universities also require a National Benchmark Test (NBT) and/or interview.'},
  pathways:[{type:'University', qualification:'MBChB (Bachelor of Medicine & Surgery)', duration:'6 years + 2 years internship + 1 year community service'}],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)','University of KwaZulu-Natal (UKZN)','Sefako Makgatho Health Sciences University (SMU)','Walter Sisulu University (WSU)'], utech:[], tvet:false},
  applicationNotes:'Register with the Health Professions Council of South Africa (HPCSA). Selection also considers a personal statement, sometimes an interview, and quintile/redress factors at some universities.',
  videoQuery:'day in the life of a medical doctor South Africa' },

{ id:'pharmacist', name:'Pharmacist', faculty:'health',
  blurb:'Dispenses medication, advises patients, and ensures the safe and effective use of medicines.',
  dayInLife:'Dispensing prescriptions, patient counselling, stock and compliance management.',
  riasec:['I','C'], strengths:['sciences','maths','problem'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:['Life Sciences'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:65},{subject:'Physical Sciences',pct:65}],
  apsGuidance:{typical:'32–38', note:'Competitive but generally more accessible than Medicine.'},
  pathways:[{type:'University', qualification:'Bachelor of Pharmacy (BPharm)', duration:'4 years + 1 year internship + board exam'}],
  institutions:{universities:['University of the Witwatersrand (Wits)','Rhodes University (RU)','University of the Western Cape (UWC)','North-West University (NWU)'], utech:['Tshwane University of Technology (TUT)'], tvet:false},
  applicationNotes:'Register with the South African Pharmacy Council (SAPC) after qualifying.',
  videoQuery:'day in the life of a pharmacist South Africa' },

{ id:'physiotherapist', name:'Physiotherapist', faculty:'health',
  blurb:'Helps patients recover movement and manage pain after injury, illness or surgery.',
  dayInLife:'Hands-on treatment sessions, assessing patients, and designing rehabilitation programmes.',
  riasec:['S','R'], strengths:['sciences','practical','language'],
  requiredSubjects:['Physical Sciences','Life Sciences'], recommendedSubjects:['Mathematics'], relatedSubjects:[],
  recommendedMarks:[{subject:'Life Sciences',pct:65},{subject:'Physical Sciences',pct:60}],
  apsGuidance:{typical:'32–38', note:'Selection is very competitive due to limited places.'},
  pathways:[{type:'University', qualification:'Bachelor of Physiotherapy', duration:'4 years'}],
  institutions:{universities:['University of the Witwatersrand (Wits)','University of Cape Town (UCT)','Stellenbosch University (SU)','University of the Free State (UFS)'], utech:[], tvet:false},
  applicationNotes:'Register with the HPCSA after qualifying. A great fit for learners who like both science and working closely with people.',
  videoQuery:'day in the life of a physiotherapist' },

{ id:'dentist', name:'Dentist', faculty:'health',
  blurb:'Diagnoses and treats problems with teeth, gums and the mouth.',
  dayInLife:'Patient consultations, procedures, and practice management.',
  riasec:['I','S'], strengths:['sciences','practical','problem'],
  requiredSubjects:['Mathematics','Physical Sciences','Life Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Physical Sciences',pct:65},{subject:'Life Sciences',pct:65}],
  apsGuidance:{typical:'34–40', note:'Very competitive; limited places nationally.'},
  pathways:[{type:'University', qualification:'Bachelor of Dental Surgery (BDS/BChD)', duration:'5 years'}],
  institutions:{universities:['University of the Witwatersrand (Wits)','University of Pretoria (UP)','University of the Western Cape (UWC)','Sefako Makgatho Health Sciences University (SMU)'], utech:[], tvet:false},
  applicationNotes:'Register with the HPCSA after qualifying.',
  videoQuery:'day in the life of a dentist' },

{ id:'biomedical-scientist', name:'Biomedical Scientist / Medical Technologist', faculty:'health',
  blurb:'Runs laboratory tests that help doctors diagnose and monitor disease.',
  dayInLife:'Analysing blood, tissue and other samples using laboratory equipment and quality-control processes.',
  riasec:['I','C'], strengths:['sciences','problem'],
  requiredSubjects:['Physical Sciences','Life Sciences'], recommendedSubjects:['Mathematics'], relatedSubjects:[],
  recommendedMarks:[{subject:'Life Sciences',pct:60},{subject:'Physical Sciences',pct:60}],
  apsGuidance:{typical:'28–34', note:'A strong, less crowded entry point into the health sciences field.'},
  pathways:[
    {type:'University', qualification:'BSc Medical Science / Biomedical Sciences', duration:'3–4 years'},
    {type:'TVET', qualification:'National Diploma: Biomedical Technology', duration:'3 years + internship'},
  ],
  institutions:{universities:['University of Pretoria (UP)','University of the Free State (UFS)','University of the Witwatersrand (Wits)'], utech:['Central University of Technology (CUT)'], tvet:true},
  applicationNotes:'Register with the HPCSA. A good STEM-aligned route into healthcare without the extreme competitiveness of Medicine.',
  videoQuery:'what does a medical laboratory scientist do' },

// ---------------- NATURAL SCIENCES ----------------
{ id:'environmental-scientist', name:'Environmental Scientist', faculty:'natsci',
  blurb:'Studies ecosystems and human impact on the environment, and advises on sustainability and conservation.',
  dayInLife:'Fieldwork, sample analysis, writing environmental impact reports, and policy research.',
  riasec:['I','R'], strengths:['sciences','problem','practical'],
  requiredSubjects:['Life Sciences'], recommendedSubjects:['Physical Sciences','Geography'], relatedSubjects:[],
  recommendedMarks:[{subject:'Life Sciences',pct:60}],
  apsGuidance:{typical:'26–34', note:'Wide range of programmes with varying entry requirements.'},
  pathways:[{type:'University', qualification:'BSc Environmental Science', duration:'3 years, often + Honours'}],
  institutions:{universities:['University of Cape Town (UCT)','Stellenbosch University (SU)','North-West University (NWU)','Rhodes University (RU)'], utech:[], tvet:false},
  applicationNotes:'Field-based degree — outdoor fieldwork is often a core part of study.',
  videoQuery:'what does an environmental scientist do' },

{ id:'geologist', name:'Geologist', faculty:'natsci',
  blurb:'Studies the Earth\'s structure and materials — vital for mining, water, energy and construction industries.',
  dayInLife:'Fieldwork and sample collection, lab analysis, and mapping geological formations.',
  riasec:['I','R'], strengths:['sciences','maths','practical'],
  requiredSubjects:['Physical Sciences','Mathematics'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Physical Sciences',pct:60},{subject:'Mathematics',pct:60}],
  apsGuidance:{typical:'28–34', note:'South Africa\'s mining industry offers strong local demand for geoscience graduates.'},
  pathways:[{type:'University', qualification:'BSc Geology / Geological Sciences', duration:'3 years, often + Honours'}],
  institutions:{universities:['University of the Witwatersrand (Wits)','University of Pretoria (UP)','Stellenbosch University (SU)'], utech:[], tvet:false},
  applicationNotes:'Register with the South African Council for Natural Scientific Professions (SACNASP) once qualified.',
  videoQuery:'what does a geologist do South Africa mining' },

{ id:'biotechnologist', name:'Biotechnologist', faculty:'natsci',
  blurb:'Uses living organisms and biological processes to develop products in medicine, agriculture and industry.',
  dayInLife:'Laboratory research, experiments, data analysis and product development.',
  riasec:['I','C'], strengths:['sciences','problem','maths'],
  requiredSubjects:['Life Sciences','Physical Sciences'], recommendedSubjects:['Mathematics'], relatedSubjects:[],
  recommendedMarks:[{subject:'Life Sciences',pct:65},{subject:'Physical Sciences',pct:60}],
  apsGuidance:{typical:'28–36', note:'A growing field linked to medicine, agriculture and industrial science.'},
  pathways:[{type:'University', qualification:'BSc Biotechnology / Microbiology', duration:'3 years, often + Honours'}],
  institutions:{universities:['University of the Free State (UFS)','University of Pretoria (UP)','University of the Western Cape (UWC)'], utech:['Cape Peninsula University of Technology (CPUT)'], tvet:false},
  applicationNotes:'Postgraduate study (Honours/Masters) is common for research-focused biotechnology careers.',
  videoQuery:'what does a biotechnologist do' },

// ---------------- BUILT ENVIRONMENT ----------------
{ id:'architect', name:'Architect', faculty:'built',
  blurb:'Designs buildings and spaces, balancing function, safety, beauty and sustainability.',
  dayInLife:'Sketching and drafting designs, client meetings, site visits, and coordinating with engineers.',
  riasec:['A','R'], strengths:['creative','maths','problem'],
  requiredSubjects:['Mathematics'], recommendedSubjects:['Engineering Graphics and Design'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:60}],
  apsGuidance:{typical:'30–38', note:'A portfolio or drawing test is often required in addition to NSC marks.'},
  pathways:[{type:'University', qualification:'Bachelor of Architecture / BAS', duration:'3 years + 2 years professional (M Arch)'}],
  institutions:{universities:['University of Cape Town (UCT)','University of Pretoria (UP)','University of the Witwatersrand (Wits)','University of Johannesburg (UJ)'], utech:['Cape Peninsula University of Technology (CPUT)'], tvet:false},
  applicationNotes:'Register with the South African Council for the Architectural Profession (SACAP). A strong choice for learners who enjoy both maths and creative design.',
  videoQuery:'day in the life of an architect South Africa' },

{ id:'quantity-surveyor', name:'Quantity Surveyor', faculty:'built',
  blurb:'Manages the costs and contracts of construction projects from planning through to completion.',
  dayInLife:'Estimating costs, preparing tender documents, and managing budgets on construction sites.',
  riasec:['C','E'], strengths:['maths','problem','leadership'],
  requiredSubjects:['Mathematics'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:60}],
  apsGuidance:{typical:'28–34', note:'Strong graduate employment rate in South Africa\'s construction sector.'},
  pathways:[{type:'University', qualification:'BSc Quantity Surveying / Construction Studies', duration:'3–4 years'}],
  institutions:{universities:['University of Cape Town (UCT)','University of Pretoria (UP)','University of the Witwatersrand (Wits)','Nelson Mandela University (NMU)'], utech:['Durban University of Technology (DUT)'], tvet:true},
  applicationNotes:'Register with the South African Council for the Quantity Surveying Profession (SACQSP).',
  videoQuery:'what does a quantity surveyor do' },

{ id:'urban-planner', name:'Urban & Regional Planner', faculty:'built',
  blurb:'Plans how towns and cities grow — land use, transport, housing and public spaces.',
  dayInLife:'Analysing data and maps, community consultations, and drafting development plans.',
  riasec:['I','S'], strengths:['problem','language','leadership'],
  requiredSubjects:[], recommendedSubjects:['Geography','Mathematics'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:55}],
  apsGuidance:{typical:'26–32', note:'A good fit for learners interested in both people and systems-level problem solving.'},
  pathways:[{type:'University', qualification:'BSc/BA Urban and Regional Planning', duration:'3–4 years'}],
  institutions:{universities:['University of the Witwatersrand (Wits)','University of Cape Town (UCT)','University of Pretoria (UP)'], utech:[], tvet:false},
  applicationNotes:'Register with the South African Council for Planners (SACPLAN) once qualified.',
  videoQuery:'what does an urban planner do' },

// ---------------- AGRICULTURE ----------------
{ id:'agricultural-scientist', name:'Agricultural Scientist (Agronomist)', faculty:'agri',
  blurb:'Researches and improves crop production, soil health and farming methods.',
  dayInLife:'Field trials, soil and plant sampling, lab analysis, and advising farmers on best practice.',
  riasec:['I','R'], strengths:['sciences','problem','practical'],
  requiredSubjects:['Life Sciences'], recommendedSubjects:['Physical Sciences','Agricultural Sciences'], relatedSubjects:[],
  recommendedMarks:[{subject:'Life Sciences',pct:60}],
  apsGuidance:{typical:'26–32', note:'South Africa has strong agricultural science faculties supporting the farming sector.'},
  pathways:[{type:'University', qualification:'BSc Agriculture (Agronomy)', duration:'3–4 years, often + Honours'}],
  institutions:{universities:['University of Pretoria (UP)','Stellenbosch University (SU)','University of the Free State (UFS)','North-West University (NWU)'], utech:[], tvet:true},
  applicationNotes:'Register with SACNASP. Bursaries from agricultural companies and government are common for this field.',
  videoQuery:'what does an agricultural scientist do' },

{ id:'agricultural-engineer', name:'Agricultural Engineer', faculty:'agri',
  blurb:'Designs machinery, irrigation and systems that make farming more efficient and sustainable.',
  dayInLife:'Designing equipment or irrigation systems, testing machinery, and on-farm problem solving.',
  riasec:['R','I'], strengths:['maths','sciences','practical'],
  requiredSubjects:['Mathematics','Physical Sciences'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:65},{subject:'Physical Sciences',pct:60}],
  apsGuidance:{typical:'28–36', note:'A niche but valuable engineering specialisation for South Africa\'s agricultural economy.'},
  pathways:[{type:'University', qualification:'BEng / BSc (Agric) Agricultural Engineering', duration:'4 years'}],
  institutions:{universities:['University of Pretoria (UP)','University of KwaZulu-Natal (UKZN)'], utech:[], tvet:false},
  applicationNotes:'ECSA registration after graduating, similar to other engineering disciplines.',
  videoQuery:'what does an agricultural engineer do' },

// ---------------- FINANCE / ACTUARIAL / QUANT ----------------
{ id:'actuary', name:'Actuary', faculty:'finance',
  blurb:'Uses maths, statistics and financial theory to assess and manage risk — for insurers, pensions and investments.',
  dayInLife:'Building statistical models, pricing risk, and presenting findings to business leaders.',
  riasec:['I','C'], strengths:['maths','problem','tech'],
  requiredSubjects:['Mathematics'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:85}],
  apsGuidance:{typical:'38–42', note:'Requires one of the highest Mathematics marks of any career path — most programmes look closely at your Maths % directly, not just APS.'},
  pathways:[{type:'University', qualification:'BSc/BCom Actuarial Science', duration:'3–4 years + professional actuarial exams'}],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)'], utech:[], tvet:false},
  applicationNotes:'Professional qualification through the Actuarial Society of South Africa (ASSA) continues after your degree. Mathematical Literacy is not accepted for this pathway.',
  videoQuery:'what does an actuary do South Africa' },

{ id:'chartered-accountant', name:'Chartered Accountant CA(SA)', faculty:'finance',
  blurb:'Provides financial reporting, auditing, tax and strategic advice to businesses and organisations.',
  dayInLife:'Reviewing financial statements, advising clients, and ensuring compliance with financial regulations.',
  riasec:['C','E'], strengths:['maths','problem','leadership'],
  requiredSubjects:['Mathematics'], recommendedSubjects:['Accounting'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70}],
  apsGuidance:{typical:'32–38', note:'Programme must be SAICA-accredited to lead to the CA(SA) qualification.'},
  pathways:[{type:'University', qualification:'BCom Accounting (CA stream) + CTA + articles', duration:'3 years degree + 1 year CTA + 3 years articles + board exams'}],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)','University of Pretoria (UP)','University of Johannesburg (UJ)'], utech:[], tvet:false},
  applicationNotes:'Registered with SAICA (South African Institute of Chartered Accountants). Accounting as an NSC subject is helpful but not always compulsory — check each university\'s specific rule.',
  videoQuery:'what does a chartered accountant do South Africa' },

{ id:'financial-analyst', name:'Financial / Investment Analyst', faculty:'finance',
  blurb:'Researches companies, markets and investments to guide financial decision-making.',
  dayInLife:'Building financial models, researching companies and markets, and writing investment reports.',
  riasec:['E','C'], strengths:['maths','problem','leadership'],
  requiredSubjects:['Mathematics'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:70}],
  apsGuidance:{typical:'30–36', note:'Often entered via BCom Finance, Economics or Investment Management degrees.'},
  pathways:[{type:'University', qualification:'BCom Finance / Investment Management', duration:'3 years, often + CFA designation'}],
  institutions:{universities:['University of Cape Town (UCT)','University of Pretoria (UP)','University of Stellenbosch (SU)','University of the Witwatersrand (Wits)'], utech:[], tvet:false},
  applicationNotes:'The CFA (Chartered Financial Analyst) designation is a valuable add-on after your degree for global finance careers.',
  videoQuery:'what does a financial analyst do' },

{ id:'quantitative-analyst', name:'Quantitative Analyst ("Quant")', faculty:'finance',
  blurb:'Builds mathematical models to price financial instruments and manage investment risk.',
  dayInLife:'Coding trading and risk models, analysing market data, and testing mathematical strategies.',
  riasec:['I','C'], strengths:['maths','tech','problem'],
  requiredSubjects:['Mathematics'], recommendedSubjects:[], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:80}],
  apsGuidance:{typical:'36–42', note:'Extremely maths-intensive — usually requires postgraduate study (Honours/Masters in Maths, Stats, Actuarial Science or Financial Engineering).'},
  pathways:[{type:'University', qualification:'BSc Mathematics/Statistics/Actuarial Science + postgraduate specialisation', duration:'3 years + Honours/Masters'}],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)','Stellenbosch University (SU)'], utech:[], tvet:false},
  applicationNotes:'A rare, highly specialised career combining advanced mathematics with coding and finance.',
  videoQuery:'what does a quantitative analyst do' },

{ id:'economist', name:'Economist', faculty:'finance',
  blurb:'Studies how economies work — analysing trends in trade, employment, prices and policy.',
  dayInLife:'Analysing economic data, building forecasts, and writing policy or research reports.',
  riasec:['I','C'], strengths:['maths','problem','language'],
  requiredSubjects:['Mathematics'], recommendedSubjects:['Economics'], relatedSubjects:[],
  recommendedMarks:[{subject:'Mathematics',pct:65}],
  apsGuidance:{typical:'28–34', note:'Entry requirements vary depending on whether the degree is BCom or BA-based.'},
  pathways:[{type:'University', qualification:'BCom/BA Economics', duration:'3 years, often + Honours for research/policy roles'}],
  institutions:{universities:['University of Cape Town (UCT)','University of Pretoria (UP)','University of Stellenbosch (SU)','University of the Witwatersrand (Wits)'], utech:[], tvet:false},
  applicationNotes:'Roles exist in government (e.g. National Treasury, SARB), banks, and research institutions.',
  videoQuery:'what does an economist do' },

// ---------------- HUMANITIES & SOCIAL SCIENCES ----------------
{ id:'teacher', name:'Teacher', faculty:'humanities',
  blurb:'Plans and delivers lessons, assesses learner progress, and supports academic and personal development in a school classroom.',
  dayInLife:'Preparing lesson plans, teaching classes, marking assessments, managing classroom behaviour, and meeting with parents or colleagues.',
  riasec:['S','A'], strengths:['language','leadership','creative','people'],
  requiredSubjects:[], recommendedSubjects:['English Home Language'], relatedSubjects:[],
  recommendedMarks:[{subject:'English Home Language',pct:60}],
  apsGuidance:{typical:'24–30', note:'Generally more accessible than competitive faculties, though Funza Lushaka bursary places are merit-based and competitive. Specialising in a subject like Maths or Science for teaching needs a strong mark in that subject too.'},
  pathways:[
    {type:'University', qualification:'Bachelor of Education (B.Ed)', duration:'4 years'},
    {type:'University', qualification:'Bachelor’s degree + Postgraduate Certificate in Education (PGCE)', duration:'3 years + 1 year PGCE'},
  ],
  institutions:{universities:['University of Pretoria (UP)','University of Johannesburg (UJ)','Stellenbosch University (SU)','University of KwaZulu-Natal (UKZN)','North-West University (NWU)','University of South Africa (UNISA)'], utech:[], tvet:false},
  applicationNotes:'The Funza Lushaka bursary covers full study costs for priority subjects (Maths, Science, languages, Foundation Phase) in exchange for teaching at a public school after graduating. Registration with SACE (South African Council for Educators) is required to teach.',
  videoQuery:'day in the life of a teacher South Africa' },

{ id:'social-worker', name:'Social Worker', faculty:'humanities',
  blurb:'Supports individuals, families and communities facing hardship — connecting them with resources, protection and care.',
  dayInLife:'Home and community visits, case assessments, court reports for child protection matters, and coordinating support services.',
  riasec:['S','I'], strengths:['language','problem','leadership','people'],
  requiredSubjects:[], recommendedSubjects:['English Home Language'], relatedSubjects:[],
  recommendedMarks:[{subject:'English Home Language',pct:60}],
  apsGuidance:{typical:'26–32', note:'A 4-year professional degree — check each university’s specific Bachelor of Social Work requirements.'},
  pathways:[{type:'University', qualification:'Bachelor of Social Work (BSW)', duration:'4 years'}],
  institutions:{universities:['University of Pretoria (UP)','University of Johannesburg (UJ)','University of the Western Cape (UWC)','University of KwaZulu-Natal (UKZN)','North-West University (NWU)','Stellenbosch University (SU)'], utech:[], tvet:false},
  applicationNotes:'Registration with the SACSSP (South African Council for Social Service Professions) is required to practise. The Department of Social Development also offers a scholarship covering study costs in exchange for a period of government service after graduating.',
  videoQuery:'day in the life of a social worker South Africa' },

{ id:'graphic-designer', name:'Graphic Designer', faculty:'humanities',
  blurb:'Creates visual concepts — branding, layouts, illustrations and digital media — to communicate ideas and messages.',
  dayInLife:'Sketching concepts, designing in software like Adobe Illustrator/Photoshop, presenting drafts to clients, and preparing final artwork for print or digital use.',
  riasec:['A','C'], strengths:['creative','tech','language'],
  requiredSubjects:[], recommendedSubjects:['Visual Arts'], relatedSubjects:[],
  recommendedMarks:[{subject:'Visual Arts',pct:60}],
  apsGuidance:{typical:'24–30', note:'Most design programmes also require a portfolio submission and/or entrance test alongside NSC results.'},
  pathways:[
    {type:'University', qualification:'BA Visual Communication Design / Multimedia Design', duration:'3–4 years'},
    {type:'TVET', qualification:'National Diploma: Graphic Design', duration:'3 years'},
  ],
  institutions:{universities:['University of Johannesburg (UJ)','Stellenbosch University (SU)','Nelson Mandela University (NMU)'], utech:['Cape Peninsula University of Technology (CPUT)','Tshwane University of Technology (TUT)','Durban University of Technology (DUT)'], tvet:true},
  applicationNotes:'Most design schools require a portfolio of creative work submitted alongside your application — start building one early with sketches, digital designs or photography.',
  videoQuery:'day in the life of a graphic designer South Africa' },

{ id:'photographer', name:'Photographer', faculty:'humanities',
  blurb:'Captures and edits images for editorial, commercial, documentary or fine-art purposes.',
  dayInLife:'Shooting on location or in a studio, editing images in software like Lightroom/Photoshop, liaising with clients, and building a portfolio.',
  riasec:['A','R'], strengths:['creative','tech','practical'],
  requiredSubjects:[], recommendedSubjects:['Visual Arts'], relatedSubjects:[],
  recommendedMarks:[{subject:'Visual Arts',pct:55}],
  apsGuidance:{typical:'20–26', note:'Many programmes weigh a portfolio and interview alongside NSC results more heavily than APS alone.'},
  pathways:[
    {type:'TVET', qualification:'National Diploma: Photography', duration:'3 years'},
    {type:'University', qualification:'BA Photography / Visual Communication', duration:'3 years'},
  ],
  institutions:{universities:['University of Johannesburg (UJ)','Stellenbosch University (SU)'], utech:['Cape Peninsula University of Technology (CPUT)','Tshwane University of Technology (TUT)','Durban University of Technology (DUT)'], tvet:true},
  applicationNotes:'A strong self-built portfolio matters more to most employers than the qualification itself — start photographing and sharing your work early.',
  videoQuery:'day in the life of a photographer South Africa' },

{ id:'filmmaker', name:'Filmmaker', faculty:'humanities',
  blurb:'Writes, shoots, directs or edits film and television content, from concept through to final cut.',
  dayInLife:'Scriptwriting or storyboarding, coordinating cast and crew on set, filming, and editing footage in post-production.',
  riasec:['A','E'], strengths:['creative','leadership','tech'],
  requiredSubjects:[], recommendedSubjects:['English Home Language'], relatedSubjects:[],
  recommendedMarks:[{subject:'English Home Language',pct:60}],
  apsGuidance:{typical:'26–32', note:'A portfolio, showreel or written motivation is often required alongside NSC results, especially at specialist film schools.'},
  pathways:[
    {type:'University', qualification:'BA Film & Television / Motion Picture Medium', duration:'3 years'},
    {type:'TVET', qualification:'National Diploma: Film and Television Production', duration:'3 years'},
  ],
  institutions:{universities:['University of the Witwatersrand (Wits)','University of Cape Town (UCT)','Stellenbosch University (SU)'], utech:['Tshwane University of Technology (TUT)'], tvet:true},
  applicationNotes:'AFDA (The South African School of Motion Picture Medium and Live Performance) is a well-known private film school — private institutions set their own fees and admission process, separate from public university APS systems.',
  videoQuery:'day in the life of a filmmaker South Africa' },

{ id:'musician', name:'Musician', faculty:'humanities',
  blurb:'Performs, composes or produces music professionally — live, in the studio, or for film, TV and media.',
  dayInLife:'Practising and rehearsing, performing live or recording in a studio, and often teaching or freelancing between gigs.',
  riasec:['A','R'], strengths:['creative','practical'],
  requiredSubjects:[], recommendedSubjects:['Music'], relatedSubjects:[],
  recommendedMarks:[{subject:'Music',pct:55}],
  apsGuidance:{typical:'20–26', note:'Most music programmes require a live audition alongside (or instead of) strong NSC marks — start preparing repertoire early.'},
  pathways:[
    {type:'University', qualification:'Bachelor of Music (BMus)', duration:'3–4 years'},
    {type:'Work-integrated', qualification:'Freelance / session and gig work while building a portfolio, without a formal degree', duration:'Ongoing'},
  ],
  institutions:{universities:['University of Cape Town (UCT)','University of Pretoria (UP)','Stellenbosch University (SU)','University of the Witwatersrand (Wits)','University of KwaZulu-Natal (UKZN)'], utech:[], tvet:false},
  applicationNotes:'A live audition is usually the deciding factor for entry, not just your NSC results. Many working musicians also build careers without a formal degree, through gigging, teaching and session work.',
  videoQuery:'day in the life of a musician South Africa' },

{ id:'dancer', name:'Dancer / Choreographer', faculty:'humanities',
  blurb:'Performs, teaches or creates original dance work — for stage, screen, events or a dance company.',
  dayInLife:'Daily technique class and rehearsal, performances, and — for choreographers — planning and staging original routines.',
  riasec:['A','R'], strengths:['creative','practical'],
  requiredSubjects:[], recommendedSubjects:['Dramatic Arts'], relatedSubjects:[],
  recommendedMarks:[{subject:'Dramatic Arts',pct:55}],
  apsGuidance:{typical:'20–26', note:'A live audition demonstrating technique is typically required alongside NSC results.'},
  pathways:[
    {type:'University', qualification:'BA Dance / BA Live Performance', duration:'3 years'},
    {type:'Work-integrated', qualification:'Company apprenticeship or full-time training school', duration:'Varies'},
  ],
  institutions:{universities:['University of Cape Town (UCT)','University of the Witwatersrand (Wits)'], utech:['Tshwane University of Technology (TUT)'], tvet:false},
  applicationNotes:'A live audition is standard for entry. Professional dance careers are physically demanding and performance-based, and many dancers also teach to supplement income.',
  videoQuery:'day in the life of a professional dancer South Africa' },
];

// NSC 7-point achievement scale used for APS calculations (general guidance — verify per institution)
const NSC_LEVELS = [
  { level:7, min:80, max:100, desc:'Outstanding' },
  { level:6, min:70, max:79,  desc:'Meritorious' },
  { level:5, min:60, max:69,  desc:'Substantial' },
  { level:4, min:50, max:59,  desc:'Adequate' },
  { level:3, min:40, max:49,  desc:'Moderate' },
  { level:2, min:30, max:39,  desc:'Elementary' },
  { level:1, min:0,  max:29,  desc:'Not achieved' },
];
function nscLevel(pct){
  pct = Math.max(0, Math.min(100, Number(pct)||0));
  const row = NSC_LEVELS.find(r => pct >= r.min && pct <= r.max) || NSC_LEVELS[NSC_LEVELS.length-1];
  return row.level;
}
