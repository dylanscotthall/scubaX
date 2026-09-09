# ScubaXcursions Current Technical Plan

Last updated: 2026-08-11

## Product objective

Replace the centre's manual WhatsApp booking workflow with a native client app and a staff-ready backend for trips, courses, structured rental-equipment requests, waivers, conditions and notifications.

## Current architecture

- Mobile: React Native with Expo SDK 57 and React Navigation.
- API: Express and TypeScript.
- Database: PostgreSQL through Prisma ORM 7 and the PostgreSQL driver adapter.
- Local development: Docker Compose PostgreSQL plus local Express and Expo processes.
- Hosted staging and production: Railway API and PostgreSQL.
- Mobile builds: Expo Application Services development, preview and production profiles.
- Runtime: Node 24 LTS; `.nvmrc` pins 24.19.0.

## Equipment decision

Equipment selection is a request to staff. It is not a reservation, stock allocation or availability promise.

The data is separated into three layers:

1. `EquipmentItem`: active catalogue entries such as BCD, cylinder and fins.
2. `UserEquipmentProfile`: reusable client defaults used to prefill future bookings.
3. `BookingEquipmentRequest`: the per-booking request snapshot.

Structured fields include BCD and wetsuit size, gas, Nitrox percentage, cylinder volume and form, total lead in kilograms, UK shoe size and fin style. Free text is only for unusual notes.

Inventory variants, physical units, maintenance, allocation and returns are deliberately out of scope until their operational value justifies the complexity.

## Seed policy

`npm run db:seed` is production-safe and idempotent. It creates or updates:

- The organization.
- Eight equipment catalogue items.
- Two boats.
- One launch site.
- Fifteen dive sites.
- An optional initial owner/admin.

It does not create fake trips, bookings, conditions or development passwords.

`npm run db:seed:dev` is local-only. It creates disposable users, future trips, a full trip, bookings, sample equipment requests, a course, sessions, a condition reading and schedule templates. It refuses to run when `NODE_ENV=production`.

Seeded dive-site descriptions, certification requirements, boat capacities and launch information must be reviewed by the centre before production. They are starting content, not authoritative operational or safety advice.

## Implemented API contract

### Authentication and user

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `PATCH /users/me/certification`
- `GET /users/me/equipment-profile`
- `PUT /users/me/equipment-profile`

### Equipment and bookings

- `GET /equipment`
- `POST /equipment` - owner/admin
- `PATCH /equipment/:id` - owner/admin
- `DELETE /equipment/:id` - retires rather than hard-deletes
- `GET /bookings/trip/:tripId`
- `POST /bookings`
- `PUT /bookings/:bookingId/equipment`
- `POST /bookings/:tripId/cancel`
- `POST /bookings/:tripId/waitlist`
- `POST /bookings/:tripId/waitlist/claim`
- `GET /trips/:tripId/equipment-requests` - staff manifest and summary

Booking creation and waitlist claiming use serializable transactions with bounded retry handling to prevent final-seat overbooking. Boat capacity is total persons aboard, including the skipper; the API reserves one skipper seat and exposes client-booking capacity separately.

### Other implemented domains

- Boats, launch sites and dive sites.
- Trips and cancellation.
- Courses, enrollment and session rescheduling.
- Schedule templates.
- Waivers.
- Manually entered condition readings.
- Notification backend hooks.

## Implemented mobile behavior

- Live authentication only.
- No bundled mock fallback.
- Live trips, courses and conditions.
- Structured equipment selection.
- Saved equipment-profile prefilling.
- Optional explicit saving of usual details.
- Existing booking equipment editing.
- Booking cancellation and waitlist joining.
- Waitlist notification and claim flow.
- Launch-site display.
- Staff equipment manifest screen.
- Visible backend and network errors.

## Deployment policy

- Keep local PostgreSQL and the local API for fast development.
- Maintain a separate Railway staging environment for physical-device and deployment tests.
- Use a distinct Railway production database and secrets before launch.
- Run `prisma migrate dev` only on a development database.
- Commit the complete `backend/prisma/migrations` history.
- Run `prisma migrate deploy` in Railway pre-deploy.
- Never expose PostgreSQL directly to the mobile app.
- Never place secrets in `EXPO_PUBLIC_` variables.

## Known limitations before public launch

- Only the staff equipment manifest has a staff mobile screen; broad staff administration UI remains incomplete.
- No payment gateway or final monetary credit/refund behavior.
- No physical equipment inventory or allocation.
- No complete production push-token registration and delivery verification.
- Waiver content and the complete mobile signing flow require legal and product work.
- No password reset, email verification or recovery workflow.
- No production monitoring, audit logs or tested backup recovery.
- No comprehensive automated integration or UI test suite.

## Next development priorities

1. Staff trip, booking and client management UI.
2. Account verification and recovery.
3. Legally approved waiver signing flow.
4. Push-token registration and notification verification.
5. Payment provider and credit/refund rules.
6. Automated backend integration and concurrency tests.
7. Production logging, monitoring, backups and security review.
8. Inventory only when real allocation and maintenance workflows are justified.
