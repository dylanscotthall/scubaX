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
  mostRecentDiveDate?: string | null;
  mostRecentDiveLocation?: string | null;
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
  price?: number | null;
  instructor?: CourseInstructor;
  enrollmentCount?: number;
  sessions: CourseSession[];
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
  shoeSizeUk?: number;
  finStyle?: FinStyle;
  clientNote?: string | null;
}

export interface BookingEquipmentInput {
  equipmentItemId: string;
  quantity: number;
  selection: EquipmentSelectionInput;
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

export interface BookingEquipmentRequest {
  id: string;
  bookingId: string;
  quantity: number;
  equipmentItem: Pick<EquipmentItem, "id" | "slug" | "name" | "category">;
  requestedSize: string | null;
  gasType: GasType | null;
  nitroxPercent: number | null;
  cylinderVolumeLitres: number | null;
  cylinderForm: CylinderForm | null;
  requestedWeightKg: number | null;
  shoeSizeUk: number | null;
  finStyle: FinStyle | null;
  clientNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  tripId: string;
  userId: string;
  status: BookingStatus;
  bookedAt: string;
  cancelledAt: string | null;
  equipmentRequests: BookingEquipmentRequest[];
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
  equipmentItem: Pick<EquipmentItem, "id" | "slug" | "name" | "category">;
  quantity: number;
  requestedSize: string | null;
  gasType: GasType | null;
  nitroxPercent: number | null;
  cylinderVolumeLitres: number | null;
  cylinderForm: CylinderForm | null;
  requestedWeightKg: number | null;
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
  };
  requests: StaffEquipmentManifestRequest[];
}
