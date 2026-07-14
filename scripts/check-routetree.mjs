#!/usr/bin/env node
/**
 * Build-time check that src/routeTree.gen.ts is in sync with src/routes/.
 *
 * The TanStack Router Vite plugin regenerates the route tree during build/dev.
 * When a developer commits a stale routeTree.gen.ts, the router hits missing
 * or extra route IDs at request time — a category of failures that shows up
 * as a 500 with `Cannot read properties of undefined (reading 'matchCache')`
 * or similar, well after the build is green.
 *
 * This script enumerates route files under src/routes/, derives the expected
 * route IDs, then verifies each ID appears in routeTree.gen.ts. Fails the
 * build if any ID is missing OR if the generated file references a route
 * whose source file no longer exists.
 *
 * Usage:
 *   node scripts/check-routetree.mjs
 * Exits non-zero on drift.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROUTES_DIR = "src/routes";
const GEN_FILE = "src/routeTree.gen.ts";

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) entries.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(name) && name !== "README.md") entries.push(full);
  }
  return entries;
}

function fileToRouteId(filePath) {
  // src/routes/foo/bar.baz.tsx -> /foo/bar/baz
  // src/routes/_authenticated/admin.users.tsx -> /_authenticated/admin/users
  // src/routes/index.tsx -> /
  const rel = relative(ROUTES_DIR, filePath).replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "");
  if (rel === "__root") return null; // root route is implicit
  const segments = rel.split("/").flatMap((seg) => seg.split("."));
  const cleaned = segments.filter((s) => s !== "index");
  if (cleaned.length === 0) return "/";
  return "/" + cleaned.join("/");
}

function main() {
  if (!existsSync(GEN_FILE)) {
    console.error(`✗ ${GEN_FILE} not found — run \`bunx --package=@tanstack/router-cli tsr generate\``);
    process.exit(1);
  }
  if (!existsSync(ROUTES_DIR)) {
    console.error(`✗ ${ROUTES_DIR} not found`);
    process.exit(1);
  }

  const gen = readFileSync(GEN_FILE, "utf8");
  const routeFiles = walk(ROUTES_DIR);
  const expectedIds = routeFiles.map(fileToRouteId).filter(Boolean);

  const missing = [];
  for (const id of expectedIds) {
    // The generated file references route IDs as string literals like '/foo/bar'
    // or as file-relative imports like './routes/foo.bar'. Check for either.
    const relImportPath = "./routes" + id.replace(/\/+/g, "/").replace(/\/(\$?[^/]+)/g, ".$1");
    const idLiteral = `'${id}'`;
    if (!gen.includes(idLiteral) && !gen.includes(relImportPath)) {
      missing.push(id);
    }
  }

  // Detect stale references: route imports in the gen file whose source file is missing.
  const importRegex = /from '\.\/(routes\/[^']+)'/g;
  const stale = [];
  let m;
  while ((m = importRegex.exec(gen)) !== null) {
    const importPath = m[1];
    const candidates = [
      `src/${importPath}.tsx`,
      `src/${importPath}.ts`,
      `src/${importPath}.jsx`,
      `src/${importPath}.js`,
    ];
    if (!candidates.some((p) => existsSync(p))) stale.push(importPath);
  }

  if (missing.length === 0 && stale.length === 0) {
    console.log(`✓ routeTree.gen.ts is in sync (${expectedIds.length} route files)`);
    return;
  }

  if (missing.length) {
    console.error("✗ Missing from routeTree.gen.ts:");
    for (const id of missing) console.error(`   ${id}`);
  }
  if (stale.length) {
    console.error("✗ Stale imports in routeTree.gen.ts (source files removed):");
    for (const p of stale) console.error(`   ${p}`);
  }
  console.error("\nRegenerate with: bunx --package=@tanstack/router-cli tsr generate");
  process.exit(1);
}

main();
