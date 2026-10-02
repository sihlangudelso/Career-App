/* ============================================================
   GRADE 9 SUBJECT CHOICE ASSESSMENT -- CONFIGURATION
   Everything you might want to tune lives in this one file; the
   scoring logic itself (js/subject_choice_engine.js) has no numbers or
   wording of its own that you'd need to hunt for.

   How a subject's score is built (all 0-100):
     Interest        <- the learner's answers to the questions below
     Personality     <- the existing personality assessment (RIASEC +
                        strengths + Grade 9 work-style), mapped to 8
                        traits (SC_TRAITS), then to each subject
     Academic        <- the learner's Grade 9 report (or current marks)
                        for the learning areas each subject builds on
     Overall         <- weighted mix of the three (SC_CONFIG.weights)

   To add a subject: add it to SC_SUBJECTS, give it questions in
   SC_QUESTIONS (weights can also spread onto other subjects), and
   (optionally) add it to a combination in SC_COMBOS.
   ============================================================ */

const SC_CONFIG = {
  // Bump when the question bank changes in a way old answers shouldn't be
  // blended with (stored alongside a learner's answers).
  bankVersion: 1,
  questionsPerPage: 6,
  scaleLabels: ['Definitely not me', 'Not really me', 'Sometimes me', 'Mostly me', 'Definitely me'],

  // Overall subject score = interest*0.40 + personality*0.25 + academic*0.35.
  // Must add up to 1. If a component isn't available for a subject (e.g. no
  // marks that map to it), the remaining weights are re-scaled to fit.
  weights: { interest: 0.40, personality: 0.25, academic: 0.35 },

  // Cut-offs for the High / Moderate / Low labels shown for interest,
  // personality alignment and natural fit (all 0-100).
  levels: { high: 65, moderate: 45 },

  // Academic readiness bands, checked top-down. `tier` feeds the simpler
  // Strong / Developing / Needs support indicator.
  readinessBands: [
    { min: 80, key: 'strong',     label: 'Strong',        full: 'Strong academic readiness',          tier: 'Strong' },
    { min: 70, key: 'good',       label: 'Good',          full: 'Good academic readiness',            tier: 'Strong' },
    { min: 60, key: 'reasonable', label: 'Reasonable',    full: 'Reasonable academic readiness',      tier: 'Developing' },
    { min: 50, key: 'developing', label: 'Developing',    full: 'Developing readiness',               tier: 'Developing' },
    { min: 0,  key: 'support',    label: 'Needs support', full: 'Additional support may be needed',   tier: 'Needs support' },
  ],
  // A subject's readiness is only worked out if at least this share of its
  // academic inputs (by weight) have a mark -- otherwise one unrelated mark
  // could stand in for the whole subject.
  minAcademicCoverage: 0.5,

  // Recommendation categories, checked in this order (first match wins).
  category: {
    strong:     { interestMin: 65, personalityMin: 50, academicMin: 60 },
    foundation: { interestMin: 65, personalityMin: 50, academicBelow: 60 },
    academic:   { academicMin: 70, interestBelow: 55 },
    lower:      { interestBelow: 45, personalityBelow: 45 },
    // anything else is "possible"
  },

  // How much of the report to show.
  report: {
    topMatches: 5, minTopMatches: 3, exploreMax: 5, effortMax: 4,
    combos: 3, minComboScore: 45,
    careerClusters: 4, careersPerCluster: 4,
    workOnBelow: 65,   // a learning-area mark under this gets a "work on" tip
    workOnMax: 5,
  },

  // Profile summary: a trait must average at least this to be called a
  // thing the learner "enjoys".
  profile: { traitMin: 60, topTraits: 3 },

  // Mathematics vs Mathematical Literacy decision.
  math: {
    careerSample: 12,     // how many top career matches to look at
    needHigh: 0.5,        // share of likely pathways needing Maths = "high need"
    needLow: 0.25,        // below this = "low need"
    weakReadiness: 60,    // Maths result under this = "may need support"
    interestLow: 45, alignmentLow: 45,
    strongOverall: 65,
    litMaxReadiness: 70,  // a Maths result at or above this is not a reason to lean to Maths Literacy
  },
  // How strongly a subject's usual study paths need Mathematics (not Maths
  // Lit) -- see `mathRequirement` on each subject below.
  mathRequirementValue: { strong: 1, common: 0.6, none: 0 },
};

/* ------------------------------------------------------------
   Fixed wording (spec wording kept as written)
   ------------------------------------------------------------ */
const SC_COPY = {
  lowerAlignment: 'This subject currently shows less alignment with your interests and preferred way of working. That does not mean you cannot succeed in it, but you may find it requires more deliberate effort than some of your stronger matches.',
  finalDecision: 'The final decision should also consider your school’s subject availability and future university requirements.',
  mathHighNeedWeak: 'Mathematics is important for several pathways you are interested in. Your current result suggests that you may need additional support rather than automatically switching to Mathematical Literacy.',
  // Used instead of the two messages below when there is no Mathematics mark
  // to base "your current results ..." on.
  mathHighNeedNoMarks: 'Mathematics keeps the widest range of the pathways you are interested in open. Add a Mathematics mark to see how your current results compare.',
  mathStrongFitNoMarks: 'Mathematics looks like a good fit for you — it matches how you like to think. Add a Mathematics mark to see how your current results compare.',
  mathHighNeedOk: 'Mathematics keeps the widest range of the pathways you are interested in open, and your current results suggest you are well placed to continue with it.',
  mathLowNeed: 'Mathematical Literacy may suit your interests and how you like to work, but review the admission requirements of careers you are considering before making the change.',
  mathStrongFit: 'Mathematics looks like a good fit for you — it matches how you like to think, and your current results support it.',
  mathInterestWeak: 'You show real interest in Mathematics, and your current result suggests that extra support and practice before Grade 10 could make a real difference — that is worth exploring rather than automatically switching to Mathematical Literacy.',
  mathEither: 'Both Mathematics and Mathematical Literacy are worth talking through with your teacher. Mathematical Literacy focuses on using mathematics in everyday life and work — a different, equally valuable route — so the right choice depends on the pathways you want to keep open.',
  mathAlways: 'Whichever you choose, check the admission requirements of the careers you are considering — some study paths require Mathematics.',
};

const SC_CATEGORIES = {
  strong:     { label: 'Strong match',                                 badge: 'badge-strong' },
  foundation: { label: 'High interest — build the foundation',         badge: 'badge-good' },
  academic:   { label: 'Academically strong — check your interest',    badge: 'badge-explore' },
  possible:   { label: 'Possible match',                               badge: 'badge-good' },
  lower:      { label: 'Lower natural alignment',                      badge: 'badge-low' },
};

/* ------------------------------------------------------------
   Personality traits -- derived from the existing assessment data.
   Each trait is a weighted blend of values that are already 0-100:
     riasec    : learner.riasec[R|I|A|S|E|C]
     strengths : learner.strengths[<STRENGTH_KEYS id>]
     workStyle : learner.workStyle[<WORK_STYLE_QUESTIONS key>]
                 (invert:true flips it, because those sliders run from
                 one pole to the other)
   Sources the learner has no data for are skipped and the rest re-scaled.
   ------------------------------------------------------------ */
const SC_TRAITS = {
  analytical: { label: 'Analytical & logical', phrase: 'analytical, logical thinking', sources: [
    { from: 'riasec', key: 'I', w: 0.30 }, { from: 'riasec', key: 'C', w: 0.10 },
    { from: 'strengths', key: 'problem', w: 0.30 }, { from: 'strengths', key: 'maths', w: 0.20 },
    { from: 'strengths', key: 'tech', w: 0.10 } ] },
  investigative: { label: 'Curious & investigative', phrase: 'finding out how things work', sources: [
    { from: 'riasec', key: 'I', w: 0.45 }, { from: 'strengths', key: 'sciences', w: 0.30 },
    { from: 'strengths', key: 'problem', w: 0.25 } ] },
  creative: { label: 'Creative', phrase: 'creative thinking', sources: [
    { from: 'riasec', key: 'A', w: 0.55 }, { from: 'strengths', key: 'creative', w: 0.45 } ] },
  organised: { label: 'Organised & detail-focused', phrase: 'organised, detail-focused work', sources: [
    { from: 'riasec', key: 'C', w: 0.40 }, { from: 'strengths', key: 'organisation', w: 0.35 },
    { from: 'workStyle', key: 'structureVsFlexible', invert: true, w: 0.15 },
    { from: 'workStyle', key: 'detailVsBigPicture', invert: true, w: 0.10 } ] },
  people: { label: 'People-oriented', phrase: 'working with and helping people', sources: [
    { from: 'riasec', key: 'S', w: 0.40 }, { from: 'strengths', key: 'people', w: 0.35 },
    { from: 'workStyle', key: 'teamVsSolo', w: 0.25 } ] },
  persuasive: { label: 'Persuasive & leadership', phrase: 'leading and persuading others', sources: [
    { from: 'riasec', key: 'E', w: 0.35 }, { from: 'strengths', key: 'leadership', w: 0.25 },
    { from: 'strengths', key: 'enterprise', w: 0.20 }, { from: 'workStyle', key: 'leadVsSupport', w: 0.20 } ] },
  practical: { label: 'Practical & hands-on', phrase: 'practical, hands-on work', sources: [
    { from: 'riasec', key: 'R', w: 0.45 }, { from: 'strengths', key: 'practical', w: 0.40 },
    { from: 'strengths', key: 'tech', w: 0.15 } ] },
  reflective: { label: 'Reflective & philosophical', phrase: 'reflecting on ideas and big questions', sources: [
    { from: 'riasec', key: 'A', w: 0.20 }, { from: 'riasec', key: 'I', w: 0.20 }, { from: 'riasec', key: 'S', w: 0.15 },
    { from: 'strengths', key: 'language', w: 0.30 }, { from: 'workStyle', key: 'teamVsSolo', invert: true, w: 0.15 } ] },
};

/* ------------------------------------------------------------
   Subject families (used for the profile summary wording) and pathway
   labels (used for "may support pathways such as ...").
   ------------------------------------------------------------ */
const SC_FAMILIES = {
  stem:       { label: 'analytical and scientific subjects' },
  commerce:   { label: 'business and commerce subjects' },
  humanities: { label: 'humanities and language subjects' },
  technology: { label: 'technology and design subjects' },
  creative:   { label: 'creative and performing arts subjects' },
  service:    { label: 'service, tourism and hospitality subjects' },
};

const SC_PATHWAYS = {
  engineering: 'Engineering', physicalScience: 'Physical sciences', health: 'Health sciences',
  healthSome: 'Some health sciences', technology: 'Technology', builtEnvironment: 'Built environment',
  computing: 'Computing & software', data: 'Data & analytics', finance: 'Finance & accounting',
  economics: 'Economics & public policy', business: 'Business & management', entrepreneurship: 'Entrepreneurship',
  marketing: 'Marketing', hr: 'Human resources', law: 'Law', politics: 'Politics & public policy',
  journalism: 'Journalism & media', humanities: 'Humanities & social sciences', research: 'Research',
  communication: 'Communication', education: 'Teaching & education', design: 'Design & architecture',
  creativeArts: 'Creative arts', performingArts: 'Performing arts', music: 'Music & sound',
  tourism: 'Tourism & travel', hospitality: 'Hospitality & events', food: 'Food & nutrition',
  agriculture: 'Agriculture & food production', environment: 'Environmental science', admin: 'Office & business administration',
  socialWork: 'Social work & community development', psychology: 'Psychology & counselling',
  lifeSciences: 'Life & biological sciences', mathematics: 'Mathematics & statistics', trades: 'Technical & trade careers',
  geography: 'Geography & planning', everyday: 'Everyday & workplace numeracy',
};

/* ------------------------------------------------------------
   "What to work on" tips, keyed by Grade 9 learning area (or the
   'Language' blend of Home + First Additional Language).
   ------------------------------------------------------------ */
const SC_AREA_TIPS = {
  'Mathematics': 'Strengthen your Mathematics fundamentals — especially algebra — with short, regular practice.',
  'Natural Sciences': 'Revisit the Natural Sciences basics (energy, forces, matter and living systems) so Grade 10 sciences feel familiar.',
  'Language': 'Reading more regularly and practising written answers can strengthen your language and comprehension skills, which matter across many subjects.',
  'Economic and Management Sciences': 'Revisit your EMS basics — budgeting, how businesses work and how money flows.',
  'Social Sciences': 'Strengthen your Social Sciences skills — reading maps and sources and writing structured answers.',
  'Technology': 'Spend more time on practical Technology tasks — designing, drawing and solving problems with real materials or software.',
  'Creative Arts': 'Keep building your Creative Arts practice — regular creating or rehearsing makes a visible difference.',
  'Overall': 'Steady, regular study across all your subjects builds the habits that subjects like this one rely on.',
};
// Traits that describe a person rather than an activity. Their phrases are
// fine after "you enjoy ...", but are never used for the "less interest so far
// in ..." sentence, where they would read as a verdict on the learner.
const SC_CHARACTER_TRAITS = { 'Empathy': true, 'Confidence': true, 'Discipline': true, 'Teamwork': true, 'Language confidence': true };
// Pseudo-areas: an area name that is really a blend of other marks.
const SC_AREA_ALIASES = {
  'Language': ['Home Language', 'First Additional Language'],
};

/* ------------------------------------------------------------
   Short, friendly phrases for each interest trait, used to build
   sentences like "You seem to enjoy solving problems and spotting
   patterns." A trait with no entry just falls back to its own name.
   ------------------------------------------------------------ */
const SC_TRAIT_PHRASES = {
  'Reading': 'reading and thinking about what you read', 'Writing': 'putting ideas into words',
  'Communication': 'explaining ideas to other people', 'Interpretation': 'noticing how words and ideas are used',
  'Argument': 'making and debating a point', 'Language confidence': 'speaking up and sharing ideas',
  'Logical reasoning': 'thinking logically', 'Pattern recognition': 'spotting patterns',
  'Abstract thinking': 'working with ideas, not just facts', 'Problem solving': 'solving problems',
  'Numerical confidence': 'working with numbers', 'Everyday numeracy': 'using numbers in everyday life',
  'Financial awareness': 'understanding money', 'Data interpretation': 'making sense of data and statistics',
  'Measurement and planning': 'measuring and planning practical projects', 'Practical problem solving': 'applying maths to real situations',
  'Scientific curiosity': 'asking how and why the physical world works', 'Cause-and-effect reasoning': 'working out causes and effects',
  'Experimentation': 'testing and building things', 'Technical problem solving': 'working out how machines and devices work',
  'Biological curiosity': 'exploring living things', 'Observation': 'observing closely',
  'Human health interest': 'understanding the human body and health', 'Environmental interest': 'understanding the environment',
  'Entrepreneurship': 'coming up with business ideas', 'Commercial thinking': 'understanding how businesses work',
  'Business strategy': 'planning how to sell and promote things', 'Leadership': 'leading and taking initiative',
  'Financial curiosity': 'understanding how money works', 'Financial accuracy': 'keeping track of money accurately',
  'Numerical organisation': 'organising numbers carefully', 'Attention to detail': 'getting the details right',
  'Structured thinking': 'working step by step', 'Economic curiosity': 'wondering why prices and economies change',
  'Systems thinking': 'seeing how the parts of a system connect', 'Social and economic awareness': 'understanding how society and the economy affect people',
  'Analytical reasoning': 'analysing why things change', 'Philosophy': 'exploring big questions about fairness and ideas',
  'Critical thinking': 'weighing up different sides', 'Society': 'understanding how societies work',
  'Human behaviour': 'understanding why people act the way they do', 'Historical curiosity': 'seeing how the past shapes the present',
  'Spatial thinking': 'understanding maps and places', 'Human geography': 'understanding how people and places interact',
  'Map and data interpretation': 'interpreting maps and data', 'Travel interest': 'exploring places and travel',
  'Service orientation': 'helping people have a great experience', 'Planning': 'planning experiences',
  'Cultural curiosity': 'learning about different cultures', 'Digital productivity': 'getting things done efficiently on a computer',
  'Organisation': 'organising information', 'Practical technology use': 'using technology to solve everyday problems',
  'Coding interest': 'creating programs and apps', 'Computational thinking': 'breaking problems into steps a computer can follow',
  'Logic': 'solving logic problems', 'Technology curiosity': 'wondering how technology works',
  'Spatial reasoning': 'imagining objects from different angles', 'Visualisation': 'picturing designs before they exist',
  'Precision': 'working accurately and precisely', 'Technical design': 'working out how things should be built',
  'Creativity': 'imagining new ideas', 'Visual thinking': 'noticing colour, shape and layout',
  'Expression': 'expressing ideas creatively', 'Originality': 'creating original work',
  'Confidence': 'performing with confidence', 'Empathy': 'understanding how other people feel',
  'Storytelling': 'telling stories', 'Collaboration': 'creating things with a group',
  'Musical ear': 'noticing melody and sound', 'Rhythm': 'feeling rhythm and beat',
  'Performance': 'performing for other people', 'Discipline': 'practising until it is right',
  'Practical creativity': 'making practical, creative things', 'Food and nutrition interest': 'understanding food and nutrition',
  'Consumer awareness': 'comparing products and value', 'Making and design': 'making and designing useful things',
  'Everyday life skills': 'learning skills you can use straight away', 'Customer care': 'making guests feel welcome',
  'Event planning': 'organising events', 'Practical skills': 'working practically with your hands',
  'Teamwork': 'staying calm and working with others', 'Food-system curiosity': 'understanding where food comes from',
  'Land and animals': 'working with land, plants and animals', 'Environmental problem solving': 'solving environmental problems',
  'Applied science': 'using science to improve real things', 'Farming technology': 'exploring farming technology',
  'Community awareness': 'understanding community issues', 'Cultural understanding': 'understanding cultures and beliefs',
  'Helping and advocacy': 'helping others and speaking up', 'Social curiosity': 'understanding laws, rights and leaders',
};

/* ------------------------------------------------------------
   Subject profiles.
     academicInputs  : Grade 9 learning areas (or the 'Language' blend /
                       'Overall' = average of all marks except Life
                       Orientation) with a weight each
     personalityTraits: SC_TRAITS ids with a weight each
     mathRequirement : how often this subject's usual study paths need
                       Mathematics (not Maths Lit): strong | common | none
     fetNames        : Grade 10-12 subject name(s) used to find related
                       career clusters in the career database
   ------------------------------------------------------------ */
const SC_SUBJECTS = {
  mathematics: {
    label: 'Mathematics', family: 'stem', fetNames: ['Mathematics'],
    covers: 'algebra, functions, geometry, trigonometry and logical problem-solving',
    interestTraits: ['Logical reasoning', 'Pattern recognition', 'Abstract thinking', 'Problem solving', 'Numerical confidence'],
    personalityTraits: { analytical: 1, investigative: 0.4 },
    academicInputs: [{ area: 'Mathematics', w: 1 }],
    pathwayTags: ['engineering', 'physicalScience', 'computing', 'data', 'finance', 'mathematics'],
    mathRequirement: null,
    note: 'Every learner takes either Mathematics or Mathematical Literacy.',
    foundationTip: 'Practise algebra and problem-solving little and often — short, regular sessions work better than last-minute cramming.',
  },
  mathematicalLiteracy: {
    label: 'Mathematical Literacy', family: 'commerce', fetNames: ['Mathematical Literacy'],
    covers: 'using mathematics in everyday life and work — finance, measurement, data and interpreting information',
    interestTraits: ['Everyday numeracy', 'Financial awareness', 'Data interpretation', 'Measurement and planning', 'Practical problem solving'],
    personalityTraits: { practical: 0.6, organised: 0.6, analytical: 0.5 },
    academicInputs: [{ area: 'Mathematics', w: 1 }],
    pathwayTags: ['everyday', 'business', 'admin', 'trades', 'hospitality'],
    mathRequirement: null,
    note: 'Every learner takes either Mathematics or Mathematical Literacy.',
    foundationTip: 'Build confidence with everyday number work — percentages, budgets, measurement and reading tables and graphs.',
  },
  physicalSciences: {
    label: 'Physical Sciences', family: 'stem', fetNames: ['Physical Sciences'],
    covers: 'physics and chemistry — forces, energy, electricity, matter and chemical reactions',
    interestTraits: ['Scientific curiosity', 'Cause-and-effect reasoning', 'Experimentation', 'Technical problem solving'],
    personalityTraits: { analytical: 1, investigative: 1, practical: 0.6 },
    academicInputs: [{ area: 'Mathematics', w: 1 }, { area: 'Natural Sciences', w: 1 }],
    pathwayTags: ['engineering', 'physicalScience', 'healthSome', 'technology', 'builtEnvironment'],
    mathRequirement: 'strong',
    foundationTip: 'Strengthen your algebra and equation-solving, and revisit the Natural Sciences basics on energy, forces and chemical reactions.',
  },
  lifeSciences: {
    label: 'Life Sciences', family: 'stem', fetNames: ['Life Sciences'],
    covers: 'biology — the human body, genetics, ecosystems, evolution and living things',
    interestTraits: ['Biological curiosity', 'Observation', 'Human health interest', 'Environmental interest'],
    personalityTraits: { investigative: 1, people: 0.5 },
    academicInputs: [{ area: 'Natural Sciences', w: 1 }, { area: 'Language', w: 0.5 }],
    pathwayTags: ['healthSome', 'lifeSciences', 'environment', 'research', 'agriculture'],
    mathRequirement: 'common',
    foundationTip: 'Revisit the Natural Sciences life-science topics and practise reading and explaining scientific text in your own words.',
  },
  accounting: {
    label: 'Accounting', family: 'commerce', fetNames: ['Accounting'],
    covers: 'recording, analysing and reporting financial information accurately',
    interestTraits: ['Financial accuracy', 'Numerical organisation', 'Attention to detail', 'Structured thinking'],
    personalityTraits: { analytical: 1, organised: 1 },
    academicInputs: [{ area: 'Mathematics', w: 1 }, { area: 'Economic and Management Sciences', w: 1 }],
    pathwayTags: ['finance', 'business', 'admin', 'entrepreneurship'],
    mathRequirement: 'common',
    foundationTip: 'Strengthen your number work and practise checking calculations carefully — accuracy matters more than speed at first.',
  },
  businessStudies: {
    label: 'Business Studies', family: 'commerce', fetNames: ['Business Studies'],
    covers: 'how businesses are started, managed, marketed and run ethically',
    interestTraits: ['Entrepreneurship', 'Commercial thinking', 'Business strategy', 'Leadership', 'Financial curiosity'],
    personalityTraits: { people: 1, persuasive: 1 },
    academicInputs: [{ area: 'Economic and Management Sciences', w: 1 }, { area: 'Language', w: 0.7 }],
    pathwayTags: ['entrepreneurship', 'business', 'marketing', 'hr'],
    mathRequirement: 'none',
    foundationTip: 'Build your reading and writing confidence — much of the subject is explaining and applying ideas in your own words.',
  },
  economics: {
    label: 'Economics', family: 'commerce', fetNames: ['Economics'],
    covers: 'how people, businesses and governments make economic decisions — prices, growth, trade and inequality',
    interestTraits: ['Economic curiosity', 'Systems thinking', 'Social and economic awareness', 'Analytical reasoning'],
    personalityTraits: { analytical: 1, persuasive: 1 },
    academicInputs: [{ area: 'Mathematics', w: 1 }, { area: 'Economic and Management Sciences', w: 1 }, { area: 'Language', w: 0.5 }],
    pathwayTags: ['economics', 'finance', 'politics', 'business', 'research'],
    mathRequirement: 'common',
    foundationTip: 'Practise reading graphs and working with percentages, and follow news about prices, jobs and the economy for real-life context.',
  },
  geography: {
    label: 'Geography', family: 'humanities', fetNames: ['Geography'],
    covers: 'physical geography (climate, landforms, water) and human geography (settlement, development, resources), with mapwork and data',
    interestTraits: ['Spatial thinking', 'Environmental interest', 'Human geography', 'Map and data interpretation'],
    personalityTraits: { investigative: 1, reflective: 0.3 },
    academicInputs: [{ area: 'Social Sciences', w: 1 }, { area: 'Mathematics', w: 0.4 }, { area: 'Natural Sciences', w: 0.4 }],
    pathwayTags: ['environment', 'geography', 'builtEnvironment', 'tourism', 'research'],
    mathRequirement: 'common',
    foundationTip: 'Practise reading maps and graphs, and revisit your Social Sciences geography topics.',
  },
  history: {
    label: 'History', family: 'humanities', fetNames: ['History'],
    covers: 'how and why societies change — power, conflict, human rights, working with sources and building arguments',
    interestTraits: ['Philosophy', 'Critical thinking', 'Argument', 'Society', 'Human behaviour', 'Historical curiosity'],
    personalityTraits: { investigative: 1, persuasive: 1, reflective: 1 },
    academicInputs: [{ area: 'Social Sciences', w: 1 }, { area: 'Language', w: 0.8 }],
    pathwayTags: ['law', 'politics', 'journalism', 'humanities', 'research', 'communication'],
    mathRequirement: 'none',
    foundationTip: 'Read widely and practise writing structured answers — working with sources and writing essays are central to the subject.',
  },
  tourism: {
    label: 'Tourism', family: 'service', fetNames: ['Tourism'],
    covers: 'travel, destinations, cultures, tourism services and planning',
    interestTraits: ['Travel interest', 'Service orientation', 'Planning', 'Cultural curiosity'],
    personalityTraits: { people: 1, organised: 0.4 },
    academicInputs: [{ area: 'Social Sciences', w: 0.8 }, { area: 'Economic and Management Sciences', w: 0.8 }, { area: 'Language', w: 0.5 }],
    pathwayTags: ['tourism', 'hospitality', 'business', 'communication'],
    mathRequirement: 'none',
    foundationTip: 'Build your general knowledge of places and cultures, and practise organising and presenting information clearly.',
  },
  computerApplicationsTechnology: {
    label: 'Computer Applications Technology', family: 'technology', fetNames: ['Computer Applications Technology'],
    covers: 'using software and digital tools — word processing, spreadsheets, databases and presentations — to solve everyday and business problems',
    interestTraits: ['Digital productivity', 'Organisation', 'Practical technology use'],
    personalityTraits: { organised: 1, practical: 0.5 },
    academicInputs: [{ area: 'Technology', w: 1 }, { area: 'Overall', w: 0.6 }],
    pathwayTags: ['admin', 'business', 'technology'],
    mathRequirement: 'none',
    foundationTip: 'Spend regular time on a computer — at school or a library works well — practising word processing, spreadsheets and presentations.',
  },
  informationTechnology: {
    label: 'Information Technology', family: 'technology', fetNames: ['Information Technology'],
    covers: 'programming, databases, networks and how technology systems work',
    interestTraits: ['Coding interest', 'Computational thinking', 'Logic', 'Problem solving', 'Technology curiosity'],
    personalityTraits: { analytical: 1, investigative: 1 },
    academicInputs: [{ area: 'Mathematics', w: 1 }, { area: 'Technology', w: 1 }],
    pathwayTags: ['computing', 'data', 'technology', 'engineering'],
    mathRequirement: 'common',
    foundationTip: 'Try a beginner coding or logic-puzzle site (at school or a library works too), and strengthen your Mathematics basics — they support programming.',
  },
  engineeringGraphicsAndDesign: {
    label: 'Engineering Graphics and Design', family: 'technology', fetNames: ['Engineering Graphics and Design'],
    covers: 'technical drawing, design and visualising objects and structures',
    interestTraits: ['Spatial reasoning', 'Visualisation', 'Precision', 'Technical design'],
    personalityTraits: { organised: 1, practical: 1, creative: 0.4 },
    academicInputs: [{ area: 'Mathematics', w: 1 }, { area: 'Technology', w: 1 }],
    pathwayTags: ['engineering', 'builtEnvironment', 'design', 'technology', 'trades'],
    mathRequirement: 'common',
    foundationTip: 'Practise neat, accurate drawing and measuring, and strengthen your geometry from Mathematics and Technology.',
  },
  visualArts: {
    label: 'Visual Arts', family: 'creative', fetNames: ['Visual Arts'],
    covers: 'drawing, design and creating original visual work, plus studying art and culture',
    interestTraits: ['Creativity', 'Visual thinking', 'Expression', 'Originality'],
    personalityTraits: { creative: 1, reflective: 0.6 },
    academicInputs: [{ area: 'Creative Arts', w: 1 }],
    pathwayTags: ['design', 'creativeArts', 'marketing', 'communication'],
    mathRequirement: 'none',
    foundationTip: 'Keep a sketchbook and make time to draw or create regularly — practice builds technique and confidence.',
  },
  dramaticArts: {
    label: 'Dramatic Arts', family: 'creative', fetNames: ['Dramatic Arts'],
    covers: 'performance, voice, movement, script work and creating theatre',
    interestTraits: ['Expression', 'Confidence', 'Empathy', 'Storytelling', 'Collaboration'],
    personalityTraits: { creative: 1, reflective: 0.6, people: 0.6, persuasive: 0.3 },
    academicInputs: [{ area: 'Creative Arts', w: 1 }, { area: 'Language', w: 0.5 }],
    pathwayTags: ['performingArts', 'creativeArts', 'communication', 'education'],
    mathRequirement: 'none',
    foundationTip: 'Look for chances to perform, read aloud or join a drama group — confidence grows with practice, and many schools expect some prior drama experience.',
  },
  music: {
    label: 'Music', family: 'creative', fetNames: ['Music'],
    covers: 'performing, creating and studying music',
    interestTraits: ['Musical ear', 'Rhythm', 'Performance', 'Creativity', 'Discipline'],
    personalityTraits: { creative: 1, reflective: 0.6, organised: 0.3 },
    academicInputs: [{ area: 'Creative Arts', w: 1 }],
    pathwayTags: ['music', 'performingArts', 'creativeArts', 'education'],
    mathRequirement: 'none',
    foundationTip: 'Regular instrument or voice practice matters here; many schools also expect some prior practical music experience.',
  },
  consumerStudies: {
    label: 'Consumer Studies', family: 'service', fetNames: ['Consumer Studies'],
    covers: 'food, clothing, housing and consumer choices — practical work and theory',
    interestTraits: ['Practical creativity', 'Food and nutrition interest', 'Consumer awareness', 'Making and design', 'Everyday life skills'],
    personalityTraits: { practical: 1, organised: 0.4, people: 0.3 },
    academicInputs: [{ area: 'Natural Sciences', w: 0.6 }, { area: 'Economic and Management Sciences', w: 0.6 }, { area: 'Technology', w: 0.4 }],
    pathwayTags: ['food', 'hospitality', 'design', 'business', 'education'],
    mathRequirement: 'none',
    foundationTip: 'Get practical — cooking, sewing or home projects — and revisit the Natural Sciences topics on food and materials.',
  },
  hospitalityStudies: {
    label: 'Hospitality Studies', family: 'service', fetNames: ['Hospitality Studies'],
    covers: 'food and beverage service, kitchen and hospitality operations, and events',
    interestTraits: ['Customer care', 'Event planning', 'Practical skills', 'Teamwork', 'Service orientation'],
    personalityTraits: { organised: 1, people: 1, practical: 1 },
    academicInputs: [{ area: 'Economic and Management Sciences', w: 1 }, { area: 'Technology', w: 0.4 }, { area: 'Language', w: 0.4 }],
    pathwayTags: ['hospitality', 'tourism', 'food', 'business', 'entrepreneurship'],
    mathRequirement: 'none',
    foundationTip: 'Gain practical experience helping with meals or events, and strengthen your EMS and organising skills.',
  },
  agriculturalSciences: {
    label: 'Agricultural Sciences', family: 'stem', fetNames: ['Agricultural Sciences'],
    covers: 'soil, plants, animals, farming systems and food production',
    interestTraits: ['Food-system curiosity', 'Land and animals', 'Environmental problem solving', 'Applied science', 'Farming technology'],
    personalityTraits: { practical: 1, investigative: 0.6 },
    academicInputs: [{ area: 'Natural Sciences', w: 1 }, { area: 'Mathematics', w: 0.5 }],
    pathwayTags: ['agriculture', 'environment', 'food', 'lifeSciences', 'business'],
    mathRequirement: 'common',
    foundationTip: 'Revisit Natural Sciences topics on plants, animals and soil, and keep your Mathematics basics strong.',
  },
  languages: {
    label: 'Languages / English', family: 'humanities', fetNames: [],
    covers: 'reading, writing, speaking and analysing texts',
    interestTraits: ['Reading', 'Writing', 'Communication', 'Interpretation', 'Argument', 'Language confidence'],
    personalityTraits: { creative: 1, people: 1, persuasive: 1, reflective: 1 },
    academicInputs: [{ area: 'Language', w: 1 }],
    pathwayTags: ['communication', 'journalism', 'law', 'education', 'humanities'],
    mathRequirement: 'none',
    note: 'Every learner studies languages — a strong fit here supports History, Business Studies and many degree pathways.',
    foundationTip: 'Read widely and write regularly — comprehension and writing confidence support almost every other subject.',
  },
  socialSciences: {
    label: 'Social Sciences / humanities pathways', family: 'humanities', fetNames: ['Geography', 'History'],
    covers: 'understanding people and societies — usually studied through History, Geography and languages',
    interestTraits: ['Community awareness', 'Cultural understanding', 'Helping and advocacy', 'Social curiosity'],
    personalityTraits: { reflective: 1, people: 0.6, investigative: 0.4 },
    academicInputs: [{ area: 'Social Sciences', w: 1 }, { area: 'Language', w: 0.5 }],
    pathwayTags: ['socialWork', 'psychology', 'humanities', 'politics', 'education', 'law'],
    mathRequirement: 'none',
    note: 'This reflects an interest in the humanities pathway rather than a single school subject — it is usually studied through History, Geography and languages.',
    foundationTip: 'Read about current affairs and practise writing structured answers about people and societies.',
  },
};

/* ------------------------------------------------------------
   Suggested subject combinations -- starting points, never streams.
   `slots` lists the subjects that can fill each place (the best-scoring
   available one is used); the special slot 'mathChoice' means
   "Mathematics or Mathematical Literacy, whichever the Maths decision
   recommends".
   ------------------------------------------------------------ */
const SC_COMBOS = [
  { id: 'stem', name: 'Analytical & Science Pathway',
    slots: [['mathematics'], ['physicalSciences'], ['lifeSciences', 'informationTechnology', 'engineeringGraphicsAndDesign']] },
  { id: 'technology', name: 'Technology & Problem-Solving Pathway',
    slots: [['mathematics'], ['informationTechnology'], ['physicalSciences', 'engineeringGraphicsAndDesign']] },
  { id: 'commerce', name: 'Business & Commerce Pathway',
    slots: [['mathChoice'], ['accounting'], ['businessStudies'], ['economics']] },
  { id: 'humanities', name: 'Humanities & Communication Pathway',
    slots: [['history'], ['geography'], ['languages']] },
  { id: 'creative', name: 'Creative & Performing Arts Pathway',
    slots: [['visualArts'], ['dramaticArts', 'music'], ['languages']] },
  { id: 'service', name: 'Tourism & Hospitality Pathway',
    slots: [['tourism'], ['hospitalityStudies'], ['businessStudies']] },
];

/* ------------------------------------------------------------
   Question bank. Each answer (1-5) feeds every subject listed in
   `weights` (1 = the question is mainly about that subject; smaller
   numbers = a weaker link). `trait` is the underlying interest the
   question reveals (must be one of its main subject's interestTraits,
   except the general questions).
   ------------------------------------------------------------ */
const SC_QUESTIONS = [
  // ---- Languages / English
  { id: 'q_lang_01', trait: 'Reading', text: 'Do you enjoy reading stories, articles or things that make you think?', weights: { languages: 1, history: 0.4, socialSciences: 0.3, dramaticArts: 0.2 } },
  { id: 'q_lang_02', trait: 'Argument', text: 'If you disagree with someone, do you enjoy explaining your side clearly?', weights: { languages: 1, history: 0.5, socialSciences: 0.3, businessStudies: 0.3, economics: 0.2 } },
  { id: 'q_lang_03', trait: 'Writing', text: 'Would you enjoy writing a story, article, speech or review?', weights: { languages: 1, dramaticArts: 0.3, history: 0.2, visualArts: 0.1 } },
  { id: 'q_lang_04', trait: 'Interpretation', text: 'Do you notice when people use words in interesting or persuasive ways?', weights: { languages: 1, businessStudies: 0.3, history: 0.3, dramaticArts: 0.3 } },
  { id: 'q_lang_05', trait: 'Communication', text: 'Would you rather explain an idea using words than numbers?', weights: { languages: 1, history: 0.4, socialSciences: 0.3, tourism: 0.2 } },
  { id: 'q_lang_06', trait: 'Language confidence', text: 'Do you feel comfortable speaking up in a group to share an idea?', weights: { languages: 1, dramaticArts: 0.5, businessStudies: 0.3, tourism: 0.3 } },

  // ---- Mathematics
  { id: 'q_math_01', trait: 'Problem solving', text: 'Do you enjoy figuring out how something works instead of being told the answer?', weights: { mathematics: 1, physicalSciences: 0.6, informationTechnology: 0.5, engineeringGraphicsAndDesign: 0.3, lifeSciences: 0.3 } },
  { id: 'q_math_02', trait: 'Pattern recognition', text: 'If you see a pattern, do you automatically try to work out what comes next?', weights: { mathematics: 1, informationTechnology: 0.6, physicalSciences: 0.3, music: 0.2 } },
  { id: 'q_math_03', trait: 'Logical reasoning', text: 'Do puzzles that require logic feel satisfying when you finally solve them?', weights: { mathematics: 1, informationTechnology: 0.7, physicalSciences: 0.4, accounting: 0.2 } },
  { id: 'q_math_04', trait: 'Abstract thinking', text: 'Would you rather solve one difficult problem than memorise ten facts?', weights: { mathematics: 1, physicalSciences: 0.5, informationTechnology: 0.4, economics: 0.3 } },
  { id: 'q_math_05', trait: 'Numerical confidence', text: 'When something involves numbers, are you usually curious about how the answer was calculated?', weights: { mathematics: 1, accounting: 0.5, economics: 0.4, physicalSciences: 0.3, mathematicalLiteracy: 0.3 } },

  // ---- Mathematical Literacy
  { id: 'q_mlit_01', trait: 'Everyday numeracy', text: 'When you see a discount or a deal, do you like working out whether it is really a good price?', weights: { mathematicalLiteracy: 1, accounting: 0.3, economics: 0.3, businessStudies: 0.2, mathematics: 0.2 } },
  { id: 'q_mlit_02', trait: 'Financial awareness', text: 'Would you enjoy planning a budget for an event, a trip or a month’s spending money?', weights: { mathematicalLiteracy: 1, accounting: 0.4, tourism: 0.3, hospitalityStudies: 0.3, businessStudies: 0.3 } },
  { id: 'q_mlit_03', trait: 'Data interpretation', text: 'When a news story or post shares statistics, do you like checking what the numbers really mean?', weights: { mathematicalLiteracy: 1, geography: 0.3, economics: 0.3, socialSciences: 0.2, mathematics: 0.2 } },
  { id: 'q_mlit_04', trait: 'Measurement and planning', text: 'Do you like working out measurements — how much paint, fabric or food a project will need?', weights: { mathematicalLiteracy: 1, consumerStudies: 0.4, engineeringGraphicsAndDesign: 0.3, hospitalityStudies: 0.3, geography: 0.2 } },
  { id: 'q_mlit_05', trait: 'Practical problem solving', text: 'Do you like maths you can see being used in real life — like loans, time or travel?', weights: { mathematicalLiteracy: 1, tourism: 0.2, accounting: 0.2 } },

  // ---- Physical Sciences
  { id: 'q_phys_01', trait: 'Scientific curiosity', text: 'Do you ever wonder why things move, fall, heat up or react?', weights: { physicalSciences: 1, mathematics: 0.3, engineeringGraphicsAndDesign: 0.3, lifeSciences: 0.2 } },
  { id: 'q_phys_02', trait: 'Technical problem solving', text: 'Would you enjoy figuring out why a phone battery, car or electrical circuit works?', weights: { physicalSciences: 1, informationTechnology: 0.4, engineeringGraphicsAndDesign: 0.5, mathematics: 0.2 } },
  { id: 'q_phys_03', trait: 'Cause-and-effect reasoning', text: 'If you saw an experiment go wrong, would you want to know why?', weights: { physicalSciences: 1, lifeSciences: 0.6, history: 0.2, mathematics: 0.2 } },
  { id: 'q_phys_04', trait: 'Scientific curiosity', text: 'Are you interested in how chemicals, electricity, forces or energy work?', weights: { physicalSciences: 1, lifeSciences: 0.3, agriculturalSciences: 0.2, engineeringGraphicsAndDesign: 0.2 } },
  { id: 'q_phys_05', trait: 'Experimentation', text: 'Would building or testing something be more interesting than simply reading about it?', weights: { physicalSciences: 1, engineeringGraphicsAndDesign: 0.5, informationTechnology: 0.3, agriculturalSciences: 0.3, consumerStudies: 0.2 } },

  // ---- Life Sciences
  { id: 'q_life_01', trait: 'Human health interest', text: 'Are you curious about how the human body works?', weights: { lifeSciences: 1, consumerStudies: 0.2, physicalSciences: 0.2 } },
  { id: 'q_life_02', trait: 'Human health interest', text: 'Would you enjoy learning why diseases spread or how the body fights them?', weights: { lifeSciences: 1, physicalSciences: 0.2, socialSciences: 0.2 } },
  { id: 'q_life_03', trait: 'Environmental interest', text: 'Do animals, plants, genetics or the environment interest you?', weights: { lifeSciences: 1, agriculturalSciences: 0.6, geography: 0.4 } },
  { id: 'q_life_04', trait: 'Observation', text: 'Would you enjoy studying living things closely and explaining what you observe?', weights: { lifeSciences: 1, agriculturalSciences: 0.4, geography: 0.2, languages: 0.2 } },
  { id: 'q_life_05', trait: 'Biological curiosity', text: 'Do topics like DNA, ecosystems or the brain make you curious?', weights: { lifeSciences: 1, physicalSciences: 0.2, agriculturalSciences: 0.3, geography: 0.2 } },

  // ---- Business Studies
  { id: 'q_bus_01', trait: 'Entrepreneurship', text: 'If someone gave you R1,000 to start a small business, would you enjoy figuring out how to grow it?', weights: { businessStudies: 1, economics: 0.5, accounting: 0.4, tourism: 0.2, hospitalityStudies: 0.2 } },
  { id: 'q_bus_02', trait: 'Financial curiosity', text: 'Would you like to understand how companies make money?', weights: { businessStudies: 1, economics: 0.6, accounting: 0.5 } },
  { id: 'q_bus_03', trait: 'Commercial thinking', text: 'Are you interested in why some businesses succeed while others fail?', weights: { businessStudies: 1, economics: 0.6, history: 0.2 } },
  { id: 'q_bus_04', trait: 'Business strategy', text: 'Would you enjoy planning how a business should sell or promote something?', weights: { businessStudies: 1, tourism: 0.4, visualArts: 0.2, languages: 0.2 } },
  { id: 'q_bus_05', trait: 'Leadership', text: 'Can you imagine yourself running a business one day?', weights: { businessStudies: 1, economics: 0.3, accounting: 0.3, hospitalityStudies: 0.3, agriculturalSciences: 0.2 } },

  // ---- Accounting
  { id: 'q_acc_01', trait: 'Financial accuracy', text: 'Do you like knowing exactly where money came from and where it went?', weights: { accounting: 1, businessStudies: 0.3, economics: 0.2, mathematicalLiteracy: 0.3 } },
  { id: 'q_acc_02', trait: 'Structured thinking', text: 'If money went missing from a budget, would you enjoy figuring out what happened?', weights: { accounting: 1, mathematicalLiteracy: 0.3, mathematics: 0.2, informationTechnology: 0.2 } },
  { id: 'q_acc_03', trait: 'Numerical organisation', text: 'Do you enjoy working carefully with numbers where everything needs to balance?', weights: { accounting: 1, mathematics: 0.4, computerApplicationsTechnology: 0.3, mathematicalLiteracy: 0.3 } },
  { id: 'q_acc_04', trait: 'Financial accuracy', text: 'Would keeping track of income, expenses and profit feel satisfying?', weights: { accounting: 1, businessStudies: 0.5, economics: 0.3, computerApplicationsTechnology: 0.3 } },
  { id: 'q_acc_05', trait: 'Attention to detail', text: 'Are you comfortable checking your work until the numbers are correct?', weights: { accounting: 1, mathematics: 0.3, engineeringGraphicsAndDesign: 0.3, computerApplicationsTechnology: 0.2 } },

  // ---- Economics
  { id: 'q_econ_01', trait: 'Economic curiosity', text: 'Have you ever wondered why food, petrol or other things become more expensive?', weights: { economics: 1, businessStudies: 0.3, mathematicalLiteracy: 0.3, geography: 0.2 } },
  { id: 'q_econ_02', trait: 'Social and economic awareness', text: 'Are you curious about why some countries or communities are richer than others?', weights: { economics: 1, geography: 0.5, history: 0.5, socialSciences: 0.5 } },
  { id: 'q_econ_03', trait: 'Systems thinking', text: 'Would you enjoy discussing jobs, prices, money and how governments make economic decisions?', weights: { economics: 1, history: 0.3, socialSciences: 0.4, businessStudies: 0.3 } },
  { id: 'q_econ_04', trait: 'Social and economic awareness', text: 'Do you find it interesting how decisions made by businesses or government affect ordinary people?', weights: { economics: 1, socialSciences: 0.5, history: 0.4, businessStudies: 0.3 } },
  { id: 'q_econ_05', trait: 'Analytical reasoning', text: 'Would you enjoy understanding why markets change?', weights: { economics: 1, businessStudies: 0.5, accounting: 0.3, mathematics: 0.2 } },

  // ---- History
  { id: 'q_hist_01', trait: 'Human behaviour', text: 'Do you enjoy discussing why people believe different things?', weights: { history: 1, socialSciences: 0.7, languages: 0.3 } },
  { id: 'q_hist_02', trait: 'Philosophy', text: 'Would you enjoy a conversation about whether something is fair or unfair?', weights: { history: 1, socialSciences: 0.6, languages: 0.4, economics: 0.2 } },
  { id: 'q_hist_03', trait: 'Historical curiosity', text: 'Are you curious about how decisions made years ago still affect society today?', weights: { history: 1, geography: 0.3, economics: 0.3, socialSciences: 0.5 } },
  { id: 'q_hist_04', trait: 'Critical thinking', text: 'Do you enjoy hearing different sides of the same story before deciding what you think?', weights: { history: 1, languages: 0.4, socialSciences: 0.5 } },
  { id: 'q_hist_05', trait: 'Society', text: 'Would a question like “Why do societies change?” interest you?', weights: { history: 1, socialSciences: 0.7, geography: 0.3, economics: 0.3 } },
  { id: 'q_hist_06', trait: 'Argument', text: 'Would you enjoy a debate about ideas like power, justice, freedom or human behaviour?', weights: { history: 1, socialSciences: 0.7, languages: 0.3 } },

  // ---- Geography
  { id: 'q_geo_01', trait: 'Spatial thinking', text: 'When you see a map, do you enjoy figuring out where places are and how they connect?', weights: { geography: 1, tourism: 0.5, engineeringGraphicsAndDesign: 0.2 } },
  { id: 'q_geo_02', trait: 'Environmental interest', text: 'Are you curious about why some areas flood, experience drought or have certain climates?', weights: { geography: 1, lifeSciences: 0.3, agriculturalSciences: 0.4, physicalSciences: 0.3 } },
  { id: 'q_geo_03', trait: 'Human geography', text: 'Do cities, populations, weather and the environment interest you?', weights: { geography: 1, socialSciences: 0.4, economics: 0.3, lifeSciences: 0.2 } },
  { id: 'q_geo_04', trait: 'Environmental interest', text: 'Would you enjoy analysing how people affect the environment?', weights: { geography: 1, lifeSciences: 0.4, agriculturalSciences: 0.4, socialSciences: 0.3 } },
  { id: 'q_geo_05', trait: 'Map and data interpretation', text: 'Would satellite images, maps and geographic data interest you?', weights: { geography: 1, informationTechnology: 0.3, mathematicalLiteracy: 0.3, mathematics: 0.2 } },

  // ---- Tourism
  { id: 'q_tour_01', trait: 'Travel interest', text: 'Do you enjoy discovering new places, cultures or attractions?', weights: { tourism: 1, geography: 0.5, socialSciences: 0.3, history: 0.2 } },
  { id: 'q_tour_02', trait: 'Planning', text: 'If friends were visiting your city, would you enjoy planning what they should do?', weights: { tourism: 1, hospitalityStudies: 0.4, businessStudies: 0.2 } },
  { id: 'q_tour_03', trait: 'Service orientation', text: 'Would you enjoy helping people have a great travel experience?', weights: { tourism: 1, hospitalityStudies: 0.6, businessStudies: 0.2 } },
  { id: 'q_tour_04', trait: 'Travel interest', text: 'Are you interested in hotels, airlines, events or travel destinations?', weights: { tourism: 1, hospitalityStudies: 0.6, businessStudies: 0.3 } },
  { id: 'q_tour_05', trait: 'Cultural curiosity', text: 'Do you enjoy learning about different cultures?', weights: { tourism: 1, socialSciences: 0.5, history: 0.3, languages: 0.3, geography: 0.3 } },

  // ---- Computer Applications Technology
  { id: 'q_cat_01', trait: 'Digital productivity', text: 'Do you enjoy using computers to organise information or complete tasks faster?', weights: { computerApplicationsTechnology: 1, accounting: 0.2, businessStudies: 0.2 } },
  { id: 'q_cat_02', trait: 'Digital productivity', text: 'Would you enjoy creating professional documents, spreadsheets or presentations?', weights: { computerApplicationsTechnology: 1, businessStudies: 0.3, accounting: 0.3, visualArts: 0.1 } },
  { id: 'q_cat_03', trait: 'Practical technology use', text: 'Are you interested in using technology to solve everyday business problems?', weights: { computerApplicationsTechnology: 1, businessStudies: 0.4, informationTechnology: 0.3 } },
  { id: 'q_cat_04', trait: 'Practical technology use', text: 'Do you like finding better or faster ways of doing things on a computer?', weights: { computerApplicationsTechnology: 1, informationTechnology: 0.5 } },
  { id: 'q_cat_05', trait: 'Organisation', text: 'Would working with digital information feel comfortable to you?', weights: { computerApplicationsTechnology: 1, accounting: 0.2, informationTechnology: 0.3 } },

  // ---- Information Technology
  { id: 'q_it_01', trait: 'Technology curiosity', text: 'Have you ever wondered how an app or website actually works?', weights: { informationTechnology: 1, computerApplicationsTechnology: 0.3, mathematics: 0.2 } },
  { id: 'q_it_02', trait: 'Computational thinking', text: 'Would you enjoy telling a computer exactly what to do and figuring out why it does not work?', weights: { informationTechnology: 1, mathematics: 0.5, physicalSciences: 0.2 } },
  { id: 'q_it_03', trait: 'Logic', text: 'Do you enjoy solving logical problems step by step?', weights: { informationTechnology: 1, mathematics: 0.6, accounting: 0.2, physicalSciences: 0.3 } },
  { id: 'q_it_04', trait: 'Coding interest', text: 'Would creating your own app, game or program sound exciting?', weights: { informationTechnology: 1, visualArts: 0.2, mathematics: 0.2 } },
  { id: 'q_it_05', trait: 'Problem solving', text: 'If technology stops working, are you curious enough to try to fix it?', weights: { informationTechnology: 1, physicalSciences: 0.3, engineeringGraphicsAndDesign: 0.2, computerApplicationsTechnology: 0.3 } },

  // ---- Engineering Graphics and Design
  { id: 'q_egd_01', trait: 'Spatial reasoning', text: 'Can you easily imagine what an object would look like from different angles?', weights: { engineeringGraphicsAndDesign: 1, visualArts: 0.3, geography: 0.2, mathematics: 0.2 } },
  { id: 'q_egd_02', trait: 'Visualisation', text: 'Would you enjoy designing something before it is built?', weights: { engineeringGraphicsAndDesign: 1, visualArts: 0.4, informationTechnology: 0.2 } },
  { id: 'q_egd_03', trait: 'Technical design', text: 'Do technical drawings, buildings or machines interest you?', weights: { engineeringGraphicsAndDesign: 1, physicalSciences: 0.3 } },
  { id: 'q_egd_04', trait: 'Precision', text: 'Do you enjoy working accurately with measurements?', weights: { engineeringGraphicsAndDesign: 1, mathematics: 0.3, accounting: 0.2, consumerStudies: 0.2 } },
  { id: 'q_egd_05', trait: 'Precision', text: 'Would creating precise drawings be satisfying to you?', weights: { engineeringGraphicsAndDesign: 1, visualArts: 0.3 } },

  // ---- Visual Arts
  { id: 'q_vis_01', trait: 'Creativity', text: 'Do you often imagine how something could look better or different?', weights: { visualArts: 1, engineeringGraphicsAndDesign: 0.3, consumerStudies: 0.2 } },
  { id: 'q_vis_02', trait: 'Originality', text: 'Would you enjoy creating something original from a blank page?', weights: { visualArts: 1, dramaticArts: 0.3, music: 0.3, languages: 0.2 } },
  { id: 'q_vis_03', trait: 'Visual thinking', text: 'Do you notice colours, shapes, layouts or designs that other people may ignore?', weights: { visualArts: 1, engineeringGraphicsAndDesign: 0.3 } },
  { id: 'q_vis_04', trait: 'Expression', text: 'Would you enjoy expressing an idea through drawing, design or visual work?', weights: { visualArts: 1, dramaticArts: 0.2 } },
  { id: 'q_vis_05', trait: 'Originality', text: 'Do you like projects where there can be more than one correct answer?', weights: { visualArts: 1, dramaticArts: 0.4, music: 0.3, history: 0.2, languages: 0.2 } },

  // ---- Dramatic Arts
  { id: 'q_dra_01', trait: 'Expression', text: 'Would you enjoy acting out a scene, telling a story out loud or performing in front of people?', weights: { dramaticArts: 1, languages: 0.4, music: 0.3 } },
  { id: 'q_dra_02', trait: 'Empathy', text: 'Do you like putting yourself in someone else’s shoes to understand how they feel?', weights: { dramaticArts: 1, history: 0.3, socialSciences: 0.4, languages: 0.3 } },
  { id: 'q_dra_03', trait: 'Collaboration', text: 'Would you enjoy working with a group to create a performance from scratch?', weights: { dramaticArts: 1, music: 0.3, visualArts: 0.2 } },
  { id: 'q_dra_04', trait: 'Storytelling', text: 'Do you enjoy changing your voice, face or body to bring a character to life?', weights: { dramaticArts: 1, music: 0.2 } },
  { id: 'q_dra_05', trait: 'Confidence', text: 'Would you enjoy sharing an idea or a performance with an audience?', weights: { dramaticArts: 1, languages: 0.3, businessStudies: 0.2 } },

  // ---- Music
  { id: 'q_mus_01', trait: 'Musical ear', text: 'Do you notice melodies in videos, shops or games — and find they stay in your head?', weights: { music: 1, mathematics: 0.1 } },
  { id: 'q_mus_02', trait: 'Discipline', text: 'Would you enjoy learning an instrument or singing, and practising until it sounds right?', weights: { music: 1 } },
  { id: 'q_mus_03', trait: 'Creativity', text: 'Do you like creating your own tunes, beats or lyrics?', weights: { music: 1, languages: 0.3, visualArts: 0.1 } },
  { id: 'q_mus_04', trait: 'Rhythm', text: 'Do you find yourself tapping out beats or rhythms on desks, tables or your legs?', weights: { music: 1, dramaticArts: 0.2 } },
  { id: 'q_mus_05', trait: 'Performance', text: 'Would you enjoy performing music for other people?', weights: { music: 1, dramaticArts: 0.5 } },

  // ---- Consumer Studies
  { id: 'q_con_01', trait: 'Practical creativity', text: 'Do you enjoy working practically with food, clothing or home projects?', weights: { consumerStudies: 1, hospitalityStudies: 0.6, visualArts: 0.2 } },
  { id: 'q_con_02', trait: 'Food and nutrition interest', text: 'Are you curious about what is really in the food you eat and how it affects your body?', weights: { consumerStudies: 1, lifeSciences: 0.4, hospitalityStudies: 0.3 } },
  { id: 'q_con_03', trait: 'Consumer awareness', text: 'Do you like comparing products to decide which is the best value or quality?', weights: { consumerStudies: 1, economics: 0.2, businessStudies: 0.3, mathematicalLiteracy: 0.3 } },
  { id: 'q_con_04', trait: 'Making and design', text: 'Would you enjoy designing or making something you can wear, use or show off?', weights: { consumerStudies: 1, visualArts: 0.4, engineeringGraphicsAndDesign: 0.2 } },
  { id: 'q_con_05', trait: 'Everyday life skills', text: 'Would you enjoy learning skills you can immediately use in everyday life or business?', weights: { consumerStudies: 1, hospitalityStudies: 0.5, businessStudies: 0.2 } },

  // ---- Hospitality Studies
  { id: 'q_hos_01', trait: 'Customer care', text: 'Would you enjoy planning an experience that makes guests feel welcome?', weights: { hospitalityStudies: 1, tourism: 0.6, businessStudies: 0.2 } },
  { id: 'q_hos_02', trait: 'Service orientation', text: 'Do you enjoy cooking, serving or looking after other people at a gathering?', weights: { hospitalityStudies: 1, consumerStudies: 0.6, tourism: 0.3 } },
  { id: 'q_hos_03', trait: 'Event planning', text: 'Would you enjoy organising an event or meal?', weights: { hospitalityStudies: 1, tourism: 0.4, businessStudies: 0.3, consumerStudies: 0.2 } },
  { id: 'q_hos_04', trait: 'Practical skills', text: 'Do you like seeing a practical project come together from beginning to end?', weights: { hospitalityStudies: 1, consumerStudies: 0.4, engineeringGraphicsAndDesign: 0.3, agriculturalSciences: 0.2 } },
  { id: 'q_hos_05', trait: 'Teamwork', text: 'Would you enjoy helping lots of different people in a busy, lively place?', weights: { hospitalityStudies: 1, tourism: 0.4, businessStudies: 0.2 } },

  // ---- Agricultural Sciences
  { id: 'q_agr_01', trait: 'Food-system curiosity', text: 'Are you interested in where food actually comes from?', weights: { agriculturalSciences: 1, lifeSciences: 0.3, consumerStudies: 0.2, geography: 0.2 } },
  { id: 'q_agr_02', trait: 'Land and animals', text: 'Would you enjoy learning how plants, animals and soil can be managed better?', weights: { agriculturalSciences: 1, lifeSciences: 0.5, geography: 0.3 } },
  { id: 'q_agr_03', trait: 'Farming technology', text: 'Are you interested in farming technology and food production?', weights: { agriculturalSciences: 1, engineeringGraphicsAndDesign: 0.2, informationTechnology: 0.2, businessStudies: 0.2 } },
  { id: 'q_agr_04', trait: 'Environmental problem solving', text: 'Would solving environmental or agricultural problems interest you?', weights: { agriculturalSciences: 1, geography: 0.5, lifeSciences: 0.4 } },
  { id: 'q_agr_05', trait: 'Applied science', text: 'Could you imagine using science to improve how food is produced?', weights: { agriculturalSciences: 1, physicalSciences: 0.3, lifeSciences: 0.4 } },

  // ---- Social Sciences / humanities pathways
  { id: 'q_soc_01', trait: 'Community awareness', text: 'Would you enjoy finding out how communities deal with problems like unemployment, safety or access to water?', weights: { socialSciences: 1, economics: 0.3, geography: 0.4, history: 0.3 } },
  { id: 'q_soc_02', trait: 'Cultural understanding', text: 'Do you like learning how people’s cultures, beliefs and traditions shape the way they live?', weights: { socialSciences: 1, history: 0.4, tourism: 0.3, languages: 0.2 } },
  { id: 'q_soc_03', trait: 'Helping and advocacy', text: 'When something seems unfair to other people, do you feel like speaking up?', weights: { socialSciences: 1, history: 0.4, languages: 0.3 } },
  { id: 'q_soc_04', trait: 'Helping and advocacy', text: 'Would you enjoy working on a project that makes life better for people in your community?', weights: { socialSciences: 1, businessStudies: 0.2, lifeSciences: 0.2 } },
  { id: 'q_soc_05', trait: 'Social curiosity', text: 'Do you enjoy thinking about how laws, rights and leaders affect everyday life?', weights: { socialSciences: 1, history: 0.5, economics: 0.3 } },

  // ---- General (spread across several subjects; no single "main" subject)
  { id: 'q_gen_01', trait: 'General', text: 'Do you enjoy figuring out why something happened?', weights: { physicalSciences: 0.6, history: 0.6, mathematics: 0.4, informationTechnology: 0.4, lifeSciences: 0.4, geography: 0.3 } },
  { id: 'q_gen_02', trait: 'General', text: 'Do you enjoy researching something and then explaining what you found to other people?', weights: { languages: 0.4, history: 0.4, socialSciences: 0.4, geography: 0.3, lifeSciences: 0.3, businessStudies: 0.2 } },
  { id: 'q_gen_03', trait: 'General', text: 'Do you like making something with your hands and then testing whether it works?', weights: { engineeringGraphicsAndDesign: 0.4, physicalSciences: 0.4, consumerStudies: 0.3, hospitalityStudies: 0.2, agriculturalSciences: 0.2, visualArts: 0.2 } },
  { id: 'q_gen_04', trait: 'General', text: 'Would you enjoy a job where every day is different and you meet lots of different people?', weights: { tourism: 0.4, hospitalityStudies: 0.4, businessStudies: 0.3, socialSciences: 0.3, dramaticArts: 0.2 } },
  { id: 'q_gen_05', trait: 'General', text: 'When you get a new gadget or app, do you explore every setting before reading the instructions?', weights: { informationTechnology: 0.5, computerApplicationsTechnology: 0.4, physicalSciences: 0.2, engineeringGraphicsAndDesign: 0.2 } },
  { id: 'q_gen_06', trait: 'General', text: 'Do you enjoy planning something carefully so that it runs smoothly on the day?', weights: { hospitalityStudies: 0.4, tourism: 0.4, businessStudies: 0.3, accounting: 0.2, computerApplicationsTechnology: 0.2 } },
];

// A question's "main" subject (the one with weight 1), or 'general' if it
// spreads across several. Used only to shuffle questions so no two about
// the same subject sit next to each other.
SC_QUESTIONS.forEach(function(q){
  const main = Object.keys(q.weights).find(function(k){ return q.weights[k] === 1; });
  q.primary = main || 'general';
});
