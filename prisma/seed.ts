import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const db = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slug(name: string, suffix?: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return suffix ? `${base}-${suffix}` : base;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function pickMany<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPrice(min: number, max: number) {
  return (Math.floor(Math.random() * (max - min) / 1000) * 1000 + min).toFixed(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Institutions
// ─────────────────────────────────────────────────────────────────────────────

const institutions = [
  {
    name: "University of Colombo",
    type: "PUBLIC_UNIVERSITY",
    country: "Sri Lanka",
    city: "Colombo",
    email: "info@cmb.ac.lk",
    website: "https://cmb.ac.lk",
    description: "The University of Colombo is the oldest and most prestigious university in Sri Lanka, offering a wide range of undergraduate and postgraduate programs across arts, sciences, management, and law.",
  },
  {
    name: "Sri Lanka Institute of Information Technology",
    type: "PRIVATE_UNIVERSITY",
    country: "Sri Lanka",
    city: "Malabe",
    email: "info@sliit.lk",
    website: "https://sliit.lk",
    description: "SLIIT is Sri Lanka's leading IT university, pioneering technology education with industry-aligned programs in computing, engineering, and business.",
  },
  {
    name: "National Institute of Business Management",
    type: "PUBLIC_UNIVERSITY",
    country: "Sri Lanka",
    city: "Colombo",
    email: "info@nibm.lk",
    website: "https://nibm.lk",
    description: "NIBM is a premier state-owned institution providing high-quality management and IT education across Sri Lanka through a nationwide network of study centres.",
  },
  {
    name: "Imperial College London",
    type: "FOREIGN_UNIVERSITY",
    country: "United Kingdom",
    city: "London",
    email: "admissions@imperial.ac.uk",
    website: "https://imperial.ac.uk",
    description: "Imperial College London is a world-class university focused on science, engineering, medicine, and business, consistently ranked among the top 10 universities globally.",
  },
  {
    name: "Massachusetts Institute of Technology",
    type: "FOREIGN_UNIVERSITY",
    country: "United States",
    city: "Cambridge",
    email: "admissions@mit.edu",
    website: "https://mit.edu",
    description: "MIT is one of the world's foremost research universities, dedicated to advancing knowledge and educating students in science, technology, and areas of scholarship that will best serve the nation and the world.",
  },
  {
    name: "National University of Singapore",
    type: "FOREIGN_UNIVERSITY",
    country: "Singapore",
    city: "Singapore",
    email: "asknus@nus.edu.sg",
    website: "https://nus.edu.sg",
    description: "NUS is Asia's leading global university, offering a broad-based curriculum, globally-connected learning experience, and path-breaking research to prepare students for a rapidly changing world.",
  },
  {
    name: "ACCA Sri Lanka",
    type: "PROFESSIONAL_BODY",
    country: "Sri Lanka",
    city: "Colombo",
    email: "srilanka@accaglobal.com",
    website: "https://accaglobal.com/lk",
    description: "ACCA (Association of Chartered Certified Accountants) is the global body for professional accountants, offering the globally recognised ACCA qualification and development opportunities.",
  },
  {
    name: "Informatics Institute of Technology",
    type: "PRIVATE_UNIVERSITY",
    country: "Sri Lanka",
    city: "Colombo",
    email: "info@iit.ac.lk",
    website: "https://iit.ac.lk",
    description: "IIT is Sri Lanka's premier institute for IT and computing education, offering UK degree programs in partnership with the University of Westminster.",
  },
  {
    name: "Indian Institute of Technology Bombay",
    type: "FOREIGN_UNIVERSITY",
    country: "India",
    city: "Mumbai",
    email: "admissions@iitb.ac.in",
    website: "https://iitb.ac.in",
    description: "IIT Bombay is one of India's most prestigious engineering institutions, recognised globally for excellence in technical education, research, and innovation.",
  },
  {
    name: "Asia Pacific Institute of Information Technology",
    type: "TRAINING_INSTITUTE",
    country: "Sri Lanka",
    city: "Colombo",
    email: "info@apiit.lk",
    website: "https://apiit.lk",
    description: "APIIT Sri Lanka offers UK degree programmes in partnership with Staffordshire University, specialising in computing, law, and business management.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Program templates per institution
// ─────────────────────────────────────────────────────────────────────────────

const programTemplates: Record<string, Array<{
  title: string;
  type: string;
  level: string;
  field: string;
  durationMonths: number;
  deliveryMode: string;
  description: string;
  entryRequirements: string;
  careerOutcomes: string;
  localPrice: string;
  foreignPrice: string;
  interestTags: string[];
  careerOutcomeTags: string[];
  language: string[];
  creditPoints: number;
}>> = {
  "University of Colombo": [
    { title: "Bachelor of Science in Computer Science", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "A comprehensive undergraduate program covering algorithms, data structures, software engineering, and emerging technologies.", entryRequirements: "3 A/L passes with Mathematics. Minimum Z-score eligibility.", careerOutcomes: "Software Engineer, Systems Analyst, Data Scientist, IT Consultant", localPrice: "0.00", foreignPrice: "3500.00", interestTags: ["programming", "algorithms", "technology"], careerOutcomeTags: ["software-engineer", "developer", "analyst"], language: ["English"], creditPoints: 120 },
    { title: "Bachelor of Arts in Economics", type: "BACHELOR", level: "UNDERGRADUATE", field: "ECONOMICS", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Study economic theory, policy analysis, and quantitative methods with a focus on developing and emerging economies.", entryRequirements: "3 A/L passes in Arts or Commerce stream.", careerOutcomes: "Economist, Policy Analyst, Banking Professional, Research Officer", localPrice: "0.00", foreignPrice: "2800.00", interestTags: ["economics", "finance", "policy"], careerOutcomeTags: ["economist", "analyst", "banker"], language: ["English", "Sinhala"], creditPoints: 90 },
    { title: "Bachelor of Laws (LLB)", type: "BACHELOR", level: "UNDERGRADUATE", field: "LAW", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "An academically rigorous law degree covering constitutional, commercial, criminal, and international law.", entryRequirements: "3 A/L passes. English proficiency required.", careerOutcomes: "Attorney-at-Law, Legal Advisor, Judge, Corporate Counsel", localPrice: "0.00", foreignPrice: "3200.00", interestTags: ["law", "justice", "governance"], careerOutcomeTags: ["lawyer", "legal-advisor", "counsel"], language: ["English"], creditPoints: 120 },
    { title: "Master of Business Administration", type: "MASTER", level: "POSTGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 24, deliveryMode: "HYBRID", description: "A globally recognised MBA program focusing on strategic leadership, financial management, and entrepreneurship.", entryRequirements: "Bachelor's degree with minimum 2 years work experience.", careerOutcomes: "Business Manager, Entrepreneur, Management Consultant, Executive Director", localPrice: "450000.00", foreignPrice: "5500.00", interestTags: ["management", "leadership", "business"], careerOutcomeTags: ["manager", "entrepreneur", "consultant"], language: ["English"], creditPoints: 60 },
    { title: "Diploma in Psychology", type: "DIPLOMA", level: "UNDERGRADUATE", field: "PSYCHOLOGY", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "An introductory program covering core psychological theories, human behaviour, and mental health fundamentals.", entryRequirements: "A/L qualification or equivalent.", careerOutcomes: "Counsellor, HR Officer, Social Worker, Community Support Worker", localPrice: "75000.00", foreignPrice: "1200.00", interestTags: ["psychology", "mental-health", "counselling"], careerOutcomeTags: ["counsellor", "social-worker", "hr-officer"], language: ["English", "Sinhala"], creditPoints: 30 },
    { title: "BSc in Environmental Science", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENVIRONMENTAL_SCIENCE", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Study ecosystems, climate change, environmental policy, and sustainable development practices.", entryRequirements: "3 A/L passes in Science stream with Biology or Chemistry.", careerOutcomes: "Environmental Consultant, Conservation Officer, Policy Analyst", localPrice: "0.00", foreignPrice: "3000.00", interestTags: ["environment", "sustainability", "climate"], careerOutcomeTags: ["environmental-consultant", "conservation-officer"], language: ["English"], creditPoints: 90 },
    { title: "Master of Public Administration", type: "MASTER", level: "POSTGRADUATE", field: "POLITICAL_SCIENCE", durationMonths: 18, deliveryMode: "HYBRID", description: "Develop competencies in public sector governance, policy implementation, and administrative leadership.", entryRequirements: "Bachelor's degree with relevant work experience in public sector.", careerOutcomes: "Government Official, Policy Analyst, Public Sector Manager", localPrice: "280000.00", foreignPrice: "4000.00", interestTags: ["governance", "policy", "public-sector"], careerOutcomeTags: ["government-official", "policy-analyst"], language: ["English", "Sinhala"], creditPoints: 45 },
    { title: "Certificate in Data Analytics", type: "CERTIFICATE", level: "ENTRY", field: "DATA_SCIENCE", durationMonths: 6, deliveryMode: "ONLINE", description: "A practical short course covering data wrangling, visualisation, and basic statistical analysis using Python and R.", entryRequirements: "Basic computer literacy. No prior programming experience required.", careerOutcomes: "Data Analyst, Business Analyst, Reporting Specialist", localPrice: "45000.00", foreignPrice: "800.00", interestTags: ["data", "analytics", "python"], careerOutcomeTags: ["data-analyst", "business-analyst"], language: ["English"], creditPoints: 15 },
    { title: "BSc in Mathematics", type: "BACHELOR", level: "UNDERGRADUATE", field: "MATHEMATICS", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "A rigorous program in pure and applied mathematics including calculus, algebra, statistics, and mathematical modelling.", entryRequirements: "3 A/L passes with Mathematics (A grade required).", careerOutcomes: "Mathematician, Actuary, Data Scientist, Financial Analyst", localPrice: "0.00", foreignPrice: "2800.00", interestTags: ["mathematics", "statistics", "modelling"], careerOutcomeTags: ["mathematician", "actuary", "analyst"], language: ["English"], creditPoints: 90 },
    { title: "Postgraduate Diploma in Education", type: "DIPLOMA", level: "POSTGRADUATE", field: "EDUCATION", durationMonths: 12, deliveryMode: "HYBRID", description: "Prepare for a career in teaching with this practice-oriented postgraduate diploma covering pedagogy and curriculum design.", entryRequirements: "Bachelor's degree in any discipline.", careerOutcomes: "School Teacher, Curriculum Developer, Educational Consultant", localPrice: "120000.00", foreignPrice: "2000.00", interestTags: ["education", "teaching", "pedagogy"], careerOutcomeTags: ["teacher", "educator", "curriculum-developer"], language: ["English", "Sinhala", "Tamil"], creditPoints: 30 },
    { title: "BSc in Physics", type: "BACHELOR", level: "UNDERGRADUATE", field: "PHYSICS", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Explore classical and modern physics including quantum mechanics, thermodynamics, optics, and astrophysics.", entryRequirements: "3 A/L passes in Physical Science stream.", careerOutcomes: "Physicist, Research Scientist, Engineer, Science Teacher", localPrice: "0.00", foreignPrice: "2800.00", interestTags: ["physics", "science", "research"], careerOutcomeTags: ["physicist", "researcher", "scientist"], language: ["English"], creditPoints: 90 },
    { title: "Diploma in Statistics", type: "DIPLOMA", level: "UNDERGRADUATE", field: "MATHEMATICS", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Foundational and applied statistics for students seeking careers in data analysis, research, and quality management.", entryRequirements: "A/L Mathematics or equivalent.", careerOutcomes: "Statistician, Research Assistant, Quality Analyst", localPrice: "60000.00", foreignPrice: "1000.00", interestTags: ["statistics", "data", "research"], careerOutcomeTags: ["statistician", "analyst"], language: ["English", "Sinhala"], creditPoints: 30 },
  ],

  "Sri Lanka Institute of Information Technology": [
    { title: "BSc in Information Technology", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "A comprehensive IT program covering software development, networking, database management, and cybersecurity.", entryRequirements: "3 A/L passes or equivalent with Mathematics.", careerOutcomes: "Software Developer, Network Engineer, IT Manager, Systems Analyst", localPrice: "560000.00", foreignPrice: "4500.00", interestTags: ["programming", "networking", "technology"], careerOutcomeTags: ["software-developer", "network-engineer", "it-manager"], language: ["English"], creditPoints: 120 },
    { title: "BSc in Software Engineering", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Industry-aligned software engineering education covering agile development, system design, and DevOps practices.", entryRequirements: "3 A/L passes with Mathematics and English.", careerOutcomes: "Software Engineer, DevOps Engineer, Technical Lead, Architect", localPrice: "580000.00", foreignPrice: "4800.00", interestTags: ["software", "engineering", "devops"], careerOutcomeTags: ["software-engineer", "devops-engineer", "architect"], language: ["English"], creditPoints: 120 },
    { title: "BSc in Data Science", type: "BACHELOR", level: "UNDERGRADUATE", field: "DATA_SCIENCE", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Cutting-edge data science curriculum covering machine learning, big data, statistical modelling, and AI applications.", entryRequirements: "3 A/L passes with Mathematics and English.", careerOutcomes: "Data Scientist, ML Engineer, Business Intelligence Analyst", localPrice: "600000.00", foreignPrice: "5000.00", interestTags: ["data-science", "machine-learning", "ai"], careerOutcomeTags: ["data-scientist", "ml-engineer", "bi-analyst"], language: ["English"], creditPoints: 120 },
    { title: "BSc in Cybersecurity", type: "BACHELOR", level: "UNDERGRADUATE", field: "CYBER_SECURITY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Specialised program in network security, ethical hacking, digital forensics, and information assurance.", entryRequirements: "3 A/L passes with Mathematics.", careerOutcomes: "Cybersecurity Analyst, Ethical Hacker, Security Consultant", localPrice: "620000.00", foreignPrice: "5200.00", interestTags: ["cybersecurity", "hacking", "security"], careerOutcomeTags: ["security-analyst", "ethical-hacker", "security-consultant"], language: ["English"], creditPoints: 120 },
    { title: "Master of Science in AI", type: "MASTER", level: "POSTGRADUATE", field: "ARTIFICIAL_INTELLIGENCE", durationMonths: 24, deliveryMode: "HYBRID", description: "Advanced study in artificial intelligence, deep learning, NLP, and AI ethics for industry-ready professionals.", entryRequirements: "BSc in IT, CS, or related field.", careerOutcomes: "AI Engineer, Research Scientist, NLP Engineer, AI Consultant", localPrice: "750000.00", foreignPrice: "7000.00", interestTags: ["ai", "deep-learning", "nlp"], careerOutcomeTags: ["ai-engineer", "research-scientist", "nlp-engineer"], language: ["English"], creditPoints: 60 },
    { title: "Diploma in Mobile Application Development", type: "DIPLOMA", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Hands-on training in iOS and Android development using Swift, Kotlin, and cross-platform frameworks like Flutter.", entryRequirements: "A/L qualification and basic programming knowledge.", careerOutcomes: "Mobile Developer, App Designer, Flutter Developer", localPrice: "120000.00", foreignPrice: "1500.00", interestTags: ["mobile", "flutter", "app-development"], careerOutcomeTags: ["mobile-developer", "app-developer"], language: ["English"], creditPoints: 30 },
    { title: "BSc in Business Information Systems", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "HYBRID", description: "Bridge IT and business with expertise in ERP systems, business analytics, and digital transformation.", entryRequirements: "3 A/L passes in any stream with English.", careerOutcomes: "Business Analyst, ERP Consultant, IT Project Manager", localPrice: "520000.00", foreignPrice: "4200.00", interestTags: ["business", "erp", "analytics"], careerOutcomeTags: ["business-analyst", "erp-consultant", "project-manager"], language: ["English"], creditPoints: 120 },
    { title: "Certificate in Cloud Computing", type: "CERTIFICATE", level: "ENTRY", field: "INFORMATION_TECHNOLOGY", durationMonths: 6, deliveryMode: "ONLINE", description: "AWS and Azure focused cloud computing fundamentals covering IaaS, PaaS, SaaS, and cloud security.", entryRequirements: "Basic IT knowledge. No formal qualifications required.", careerOutcomes: "Cloud Engineer, DevOps Engineer, Solutions Architect", localPrice: "65000.00", foreignPrice: "900.00", interestTags: ["cloud", "aws", "azure"], careerOutcomeTags: ["cloud-engineer", "devops-engineer", "solutions-architect"], language: ["English"], creditPoints: 15 },
    { title: "MSc in Information Security", type: "MASTER", level: "POSTGRADUATE", field: "CYBER_SECURITY", durationMonths: 18, deliveryMode: "HYBRID", description: "Advanced cybersecurity training covering threat intelligence, incident response, and security architecture.", entryRequirements: "BSc in IT or related field.", careerOutcomes: "CISO, Security Architect, Incident Response Analyst", localPrice: "720000.00", foreignPrice: "6500.00", interestTags: ["security", "threat-intelligence", "incident-response"], careerOutcomeTags: ["ciso", "security-architect", "incident-responder"], language: ["English"], creditPoints: 45 },
    { title: "BSc in Computer Networks", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "In-depth study of network protocols, infrastructure design, wireless technologies, and cloud networking.", entryRequirements: "3 A/L passes with Mathematics.", careerOutcomes: "Network Engineer, Infrastructure Specialist, NOC Engineer", localPrice: "540000.00", foreignPrice: "4300.00", interestTags: ["networking", "infrastructure", "wireless"], careerOutcomeTags: ["network-engineer", "infrastructure-specialist"], language: ["English"], creditPoints: 120 },
    { title: "Microcredential in UI/UX Design", type: "MICROCREDENTIAL", level: "ENTRY", field: "GRAPHIC_DESIGN", durationMonths: 3, deliveryMode: "ONLINE", description: "Learn user experience design, wireframing, prototyping, and usability testing using Figma and Adobe XD.", entryRequirements: "No formal requirements. Creativity and interest in design.", careerOutcomes: "UI/UX Designer, Product Designer, Interaction Designer", localPrice: "35000.00", foreignPrice: "500.00", interestTags: ["ux", "design", "figma"], careerOutcomeTags: ["ux-designer", "product-designer"], language: ["English"], creditPoints: 10 },
  ],

  "National Institute of Business Management": [
    { title: "Higher National Diploma in Business Management", type: "DIPLOMA", level: "UNDERGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 24, deliveryMode: "HYBRID", description: "A practical business management qualification covering marketing, finance, HR, and operations management.", entryRequirements: "A/L qualification or equivalent.", careerOutcomes: "Business Manager, Marketing Executive, Operations Officer", localPrice: "180000.00", foreignPrice: "2200.00", interestTags: ["business", "management", "marketing"], careerOutcomeTags: ["business-manager", "marketing-executive", "operations-officer"], language: ["English", "Sinhala"], creditPoints: 60 },
    { title: "BSc in Accounting and Finance", type: "BACHELOR", level: "UNDERGRADUATE", field: "ACCOUNTING_FINANCE", durationMonths: 36, deliveryMode: "HYBRID", description: "Comprehensive coverage of financial accounting, management accounting, taxation, and corporate finance.", entryRequirements: "A/L Commerce stream or equivalent.", careerOutcomes: "Accountant, Financial Analyst, Auditor, Tax Consultant", localPrice: "320000.00", foreignPrice: "3500.00", interestTags: ["accounting", "finance", "taxation"], careerOutcomeTags: ["accountant", "financial-analyst", "auditor"], language: ["English"], creditPoints: 90 },
    { title: "Diploma in Human Resource Management", type: "DIPLOMA", level: "UNDERGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 12, deliveryMode: "HYBRID", description: "Essential HRM skills covering recruitment, performance management, labour law, and organisational behaviour.", entryRequirements: "A/L qualification.", careerOutcomes: "HR Officer, Recruitment Consultant, Training Coordinator", localPrice: "85000.00", foreignPrice: "1100.00", interestTags: ["hr", "recruitment", "people-management"], careerOutcomeTags: ["hr-officer", "recruitment-consultant"], language: ["English", "Sinhala"], creditPoints: 30 },
    { title: "MBA in Financial Management", type: "MASTER", level: "POSTGRADUATE", field: "ACCOUNTING_FINANCE", durationMonths: 18, deliveryMode: "HYBRID", description: "Postgraduate specialisation in corporate finance, investment analysis, risk management, and financial strategy.", entryRequirements: "Bachelor's degree with 2 years work experience.", careerOutcomes: "CFO, Finance Manager, Investment Analyst, Risk Manager", localPrice: "480000.00", foreignPrice: "5500.00", interestTags: ["finance", "investment", "risk-management"], careerOutcomeTags: ["cfo", "finance-manager", "investment-analyst"], language: ["English"], creditPoints: 60 },
    { title: "Certificate in Digital Marketing", type: "CERTIFICATE", level: "ENTRY", field: "BUSINESS_MANAGEMENT", durationMonths: 6, deliveryMode: "ONLINE", description: "Practical digital marketing skills covering SEO, social media, content marketing, Google Ads, and analytics.", entryRequirements: "O/L or equivalent. Basic internet skills.", careerOutcomes: "Digital Marketer, Social Media Manager, SEO Specialist", localPrice: "45000.00", foreignPrice: "700.00", interestTags: ["digital-marketing", "seo", "social-media"], careerOutcomeTags: ["digital-marketer", "social-media-manager", "seo-specialist"], language: ["English", "Sinhala"], creditPoints: 15 },
    { title: "BSc in Logistics and Supply Chain Management", type: "BACHELOR", level: "UNDERGRADUATE", field: "LOGISTICS", durationMonths: 36, deliveryMode: "HYBRID", description: "Study global supply chain operations, inventory management, procurement, and logistics technology.", entryRequirements: "A/L qualification in any stream.", careerOutcomes: "Logistics Manager, Supply Chain Analyst, Procurement Officer", localPrice: "300000.00", foreignPrice: "3200.00", interestTags: ["logistics", "supply-chain", "procurement"], careerOutcomeTags: ["logistics-manager", "supply-chain-analyst"], language: ["English"], creditPoints: 90 },
    { title: "Postgraduate Diploma in Project Management", type: "DIPLOMA", level: "POSTGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 12, deliveryMode: "HYBRID", description: "PMP-aligned curriculum covering project planning, risk management, agile methodologies, and stakeholder management.", entryRequirements: "Bachelor's degree with relevant work experience.", careerOutcomes: "Project Manager, Scrum Master, Programme Manager", localPrice: "150000.00", foreignPrice: "2000.00", interestTags: ["project-management", "agile", "scrum"], careerOutcomeTags: ["project-manager", "scrum-master", "programme-manager"], language: ["English"], creditPoints: 30 },
    { title: "Diploma in Entrepreneurship", type: "DIPLOMA", level: "UNDERGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 12, deliveryMode: "HYBRID", description: "Build entrepreneurial skills in business planning, innovation, startup financing, and go-to-market strategy.", entryRequirements: "A/L qualification or equivalent.", careerOutcomes: "Entrepreneur, Startup Founder, Business Development Manager", localPrice: "90000.00", foreignPrice: "1200.00", interestTags: ["entrepreneurship", "startup", "innovation"], careerOutcomeTags: ["entrepreneur", "startup-founder", "business-developer"], language: ["English", "Sinhala"], creditPoints: 30 },
    { title: "BSc in Tourism and Hospitality Management", type: "BACHELOR", level: "UNDERGRADUATE", field: "TOURISM_HOSPITALITY", durationMonths: 36, deliveryMode: "HYBRID", description: "Comprehensive tourism and hospitality program covering hotel operations, event management, and destination marketing.", entryRequirements: "A/L qualification in any stream.", careerOutcomes: "Hotel Manager, Tourism Officer, Event Coordinator", localPrice: "280000.00", foreignPrice: "3000.00", interestTags: ["tourism", "hospitality", "hotel-management"], careerOutcomeTags: ["hotel-manager", "tourism-officer", "event-coordinator"], language: ["English", "Sinhala"], creditPoints: 90 },
    { title: "Certificate in Entrepreneurship and Innovation", type: "CERTIFICATE", level: "ENTRY", field: "BUSINESS_MANAGEMENT", durationMonths: 4, deliveryMode: "ONLINE", description: "A focused short course on ideation, business model design, lean startup methodology, and pitching to investors.", entryRequirements: "No formal requirements.", careerOutcomes: "Entrepreneur, Innovation Manager, Product Owner", localPrice: "30000.00", foreignPrice: "500.00", interestTags: ["entrepreneurship", "innovation", "startup"], careerOutcomeTags: ["entrepreneur", "product-owner"], language: ["English", "Sinhala"], creditPoints: 10 },
  ],

  "Imperial College London": [
    { title: "MEng in Electrical and Electronic Engineering", type: "MASTER", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "A world-class integrated master's covering power systems, signal processing, communications, and microelectronics.", entryRequirements: "A-levels: A*A*A including Mathematics and Physics.", careerOutcomes: "Electrical Engineer, Systems Engineer, R&D Engineer", localPrice: "35000.00", foreignPrice: "42000.00", interestTags: ["electrical", "engineering", "electronics"], careerOutcomeTags: ["electrical-engineer", "systems-engineer", "rd-engineer"], language: ["English"], creditPoints: 240 },
    { title: "BSc in Computing", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "A rigorous computing programme covering algorithms, machine learning, distributed systems, and software engineering.", entryRequirements: "A-levels: A*A*A including Mathematics.", careerOutcomes: "Software Engineer, Research Scientist, Technical Architect", localPrice: "33000.00", foreignPrice: "39000.00", interestTags: ["computing", "algorithms", "software"], careerOutcomeTags: ["software-engineer", "research-scientist", "architect"], language: ["English"], creditPoints: 180 },
    { title: "MSc in Machine Learning", type: "MASTER", level: "POSTGRADUATE", field: "ARTIFICIAL_INTELLIGENCE", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Advanced machine learning programme developed with DeepMind covering deep learning, reinforcement learning, and probabilistic ML.", entryRequirements: "First-class or upper-second BSc in computing, mathematics, or engineering.", careerOutcomes: "ML Researcher, AI Engineer, Data Scientist", localPrice: "35000.00", foreignPrice: "38500.00", interestTags: ["machine-learning", "deep-learning", "ai"], careerOutcomeTags: ["ml-researcher", "ai-engineer", "data-scientist"], language: ["English"], creditPoints: 90 },
    { title: "MEng in Chemical Engineering", type: "MASTER", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Industry-leading chemical engineering programme integrating process design, reaction engineering, and sustainability.", entryRequirements: "A-levels: A*A*A including Mathematics and Chemistry.", careerOutcomes: "Chemical Engineer, Process Engineer, R&D Scientist", localPrice: "35000.00", foreignPrice: "42000.00", interestTags: ["chemical-engineering", "process", "sustainability"], careerOutcomeTags: ["chemical-engineer", "process-engineer", "rd-scientist"], language: ["English"], creditPoints: 240 },
    { title: "MSc in Epidemiology", type: "MASTER", level: "POSTGRADUATE", field: "HEALTHCARE", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Study disease patterns, public health interventions, and statistical methods used in epidemiological research.", entryRequirements: "Upper-second BSc in a health, biological, or quantitative science.", careerOutcomes: "Epidemiologist, Public Health Officer, Health Researcher", localPrice: "33000.00", foreignPrice: "36000.00", interestTags: ["epidemiology", "public-health", "research"], careerOutcomeTags: ["epidemiologist", "public-health-officer", "health-researcher"], language: ["English"], creditPoints: 90 },
    { title: "MBA in Innovation and Entrepreneurship", type: "MASTER", level: "POSTGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Imperial's flagship MBA blending technology, business strategy, and entrepreneurial thinking for innovation leaders.", entryRequirements: "GMAT 600+ and 3 years professional experience.", careerOutcomes: "Entrepreneur, Innovation Director, Venture Capitalist", localPrice: "65000.00", foreignPrice: "72000.00", interestTags: ["mba", "innovation", "entrepreneurship"], careerOutcomeTags: ["entrepreneur", "innovation-director", "vc"], language: ["English"], creditPoints: 90 },
    { title: "BSc in Biochemistry", type: "BACHELOR", level: "UNDERGRADUATE", field: "BIO_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Explore the molecular basis of life covering protein chemistry, genomics, metabolic pathways, and drug discovery.", entryRequirements: "A-levels: A*A*A including Chemistry and Biology.", careerOutcomes: "Biochemist, Research Scientist, Pharmaceutical Scientist", localPrice: "33000.00", foreignPrice: "39000.00", interestTags: ["biochemistry", "genomics", "drug-discovery"], careerOutcomeTags: ["biochemist", "research-scientist", "pharmaceutical-scientist"], language: ["English"], creditPoints: 180 },
    { title: "MSc in Data Science", type: "MASTER", level: "POSTGRADUATE", field: "DATA_SCIENCE", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Imperial's data science MSc integrating statistical learning, big data systems, and real-world industry projects.", entryRequirements: "Upper-second BSc in mathematics, statistics, computing, or engineering.", careerOutcomes: "Data Scientist, Quantitative Analyst, ML Engineer", localPrice: "34000.00", foreignPrice: "37500.00", interestTags: ["data-science", "statistics", "big-data"], careerOutcomeTags: ["data-scientist", "quantitative-analyst", "ml-engineer"], language: ["English"], creditPoints: 90 },
    { title: "MEng in Aeronautical Engineering", type: "MASTER", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "World-renowned aerospace engineering programme covering aerodynamics, propulsion, structures, and flight mechanics.", entryRequirements: "A-levels: A*A*A including Mathematics and Physics.", careerOutcomes: "Aerospace Engineer, Flight Systems Engineer, R&D Engineer", localPrice: "35000.00", foreignPrice: "43000.00", interestTags: ["aerospace", "aerodynamics", "engineering"], careerOutcomeTags: ["aerospace-engineer", "flight-systems-engineer"], language: ["English"], creditPoints: 240 },
    { title: "MSc in Environmental Engineering", type: "MASTER", level: "POSTGRADUATE", field: "ENVIRONMENTAL_SCIENCE", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Address global environmental challenges through engineering solutions in water treatment, air quality, and waste management.", entryRequirements: "Upper-second BSc in engineering or environmental science.", careerOutcomes: "Environmental Engineer, Sustainability Consultant, Policy Advisor", localPrice: "34000.00", foreignPrice: "37000.00", interestTags: ["environmental", "sustainability", "engineering"], careerOutcomeTags: ["environmental-engineer", "sustainability-consultant"], language: ["English"], creditPoints: 90 },
    { title: "PhD in Biomedical Engineering", type: "PHD", level: "RESEARCH", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Frontier research at the intersection of engineering and medicine — from medical devices to tissue engineering and neural interfaces.", entryRequirements: "First-class MSc or MEng in a relevant discipline.", careerOutcomes: "Research Scientist, University Professor, Biotech Entrepreneur", localPrice: "24000.00", foreignPrice: "28000.00", interestTags: ["biomedical", "research", "engineering"], careerOutcomeTags: ["research-scientist", "professor", "biotech-entrepreneur"], language: ["English"], creditPoints: 0 },
  ],

  "Massachusetts Institute of Technology": [
    { title: "BSc in Electrical Engineering and Computer Science", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "MIT's flagship EECS program — one of the most rigorous and respected engineering degrees in the world.", entryRequirements: "SAT/ACT scores in top 1%. Exceptional academic record.", careerOutcomes: "Software Engineer, Hardware Engineer, Research Scientist, Founder", localPrice: "57000.00", foreignPrice: "62000.00", interestTags: ["eecs", "engineering", "computer-science"], careerOutcomeTags: ["software-engineer", "hardware-engineer", "researcher", "founder"], language: ["English"], creditPoints: 180 },
    { title: "MSc in Computer Science and Artificial Intelligence", type: "MASTER", level: "POSTGRADUATE", field: "ARTIFICIAL_INTELLIGENCE", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "Advanced AI and CS research programme at the MIT CSAIL — one of the world's premier AI research labs.", entryRequirements: "BSc with exceptional academic standing and research experience.", careerOutcomes: "AI Researcher, Principal Engineer, Research Scientist, CTO", localPrice: "60000.00", foreignPrice: "65000.00", interestTags: ["ai", "research", "computer-science"], careerOutcomeTags: ["ai-researcher", "principal-engineer", "research-scientist", "cto"], language: ["English"], creditPoints: 90 },
    { title: "BSc in Mathematics with Computer Science", type: "BACHELOR", level: "UNDERGRADUATE", field: "MATHEMATICS", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "A unique interdisciplinary program at the intersection of theoretical mathematics and practical computer science.", entryRequirements: "SAT/ACT top percentile. Strong mathematical background.", careerOutcomes: "Cryptographer, Quantitative Analyst, Research Mathematician", localPrice: "57000.00", foreignPrice: "62000.00", interestTags: ["mathematics", "computer-science", "theory"], careerOutcomeTags: ["cryptographer", "quantitative-analyst", "mathematician"], language: ["English"], creditPoints: 180 },
    { title: "MEng in Mechanical Engineering", type: "MASTER", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 60, deliveryMode: "ON_CAMPUS", description: "An integrated master's in mechanical engineering covering robotics, thermodynamics, manufacturing, and design.", entryRequirements: "Exceptional secondary school record. SAT/ACT top scores.", careerOutcomes: "Mechanical Engineer, Robotics Engineer, Product Designer", localPrice: "57000.00", foreignPrice: "63000.00", interestTags: ["mechanical", "robotics", "engineering"], careerOutcomeTags: ["mechanical-engineer", "robotics-engineer", "product-designer"], language: ["English"], creditPoints: 240 },
    { title: "MSc in Data, Economics, and Development Policy", type: "MASTER", level: "POSTGRADUATE", field: "ECONOMICS", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "Rigorous programme using data science and economic theory to address global development challenges.", entryRequirements: "Strong quantitative BSc with research experience.", careerOutcomes: "Policy Researcher, Economist, Development Consultant", localPrice: "60000.00", foreignPrice: "65000.00", interestTags: ["economics", "policy", "data-science"], careerOutcomeTags: ["policy-researcher", "economist", "development-consultant"], language: ["English"], creditPoints: 90 },
    { title: "BSc in Physics", type: "BACHELOR", level: "UNDERGRADUATE", field: "PHYSICS", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "World-class physics education covering quantum mechanics, relativity, condensed matter, and astrophysics.", entryRequirements: "SAT/ACT top percentile. Exceptional Mathematics and Physics results.", careerOutcomes: "Physicist, Research Scientist, Quantitative Analyst", localPrice: "57000.00", foreignPrice: "62000.00", interestTags: ["physics", "quantum", "astrophysics"], careerOutcomeTags: ["physicist", "research-scientist", "quantitative-analyst"], language: ["English"], creditPoints: 180 },
    { title: "MBA Sloan Full-Time", type: "MASTER", level: "POSTGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "MIT Sloan MBA — a transformative two-year programme for leaders who want to make a difference in global organisations.", entryRequirements: "GMAT 700+ and 5 years professional experience.", careerOutcomes: "CEO, Entrepreneur, Management Consultant, Investment Banker", localPrice: "80000.00", foreignPrice: "83000.00", interestTags: ["mba", "leadership", "business"], careerOutcomeTags: ["ceo", "entrepreneur", "consultant", "investment-banker"], language: ["English"], creditPoints: 90 },
    { title: "PhD in Computer Science", type: "PHD", level: "RESEARCH", field: "INFORMATION_TECHNOLOGY", durationMonths: 60, deliveryMode: "ON_CAMPUS", description: "One of the world's most prestigious CS doctoral programmes with research spanning AI, systems, theory, and HCI.", entryRequirements: "MSc or BSc with outstanding research portfolio.", careerOutcomes: "Professor, Principal Research Scientist, CTO, Entrepreneur", localPrice: "0.00", foreignPrice: "0.00", interestTags: ["research", "computer-science", "phd"], careerOutcomeTags: ["professor", "research-scientist", "cto"], language: ["English"], creditPoints: 0 },
    { title: "Certificate in FinTech", type: "CERTIFICATE", level: "ENTRY", field: "ACCOUNTING_FINANCE", durationMonths: 6, deliveryMode: "ONLINE", description: "MIT-curated fintech programme covering blockchain, digital payments, AI in finance, and regulatory technology.", entryRequirements: "Professional with finance or technology background.", careerOutcomes: "FinTech Developer, Blockchain Engineer, Digital Banking Specialist", localPrice: "3500.00", foreignPrice: "3500.00", interestTags: ["fintech", "blockchain", "digital-banking"], careerOutcomeTags: ["fintech-developer", "blockchain-engineer"], language: ["English"], creditPoints: 15 },
    { title: "MSc in Urban Planning and Development", type: "MASTER", level: "POSTGRADUATE", field: "ARCHITECTURE", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "Interdisciplinary programme addressing sustainable urbanisation, smart cities, and infrastructure planning.", entryRequirements: "BSc in architecture, urban studies, or related field.", careerOutcomes: "Urban Planner, City Architect, Infrastructure Consultant", localPrice: "60000.00", foreignPrice: "65000.00", interestTags: ["urban-planning", "smart-cities", "sustainability"], careerOutcomeTags: ["urban-planner", "city-architect", "infrastructure-consultant"], language: ["English"], creditPoints: 90 },
  ],

  "National University of Singapore": [
    { title: "BSc in Computer Science", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Asia's top-ranked CS programme covering algorithms, AI, software engineering, and interdisciplinary specialisations.", entryRequirements: "A-levels or equivalent with strong Mathematics performance.", careerOutcomes: "Software Engineer, AI Researcher, Product Manager, Entrepreneur", localPrice: "14000.00", foreignPrice: "28000.00", interestTags: ["computer-science", "ai", "software"], careerOutcomeTags: ["software-engineer", "ai-researcher", "product-manager"], language: ["English"], creditPoints: 160 },
    { title: "BSc in Business Administration", type: "BACHELOR", level: "UNDERGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Asia's leading business programme with global exposure, dual-degree options, and a strong industry network.", entryRequirements: "A-levels or IB with strong academic performance.", careerOutcomes: "Business Analyst, Investment Banker, Consultant, Entrepreneur", localPrice: "13500.00", foreignPrice: "27000.00", interestTags: ["business", "finance", "management"], careerOutcomeTags: ["business-analyst", "investment-banker", "consultant"], language: ["English"], creditPoints: 160 },
    { title: "MSc in Financial Technology", type: "MASTER", level: "POSTGRADUATE", field: "ACCOUNTING_FINANCE", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "NUS's cutting-edge FinTech MSc combining finance, data science, and blockchain developed with MAS and industry partners.", entryRequirements: "Upper-second BSc in business, finance, computing, or engineering.", careerOutcomes: "FinTech Product Manager, Blockchain Developer, Digital Banker", localPrice: "28000.00", foreignPrice: "42000.00", interestTags: ["fintech", "blockchain", "digital-banking"], careerOutcomeTags: ["fintech-pm", "blockchain-developer", "digital-banker"], language: ["English"], creditPoints: 40 },
    { title: "PhD in Biomedical Sciences", type: "PHD", level: "RESEARCH", field: "MEDICINE", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Cutting-edge research in cancer biology, infectious disease, neuroscience, and precision medicine.", entryRequirements: "MSc or first-class BSc with research experience.", careerOutcomes: "Research Scientist, Biotech Entrepreneur, University Professor", localPrice: "8000.00", foreignPrice: "16000.00", interestTags: ["biomedical", "research", "medicine"], careerOutcomeTags: ["research-scientist", "biotech-entrepreneur", "professor"], language: ["English"], creditPoints: 0 },
    { title: "MSc in Data Science and Machine Learning", type: "MASTER", level: "POSTGRADUATE", field: "DATA_SCIENCE", durationMonths: 12, deliveryMode: "HYBRID", description: "Industry-oriented data science MSc with specialisations in NLP, computer vision, and data engineering.", entryRequirements: "Upper-second BSc in computing, statistics, or mathematics.", careerOutcomes: "Data Scientist, ML Engineer, AI Product Manager", localPrice: "26000.00", foreignPrice: "40000.00", interestTags: ["data-science", "machine-learning", "nlp"], careerOutcomeTags: ["data-scientist", "ml-engineer", "ai-pm"], language: ["English"], creditPoints: 40 },
    { title: "BSc in Industrial and Systems Engineering", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Systems thinking approach to engineering covering operations research, supply chain, and human factors engineering.", entryRequirements: "A-levels with Mathematics and Physics.", careerOutcomes: "Systems Engineer, Operations Research Analyst, Logistics Manager", localPrice: "13500.00", foreignPrice: "27500.00", interestTags: ["systems-engineering", "operations-research", "logistics"], careerOutcomeTags: ["systems-engineer", "operations-analyst", "logistics-manager"], language: ["English"], creditPoints: 160 },
    { title: "LLM in International and Comparative Law", type: "MASTER", level: "POSTGRADUATE", field: "LAW", durationMonths: 12, deliveryMode: "ON_CAMPUS", description: "Globally recognised law master's specialising in Asian legal systems, international arbitration, and cross-border transactions.", entryRequirements: "LLB or JD with strong academic standing.", careerOutcomes: "International Lawyer, Arbitrator, Legal Counsel, Diplomat", localPrice: "24000.00", foreignPrice: "36000.00", interestTags: ["international-law", "arbitration", "legal"], careerOutcomeTags: ["international-lawyer", "arbitrator", "legal-counsel"], language: ["English"], creditPoints: 40 },
    { title: "BSc in Environmental Studies", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENVIRONMENTAL_SCIENCE", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Interdisciplinary programme exploring environmental policy, ecology, sustainability science, and green technology.", entryRequirements: "A-levels or IB in sciences.", careerOutcomes: "Environmental Consultant, Policy Analyst, Sustainability Officer", localPrice: "13000.00", foreignPrice: "26000.00", interestTags: ["environment", "sustainability", "ecology"], careerOutcomeTags: ["environmental-consultant", "policy-analyst", "sustainability-officer"], language: ["English"], creditPoints: 120 },
    { title: "Certificate in Design Thinking", type: "CERTIFICATE", level: "ENTRY", field: "GRAPHIC_DESIGN", durationMonths: 3, deliveryMode: "ONLINE", description: "Stanford d.school methodology adapted for Asian business contexts — ideation, prototyping, and user-centred design.", entryRequirements: "Working professional or student. No formal requirements.", careerOutcomes: "Design Strategist, Innovation Manager, Product Owner", localPrice: "2500.00", foreignPrice: "3500.00", interestTags: ["design-thinking", "innovation", "ux"], careerOutcomeTags: ["design-strategist", "innovation-manager", "product-owner"], language: ["English"], creditPoints: 10 },
    { title: "MSc in Urban Design", type: "MASTER", level: "POSTGRADUATE", field: "ARCHITECTURE", durationMonths: 18, deliveryMode: "ON_CAMPUS", description: "Explore Singapore's globally acclaimed urban planning model and apply design principles to tropical and Asian city contexts.", entryRequirements: "Bachelor's in architecture, planning, or related field.", careerOutcomes: "Urban Designer, City Planner, Real Estate Developer", localPrice: "25000.00", foreignPrice: "38000.00", interestTags: ["urban-design", "city-planning", "architecture"], careerOutcomeTags: ["urban-designer", "city-planner", "real-estate-developer"], language: ["English"], creditPoints: 60 },
  ],

  "ACCA Sri Lanka": [
    { title: "ACCA Professional Qualification", type: "PROFESSIONAL", level: "POSTGRADUATE", field: "ACCOUNTING_FINANCE", durationMonths: 36, deliveryMode: "HYBRID", description: "The globally recognised ACCA qualification covering financial reporting, taxation, audit, and strategic business leadership.", entryRequirements: "Minimum 2 A/L passes and 3 O/L passes including English and Mathematics.", careerOutcomes: "Chartered Accountant, CFO, Financial Controller, Auditor", localPrice: "350000.00", foreignPrice: "4200.00", interestTags: ["accounting", "acca", "audit"], careerOutcomeTags: ["chartered-accountant", "cfo", "auditor"], language: ["English"], creditPoints: 0 },
    { title: "ACCA Foundation in Accountancy", type: "FOUNDATION", level: "ENTRY", field: "ACCOUNTING_FINANCE", durationMonths: 12, deliveryMode: "HYBRID", description: "Entry-level accounting qualification providing the foundation to progress to the ACCA Professional Qualification.", entryRequirements: "O/L qualification with passes in Mathematics and English.", careerOutcomes: "Accounts Assistant, Bookkeeper, Junior Auditor", localPrice: "95000.00", foreignPrice: "1200.00", interestTags: ["accounting", "bookkeeping", "finance"], careerOutcomeTags: ["accounts-assistant", "bookkeeper", "junior-auditor"], language: ["English"], creditPoints: 0 },
    { title: "Diploma in Financial and Management Accounting", type: "DIPLOMA", level: "UNDERGRADUATE", field: "ACCOUNTING_FINANCE", durationMonths: 18, deliveryMode: "HYBRID", description: "Practical financial and management accounting skills for professionals in finance, banking, and business roles.", entryRequirements: "A/L qualification or equivalent.", careerOutcomes: "Management Accountant, Financial Analyst, Cost Accountant", localPrice: "130000.00", foreignPrice: "1600.00", interestTags: ["management-accounting", "financial-analysis", "cost-accounting"], careerOutcomeTags: ["management-accountant", "financial-analyst", "cost-accountant"], language: ["English"], creditPoints: 40 },
    { title: "Certificate in Taxation", type: "CERTIFICATE", level: "ENTRY", field: "ACCOUNTING_FINANCE", durationMonths: 6, deliveryMode: "ONLINE", description: "Sri Lankan and international taxation fundamentals including income tax, VAT, and corporate tax planning.", entryRequirements: "Accounting background or A/L Commerce.", careerOutcomes: "Tax Consultant, Tax Manager, Finance Officer", localPrice: "55000.00", foreignPrice: "800.00", interestTags: ["taxation", "tax-planning", "finance"], careerOutcomeTags: ["tax-consultant", "tax-manager", "finance-officer"], language: ["English"], creditPoints: 15 },
    { title: "ACCA Strategic Business Leader Programme", type: "PROFESSIONAL", level: "POSTGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 6, deliveryMode: "HYBRID", description: "An integrated case study examination testing leadership, governance, strategy, and professional skills at the strategic level.", entryRequirements: "ACCA Applied Skills level completion.", careerOutcomes: "Business Leader, Finance Director, Strategic Advisor", localPrice: "85000.00", foreignPrice: "1200.00", interestTags: ["leadership", "strategy", "governance"], careerOutcomeTags: ["business-leader", "finance-director", "strategic-advisor"], language: ["English"], creditPoints: 0 },
    { title: "Microcredential in Financial Modelling", type: "MICROCREDENTIAL", level: "ENTRY", field: "ACCOUNTING_FINANCE", durationMonths: 3, deliveryMode: "ONLINE", description: "Excel-based financial modelling skills covering DCF valuation, LBO, M&A models, and scenario analysis.", entryRequirements: "Basic accounting knowledge and Excel familiarity.", careerOutcomes: "Financial Modeller, Investment Analyst, Corporate Finance Associate", localPrice: "35000.00", foreignPrice: "500.00", interestTags: ["financial-modelling", "excel", "valuation"], careerOutcomeTags: ["financial-modeller", "investment-analyst", "corporate-finance"], language: ["English"], creditPoints: 10 },
    { title: "Certificate in ESG and Sustainability Reporting", type: "CERTIFICATE", level: "ENTRY", field: "BUSINESS_MANAGEMENT", durationMonths: 4, deliveryMode: "ONLINE", description: "Emerging skills in environmental, social, and governance reporting frameworks including GRI, TCFD, and ISSB standards.", entryRequirements: "Finance or business professional.", careerOutcomes: "ESG Analyst, Sustainability Reporting Officer, CSR Manager", localPrice: "40000.00", foreignPrice: "600.00", interestTags: ["esg", "sustainability", "reporting"], careerOutcomeTags: ["esg-analyst", "sustainability-officer", "csr-manager"], language: ["English"], creditPoints: 10 },
    { title: "ACCA Applied Skills Programme", type: "PROFESSIONAL", level: "UNDERGRADUATE", field: "ACCOUNTING_FINANCE", durationMonths: 18, deliveryMode: "HYBRID", description: "The middle tier of the ACCA qualification covering corporate reporting, taxation, financial management, and performance management.", entryRequirements: "ACCA Applied Knowledge level or equivalent.", careerOutcomes: "Accountant, Financial Manager, Tax Associate, Auditor", localPrice: "180000.00", foreignPrice: "2400.00", interestTags: ["accounting", "financial-management", "audit"], careerOutcomeTags: ["accountant", "financial-manager", "auditor"], language: ["English"], creditPoints: 0 },
  ],

  "Informatics Institute of Technology": [
    { title: "BSc in Computing (University of Westminster)", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "A UK degree programme delivered in Sri Lanka covering software development, networking, and AI fundamentals.", entryRequirements: "3 A/L passes or equivalent. Mathematics preferred.", careerOutcomes: "Software Developer, Systems Analyst, IT Consultant", localPrice: "490000.00", foreignPrice: "4200.00", interestTags: ["computing", "software", "uk-degree"], careerOutcomeTags: ["software-developer", "systems-analyst", "it-consultant"], language: ["English"], creditPoints: 120 },
    { title: "BSc in Business Information Systems", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Bridging business and technology with modules in ERP, business analytics, project management, and digital strategy.", entryRequirements: "3 A/L passes in any stream.", careerOutcomes: "Business Analyst, ERP Consultant, Digital Transformation Lead", localPrice: "470000.00", foreignPrice: "4000.00", interestTags: ["business-systems", "erp", "analytics"], careerOutcomeTags: ["business-analyst", "erp-consultant", "digital-transformation"], language: ["English"], creditPoints: 120 },
    { title: "HND in Software Development", type: "DIPLOMA", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "A Pearson BTEC Higher National Diploma in software development covering Java, Python, web technologies, and agile practices.", entryRequirements: "O/L qualification with 5 passes including Mathematics and English.", careerOutcomes: "Junior Developer, Web Developer, QA Engineer", localPrice: "220000.00", foreignPrice: "2500.00", interestTags: ["software-development", "java", "web"], careerOutcomeTags: ["junior-developer", "web-developer", "qa-engineer"], language: ["English"], creditPoints: 60 },
    { title: "BSc in Computer Science (University of Westminster)", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Deep theoretical and practical computer science education covering algorithms, databases, OS, and machine learning.", entryRequirements: "3 A/L passes with Mathematics.", careerOutcomes: "Software Engineer, Research Scientist, Data Scientist", localPrice: "510000.00", foreignPrice: "4400.00", interestTags: ["computer-science", "algorithms", "machine-learning"], careerOutcomeTags: ["software-engineer", "research-scientist", "data-scientist"], language: ["English"], creditPoints: 120 },
    { title: "Certificate in Full Stack Web Development", type: "CERTIFICATE", level: "ENTRY", field: "INFORMATION_TECHNOLOGY", durationMonths: 6, deliveryMode: "HYBRID", description: "Intensive full stack bootcamp covering HTML/CSS, React, Node.js, PostgreSQL, and deployment on AWS.", entryRequirements: "Basic computer literacy. No programming experience required.", careerOutcomes: "Full Stack Developer, Front-End Developer, Back-End Developer", localPrice: "75000.00", foreignPrice: "1000.00", interestTags: ["web-development", "react", "nodejs"], careerOutcomeTags: ["full-stack-developer", "front-end-developer", "back-end-developer"], language: ["English"], creditPoints: 15 },
    { title: "HND in Networking and Cybersecurity", type: "DIPLOMA", level: "UNDERGRADUATE", field: "CYBER_SECURITY", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "BTEC HND covering network infrastructure, ethical hacking, firewall management, and incident response.", entryRequirements: "O/L qualification with Mathematics and English.", careerOutcomes: "Network Technician, Security Analyst, IT Support Engineer", localPrice: "230000.00", foreignPrice: "2600.00", interestTags: ["networking", "cybersecurity", "ethical-hacking"], careerOutcomeTags: ["network-technician", "security-analyst", "it-support"], language: ["English"], creditPoints: 60 },
    { title: "MSc in Advanced Computer Science", type: "MASTER", level: "POSTGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 18, deliveryMode: "HYBRID", description: "Postgraduate programme in advanced algorithms, distributed systems, cloud computing, and research methods.", entryRequirements: "BSc in Computing or related field.", careerOutcomes: "Senior Developer, Research Engineer, Solutions Architect", localPrice: "580000.00", foreignPrice: "5200.00", interestTags: ["advanced-computing", "distributed-systems", "cloud"], careerOutcomeTags: ["senior-developer", "research-engineer", "solutions-architect"], language: ["English"], creditPoints: 60 },
    { title: "Microcredential in Data Analytics with Python", type: "MICROCREDENTIAL", level: "ENTRY", field: "DATA_SCIENCE", durationMonths: 3, deliveryMode: "ONLINE", description: "Hands-on data analytics using Python, pandas, matplotlib, and scikit-learn — from data cleaning to predictive modelling.", entryRequirements: "Basic Python knowledge preferred but not required.", careerOutcomes: "Data Analyst, Junior Data Scientist, Business Intelligence Analyst", localPrice: "30000.00", foreignPrice: "450.00", interestTags: ["python", "data-analytics", "pandas"], careerOutcomeTags: ["data-analyst", "junior-data-scientist", "bi-analyst"], language: ["English"], creditPoints: 10 },
  ],

  "Indian Institute of Technology Bombay": [
    { title: "BTech in Computer Science and Engineering", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "One of India's most prestigious CS degrees, known for producing world-class engineers and entrepreneurs.", entryRequirements: "JEE Advanced top ranks. Exceptional academic record.", careerOutcomes: "Software Engineer, Researcher, Entrepreneur, Product Manager", localPrice: "250000.00", foreignPrice: "8000.00", interestTags: ["computer-science", "engineering", "algorithms"], careerOutcomeTags: ["software-engineer", "researcher", "entrepreneur", "product-manager"], language: ["English"], creditPoints: 160 },
    { title: "BTech in Electrical Engineering", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "World-class electrical engineering education covering power systems, signal processing, VLSI, and communications.", entryRequirements: "JEE Advanced top ranks.", careerOutcomes: "Electrical Engineer, VLSI Designer, R&D Engineer", localPrice: "250000.00", foreignPrice: "8000.00", interestTags: ["electrical", "vlsi", "power-systems"], careerOutcomeTags: ["electrical-engineer", "vlsi-designer", "rd-engineer"], language: ["English"], creditPoints: 160 },
    { title: "MTech in Artificial Intelligence", type: "MASTER", level: "POSTGRADUATE", field: "ARTIFICIAL_INTELLIGENCE", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "Advanced AI research programme covering deep learning, computer vision, NLP, and AI for social good.", entryRequirements: "GATE score in CS or equivalent.", careerOutcomes: "AI Researcher, ML Engineer, Research Scientist", localPrice: "50000.00", foreignPrice: "4000.00", interestTags: ["ai", "deep-learning", "computer-vision"], careerOutcomeTags: ["ai-researcher", "ml-engineer", "research-scientist"], language: ["English"], creditPoints: 60 },
    { title: "BTech in Chemical Engineering", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Industry-focused chemical engineering programme with strong emphasis on process design, simulation, and sustainability.", entryRequirements: "JEE Advanced top ranks.", careerOutcomes: "Chemical Engineer, Process Engineer, R&D Scientist", localPrice: "250000.00", foreignPrice: "8000.00", interestTags: ["chemical-engineering", "process-design", "sustainability"], careerOutcomeTags: ["chemical-engineer", "process-engineer", "rd-scientist"], language: ["English"], creditPoints: 160 },
    { title: "MSc in Data Science", type: "MASTER", level: "POSTGRADUATE", field: "DATA_SCIENCE", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "Two-year MSc combining statistical learning, data engineering, and domain applications in finance, health, and industry.", entryRequirements: "BSc in Mathematics, Statistics, or CS with strong marks.", careerOutcomes: "Data Scientist, Quantitative Analyst, ML Engineer", localPrice: "45000.00", foreignPrice: "3500.00", interestTags: ["data-science", "statistics", "machine-learning"], careerOutcomeTags: ["data-scientist", "quantitative-analyst", "ml-engineer"], language: ["English"], creditPoints: 60 },
    { title: "BTech in Mechanical Engineering", type: "BACHELOR", level: "UNDERGRADUATE", field: "ENGINEERING", durationMonths: 48, deliveryMode: "ON_CAMPUS", description: "Comprehensive mechanical engineering programme with specialisations in robotics, thermal systems, and manufacturing.", entryRequirements: "JEE Advanced top ranks.", careerOutcomes: "Mechanical Engineer, Robotics Engineer, Product Designer", localPrice: "250000.00", foreignPrice: "8000.00", interestTags: ["mechanical", "robotics", "manufacturing"], careerOutcomeTags: ["mechanical-engineer", "robotics-engineer", "product-designer"], language: ["English"], creditPoints: 160 },
    { title: "MBA in Technology Management", type: "MASTER", level: "POSTGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "IIT Bombay's flagship MBA with a focus on technology-driven businesses, innovation, and global leadership.", entryRequirements: "CAT score 98+ percentile and 2 years work experience.", careerOutcomes: "Product Manager, Management Consultant, Entrepreneur, VC", localPrice: "800000.00", foreignPrice: "12000.00", interestTags: ["mba", "technology-management", "entrepreneurship"], careerOutcomeTags: ["product-manager", "consultant", "entrepreneur", "vc"], language: ["English"], creditPoints: 90 },
    { title: "PhD in Materials Science", type: "PHD", level: "RESEARCH", field: "ENGINEERING", durationMonths: 60, deliveryMode: "ON_CAMPUS", description: "Research at the frontier of nanomaterials, biomaterials, semiconductors, and energy materials.", entryRequirements: "MTech or MSc in relevant discipline with research aptitude.", careerOutcomes: "Research Scientist, University Professor, Materials Engineer", localPrice: "0.00", foreignPrice: "0.00", interestTags: ["materials-science", "nanotechnology", "research"], careerOutcomeTags: ["research-scientist", "professor", "materials-engineer"], language: ["English"], creditPoints: 0 },
    { title: "Microcredential in Blockchain Technology", type: "MICROCREDENTIAL", level: "ENTRY", field: "INFORMATION_TECHNOLOGY", durationMonths: 3, deliveryMode: "ONLINE", description: "Practical blockchain skills covering Ethereum, Solidity smart contracts, DeFi, and enterprise blockchain applications.", entryRequirements: "Basic programming knowledge.", careerOutcomes: "Blockchain Developer, Smart Contract Engineer, Web3 Developer", localPrice: "15000.00", foreignPrice: "500.00", interestTags: ["blockchain", "ethereum", "web3"], careerOutcomeTags: ["blockchain-developer", "smart-contract-engineer", "web3-developer"], language: ["English"], creditPoints: 10 },
    { title: "Certificate in Product Management", type: "CERTIFICATE", level: "ENTRY", field: "BUSINESS_MANAGEMENT", durationMonths: 4, deliveryMode: "ONLINE", description: "IIT Bombay's product management certificate covering roadmapping, user research, metrics, and go-to-market strategy.", entryRequirements: "Working professional in tech or business.", careerOutcomes: "Product Manager, Associate PM, Product Owner", localPrice: "25000.00", foreignPrice: "800.00", interestTags: ["product-management", "roadmapping", "user-research"], careerOutcomeTags: ["product-manager", "associate-pm", "product-owner"], language: ["English"], creditPoints: 10 },
  ],

  "Asia Pacific Institute of Information Technology": [
    { title: "BSc in Computing (Staffordshire University)", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "A UK-accredited computing degree covering software development, networking, databases, and emerging technologies.", entryRequirements: "3 A/L passes or equivalent.", careerOutcomes: "Software Developer, IT Manager, Systems Analyst", localPrice: "450000.00", foreignPrice: "3800.00", interestTags: ["computing", "software", "uk-degree"], careerOutcomeTags: ["software-developer", "it-manager", "systems-analyst"], language: ["English"], creditPoints: 120 },
    { title: "LLB in Laws (Staffordshire University)", type: "BACHELOR", level: "UNDERGRADUATE", field: "LAW", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "A UK law degree covering English and Sri Lankan legal systems, contract law, criminal law, and corporate law.", entryRequirements: "3 A/L passes with English proficiency.", careerOutcomes: "Lawyer, Legal Advisor, Company Secretary, Judge", localPrice: "520000.00", foreignPrice: "4500.00", interestTags: ["law", "legal", "uk-degree"], careerOutcomeTags: ["lawyer", "legal-advisor", "company-secretary"], language: ["English"], creditPoints: 120 },
    { title: "BSc in Business Management (Staffordshire University)", type: "BACHELOR", level: "UNDERGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "A practical UK business degree covering marketing, finance, HR, operations, and strategic management.", entryRequirements: "3 A/L passes in any stream.", careerOutcomes: "Business Manager, Marketing Manager, Operations Manager", localPrice: "430000.00", foreignPrice: "3600.00", interestTags: ["business", "management", "marketing"], careerOutcomeTags: ["business-manager", "marketing-manager", "operations-manager"], language: ["English"], creditPoints: 120 },
    { title: "HND in IT (Pearson BTEC)", type: "DIPLOMA", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 24, deliveryMode: "ON_CAMPUS", description: "Pearson BTEC Higher National Diploma in IT covering programming, networking, database administration, and project management.", entryRequirements: "O/L with 5 passes including Mathematics and English.", careerOutcomes: "Junior Developer, IT Technician, Help Desk Analyst", localPrice: "200000.00", foreignPrice: "2200.00", interestTags: ["it", "programming", "networking"], careerOutcomeTags: ["junior-developer", "it-technician", "help-desk-analyst"], language: ["English"], creditPoints: 60 },
    { title: "MSc in Cyber Security (Staffordshire University)", type: "MASTER", level: "POSTGRADUATE", field: "CYBER_SECURITY", durationMonths: 18, deliveryMode: "HYBRID", description: "Advanced cybersecurity programme covering penetration testing, digital forensics, security architecture, and governance.", entryRequirements: "BSc in Computing or related field.", careerOutcomes: "Security Analyst, Penetration Tester, CISO, Digital Forensics Analyst", localPrice: "650000.00", foreignPrice: "5500.00", interestTags: ["cybersecurity", "penetration-testing", "forensics"], careerOutcomeTags: ["security-analyst", "penetration-tester", "ciso"], language: ["English"], creditPoints: 60 },
    { title: "Certificate in Legal Practice", type: "CERTIFICATE", level: "ENTRY", field: "LAW", durationMonths: 6, deliveryMode: "HYBRID", description: "Practical legal skills for law graduates entering professional practice — drafting, advocacy, and client management.", entryRequirements: "LLB or equivalent law qualification.", careerOutcomes: "Trainee Solicitor, Legal Executive, Paralegal", localPrice: "65000.00", foreignPrice: "900.00", interestTags: ["legal-practice", "advocacy", "law"], careerOutcomeTags: ["trainee-solicitor", "legal-executive", "paralegal"], language: ["English"], creditPoints: 15 },
    { title: "BSc in Games Technology (Staffordshire University)", type: "BACHELOR", level: "UNDERGRADUATE", field: "INFORMATION_TECHNOLOGY", durationMonths: 36, deliveryMode: "ON_CAMPUS", description: "Specialised games development degree covering Unity, Unreal Engine, game design, 3D modelling, and VR/AR development.", entryRequirements: "3 A/L passes. Interest in gaming and design.", careerOutcomes: "Game Developer, 3D Artist, VR Developer, Game Designer", localPrice: "460000.00", foreignPrice: "3900.00", interestTags: ["game-development", "unity", "vr-ar"], careerOutcomeTags: ["game-developer", "3d-artist", "vr-developer"], language: ["English"], creditPoints: 120 },
    { title: "Microcredential in Digital Transformation", type: "MICROCREDENTIAL", level: "ENTRY", field: "BUSINESS_MANAGEMENT", durationMonths: 3, deliveryMode: "ONLINE", description: "Practical guide to leading digital transformation initiatives covering cloud adoption, automation, and change management.", entryRequirements: "Working professional. No formal requirements.", careerOutcomes: "Digital Transformation Lead, Change Manager, IT Strategy Consultant", localPrice: "28000.00", foreignPrice: "400.00", interestTags: ["digital-transformation", "cloud", "automation"], careerOutcomeTags: ["digital-transformation-lead", "change-manager", "it-strategy-consultant"], language: ["English"], creditPoints: 10 },
    { title: "HND in Business Management (Pearson BTEC)", type: "DIPLOMA", level: "UNDERGRADUATE", field: "BUSINESS_MANAGEMENT", durationMonths: 24, deliveryMode: "HYBRID", description: "BTEC HND in Business covering marketing fundamentals, financial planning, HR principles, and entrepreneurship.", entryRequirements: "O/L with 5 passes.", careerOutcomes: "Business Executive, Marketing Assistant, Sales Manager", localPrice: "185000.00", foreignPrice: "2000.00", interestTags: ["business", "marketing", "entrepreneurship"], careerOutcomeTags: ["business-executive", "marketing-assistant", "sales-manager"], language: ["English"], creditPoints: 60 },
    { title: "MSc in Data Science (Staffordshire University)", type: "MASTER", level: "POSTGRADUATE", field: "DATA_SCIENCE", durationMonths: 18, deliveryMode: "HYBRID", description: "UK-accredited data science MSc covering machine learning, big data platforms, data visualisation, and research methods.", entryRequirements: "BSc in IT, Statistics, or Mathematics.", careerOutcomes: "Data Scientist, Data Engineer, ML Engineer", localPrice: "620000.00", foreignPrice: "5200.00", interestTags: ["data-science", "machine-learning", "big-data"], careerOutcomeTags: ["data-scientist", "data-engineer", "ml-engineer"], language: ["English"], creditPoints: 60 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Course templates
// ─────────────────────────────────────────────────────────────────────────────

const courseTemplatesByField: Record<string, string[]> = {
  INFORMATION_TECHNOLOGY: [
    "Introduction to Programming", "Data Structures and Algorithms", "Database Management Systems",
    "Web Development Fundamentals", "Object-Oriented Programming", "Software Engineering Principles",
    "Computer Networks", "Operating Systems", "Cybersecurity Fundamentals", "Cloud Computing Basics",
    "Mobile Application Development", "API Design and Development", "Version Control with Git",
    "Agile and Scrum Methodology", "UI/UX Design Principles",
  ],
  ARTIFICIAL_INTELLIGENCE: [
    "Machine Learning Fundamentals", "Deep Learning and Neural Networks", "Natural Language Processing",
    "Computer Vision", "Reinforcement Learning", "AI Ethics and Governance",
    "Data Preprocessing and Feature Engineering", "Model Deployment and MLOps",
    "Probabilistic Graphical Models", "Generative AI and Large Language Models",
  ],
  DATA_SCIENCE: [
    "Statistics for Data Science", "Python for Data Analysis", "Data Visualisation",
    "Big Data Technologies", "Machine Learning Applications", "SQL and Database Querying",
    "Time Series Analysis", "Business Intelligence and Reporting",
    "Data Engineering and Pipelines", "Predictive Analytics",
  ],
  BUSINESS_MANAGEMENT: [
    "Principles of Management", "Marketing Management", "Financial Accounting",
    "Human Resource Management", "Business Strategy", "Operations Management",
    "Entrepreneurship and Innovation", "Business Law", "Organisational Behaviour",
    "Supply Chain Management", "Digital Business Transformation",
  ],
  ACCOUNTING_FINANCE: [
    "Financial Reporting", "Management Accounting", "Taxation Principles",
    "Audit and Assurance", "Corporate Finance", "Investment Analysis",
    "Risk Management", "Financial Modelling", "International Finance",
    "Ethics in Accounting and Finance",
  ],
  ENGINEERING: [
    "Engineering Mathematics", "Engineering Physics", "Engineering Drawing and CAD",
    "Materials Science", "Thermodynamics", "Fluid Mechanics",
    "Control Systems", "Electrical Circuits", "Structural Analysis",
    "Manufacturing Processes", "Project Engineering",
  ],
  LAW: [
    "Contract Law", "Constitutional Law", "Criminal Law",
    "Tort Law", "Company Law", "International Law",
    "Evidence and Procedure", "Intellectual Property Law",
    "Human Rights Law", "Legal Research and Writing",
  ],
  ECONOMICS: [
    "Microeconomics", "Macroeconomics", "Econometrics",
    "Development Economics", "International Trade", "Public Finance",
    "Monetary Economics", "Behavioural Economics",
    "Economic Policy Analysis", "Labour Economics",
  ],
  CYBER_SECURITY: [
    "Network Security Fundamentals", "Ethical Hacking and Penetration Testing",
    "Digital Forensics", "Cryptography", "Incident Response and Management",
    "Security Architecture and Design", "Malware Analysis",
    "Risk Assessment and Compliance", "Cloud Security", "IoT Security",
  ],
  MATHEMATICS: [
    "Calculus I", "Calculus II", "Linear Algebra",
    "Discrete Mathematics", "Probability and Statistics", "Numerical Methods",
    "Abstract Algebra", "Real Analysis", "Differential Equations",
    "Mathematical Modelling",
  ],
};

const defaultCourses = [
  "Research Methods", "Professional Development", "Communication Skills",
  "Critical Thinking", "Industry Project", "Internship",
  "Ethics and Social Responsibility", "Leadership and Teamwork",
];

// ─────────────────────────────────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting iNEXORA seed...\n");

  // Clear existing data in correct order
  console.log("🗑️  Clearing existing data...");
  await db.courseEnrollment.deleteMany();
  await db.enrollment.deleteMany();
  await db.courseLecturer.deleteMany();
  await db.courseResource.deleteMany();
  await db.courseSection.deleteMany();
  await db.course.deleteMany();
  await db.program.deleteMany();
  await db.institutionAccount.deleteMany();
  await db.institution.deleteMany();
  console.log("✅ Cleared\n");

  for (const instData of institutions) {
    console.log(`🏛️  Creating: ${instData.name}`);

    // Create institution
    const instSlug = slug(instData.name, Math.random().toString(36).slice(2, 6));
    const institution = await db.institution.create({
      data: {
        name: instData.name,
        slug: instSlug,
        type: instData.type as any,
        country: instData.country,
        city: instData.city,
        email: instData.email,
        website: instData.website,
        description: instData.description,
        isActive: true,
        isVerified: true,
        approvalStatus: "APPROVED",
      },
    });

    // Get program templates for this institution
    const templates = programTemplates[instData.name] ?? [];

    console.log(`   📚 Creating ${templates.length} programs...`);

    for (let pi = 0; pi < templates.length; pi++) {
      const tmpl = templates[pi]!;
      const programSlug = slug(tmpl.title, `${Math.random().toString(36).slice(2, 6)}`);

      const program = await db.program.create({
        data: {
          institutionId: institution.id,
          title: tmpl.title,
          slug: programSlug,
          type: tmpl.type as any,
          level: tmpl.level as any,
          field: tmpl.field as any,
          durationMonths: tmpl.durationMonths,
          deliveryMode: tmpl.deliveryMode as any,
          language: tmpl.language,
          description: tmpl.description,
          entryRequirements: tmpl.entryRequirements,
          careerOutcomes: tmpl.careerOutcomes,
          localPrice: tmpl.localPrice as any,
          foreignPrice: tmpl.foreignPrice as any,
          creditPoints: tmpl.creditPoints,
          interestTags: tmpl.interestTags,
          careerOutcomeTags: tmpl.careerOutcomeTags,
          scholarshipAvailable: Math.random() > 0.6,
          isPublished: true,
          isActive: true,
          approvalStatus: "APPROVED",
          acceptsInternational: true,
          hostCountry: instData.country,
          priceCurrency: instData.country === "Sri Lanka" ? "LKR" : "USD",
        },
      });

      // Get course pool for this field
      const fieldCourses = courseTemplatesByField[tmpl.field] ?? defaultCourses;
      const allCourses = [...fieldCourses, ...defaultCourses];
      const courseCount = randInt(5, 10);
      const selectedCourses = pickMany(allCourses, courseCount, courseCount);

      for (let ci = 0; ci < selectedCourses.length; ci++) {
        const courseTitle = selectedCourses[ci]!;
        await db.course.create({
          data: {
            programId: program.id,
            title: courseTitle,
            code: `${tmpl.field.slice(0, 3)}${String(pi + 1).padStart(2, "0")}${String(ci + 1).padStart(2, "0")}`,
            description: `This course provides students with a thorough understanding of ${courseTitle.toLowerCase()} within the context of ${tmpl.field.replace(/_/g, " ").toLowerCase()}.`,
            creditHours: pick([2, 3, 4]),
            semester: pick([1, 2, 3, 4, 5, 6]),
            year: pick([1, 2, 3, 4]),
            isMandatory: Math.random() > 0.3,
            orderIndex: ci,
            isStandalone: false,
            isPublished: true,
            localPrice: null,
            foreignPrice: null,
          },
        });
      }
    }

    console.log(`   ✅ Done: ${instData.name}\n`);
  }

  console.log("✅ Seed complete!");
  console.log(`   Institutions: ${institutions.length}`);
  const totalPrograms = Object.values(programTemplates).reduce((s, p) => s + p.length, 0);
  console.log(`   Programs: ${totalPrograms}`);
  console.log(`   Courses: ~${totalPrograms * 7} (avg 7 per program)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());