import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = false;

function fail(message) {
  failed = true;
  console.error(`ERROR: ${message}`);
}

function ok(message) {
  console.log(`OK: ${message}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  try {
    const value = JSON.parse(readText(relativePath));
    ok(`valid JSON: ${relativePath}`);
    return value;
  } catch (error) {
    fail(`invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, predicate));
    else if (predicate(absolute)) files.push(absolute);
  }
  return files;
}

const requiredFiles = [
  ".nvmrc",
  "START_HERE_ARCH.md",
  "VERIFICATION.md",
  "compose.yaml",
  "backend/.env.example",
  "backend/package.json",
  "backend/package-lock.json",
  "backend/prisma.config.ts",
  "backend/prisma/schema.prisma",
  "backend/prisma/seed.ts",
  "backend/prisma/seed.dev.ts",
  "backend/prisma/migrations/20260811180000_init/migration.sql",
  "backend/railway.json",
  "backend/scripts/smoke-test.mjs",
  "backend/scripts/equipment-flow-test.mjs",
  "backend/src/config.ts",
  "backend/src/lib/capacity.ts",
  "backend/src/lib/equipment.ts",
  "backend/src/lib/http.ts",
  "backend/src/lib/transactions.ts",
  "mobile/.env.example",
  "mobile/app.json",
  "mobile/eas.json",
  "mobile/package.json",
  "mobile/package-lock.json",
  "mobile/src/screens/SelectEquipmentScreen.tsx",
  "mobile/src/screens/StaffEquipmentScreen.tsx",
  "scripts/check-arch.sh",
  "scripts/setup-local.sh",
  "scripts/start-backend.sh",
  "scripts/start-mobile.sh",
  "scripts/update-mobile-api.sh",
  "scripts/doctor.sh",
  "scripts/reset-local.sh",
  "docs/ARCH_START_TO_FINISH.md",
  "docs/RAILWAY_STAGING.md",
  "docs/PROJECT_STATUS.md",
];
for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) fail(`missing required file: ${relativePath}`);
}
if (!failed) ok("required generated files are present");

const filesThatMustBeDeleted = [
  "mobile/src/api/mockData.ts",
  "mobile/src/components/DemoBanner.tsx",
  "scripts/bootstrap-local.sh",
];
for (const relativePath of filesThatMustBeDeleted) {
  if (fs.existsSync(path.join(root, relativePath))) fail(`legacy file must be deleted: ${relativePath}`);
}

const jsonPaths = [
  "backend/package.json",
  "backend/package-lock.json",
  "backend/railway.json",
  "mobile/package.json",
  "mobile/package-lock.json",
  "mobile/app.json",
  "mobile/eas.json",
];
const json = Object.fromEntries(jsonPaths.map((file) => [file, readJson(file)]));

function comparePackageAndLock(prefix) {
  const packageFile = `${prefix}/package.json`;
  const lockFile = `${prefix}/package-lock.json`;
  const packageJson = json[packageFile];
  const packageLock = json[lockFile];
  if (!packageJson || !packageLock) return;
  const lockRoot = packageLock.packages?.[""];
  if (!lockRoot) {
    fail(`${lockFile} has no packages[\"\"] root entry`);
    return;
  }

  for (const field of ["name", "version"]) {
    if (packageJson[field] !== lockRoot[field]) {
      fail(`${packageFile} ${field} does not match ${lockFile}`);
    }
  }
  for (const field of ["dependencies", "devDependencies", "engines"]) {
    const expected = JSON.stringify(packageJson[field] ?? {});
    const actual = JSON.stringify(lockRoot[field] ?? {});
    if (expected !== actual) fail(`${packageFile} ${field} does not match ${lockFile}`);
  }
  ok(`${prefix} package.json matches package-lock root metadata`);
}
comparePackageAndLock("backend");
comparePackageAndLock("mobile");

for (const prefix of ["backend", "mobile"]) {
  const packageJson = json[`${prefix}/package.json`];
  const packageLock = json[`${prefix}/package-lock.json`];
  if (!packageJson || !packageLock) continue;
  for (const dependencyGroup of ["dependencies", "devDependencies"]) {
    for (const [name, version] of Object.entries(packageJson[dependencyGroup] ?? {})) {
      const lockedVersion = packageLock.packages?.[`node_modules/${name}`]?.version;
      if (version !== lockedVersion) {
        fail(`${prefix}: ${name} is ${version} in package.json but ${lockedVersion ?? "missing"} in the lockfile`);
      }
    }
  }
  ok(`${prefix} top-level dependency versions match installed lock entries`);
}

for (const prefix of ["backend", "mobile"]) {
  const packageJson = json[`${prefix}/package.json`];
  if (packageJson?.engines?.node !== ">=22.12.0 <23") {
    fail(`${prefix}/package.json must pin Node to >=22.12.0 <23`);
  }
}
if (!/^22\./.test(readText(".nvmrc").trim())) fail(".nvmrc must contain a Node 22 version");

const backendPackage = json["backend/package.json"];
const mobilePackage = json["mobile/package.json"];
if (backendPackage?.scripts?.["db:release"] !== "npm run db:deploy && npm run db:seed") {
  fail("backend db:release script is missing or incorrect");
}
if (backendPackage?.scripts?.postinstall !== "prisma generate") {
  fail("backend postinstall must generate Prisma Client");
}
if (backendPackage?.scripts?.predev !== "prisma generate") {
  fail("backend predev must generate Prisma Client");
}
const railway = json["backend/railway.json"];
if (railway?.deploy?.preDeployCommand !== "npm run db:release") {
  fail("Railway preDeployCommand must be npm run db:release");
}
if (railway?.deploy?.healthcheckPath !== "/health") fail("Railway healthcheckPath must be /health");
if (mobilePackage?.scripts?.["start:go"] !== "expo start --go --clear") {
  fail("mobile start:go script is missing or incorrect");
}
if (mobilePackage?.scripts?.["start:go:tunnel"] !== "expo start --go --clear --tunnel") {
  fail("mobile start:go:tunnel script is missing or incorrect");
}

const setupScript = readText("scripts/setup-local.sh");
for (const command of [
  "npm ci --no-audit --no-fund",
  "npm run prisma:generate",
  "npm run db:deploy",
  "npm run db:seed",
  "npm run db:seed:dev",
  "npm run typecheck",
  "npm run build",
  "npm run smoke",
  "npm run test:equipment-flow",
  "npx expo config --type public",
  "npx expo install --check",
]) {
  if (!setupScript.includes(command)) {
    fail(`scripts/setup-local.sh is missing required step: ${command}`);
  }
}

const startMobileScript = readText("scripts/start-mobile.sh");
if (!startMobileScript.includes("npm run start:dev")) {
  fail("scripts/start-mobile.sh must start the Expo development client");
}
if (startMobileScript.includes("npm run start:go")) {
  fail("scripts/start-mobile.sh must not default to Expo Go");
}
if (mobilePackage?.scripts?.["start:dev"] !== "expo start --dev-client --clear") {
  fail("mobile start:dev script is missing or incorrect");
}
if (
  mobilePackage?.scripts?.["start:dev:tunnel"] !==
  "expo start --dev-client --clear --tunnel"
) {
  fail("mobile start:dev:tunnel script is missing or incorrect");
}

const schema = readText("backend/prisma/schema.prisma");
const requiredSchemaTerms = [
  "enum EquipmentCategory",
  "enum GasType",
  "enum CylinderForm",
  "enum FinStyle",
  "model UserEquipmentProfile",
  "model BookingEquipmentRequest",
  "model LaunchSite",
  "provider     = \"prisma-client\"",
  "output       = \"../src/generated/prisma\"",
  "equipmentProfile UserEquipmentProfile?",
  "equipmentRequests BookingEquipmentRequest[]",
  "certSpecialties     String[]    @default([])",
];
for (const term of requiredSchemaTerms) {
  if (!schema.includes(term)) fail(`Prisma schema is missing: ${term}`);
}
const forbiddenSchemaPatterns = [
  /\bquantityAvailable\b/,
  /\bsizeNote\b/,
  /^model BookingEquipment\s*\{/m,
];
for (const pattern of forbiddenSchemaPatterns) {
  if (pattern.test(schema)) fail(`Prisma schema still contains legacy pattern: ${pattern}`);
}

const prismaConfig = readText("backend/prisma.config.ts");
if (!prismaConfig.includes("process.env.DATABASE_URL ??")) {
  fail("prisma.config.ts must allow prisma generate before backend/.env exists");
}

const migration = readText(
  "backend/prisma/migrations/20260811180000_init/migration.sql",
);
for (const table of [
  "organizations",
  "users",
  "boats",
  "launch_sites",
  "trips",
  "bookings",
  "equipment_items",
  "user_equipment_profiles",
  "booking_equipment_requests",
]) {
  if (!migration.includes(`CREATE TABLE "${table}"`)) {
    fail(`initial migration is missing table ${table}`);
  }
}
if (!migration.includes('"cert_specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]')) {
  fail("initial migration must default cert_specialties to an empty text array");
}
for (const enumName of ["EquipmentCategory", "GasType", "CylinderForm", "FinStyle"]) {
  if (!migration.includes(`CREATE TYPE "${enumName}" AS ENUM`)) {
    fail(`initial migration is missing enum ${enumName}`);
  }
}

// Independently compare every Prisma scalar column with the committed initial
// migration. This catches hand-authored migration omissions before PostgreSQL
// is started on the developer machine.
const enumNames = new Set(
  [...schema.matchAll(/^enum\s+(\w+)\s*\{/gm)].map((match) => match[1]),
);
const scalarTypes = new Set([
  "String",
  "Int",
  "Boolean",
  "DateTime",
  "Float",
  "Decimal",
  ...enumNames,
]);
const schemaTables = new Map();
for (const modelMatch of schema.matchAll(/^model\s+(\w+)\s*\{\n(.*?)^\}/gms)) {
  const [, modelName, body] = modelMatch;
  const tableName = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName;
  const columns = new Set();

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
    const fieldMatch = line.match(/^(\w+)\s+([\w\[\]?]+)(.*)$/);
    if (!fieldMatch) continue;
    const [, fieldName, fieldType, attributes] = fieldMatch;
    const baseType = fieldType.replace("[]", "").replace("?", "");
    if (!scalarTypes.has(baseType)) continue;
    const columnName = attributes.match(/@map\("([^"]+)"\)/)?.[1] ?? fieldName;
    columns.add(columnName);
  }

  schemaTables.set(tableName, columns);
}

const migrationTables = new Map();
for (const tableMatch of migration.matchAll(/CREATE TABLE "([^"]+)" \(\n(.*?)\n\);/gs)) {
  const [, tableName, body] = tableMatch;
  const columns = new Set();
  for (const rawLine of body.split("\n")) {
    const columnName = rawLine.match(/^\s*"([^"]+)"\s+/)?.[1];
    if (columnName) columns.add(columnName);
  }
  migrationTables.set(tableName, columns);
}

for (const [tableName, schemaColumns] of schemaTables) {
  const migrationColumns = migrationTables.get(tableName);
  if (!migrationColumns) {
    fail(`initial migration is missing Prisma table ${tableName}`);
    continue;
  }
  const schemaOnly = [...schemaColumns].filter((column) => !migrationColumns.has(column));
  const migrationOnly = [...migrationColumns].filter((column) => !schemaColumns.has(column));
  if (schemaOnly.length || migrationOnly.length) {
    fail(
      `schema/migration column mismatch for ${tableName}: schema-only=[${schemaOnly.join(", ")}], migration-only=[${migrationOnly.join(", ")}]`,
    );
  }
}
for (const tableName of migrationTables.keys()) {
  if (!schemaTables.has(tableName)) {
    fail(`initial migration contains table not present in Prisma schema: ${tableName}`);
  }
}

// Catch simple hand-authored migration mistakes such as declaring the same
// column twice inside one CREATE TABLE statement.
const tablePattern = /CREATE TABLE "([^"]+)" \(([^;]+?)\n\);/gs;
for (let tableMatch = tablePattern.exec(migration); tableMatch; tableMatch = tablePattern.exec(migration)) {
  const [, tableName, body] = tableMatch;
  const columns = [];
  for (const line of body.split("\n")) {
    const columnMatch = line.match(/^\s*"([^"]+)"\s+/);
    if (columnMatch) columns.push(columnMatch[1]);
  }
  const duplicates = columns.filter((column, index) => columns.indexOf(column) !== index);
  if (duplicates.length > 0) {
    fail(`initial migration table ${tableName} has duplicate column(s): ${[...new Set(duplicates)].join(", ")}`);
  }
}

const sourceRoots = ["backend/src", "backend/prisma", "mobile/src"];
const sourceFiles = sourceRoots.flatMap((relativePath) =>
  walk(path.join(root, relativePath), (file) => /\.(ts|tsx)$/.test(file)),
);
const forbiddenTerms = [
  "withMockFallback",
  "quantityAvailable",
  "sizeNote",
  "EXPO_PUBLIC_API_MODE",
  'from "@prisma/client"',
  "from '@prisma/client'",
];
for (const absolute of sourceFiles) {
  const source = fs.readFileSync(absolute, "utf8");
  for (const term of forbiddenTerms) {
    if (source.includes(term)) {
      fail(`legacy term '${term}' remains in ${path.relative(root, absolute)}`);
    }
  }
}


const prismaSourceImports = sourceFiles
  .filter((absolute) => absolute.startsWith(path.join(root, "backend")))
  .filter((absolute) => fs.readFileSync(absolute, "utf8").includes("generated/prisma/client"));
if (prismaSourceImports.length === 0) {
  fail("backend source does not import the explicit generated Prisma Client");
}
if (readText("backend/src/lib/prisma.ts").includes(".prisma/client")) {
  fail("backend runtime must not depend on node_modules/.prisma/client");
}
if (!readText("backend/src/lib/equipment.ts").includes("quantity must be 1 because requestedWeightKg is the total lead required")) {
  fail("weights requests must enforce quantity 1 because kilograms are already a total");
}
if (readText("backend/src/routes/trips.ts").includes("requestedWeightKg * quantity")) {
  fail("staff manifest must not multiply total requested kilograms by quantity");
}
if (!readText("mobile/src/screens/HomeScreen.tsx").includes('navigation.navigate("TripDetail"')) {
  fail("Home must open TripDetail before booking instead of bypassing trip state");
}
if (!readText("mobile/src/screens/HomeScreen.tsx").includes("confirmLogout")) {
  fail("authenticated mobile UI must expose logout");
}

function resolveRelativeImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

const importPatterns = [
  /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
];
for (const absolute of sourceFiles) {
  const source = fs.readFileSync(absolute, "utf8");
  for (const pattern of importPatterns) {
    pattern.lastIndex = 0;
    for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
      const specifier = match[1];
      const generatedPrismaImport = specifier.includes("generated/prisma/client");
      if (
        specifier.startsWith(".") &&
        !generatedPrismaImport &&
        !resolveRelativeImport(absolute, specifier)
      ) {
        fail(`unresolved relative import '${specifier}' in ${path.relative(root, absolute)}`);
      }
    }
  }
}
ok(`checked ${sourceFiles.length} TypeScript/TSX files for legacy terms and relative imports`);

const jsFiles = [
  "backend/scripts/smoke-test.mjs",
  "backend/scripts/equipment-flow-test.mjs",
  "mobile/babel.config.js",
  "scripts/verify-source.mjs",
];
for (const relativePath of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, relativePath)], {
    stdio: "inherit",
  });
  if (result.status !== 0) fail(`JavaScript syntax check failed: ${relativePath}`);
}

const gitignore = readText(".gitignore");
for (const requiredIgnore of ["node_modules/", ".env", "dist/", ".expo/"]) {
  if (!gitignore.includes(requiredIgnore)) fail(`root .gitignore is missing ${requiredIgnore}`);
}

if (failed) process.exit(1);
console.log("Source-level verification passed. Dependency-aware checks still require npm ci.");
