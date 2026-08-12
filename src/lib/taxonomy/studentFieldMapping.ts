// src/lib/taxonomy/studentFieldMapping.ts
//
// Best-effort free-text classifier mapping Student.fieldOfStudy → the
// ProgramField Prisma enum, used purely to power candidate-search filter
// facets (src/server/api/routers/candidate.ts). fieldOfStudy has no
// structured input at profile-setup time today, so this is substring
// classification against a keyword list, not an authoritative mapping —
// unmatched or ambiguous text simply returns null.

import { type ProgramField } from "@prisma/client";

export const PROGRAM_FIELD_KEYWORDS: Record<ProgramField, string[]> = {
  // Deliberately excludes the bare word "engineering" — it would greedily
  // swallow "software engineering" / "computer engineering" before those
  // more specific fields get a chance to match below.
  ENGINEERING: ["civil engineering", "mechanical engineering", "electrical engineering", "chemical engineering", "structural engineering"],
  INFORMATION_TECHNOLOGY: ["information technology", "computer science", "software engineering", "computing", "informatics"],
  BUSINESS_MANAGEMENT: ["business management", "business administration", "management studies", "entrepreneurship"],
  ACCOUNTING_FINANCE: ["accounting", "finance", "financial management", "acca", "cima"],
  MEDICINE: ["medicine", "medical", "mbbs", "surgery"],
  HEALTHCARE: ["healthcare", "health science", "public health"],
  NURSING: ["nursing", "midwifery"],
  PHARMACY: ["pharmacy", "pharmaceutical"],
  BIO_TECHNOLOGY: ["biotechnology", "bio technology", "molecular biology", "genetics"],
  AGRICULTURE: ["agriculture", "agricultural science", "agronomy"],
  ENVIRONMENTAL_SCIENCE: ["environmental science", "environmental studies", "sustainability"],
  LAW: ["law", "llb", "legal studies", "jurisprudence"],
  PSYCHOLOGY: ["psychology", "counselling", "counseling"],
  SOCIAL_SCIENCE: ["social science", "sociology", "anthropology"],
  EDUCATION: ["education", "teaching", "pedagogy"],
  ARTS: ["fine arts", "arts", "humanities"],
  ARCHITECTURE: ["architecture", "architectural"],
  MEDIA_COMMUNICATION: ["media", "communication studies", "mass communication"],
  JOURNALISM: ["journalism", "broadcasting"],
  LOGISTICS: ["logistics", "supply chain", "transport management"],
  TOURISM_HOSPITALITY: ["tourism", "hospitality", "hotel management"],
  MARITIME: ["maritime", "marine", "nautical science"],
  FASHION_DESIGN: ["fashion design", "fashion", "apparel"],
  INTERIOR_DESIGN: ["interior design", "interior architecture"],
  GRAPHIC_DESIGN: ["graphic design", "visual communication"],
  MUSIC: ["music"],
  PERFORMING_ARTS: ["performing arts", "drama", "theatre", "theater", "dance"],
  SPORTS_SCIENCE: ["sports science", "physical education", "exercise science"],
  POLITICAL_SCIENCE: ["political science", "international relations", "public policy"],
  ECONOMICS: ["economics", "econometrics"],
  MATHEMATICS: ["mathematics", "applied mathematics", "statistics"],
  PHYSICS: ["physics", "applied physics"],
  CHEMISTRY: ["chemistry", "applied chemistry"],
  DATA_SCIENCE: ["data science", "data analytics", "big data"],
  ARTIFICIAL_INTELLIGENCE: ["artificial intelligence", "machine learning", "deep learning"],
  CYBER_SECURITY: ["cyber security", "cybersecurity", "information security", "network security"],
  OTHER: [],
};

export function classifyFieldOfStudy(fieldOfStudy: string | null): ProgramField | null {
  if (!fieldOfStudy) return null;
  const normalized = ` ${fieldOfStudy.toLowerCase().trim()} `;
  for (const field of Object.keys(PROGRAM_FIELD_KEYWORDS) as ProgramField[]) {
    if (PROGRAM_FIELD_KEYWORDS[field].some((kw) => normalized.includes(kw))) {
      return field;
    }
  }
  return null;
}
