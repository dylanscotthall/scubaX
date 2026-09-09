import { prisma } from "../lib/prisma";

const SAPPI_URL = "https://www.sappibuoy.com/sappi_post.php";

type SappiType = "wavemodule" | "weather" | "adcp";

type WaveRecord = {
  Hm0: number | null;
  Hmax: number | null;
  Tm01: number | null;
  time: number;
};

type WeatherRecord = {
  windSpeed: number | null;
  windDirection: number | null;
  airTemperature: number | null;
  atmosphericPressure: number | null;
  time: number;
};

type AdcpRecord = {
  Uda: number | null;
  vsurf: number | null;
  Udirda: number | null;
  temperature: number | null;
  time: number;
};

export type SappiSiteCondition = {
  source: "sappi_buoy";
  recordedAt: Date;

  significantWaveHeightM?: number;
  maxWaveHeightM?: number;
  meanWavePeriodS?: number;

  windSpeedMps?: number;
  windDirectionDeg?: number;
  airTemperatureC?: number;
  airPressureHpa?: number;

  meanCurrentSpeedMps?: number;
  surfaceCurrentSpeedMps?: number;
  currentDirectionDeg?: number;
  seaSurfaceTempC?: number;
};

/**
 * Fetch one dataset from Sappi.
 */
async function fetchSappiType<T>(type: SappiType): Promise<T[]> {
  const body = new URLSearchParams({
    data: "true",
    hist: "7",
    type,
  });

  const response = await fetch(SAPPI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.sappibuoy.com/index",
      "User-Agent": "ScubaX/1.0",
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `Sappi request failed for ${type}: ${response.status} ${response.statusText}`,
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected Sappi response for ${type}`);
  }

  return data as T[];
}

/**
 * Find the newest record based on Sappi's Unix timestamp.
 */
function latestValid<T extends { time: number }>(records: T[]): T | undefined {
  let latest: T | undefined;

  for (const record of records) {
    if (!Number.isFinite(record.time)) {
      continue;
    }

    if (!latest || record.time > latest.time) {
      latest = record;
    }
  }

  return latest;
}

/**
 * Convert direction into an integer from 0-359.
 */
function normalizeDirection(
  value: number | null | undefined,
): number | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.round(((value % 360) + 360) % 360) % 360;
}

/**
 * Prevent null, NaN and Infinity from reaching Prisma.
 */
function validNumber(value: number | null | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

/**
 * Fetch the latest wave, weather and current measurements
 * and normalize them into our SiteCondition format.
 */
export async function fetchSappiBuoy(): Promise<SappiSiteCondition> {
  const [waveRecords, weatherRecords, currentRecords] = await Promise.all([
    fetchSappiType<WaveRecord>("wavemodule"),
    fetchSappiType<WeatherRecord>("weather"),
    fetchSappiType<AdcpRecord>("adcp"),
  ]);

  const wave = latestValid(waveRecords);
  const weather = latestValid(weatherRecords);
  const current = latestValid(currentRecords);

  if (!wave && !weather && !current) {
    throw new Error("Sappi returned no usable buoy data");
  }

  const latestTimestamp = Math.max(
    wave?.time ?? 0,
    weather?.time ?? 0,
    current?.time ?? 0,
  );

  if (latestTimestamp <= 0) {
    throw new Error("Sappi returned no valid timestamps");
  }

  return {
    source: "sappi_buoy",
    recordedAt: new Date(latestTimestamp * 1000),

    // Waves
    significantWaveHeightM: validNumber(wave?.Hm0),
    maxWaveHeightM: validNumber(wave?.Hmax),
    meanWavePeriodS: validNumber(wave?.Tm01),

    // Weather
    windSpeedMps: validNumber(weather?.windSpeed),
    windDirectionDeg: normalizeDirection(weather?.windDirection),
    airTemperatureC: validNumber(weather?.airTemperature),

    // Sappi returns pressure around 103.x kPa.
    // 1 kPa = 10 hPa.
    airPressureHpa:
      weather?.atmosphericPressure != null &&
      Number.isFinite(weather.atmosphericPressure)
        ? weather.atmosphericPressure * 10
        : undefined,

    // Currents
    meanCurrentSpeedMps: validNumber(current?.Uda),
    surfaceCurrentSpeedMps: validNumber(current?.vsurf),
    currentDirectionDeg: normalizeDirection(current?.Udirda),

    // ADCP water temperature
    seaSurfaceTempC: validNumber(current?.temperature),
  };
}

/**
 * Fetch the latest Sappi data and save it for an organization.
 *
 * Because the database has:
 *
 * @@unique([organizationId, source, recordedAt])
 *
 * repeated syncs of the same Sappi timestamp update the existing row
 * instead of creating duplicates.
 */
export async function syncSappiBuoy(organizationId: string) {
  const condition = await fetchSappiBuoy();

  return prisma.siteCondition.upsert({
    where: {
      organizationId_source_recordedAt: {
        organizationId,
        source: condition.source,
        recordedAt: condition.recordedAt,
      },
    },

    create: {
      organizationId,
      ...condition,
    },

    update: {
      significantWaveHeightM: condition.significantWaveHeightM,
      maxWaveHeightM: condition.maxWaveHeightM,
      meanWavePeriodS: condition.meanWavePeriodS,

      windSpeedMps: condition.windSpeedMps,
      windDirectionDeg: condition.windDirectionDeg,
      airTemperatureC: condition.airTemperatureC,
      airPressureHpa: condition.airPressureHpa,

      meanCurrentSpeedMps: condition.meanCurrentSpeedMps,
      surfaceCurrentSpeedMps: condition.surfaceCurrentSpeedMps,
      currentDirectionDeg: condition.currentDirectionDeg,
      seaSurfaceTempC: condition.seaSurfaceTempC,
    },
  });
}
