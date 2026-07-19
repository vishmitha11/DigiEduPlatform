
export const REGIONS = [
  { id: "south-asia", label: "South Asia" },
  { id: "southeast-asia", label: "Southeast Asia" },
  { id: "east-asia", label: "East Asia" },
  { id: "middle-east", label: "Middle East" },
  { id: "sub-saharan-africa", label: "Sub Saharan Africa" },
  { id: "north-africa", label: "North Africa" },
  { id: "western-europe", label: "Western Europe" },
  { id: "eastern-europe", label: "Eastern Europe" },
  { id: "north-america", label: "North America" },
  { id: "central-america-caribbean", label: "Central America & Caribbean" },
  { id: "south-america", label: "South America" },
  { id: "oceania", label: "Oceania" },
] as const;

export type RegionId = typeof REGIONS[number]["id"];

// Maps ISO country codes to region ids. Extend as needed; this is the
// starting set covering the most common student origin and program host countries.
export const COUNTRY_TO_REGION: Record<string, RegionId> = {
  LK: "south-asia",
  IN: "south-asia",
  PK: "south-asia",
  BD: "south-asia",
  NP: "south-asia",
  SG: "southeast-asia",
  MY: "southeast-asia",
  TH: "southeast-asia",
  PH: "southeast-asia",
  VN: "southeast-asia",
  ID: "southeast-asia",
  CN: "east-asia",
  JP: "east-asia",
  KR: "east-asia",
  AE: "middle-east",
  SA: "middle-east",
  QA: "middle-east",
  KW: "middle-east",
  NG: "sub-saharan-africa",
  KE: "sub-saharan-africa",
  ZA: "sub-saharan-africa",
  GH: "sub-saharan-africa",
  EG: "north-africa",
  MA: "north-africa",
  GB: "western-europe",
  DE: "western-europe",
  FR: "western-europe",
  NL: "western-europe",
  IE: "western-europe",
  PL: "eastern-europe",
  RO: "eastern-europe",
  US: "north-america",
  CA: "north-america",
  MX: "central-america-caribbean",
  JM: "central-america-caribbean",
  BR: "south-america",
  AR: "south-america",
  AU: "oceania",
  NZ: "oceania",
};

export function getRegionForCountry(countryCode: string): RegionId | null {
  return COUNTRY_TO_REGION[countryCode.toUpperCase()] ?? null;
}