// A curated list of real SSI specialty names to populate pickers with —
// the centre certifies through SSI, but this is just a set of sensible
// defaults, not a schema constraint. Staff/divers can still type any other
// specialty name; the backend accepts free text in both
// User.certSpecialties and Course.grantsSpecialty.
export const CURATED_SPECIALTIES = [
  "Deep Diving",
  "Navigation",
  "Enriched Air Nitrox",
  "Wreck Diving",
  "Search & Recovery",
  "Stress & Rescue",
  "Perfect Buoyancy",
  "Night & Limited Visibility",
  "Boat Diving",
  "Equipment Techniques",
] as const;
