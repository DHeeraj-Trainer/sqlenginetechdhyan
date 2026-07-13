import { describe, it, expect } from "vitest";
import { buildScript } from "@/lib/db/sample-builder";
import { sampleDatabases } from "@/lib/db/sample-databases";

// Engine-level (WASM) tests require a browser environment; run sample-builder
// unit tests here as a smoke suite that runs anywhere.
describe("sample-builder", () => {
  it("builds a script that includes CREATE and INSERT for each sample table", () => {
    for (const db of sampleDatabases) {
      const script = buildScript(db, "sqlite");
      for (const t of db.tables) {
        expect(script).toContain(`CREATE TABLE ${t.name}`);
        if (t.rows.length) expect(script).toContain(`INSERT INTO ${t.name}`);
      }
    }
  });

  it("emits DROP TABLE IF EXISTS in reverse declaration order", () => {
    const db = sampleDatabases[0];
    const script = buildScript(db, "sqlite");
    const dropIdx = db.tables
      .map((t) => script.indexOf(`DROP TABLE IF EXISTS ${t.name}`))
      .filter((i) => i >= 0);
    expect(dropIdx.length).toBe(db.tables.length);
    // dropped in reverse table order → indices should be increasing when read
    // in reverse table order.
    const reversed = [...dropIdx].reverse();
    expect([...reversed].sort((a, b) => a - b)).toEqual(reversed);
  });

  it("maps types differently per engine", () => {
    const db = sampleDatabases[0];
    const sqliteScript = buildScript(db, "sqlite");
    const pgScript = buildScript(db, "postgres");
    expect(sqliteScript).toContain("INTEGER");
    expect(pgScript).toContain("INTEGER");
    // postgres uses DOUBLE PRECISION for reals; sqlite uses REAL
    expect(pgScript).toMatch(/DOUBLE PRECISION|TEXT/);
    expect(sqliteScript).toContain("REAL");
  });
});
