// src/lib/taxonomy/programTaxonomy.ts

export const INTEREST_CATEGORIES = [
  {
    id: "software-engineering",
    label: "Software Engineering & Web Development",
    subcategories: ["Frontend", "Backend", "Full Stack", "DevOps", "Software Architecture", "Game Development"],
  },
  {
    id: "mobile-development",
    label: "Mobile Development",
    subcategories: ["iOS", "Android", "Cross Platform", "Mobile UI"],
  },
  {
    id: "data-ai",
    label: "Data Science, AI & Analytics",
    subcategories: ["Machine Learning", "Deep Learning", "Data Engineering", "Business Intelligence", "Statistics", "Natural Language Processing", "Computer Vision"],
  },
  {
    id: "cybersecurity",
    label: "Cybersecurity",
    subcategories: ["Network Security", "Ethical Hacking", "Cloud Security", "Digital Forensics", "Risk & Compliance"],
  },
  {
    id: "cloud-infrastructure",
    label: "Cloud Computing & Infrastructure",
    subcategories: ["AWS", "Azure", "Google Cloud", "DevOps Engineering", "Site Reliability Engineering"],
  },
  {
    id: "design",
    label: "Design",
    subcategories: ["UI/UX Design", "Graphic Design", "Product Design", "Motion Design", "Industrial Design"],
  },
  {
    id: "business-management",
    label: "Business & Management",
    subcategories: ["Entrepreneurship", "Project Management", "Operations Management", "Supply Chain", "Strategy"],
  },
  {
    id: "marketing",
    label: "Marketing & Communications",
    subcategories: ["Digital Marketing", "Brand Management", "Content Strategy", "SEO", "Public Relations", "Social Media Management"],
  },
  {
    id: "finance-accounting",
    label: "Finance & Accounting",
    subcategories: ["Corporate Finance", "Investment Banking", "Accounting", "Auditing", "Financial Planning", "Taxation"],
  },
  {
    id: "human-resources",
    label: "Human Resources",
    subcategories: ["Talent Acquisition", "Organizational Development", "Compensation & Benefits", "Employee Relations"],
  },
  {
    id: "engineering",
    label: "Engineering (Non Software)",
    subcategories: ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Electronics", "Industrial Engineering", "Chemical Engineering"],
  },
  {
    id: "healthcare-medicine",
    label: "Healthcare & Medicine",
    subcategories: ["Nursing", "Pharmacy", "Medical Laboratory Science", "Public Health", "Physiotherapy", "Healthcare Management"],
  },
  {
    id: "law-legal-studies",
    label: "Law & Legal Studies",
    subcategories: ["Corporate Law", "Criminal Law", "Human Rights", "Legal Research", "International Law"],
  },
  {
    id: "education-teaching",
    label: "Education & Teaching",
    subcategories: ["Early Childhood Education", "TESOL/TEFL", "Curriculum Design", "Educational Technology", "Special Education"],
  },
  {
    id: "hospitality-tourism",
    label: "Hospitality & Tourism",
    subcategories: ["Hotel Management", "Culinary Arts", "Travel & Tourism", "Event Management", "Airline & Aviation Services"],
  },
  {
    id: "media-communication",
    label: "Media, Journalism & Communication",
    subcategories: ["Journalism", "Broadcasting", "Film & Video Production", "Photography", "Mass Communication"],
  },
  {
    id: "architecture-construction",
    label: "Architecture & Construction",
    subcategories: ["Architecture", "Interior Design", "Quantity Surveying", "Urban Planning", "Construction Management"],
  },
  {
    id: "agriculture-environment",
    label: "Agriculture & Environmental Science",
    subcategories: ["Agribusiness", "Sustainable Agriculture", "Environmental Science", "Food Technology", "Fisheries & Aquaculture"],
  },
  {
    id: "psychology-social-sciences",
    label: "Psychology & Social Sciences",
    subcategories: ["Clinical Psychology", "Counseling", "Sociology", "Social Work", "Political Science"],
  },
  {
    id: "languages-linguistics",
    label: "Languages & Linguistics",
    subcategories: ["English Language", "Translation & Interpretation", "Foreign Languages", "Applied Linguistics"],
  },
  {
    id: "fashion-textile",
    label: "Fashion & Textile",
    subcategories: ["Fashion Design", "Textile Engineering", "Apparel Merchandising"],
  },
  {
    id: "logistics-supply-chain",
    label: "Logistics & Supply Chain",
    subcategories: ["Warehousing", "Freight & Shipping", "Procurement", "Inventory Management"],
  },
  {
    id: "sports-fitness",
    label: "Sports Science & Fitness",
    subcategories: ["Sports Management", "Exercise Science", "Nutrition & Dietetics", "Coaching"],
  },
  {
    id: "natural-sciences",
    label: "Natural Sciences",
    subcategories: ["Physics", "Chemistry", "Biology", "Mathematics", "Astronomy", "Biotechnology"],
  },
  {
    id: "aviation-maritime",
    label: "Aviation & Maritime Studies",
    subcategories: ["Pilot Training", "Aircraft Maintenance", "Marine Engineering", "Nautical Science", "Air Traffic Control"],
  },
] as const;

export const CAREER_GOALS = [
  { id: "software-engineer", label: "Software Engineer", relatedInterests: ["software-engineering", "cloud-infrastructure"] },
  { id: "mobile-developer", label: "Mobile Developer", relatedInterests: ["mobile-development"] },
  { id: "data-analyst", label: "Data Analyst", relatedInterests: ["data-ai"] },
  { id: "ml-engineer", label: "Machine Learning Engineer", relatedInterests: ["data-ai"] },
  { id: "security-analyst", label: "Security Analyst", relatedInterests: ["cybersecurity"] },
  { id: "cloud-engineer", label: "Cloud Engineer", relatedInterests: ["cloud-infrastructure"] },
  { id: "product-designer", label: "Product Designer", relatedInterests: ["design"] },
  { id: "product-manager", label: "Product Manager", relatedInterests: ["business-management", "design"] },
  { id: "digital-marketer", label: "Digital Marketing Specialist", relatedInterests: ["marketing"] },
  { id: "financial-analyst", label: "Financial Analyst", relatedInterests: ["finance-accounting"] },
  { id: "accountant", label: "Chartered Accountant", relatedInterests: ["finance-accounting"] },
  { id: "hr-manager", label: "HR Manager", relatedInterests: ["human-resources"] },
  { id: "civil-engineer", label: "Civil Engineer", relatedInterests: ["engineering", "architecture-construction"] },
  { id: "mechanical-engineer", label: "Mechanical Engineer", relatedInterests: ["engineering"] },
  { id: "electrical-engineer", label: "Electrical Engineer", relatedInterests: ["engineering"] },
  { id: "nurse", label: "Registered Nurse", relatedInterests: ["healthcare-medicine"] },
  { id: "pharmacist", label: "Pharmacist", relatedInterests: ["healthcare-medicine"] },
  { id: "healthcare-admin", label: "Healthcare Administrator", relatedInterests: ["healthcare-medicine"] },
  { id: "lawyer", label: "Lawyer / Legal Consultant", relatedInterests: ["law-legal-studies"] },
  { id: "teacher", label: "Teacher / Educator", relatedInterests: ["education-teaching"] },
  { id: "hotel-manager", label: "Hotel & Hospitality Manager", relatedInterests: ["hospitality-tourism"] },
  { id: "chef", label: "Chef / Culinary Professional", relatedInterests: ["hospitality-tourism"] },
  { id: "journalist", label: "Journalist / Broadcaster", relatedInterests: ["media-communication"] },
  { id: "architect", label: "Architect", relatedInterests: ["architecture-construction"] },
  { id: "quantity-surveyor", label: "Quantity Surveyor", relatedInterests: ["architecture-construction"] },
  { id: "agribusiness-manager", label: "Agribusiness Manager", relatedInterests: ["agriculture-environment"] },
  { id: "environmental-scientist", label: "Environmental Scientist", relatedInterests: ["agriculture-environment"] },
  { id: "psychologist", label: "Psychologist / Counselor", relatedInterests: ["psychology-social-sciences"] },
  { id: "social-worker", label: "Social Worker", relatedInterests: ["psychology-social-sciences"] },
  { id: "translator", label: "Translator / Interpreter", relatedInterests: ["languages-linguistics"] },
  { id: "fashion-designer", label: "Fashion Designer", relatedInterests: ["fashion-textile"] },
  { id: "supply-chain-manager", label: "Supply Chain Manager", relatedInterests: ["logistics-supply-chain"] },
  { id: "sports-scientist", label: "Sports Scientist / Coach", relatedInterests: ["sports-fitness"] },
  { id: "research-scientist", label: "Research Scientist", relatedInterests: ["natural-sciences"] },
  { id: "pilot", label: "Pilot / Aviation Professional", relatedInterests: ["aviation-maritime"] },
  { id: "marine-engineer", label: "Marine Engineer", relatedInterests: ["aviation-maritime"] },
  { id: "entrepreneur", label: "Entrepreneur / Founder", relatedInterests: ["business-management"] },
] as const;

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export const DELIVERY_MODES = ["online", "hybrid", "in_person"] as const;

// Currency agnostic budget tiers. Programs store price in their own currency
// plus a normalized USD equivalent (programPriceUsd) for cross border comparison.
export const BUDGET_TIERS = [
  { id: "free", label: "Free / Scholarship only", maxUsd: 0 },
  { id: "low", label: "Under $500", maxUsd: 500 },
  { id: "mid", label: "$500 to $2,000", maxUsd: 2000 },
  { id: "high", label: "$2,000 to $10,000", maxUsd: 10000 },
  { id: "premium", label: "Above $10,000", maxUsd: Infinity },
] as const;

export const PROGRAM_DURATION_TYPES = [
  "short_course",
  "certificate",
  "diploma",
  "higher_diploma",
  "associate_degree",
  "bachelors",
  "postgraduate_diploma",
  "masters",
  "doctorate",
] as const;

export type InterestCategoryId = typeof INTEREST_CATEGORIES[number]["id"];
export type CareerGoalId = typeof CAREER_GOALS[number]["id"];
export type SkillLevel = typeof SKILL_LEVELS[number];
export type DeliveryMode = typeof DELIVERY_MODES[number];
export type BudgetTierId = typeof BUDGET_TIERS[number]["id"];
export type ProgramDurationType = typeof PROGRAM_DURATION_TYPES[number];