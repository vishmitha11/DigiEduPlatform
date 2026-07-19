// src/lib/taxonomy/programFieldMapping.ts
//
// Bridges Program.field (the ProgramField Prisma enum, always set) to the
// recommendation taxonomy's interest category ids. Used as a fallback when
// a program's own interestTags array is still empty — see
// getEffectiveInterestTags in src/lib/recommendation/scoring.ts.

import type { InterestCategoryId, DeliveryMode } from "~/lib/taxonomy/programTaxonomy";

export const PROGRAM_FIELD_TO_INTERESTS: Record<string, InterestCategoryId[]> = {
  ENGINEERING: ["engineering"],
  INFORMATION_TECHNOLOGY: ["software-engineering", "cloud-infrastructure"],
  BUSINESS_MANAGEMENT: ["business-management"],
  ACCOUNTING_FINANCE: ["finance-accounting"],
  MEDICINE: ["healthcare-medicine"],
  HEALTHCARE: ["healthcare-medicine"],
  NURSING: ["healthcare-medicine"],
  PHARMACY: ["healthcare-medicine"],
  BIO_TECHNOLOGY: ["natural-sciences", "healthcare-medicine"],
  AGRICULTURE: ["agriculture-environment"],
  ENVIRONMENTAL_SCIENCE: ["agriculture-environment"],
  LAW: ["law-legal-studies"],
  PSYCHOLOGY: ["psychology-social-sciences"],
  SOCIAL_SCIENCE: ["psychology-social-sciences"],
  EDUCATION: ["education-teaching"],
  ARTS: ["design"],
  ARCHITECTURE: ["architecture-construction"],
  MEDIA_COMMUNICATION: ["media-communication"],
  JOURNALISM: ["media-communication"],
  LOGISTICS: ["logistics-supply-chain"],
  TOURISM_HOSPITALITY: ["hospitality-tourism"],
  MARITIME: ["aviation-maritime"],
  FASHION_DESIGN: ["fashion-textile"],
  INTERIOR_DESIGN: ["architecture-construction", "design"],
  GRAPHIC_DESIGN: ["design"],
  MUSIC: ["media-communication"],
  PERFORMING_ARTS: ["media-communication"],
  SPORTS_SCIENCE: ["sports-fitness"],
  POLITICAL_SCIENCE: ["psychology-social-sciences"],
  ECONOMICS: ["finance-accounting", "business-management"],
  MATHEMATICS: ["natural-sciences"],
  PHYSICS: ["natural-sciences"],
  CHEMISTRY: ["natural-sciences"],
  DATA_SCIENCE: ["data-ai"],
  ARTIFICIAL_INTELLIGENCE: ["data-ai"],
  CYBER_SECURITY: ["cybersecurity"],
  OTHER: [],
};

// Program.deliveryMode is an uppercase Prisma enum; the recommendation
// taxonomy's preferredMode is lowercase and has no BLENDED equivalent —
// BLENDED is treated as closest to hybrid.
export const PROGRAM_MODE_TO_TAXONOMY_MODE: Record<string, DeliveryMode> = {
  ONLINE: "online",
  HYBRID: "hybrid",
  ON_CAMPUS: "in_person",
  BLENDED: "hybrid",
};
