import { CertLevel, DiveType } from "../generated/prisma/client";

// CertLevel's declaration order in the schema is not a valid rank order
// (OTHER trails everything, professional levels follow recreational ones) —
// this is the explicit ranking used anywhere a "does this level meet that
// level" comparison is needed. OTHER is deliberately excluded: it never
// satisfies a requirement and a requirement of OTHER is never satisfiable.
const CERT_LEVEL_RANK: Record<Exclude<CertLevel, "OTHER">, number> = {
  OPEN_WATER: 1,
  ADVANCED_OPEN_WATER: 2,
  RESCUE_DIVER: 3,
  DIVEMASTER: 4,
  ASSISTANT_INSTRUCTOR: 5,
  INSTRUCTOR: 6,
  INSTRUCTOR_TRAINER: 7,
};

export function meetsCertLevel(
  userLevel: CertLevel | null | undefined,
  requiredLevel: CertLevel,
): boolean {
  if (userLevel == null || userLevel === "OTHER" || requiredLevel === "OTHER") {
    return false;
  }
  return CERT_LEVEL_RANK[userLevel] >= CERT_LEVEL_RANK[requiredLevel];
}

// Only a DEEP dive (18-40m) ever warrants a warning — SCUBA/BAITED_SHARK_SCUBA
// stay within the 18m Open Water limit, and the snorkel variants need no
// certification at all. Advanced Open Water (30m) is the real-world minimum
// to legally exceed 18m at all, so it's the bar for the whole DEEP category
// even though some deep dives go further (40m, needing a Deep specialty) —
// this is a soft warning, not a hard block, so a coarse bar is enough.
export function deepDiveWarningApplies(
  diveType: DiveType | null | undefined,
  userCertLevel: CertLevel | null | undefined,
): boolean {
  if (diveType !== "DEEP") return false;
  return !meetsCertLevel(userCertLevel, "ADVANCED_OPEN_WATER");
}
