export type AppRole =
  "CLIENT" | "DIVEMASTER" | "SKIPPER" | "INSTRUCTOR" | "ADMIN" | "OWNER";

export type CertAgency = "PADI" | "SSI" | "NAUI" | "CMAS" | "OTHER";

export type CertLevel =
  | "OPEN_WATER"
  | "ADVANCED_OPEN_WATER"
  | "RESCUE_DIVER"
  | "DIVEMASTER"
  | "ASSISTANT_INSTRUCTOR"
  | "INSTRUCTOR"
  | "INSTRUCTOR_TRAINER"
  | "OTHER";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  roles: AppRole[];
  certAgency?: CertAgency | null;
  certLevel?: CertLevel | null;
  certNumber?: string | null;
  certSpecialties?: string[];
  mostRecentDiveDate?: string | null;
  mostRecentDiveLocation?: string | null;
}

// Matches backend/src/routes/users.ts's updateCertSchema. Every field is
// independently optional so a partial update (e.g. just adding one
// specialty) only needs to send what's changing.
export interface UpdateCertificationInput {
  certAgency?: CertAgency | null;
  certLevel?: CertLevel | null;
  certNumber?: string | null;
  certSpecialties?: string[];
  mostRecentDiveDate?: string | null;
  mostRecentDiveLoc?: string | null;
}

export interface Boat {
  id: string;
  name: string;
  capacity: number;
  active: boolean;
}

export interface DiveSite {
  id: string;
  name: string;
  active: boolean;
  closedReason?: string | null;
  minCertLevel?: CertLevel | null;
}

export interface LaunchSite {
  id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  active: boolean;
}

export type TripStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

// The five dive products the centre sells. Only DEEP ever triggers
// requiresCertWarning below — see backend/src/lib/certification.ts.
export type DiveType =
  | "SNORKEL"
  | "SCUBA"
  | "DEEP"
  | "BAITED_SHARK_SNORKEL"
  | "BAITED_SHARK_SCUBA";

export interface Trip {
  id: string;
  boat: Boat;
  launchSite?: LaunchSite | null;
  date: string;
  tripDate?: string;
  meetTime: string;
  launchTime: string;
  site?: DiveSite | null;
  siteEstimated: boolean;
  diveType?: DiveType | null;
  // Server-computed against the viewer's own certLevel — true only for a
  // DEEP dive when they have no cert on file or are below Advanced Open
  // Water. Never a hard block, just what drives the booking confirm dialog.
  requiresCertWarning?: boolean;
  capacityOverride?: number | null;
  capacity: number;
  boatCapacity: number;
  status: TripStatus;
  confirmedCount: number;
  cancelledReason?: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  roles: string[];
}

// Matches backend/src/routes/trips.ts's createTripSchema exactly — tripDate
// must be a full ISO datetime string (zod's `.datetime()`), not just a date.
export interface CreateTripInput {
  boatId: string;
  launchSiteId?: string | null;
  siteId?: string | null;
  siteEstimated?: boolean;
  diveType?: DiveType | null;
  tripDate: string;
  meetTime: string;
  launchTime: string;
  capacityOverride?: number | null;
  skipperId?: string | null;
}

export interface CourseInstructor {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string | null;
  agency?: CertAgency | null;
  prerequisiteCertLevel?: CertLevel | null;
  // What completing this course grants — at most one of the two is set.
  grantsCertLevel?: CertLevel | null;
  grantsSpecialty?: string | null;
  active: boolean;
  price?: number | null;
  instructor?: CourseInstructor;
  enrollmentCount?: number;
  sessions: CourseSession[];
  // Server-computed against the viewer's own cert profile.
  alreadyQualified: boolean;
  meetsPrerequisite: boolean;
  // Only present for the instructor-of-record/admin/owner viewing GET /:id.
  enrollments?: CourseEnrollmentRosterEntry[];
}

export type CourseEnrollmentStatus = "ENROLLED" | "COMPLETED" | "CANCELLED";

export interface CourseEnrollmentRosterEntry {
  id: string;
  status: CourseEnrollmentStatus;
  enrolledAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    name: string;
  };
}

export interface CourseSession {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  locationType: "pool" | "classroom" | "open_water";
  siteId?: string | null;
  notes?: string | null;
}

export interface CourseSessionInput {
  sessionDate: string;
  startTime: string;
  endTime: string;
  locationType: "pool" | "classroom" | "open_water";
  siteId?: string | null;
  notes?: string | null;
}

// Matches backend/src/routes/courses.ts's createCourseSchema.
export interface CreateCourseInput {
  name: string;
  description?: string | null;
  agency?: CertAgency | null;
  prerequisiteCertLevel?: CertLevel | null;
  grantsCertLevel?: CertLevel | null;
  grantsSpecialty?: string | null;
  price?: number | null;
  sessions: CourseSessionInput[];
}

// Matches backend/src/routes/courses.ts's updateCourseSchema — every field
// optional since it's a partial update, and it has no `sessions` (sessions
// are edited individually via the reschedule endpoint).
export interface UpdateCourseInput {
  name?: string;
  description?: string | null;
  agency?: CertAgency | null;
  prerequisiteCertLevel?: CertLevel | null;
  grantsCertLevel?: CertLevel | null;
  grantsSpecialty?: string | null;
  price?: number | null;
  active?: boolean;
}

export type EquipmentCategory =
  | "BCD"
  | "REGULATOR"
  | "CYLINDER"
  | "WEIGHTS"
  | "WETSUIT"
  | "FINS"
  | "MASK"
  | "DIVE_COMPUTER";

export type GasType = "AIR" | "NITROX";
export type CylinderForm = "STANDARD" | "TALL";
export type WeightCarryMethod = "BELT" | "POCKETS";
export type FinStyle = "OPEN_HEEL" | "FULL_FOOT";

export interface EquipmentItem {
  id: string;
  slug: string;
  name: string;
  category: EquipmentCategory;
  active: boolean;
  displayOrder: number;
}

export interface UserEquipmentProfile {
  bcdSize: string | null;
  wetsuitSize: string | null;
  preferredGasType: GasType | null;
  preferredNitroxPercent: number | null;
  preferredCylinderVolumeLitres: number | null;
  preferredCylinderForm: CylinderForm | null;
  preferredWeightKg: number | null;
  preferredWeightCarryMethod: WeightCarryMethod | null;
  shoeSizeUk: number | null;
  finStyle: FinStyle | null;
}

export interface EquipmentSelectionInput {
  requestedSize?: string;
  gasType?: GasType;
  nitroxPercent?: number;
  cylinderVolumeLitres?: number;
  cylinderForm?: CylinderForm;
  requestedWeightKg?: number;
  weightCarryMethod?: WeightCarryMethod;
  shoeSizeUk?: number;
  finStyle?: FinStyle;
  clientNote?: string | null;
}

export interface BookingEquipmentInput {
  equipmentItemId: string;
  quantity: number;
  selection: EquipmentSelectionInput;
}

export interface BookingGuestInput {
  label?: string | null;
  equipment: BookingEquipmentInput[];
}

export type BookingStatus = "CONFIRMED" | "CANCELLED" | "CREDITED";
export type WaitlistStatus = "WAITING" | "NOTIFIED" | "CLAIMED" | "EXPIRED";

export interface WaitlistEntry {
  id: string;
  status: WaitlistStatus;
  joinedAt: string;
  notifiedAt: string | null;
  resolvedAt: string | null;
}

// Fields shared by BookingEquipmentRequest and BookingGuestEquipmentRequest —
// the two are field-for-field identical apart from which owner they're keyed
// by, so UI code that only reads the equipment fields (e.g. seeding the
// equipment-selection form) can accept either via this shape.
export interface EquipmentRequestFields {
  id: string;
  quantity: number;
  equipmentItem: Pick<EquipmentItem, "id" | "slug" | "name" | "category">;
  requestedSize: string | null;
  gasType: GasType | null;
  nitroxPercent: number | null;
  cylinderVolumeLitres: number | null;
  cylinderForm: CylinderForm | null;
  requestedWeightKg: number | null;
  weightCarryMethod: WeightCarryMethod | null;
  shoeSizeUk: number | null;
  finStyle: FinStyle | null;
  clientNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingEquipmentRequest extends EquipmentRequestFields {
  bookingId: string;
}

export interface BookingGuestEquipmentRequest extends EquipmentRequestFields {
  bookingGuestId: string;
}

export interface BookingGuest {
  id: string;
  bookingId: string;
  position: number;
  label: string;
  equipmentRequests: BookingGuestEquipmentRequest[];
}

export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  status: BookingStatus;
  bookedAt: string;
  cancelledAt: string | null;
  partySize: number;
  equipmentRequests: BookingEquipmentRequest[];
  guests: BookingGuest[];
}

export interface SiteConditionReading {
  id: string;
  source: string;
  recordedAt: string;
  significantWaveHeightM?: number | null;
  maxWaveHeightM?: number | null;
  meanWavePeriodS?: number | null;
  windSpeedMps?: number | null;
  windDirectionDeg?: number | null;
  airTemperatureC?: number | null;
  airPressureHpa?: number | null;
  meanCurrentSpeedMps?: number | null;
  surfaceCurrentSpeedMps?: number | null;
  currentDirectionDeg?: number | null;
  seaSurfaceTempC?: number | null;
}

export type EquipmentOwner =
  | { type: "SELF"; label: string }
  | { type: "GUEST"; label: string; bookingGuestId: string; position: number };

export interface StaffEquipmentManifestRequest {
  id: string;
  bookingId: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string;
    phone: string | null;
  };
  owner: EquipmentOwner;
  equipmentItem: Pick<EquipmentItem, "id" | "slug" | "name" | "category">;
  quantity: number;
  requestedSize: string | null;
  gasType: GasType | null;
  nitroxPercent: number | null;
  cylinderVolumeLitres: number | null;
  cylinderForm: CylinderForm | null;
  requestedWeightKg: number | null;
  weightCarryMethod: WeightCarryMethod | null;
  shoeSizeUk: number | null;
  finStyle: FinStyle | null;
  clientNote: string | null;
}

export interface StaffEquipmentManifest {
  trip: {
    id: string;
    date: string;
    tripDate: string;
    meetTime: string;
    launchTime: string;
    boat: Pick<Boat, "id" | "name">;
    launchSite?: Pick<LaunchSite, "id" | "name" | "address"> | null;
    site?: Pick<DiveSite, "id" | "name"> | null;
  };
  summary: {
    byCategory: Partial<Record<EquipmentCategory, number>>;
    bcdSizes: Record<string, number>;
    wetsuitSizes: Record<string, number>;
    cylinders: Record<string, number>;
    totalWeightKg: number;
    fins: Record<string, number>;
    totalPartySize: number;
  };
  requests: StaffEquipmentManifestRequest[];
}
