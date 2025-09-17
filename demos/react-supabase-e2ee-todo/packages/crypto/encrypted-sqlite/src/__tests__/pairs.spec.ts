import { describe, it, expect } from "vitest";
import { ensurePairsDDL } from "../pairs.js";
import { FakeDB } from "./fakes.js";

describe("ensurePairsDDL", () => {
  it("creates encrypted & mirror tables with custom columns and triggers", async () => {
    const db = new FakeDB();

    await ensurePairsDDL(db as any, [
      {
        name: "todos",
        encryptedTable: "raw_items",
        mirrorTable: "raw_items_plain",
        mirrorColumns: [
          { name: "text", type: "TEXT", notNull: true, defaultExpr: "''" },
          { name: "completed", type: "INTEGER", notNull: true, defaultExpr: "0" }
        ],
        parsePlain: () => ({})
      }
    ]);

    const ddl = db.execCalls.map(c => c.sql).join("\n---\n");
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS raw_items (");
    expect(ddl).toContain("CREATE TABLE IF NOT EXISTS raw_items_plain (");
    expect(ddl).toContain("text TEXT NOT NULL DEFAULT ''");
    expect(ddl).toContain("completed INTEGER NOT NULL DEFAULT 0");
    expect(ddl).toContain("CREATE TRIGGER IF NOT EXISTS raw_items_insert");
    expect(ddl).toContain("CREATE TRIGGER IF NOT EXISTS raw_items_update");
    expect(ddl).toContain("CREATE TRIGGER IF NOT EXISTS raw_items_delete");
  });
});