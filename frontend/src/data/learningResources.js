// Free learning material for the career roadmap. Curated entries point
// at stable, freely available books, docs, and papers; every skill also
// gets search links (YouTube, arXiv, Google Scholar, Open Textbook
// Library) so skills added to the catalog later still get resources.

const CURATED = {
  python: [
    { type: 'docs', title: 'The Python Tutorial (official)', url: 'https://docs.python.org/3/tutorial/' },
    { type: 'book', title: 'Think Python, 2nd ed. — Allen B. Downey (free)', url: 'https://greenteapress.com/wp/think-python-2e/' },
    { type: 'book', title: 'Automate the Boring Stuff with Python (free online)', url: 'https://automatetheboringstuff.com/' },
    { type: 'video', title: 'freeCodeCamp — Python courses', url: 'https://www.youtube.com/@freecodecamp/search?query=python' },
  ],
  javascript: [
    { type: 'book', title: 'Eloquent JavaScript — Marijn Haverbeke (free)', url: 'https://eloquentjavascript.net/' },
    { type: 'book', title: "You Don't Know JS Yet — Kyle Simpson (free on GitHub)", url: 'https://github.com/getify/You-Dont-Know-JS' },
    { type: 'docs', title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide' },
    { type: 'course', title: 'The Modern JavaScript Tutorial', url: 'https://javascript.info/' },
  ],
  typescript: [
    { type: 'docs', title: 'The TypeScript Handbook (official)', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
    { type: 'book', title: 'TypeScript Deep Dive — Basarat Ali Syed (free)', url: 'https://basarat.gitbook.io/typescript/' },
    { type: 'paper', title: 'Understanding TypeScript — Bierman, Abadi & Torgersen (ECOOP 2014)', url: 'https://scholar.google.com/scholar?q=%22Understanding+TypeScript%22+Bierman+Abadi+Torgersen' },
  ],
  react: [
    { type: 'docs', title: 'Learn React (react.dev, official)', url: 'https://react.dev/learn' },
    { type: 'docs', title: 'Thinking in React', url: 'https://react.dev/learn/thinking-in-react' },
    { type: 'video', title: 'freeCodeCamp — React courses', url: 'https://www.youtube.com/@freecodecamp/search?query=react' },
  ],
  fastapi: [
    { type: 'docs', title: 'FastAPI Tutorial — User Guide (official)', url: 'https://fastapi.tiangolo.com/tutorial/' },
    { type: 'docs', title: 'SQLAlchemy 2.0 Unified Tutorial', url: 'https://docs.sqlalchemy.org/en/20/tutorial/' },
    { type: 'video', title: 'freeCodeCamp — FastAPI courses', url: 'https://www.youtube.com/@freecodecamp/search?query=fastapi' },
  ],
  'node.js': [
    { type: 'docs', title: 'Learn Node.js (official)', url: 'https://nodejs.org/en/learn' },
    { type: 'book', title: 'Node.js Best Practices (free on GitHub)', url: 'https://github.com/goldbergyoni/nodebestpractices' },
    { type: 'video', title: 'freeCodeCamp — Node.js courses', url: 'https://www.youtube.com/@freecodecamp/search?query=node.js' },
  ],
  postgresql: [
    { type: 'docs', title: 'PostgreSQL Tutorial (official docs)', url: 'https://www.postgresql.org/docs/current/tutorial.html' },
    { type: 'book', title: 'Use The Index, Luke — SQL indexing & tuning (free)', url: 'https://use-the-index-luke.com/' },
    { type: 'paper', title: 'The Design of POSTGRES — Stonebraker & Rowe (1986)', url: 'https://scholar.google.com/scholar?q=%22The+design+of+POSTGRES%22+Stonebraker+Rowe' },
  ],
  mongodb: [
    { type: 'course', title: 'MongoDB University (free courses)', url: 'https://learn.mongodb.com/' },
    { type: 'docs', title: 'The MongoDB Manual', url: 'https://www.mongodb.com/docs/manual/' },
    { type: 'video', title: 'freeCodeCamp — MongoDB courses', url: 'https://www.youtube.com/@freecodecamp/search?query=mongodb' },
  ],
  docker: [
    { type: 'docs', title: 'Docker Get Started guide (official)', url: 'https://docs.docker.com/get-started/' },
    { type: 'course', title: 'Docker Curriculum — a beginner tutorial', url: 'https://docker-curriculum.com/' },
    { type: 'video', title: 'freeCodeCamp — Docker courses', url: 'https://www.youtube.com/@freecodecamp/search?query=docker' },
  ],
  kubernetes: [
    { type: 'docs', title: 'Kubernetes Basics tutorial (official)', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/' },
    { type: 'paper', title: 'Borg, Omega, and Kubernetes — Burns et al. (ACM Queue, 2016)', url: 'https://queue.acm.org/detail.cfm?id=2898444' },
    { type: 'paper', title: 'Large-scale cluster management at Google with Borg (EuroSys 2015)', url: 'https://research.google/pubs/large-scale-cluster-management-at-google-with-borg/' },
    { type: 'video', title: 'freeCodeCamp — Kubernetes courses', url: 'https://www.youtube.com/@freecodecamp/search?query=kubernetes' },
  ],
  'amazon web services': [
    { type: 'course', title: 'AWS Skill Builder (free digital training)', url: 'https://skillbuilder.aws/' },
    { type: 'docs', title: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/' },
    { type: 'paper', title: "Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)", url: 'https://scholar.google.com/scholar?q=%22Dynamo%3A+Amazon%27s+highly+available+key-value+store%22' },
  ],
  'machine learning': [
    { type: 'book', title: 'Dive into Deep Learning (free, interactive)', url: 'https://d2l.ai/' },
    { type: 'book', title: 'An Introduction to Statistical Learning (free PDF)', url: 'https://www.statlearning.com/' },
    { type: 'course', title: 'Stanford CS229 — Machine Learning (notes)', url: 'https://cs229.stanford.edu/' },
    { type: 'docs', title: 'scikit-learn User Guide', url: 'https://scikit-learn.org/stable/user_guide.html' },
    { type: 'paper', title: 'A Few Useful Things to Know About Machine Learning — Domingos (CACM 2012)', url: 'https://scholar.google.com/scholar?q=%22A+few+useful+things+to+know+about+machine+learning%22' },
  ],
  'artificial intelligence': [
    { type: 'book', title: 'Deep Learning — Goodfellow, Bengio & Courville (free online)', url: 'https://www.deeplearningbook.org/' },
    { type: 'paper', title: 'Attention Is All You Need — Vaswani et al. (2017)', url: 'https://arxiv.org/abs/1706.03762' },
    { type: 'course', title: 'Hugging Face LLM Course (free)', url: 'https://huggingface.co/learn' },
  ],
  'rest api': [
    { type: 'paper', title: 'Architectural Styles and the Design of Network-based Software Architectures — Fielding (REST dissertation)', url: 'https://ics.uci.edu/~fielding/pubs/dissertation/top.htm' },
    { type: 'docs', title: 'MDN — An overview of HTTP', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP' },
    { type: 'docs', title: 'OpenAPI Specification', url: 'https://spec.openapis.org/oas/latest.html' },
  ],
  'structured query language': [
    { type: 'course', title: 'SQLBolt — interactive SQL lessons', url: 'https://sqlbolt.com/' },
    { type: 'book', title: 'Use The Index, Luke — SQL performance (free)', url: 'https://use-the-index-luke.com/' },
    { type: 'paper', title: 'A Relational Model of Data for Large Shared Data Banks — Codd (1970)', url: 'https://dl.acm.org/doi/10.1145/362384.362685' },
  ],
  figma: [
    { type: 'docs', title: 'Figma Help Center & Learn', url: 'https://help.figma.com/hc/en-us' },
    { type: 'video', title: 'Figma (official YouTube channel)', url: 'https://www.youtube.com/@Figma' },
    { type: 'book', title: 'Laws of UX', url: 'https://lawsofux.com/' },
  ],
  'project management': [
    { type: 'docs', title: 'The Scrum Guide (official, free)', url: 'https://scrumguides.org/scrum-guide.html' },
    { type: 'docs', title: 'Manifesto for Agile Software Development', url: 'https://agilemanifesto.org/' },
    { type: 'video', title: 'Project management courses on YouTube', url: 'https://www.youtube.com/results?search_query=project+management+full+course' },
  ],
  'system design': [
    { type: 'book', title: 'The System Design Primer (free on GitHub)', url: 'https://github.com/donnemartin/system-design-primer' },
    { type: 'paper', title: 'MapReduce: Simplified Data Processing on Large Clusters (OSDI 2004)', url: 'https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/' },
    { type: 'paper', title: 'The Google File System (SOSP 2003)', url: 'https://research.google/pubs/the-google-file-system/' },
  ],
  'data engineering': [
    { type: 'course', title: 'Data Engineering Zoomcamp — DataTalks.Club (free)', url: 'https://github.com/DataTalksClub/data-engineering-zoomcamp' },
    { type: 'docs', title: 'Apache Spark — Quick Start', url: 'https://spark.apache.org/docs/latest/quick-start.html' },
    { type: 'paper', title: 'Spark: Cluster Computing with Working Sets — Zaharia et al. (2010)', url: 'https://scholar.google.com/scholar?q=%22Spark%3A+cluster+computing+with+working+sets%22' },
  ],
  'ci/cd': [
    { type: 'docs', title: 'Continuous Integration — Martin Fowler', url: 'https://martinfowler.com/articles/continuousIntegration.html' },
    { type: 'docs', title: 'GitHub Actions documentation', url: 'https://docs.github.com/en/actions' },
    { type: 'book', title: 'Pro Git — Chacon & Straub (free)', url: 'https://git-scm.com/book/en/v2' },
  ],
};

const encode = (value) => encodeURIComponent(value);

export const searchResources = (skillName) => [
  { type: 'video', title: `YouTube tutorials for ${skillName}`, url: `https://www.youtube.com/results?search_query=${encode(`${skillName} tutorial for beginners`)}` },
  { type: 'video', title: `Full ${skillName} courses on YouTube`, url: `https://www.youtube.com/results?search_query=${encode(`${skillName} full course`)}` },
  { type: 'book', title: `Free textbooks on ${skillName} (Open Textbook Library)`, url: `https://open.umn.edu/opentextbooks/search?term=${encode(skillName)}` },
  { type: 'paper', title: `Research papers on ${skillName} (Google Scholar)`, url: `https://scholar.google.com/scholar?q=${encode(skillName)}` },
  { type: 'paper', title: `Preprints on ${skillName} (arXiv)`, url: `https://arxiv.org/search/?query=${encode(skillName)}&searchtype=all` },
];

export const resourcesForSkill = (skillName) => ({
  curated: CURATED[(skillName || '').toLowerCase()] || [],
  search: searchResources(skillName || ''),
});

// What "level N" means, so each roadmap step has a concrete goal.
export const LEVEL_MILESTONES = {
  1: 'Basics — follow a tutorial end to end and explain the core concepts.',
  2: 'Working knowledge — build a small project on your own with documentation.',
  3: 'Practitioner — deliver a production feature, debug issues, review others’ code.',
  4: 'Advanced — design solutions, handle performance and edge cases, mentor peers.',
  5: 'Expert — set standards, lead architecture decisions, teach the topic.',
};
