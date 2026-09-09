const API_BASE_URL = (process.env.SMOKE_API_URL ?? process.env.API_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const CLIENT_EMAIL =
  process.env.SMOKE_CLIENT_EMAIL ??
  process.env.CLIENT_EMAIL ??
  process.env.DEV_CLIENT_EMAIL ??
  "client@scubaxcursion.local";
const CLIENT_PASSWORD =
  process.env.SMOKE_CLIENT_PASSWORD ??
  process.env.CLIENT_PASSWORD ??
  process.env.DEV_CLIENT_PASSWORD ??
  "LocalClient123!";
const ADMIN_EMAIL =
  process.env.SMOKE_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  process.env.DEV_ADMIN_EMAIL ??
  "admin@scubaxcursion.local";
const ADMIN_PASSWORD =
  process.env.SMOKE_ADMIN_PASSWORD ??
  process.env.ADMIN_PASSWORD ??
  process.env.DEV_ADMIN_PASSWORD ??
  "LocalAdmin123!";

class SmokeError extends Error {}

function assertNoSensitiveKeys(value, path = "response") {
  if (value == null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveKeys(item, `${path}[${index}]`));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "passwordHash") {
      throw new SmokeError(`Sensitive field passwordHash leaked at ${path}.${key}`);
    }
    assertNoSensitiveKeys(child, `${path}.${key}`);
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      throw new SmokeError(
        `${options.method ?? "GET"} ${path} returned ${response.status}: ${
          typeof payload === "string" ? payload : JSON.stringify(payload)
        }`,
      );
    }

    assertNoSensitiveKeys(payload, `${options.method ?? "GET"} ${path}`);
    return payload;
  } catch (error) {
    if (error instanceof SmokeError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SmokeError(`${options.method ?? "GET"} ${path} timed out`);
    }
    throw new SmokeError(
      `${options.method ?? "GET"} ${path} could not reach ${API_BASE_URL}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) throw new SmokeError(message);
}

async function login(email, password) {
  const result = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert(typeof result?.token === "string", `Login did not return a token for ${email}`);
  return result;
}

async function main() {
  console.log(`Testing ${API_BASE_URL}`);

  const health = await request("/health");
  assert(health?.status === "ok", "Health endpoint did not return status=ok");
  console.log("PASS  health");

  const clientLogin = await login(CLIENT_EMAIL, CLIENT_PASSWORD);
  const clientToken = clientLogin.token;
  console.log(`PASS  client login (${CLIENT_EMAIL})`);

  const [
    profile,
    equipment,
    trips,
    equipmentProfile,
    courses,
    conditions,
    boats,
    launchSites,
    diveSites,
  ] =
    await Promise.all([
      request("/users/me", { token: clientToken }),
      request("/equipment", { token: clientToken }),
      request(`/trips?from=${new Date().toISOString().slice(0, 10)}`, {
        token: clientToken,
      }),
      request("/users/me/equipment-profile", { token: clientToken }),
      request("/courses", { token: clientToken }),
      request("/conditions/latest", { token: clientToken }),
      request("/boats", { token: clientToken }),
      request("/launch-sites", { token: clientToken }),
      request("/dive-sites", { token: clientToken }),
    ]);

  assert(profile?.user?.email === CLIENT_EMAIL.toLowerCase(), "Client profile mismatch");
  assert(Array.isArray(equipment?.equipmentItems), "Equipment response is not an array");
  assert(equipment.equipmentItems.length >= 8, "Base equipment catalogue is incomplete");
  assert(Array.isArray(trips?.trips), "Trips response is not an array");
  assert(equipmentProfile?.profile, "Equipment profile response is missing");
  assert(Array.isArray(courses?.courses), "Courses response is not an array");
  assert("siteCondition" in conditions, "Conditions response is missing siteCondition");
  assert(Array.isArray(boats?.boats), "Boats response is not an array");
  assert(boats.boats.length >= 2, "Base boat seed is incomplete");
  assert(Array.isArray(launchSites?.launchSites), "Launch sites response is not an array");
  assert(launchSites.launchSites.length >= 1, "Base launch-site seed is incomplete");
  assert(Array.isArray(diveSites?.sites), "Dive-sites response is not an array");
  assert(diveSites.sites.length >= 15, "Base dive-site seed is incomplete");
  console.log(
    `PASS  client reads (${equipment.equipmentItems.length} equipment items, ${boats.boats.length} boats, ${launchSites.launchSites.length} launch sites, ${diveSites.sites.length} dive sites, ${trips.trips.length} upcoming trips, ${courses.courses.length} courses)`,
  );

  if (trips.trips.length > 0) {
    const firstTripId = trips.trips[0].id;
    const [tripDetail, booking] = await Promise.all([
      request(`/trips/${firstTripId}`, { token: clientToken }),
      request(`/bookings/trip/${firstTripId}`, { token: clientToken }),
    ]);
    assert(tripDetail?.trip?.id === firstTripId, "Trip detail response mismatch");
    assert("booking" in booking, "My-booking response is missing booking");
    assert("waitlistEntry" in booking, "My-booking response is missing waitlistEntry");
    console.log("PASS  trip detail and current-client booking lookup");
  }

  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminToken = adminLogin.token;
  assert(
    adminLogin.user?.roles?.some((role) => role === "ADMIN" || role === "OWNER"),
    "Admin account does not have ADMIN or OWNER role",
  );
  console.log(`PASS  admin login (${ADMIN_EMAIL})`);

  const adminProfile = await request("/users/me", { token: adminToken });
  assert(adminProfile?.user?.email === ADMIN_EMAIL.toLowerCase(), "Admin profile mismatch");
  console.log("PASS  safe admin profile serialization");

  if (trips.trips.length > 0) {
    const manifest = await request(
      `/trips/${trips.trips[0].id}/equipment-requests`,
      { token: adminToken },
    );
    assert(Array.isArray(manifest?.requests), "Equipment manifest requests are missing");
    assert(manifest?.summary, "Equipment manifest summary is missing");
    console.log(`PASS  staff equipment manifest (${manifest.requests.length} rows)`);
  }

  console.log("\nSmoke test passed. No data was changed.");
}

main().catch((error) => {
  console.error(`\nSMOKE TEST FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
