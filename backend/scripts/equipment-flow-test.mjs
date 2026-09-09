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

class FlowError extends Error {}

function assert(condition, message) {
  if (!condition) throw new FlowError(message);
}

function assertNoSensitiveKeys(value, path = "response") {
  if (value == null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSensitiveKeys(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "passwordHash") {
      throw new FlowError(`Sensitive field passwordHash leaked at ${path}.${key}`);
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
      throw new FlowError(
        `${options.method ?? "GET"} ${path} returned ${response.status}: ${
          typeof payload === "string" ? payload : JSON.stringify(payload)
        }`,
      );
    }

    assertNoSensitiveKeys(payload, `${options.method ?? "GET"} ${path}`);
    return payload;
  } catch (error) {
    if (error instanceof FlowError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FlowError(`${options.method ?? "GET"} ${path} timed out`);
    }
    throw new FlowError(
      `${options.method ?? "GET"} ${path} could not reach ${API_BASE_URL}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function login(email, password) {
  const result = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  assert(typeof result?.token === "string", `Login did not return a token for ${email}`);
  return result.token;
}

function itemByCategory(items, category) {
  const item = items.find((candidate) => candidate.category === category);
  assert(item, `Equipment catalogue is missing ${category}`);
  return item;
}

function requestByCategory(booking, category) {
  const row = booking.equipmentRequests.find(
    (requestRow) => requestRow.equipmentItem.category === category,
  );
  assert(row, `Booking response is missing ${category}`);
  return row;
}

async function main() {
  console.log(`Testing structured equipment write flow against ${API_BASE_URL}`);

  const [clientToken, adminToken] = await Promise.all([
    login(CLIENT_EMAIL, CLIENT_PASSWORD),
    login(ADMIN_EMAIL, ADMIN_PASSWORD),
  ]);

  const [catalogue, tripList] = await Promise.all([
    request("/equipment", { token: clientToken }),
    request(`/trips?from=${new Date().toISOString().slice(0, 10)}`, {
      token: clientToken,
    }),
  ]);

  assert(Array.isArray(catalogue?.equipmentItems), "Equipment catalogue is missing");
  assert(Array.isArray(tripList?.trips), "Trip list is missing");

  const trip = tripList.trips.find(
    (candidate) =>
      candidate.status === "SCHEDULED" &&
      candidate.confirmedCount < candidate.capacity,
  );
  assert(trip, "Development seed has no scheduled trip with an open client spot");

  const current = await request(`/bookings/trip/${trip.id}`, {
    token: clientToken,
  });
  if (current?.booking?.status === "CONFIRMED") {
    await request(`/bookings/${trip.id}/cancel`, {
      method: "POST",
      token: clientToken,
    });
  }

  const bcd = itemByCategory(catalogue.equipmentItems, "BCD");
  const cylinder = itemByCategory(catalogue.equipmentItems, "CYLINDER");
  const weights = itemByCategory(catalogue.equipmentItems, "WEIGHTS");
  const fins = itemByCategory(catalogue.equipmentItems, "FINS");

  const created = await request("/bookings", {
    method: "POST",
    token: clientToken,
    body: {
      tripId: trip.id,
      equipment: [
        {
          equipmentItemId: bcd.id,
          quantity: 1,
          selection: { requestedSize: "M" },
        },
        {
          equipmentItemId: cylinder.id,
          quantity: 1,
          selection: {
            gasType: "NITROX",
            nitroxPercent: 32,
            cylinderVolumeLitres: 12,
            cylinderForm: "STANDARD",
          },
        },
        {
          equipmentItemId: weights.id,
          quantity: 1,
          selection: { requestedWeightKg: 8.5 },
        },
        {
          equipmentItemId: fins.id,
          quantity: 1,
          selection: { shoeSizeUk: 9, finStyle: "OPEN_HEEL" },
        },
      ],
    },
  });

  assert(created?.booking?.status === "CONFIRMED", "Booking was not confirmed");
  assert(created.booking.equipmentRequests.length === 4, "Expected four equipment requests");
  assert(requestByCategory(created.booking, "BCD").requestedSize === "M", "BCD size was not stored");
  assert(requestByCategory(created.booking, "CYLINDER").nitroxPercent === 32, "Nitrox percentage was not stored");
  assert(requestByCategory(created.booking, "WEIGHTS").requestedWeightKg === 8.5, "Weight kilograms were not stored");
  assert(requestByCategory(created.booking, "FINS").shoeSizeUk === 9, "Fin shoe size was not stored");
  assert(!JSON.stringify(created).includes("sizeNote"), "Legacy sizeNote leaked into the booking contract");
  console.log("PASS  structured booking request creation");

  const readBack = await request(`/bookings/trip/${trip.id}`, {
    token: clientToken,
  });
  assert(readBack?.booking?.id === created.booking.id, "Created booking could not be read back");
  assert(readBack.booking.equipmentRequests.length === 4, "Read-back request count mismatch");
  console.log("PASS  structured booking request read-back");

  const updated = await request(`/bookings/${created.booking.id}/equipment`, {
    method: "PUT",
    token: clientToken,
    body: {
      equipment: [
        {
          equipmentItemId: bcd.id,
          quantity: 1,
          selection: { requestedSize: "ML" },
        },
        {
          equipmentItemId: weights.id,
          quantity: 1,
          selection: { requestedWeightKg: 9 },
        },
      ],
    },
  });
  assert(updated?.booking?.equipmentRequests?.length === 2, "Equipment replacement did not replace the snapshot");
  assert(requestByCategory(updated.booking, "BCD").requestedSize === "ML", "Updated BCD size mismatch");
  assert(requestByCategory(updated.booking, "WEIGHTS").requestedWeightKg === 9, "Updated weight mismatch");
  console.log("PASS  structured equipment replacement");

  const manifest = await request(
    `/trips/${trip.id}/equipment-requests?category=WEIGHTS`,
    { token: adminToken },
  );
  assert(Array.isArray(manifest?.requests), "Staff manifest requests are missing");
  assert(
    manifest.requests.some(
      (row) => row.bookingId === created.booking.id && row.requestedWeightKg === 9,
    ),
    "Updated weight request is missing from the staff manifest",
  );
  assert(manifest?.summary?.totalWeightKg >= 9, "Staff manifest weight summary is incorrect");
  console.log("PASS  staff manifest sees structured request");

  const cleared = await request(`/bookings/${created.booking.id}/equipment`, {
    method: "PUT",
    token: clientToken,
    body: { equipment: [] },
  });
  assert(cleared?.booking?.equipmentRequests?.length === 0, "Equipment request could not be cleared");

  await request(`/bookings/${trip.id}/cancel`, {
    method: "POST",
    token: clientToken,
  });
  const afterCancel = await request(`/bookings/trip/${trip.id}`, {
    token: clientToken,
  });
  assert(afterCancel?.booking?.status === "CANCELLED", "Test booking was not cancelled");
  console.log("PASS  cleanup (request cleared and development booking cancelled)");

  console.log("\nStructured equipment flow test passed.");
}

main().catch((error) => {
  console.error(`\nEQUIPMENT FLOW TEST FAILED: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
