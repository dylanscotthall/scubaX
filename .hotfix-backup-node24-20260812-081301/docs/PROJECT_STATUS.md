# ScubaXcursions v0.3.0 Project Status

Last updated: 2026-08-11

## Product direction

ScubaXcursions replaces the centre's manual booking workflow with an Expo mobile application and an Express/PostgreSQL backend. This version establishes a clean base for trips, waitlists, courses, conditions, waivers and structured equipment requests.

## Implemented backend

- JWT authentication and role checks.
- Organization-scoped database access.
- Safe user selections that do not expose password hashes.
- Boats, launch sites and dive sites.
- Trips, client-capacity calculation and cancellation.
- Serializable booking and waitlist-claim transactions with bounded retry handling.
- Waitlist joining, notification state and claiming.
- Structured equipment catalogue.
- Reusable client equipment profile.
- Per-booking structured equipment-request snapshots.
- Staff trip equipment manifest with category, size and gas filters.
- Equipment request summaries by size, cylinder configuration, lead kilograms and fin details.
- Courses, enrollments and course sessions.
- Schedule templates.
- Manually entered dive conditions.
- Waiver API models and routes.
- Notification backend hooks.
- Production-safe base seed and local-only development seed.
- Docker Compose PostgreSQL.
- Committed initial Prisma migration.
- Railway build, migration, seed, start and health-check configuration.
- Automated read-only API smoke test and structured equipment write-flow test.

## Implemented mobile application

- Live login and secure token storage.
- Client account registration from the mobile app.
- No mock-data fallback.
- Upcoming trip list and detail.
- Booking, cancellation and waitlist joining.
- Visible waitlist status and notified-opening claim flow.
- Structured equipment selection after booking or waitlist claim.
- Saved usual equipment details and profile prefilling.
- Existing booking equipment editing.
- Courses and course details.
- Latest condition display.
- Launch-site display on trip details.
- Staff equipment-manifest screen for authorized staff.
- Real API and network errors shown to the user.

## Equipment decision

Equipment selection is a request to staff, not a reservation or availability guarantee.

The data is split into:

```text
EquipmentItem
UserEquipmentProfile
BookingEquipmentRequest
```

Stored request details include:

- BCD size.
- Wetsuit size.
- Air or Nitrox.
- Nitrox percentage.
- Cylinder volume and form.
- Total lead in kilograms.
- UK shoe size.
- Fin style.
- Optional exceptional note.

This design is searchable and supports future inventory work without parsing sentence strings.

## Seeded base data

Production-safe seed:

- One organization.
- Eight equipment catalogue entries.
- Two boats.
- One launch site.
- Fifteen dive sites.
- Optional first owner/admin from environment variables.

Local development seed:

- Admin and client accounts.
- Additional sample divers.
- Future trips, including a full waitlist test trip.
- Example bookings and equipment requests.
- Saved client equipment profile.
- Example course and sessions.
- Condition reading.
- Schedule templates.

Seeded site descriptions, certification requirements, boat capacity and launch information are starting data only. Centre staff must verify them before production use.

## Deliberately not implemented yet

- Physical equipment inventory.
- Equipment quantity guarantees or date-based reservations.
- Equipment variants, serial-numbered units, allocation, service, return or damage tracking.
- Payment gateway and final credit/refund rules.
- Complete staff CRUD user interface for trips, boats, sites, clients and courses.
- Complete production push-token registration and delivery verification.
- Final mobile waiver signing flow and legally approved waiver text.
- Password reset, email verification and account recovery.
- Production observability, alerting, audit logs and tested backup recovery.
- Full automated integration and UI test suites beyond source checks and the API smoke test.

## Launch readiness blockers

Before real clients use the system:

1. Verify all operational seed data with the centre.
2. Complete and legally approve waiver content.
3. Add secure password reset and account recovery.
4. Test push notifications on real iOS and Android devices.
5. Decide payment, cancellation, credit and refund policy.
6. Add production logging, monitoring and database backups.
7. Complete a security review and access-control test.
8. Run staging tests with actual staff workflows and physical phones.
9. Add automated tests for booking concurrency and key write endpoints.

## Recommended next development order

1. Staff trip and booking management interface.
2. Email verification and password recovery.
3. Waiver signing and document version management.
4. Push notification registration and delivery monitoring.
5. Payment and credit policy implementation.
6. Automated backend integration tests.
7. Production security, monitoring and backups.
8. Inventory only when the centre is ready to manage real allocation and maintenance workflows.
