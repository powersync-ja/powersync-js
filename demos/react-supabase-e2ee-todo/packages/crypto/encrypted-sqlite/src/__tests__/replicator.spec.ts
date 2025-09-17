import { describe, it, expect } from "vitest";
import { startEncryptedMirrors } from "../replicator.js";
import { FakeDB, MockCrypto } from "./fakes.js";

const PAIR = {
  name: "todos",
  encryptedTable: "raw_items",
  mirrorTable: "raw_items_plain",
  mirrorColumns: [
    { name: "text", type: "TEXT", notNull: true, defaultExpr: "''" },
    { name: "completed", type: "INTEGER", notNull: true, defaultExpr: "0" }
  ],
  parsePlain: ({ plaintext }: any) => {
    const obj = JSON.parse(new TextDecoder().decode(plaintext));
    return { text: obj.text ?? "", completed: obj.completed ? 1 : 0 };
  }
};

describe("replicator", () => {
  it("decrypts, parses, and upserts into mirror columns", async () => {
    const db = new FakeDB() ;

    const stop = startEncryptedMirrors(
      { db: db as any, userId: "u1", crypto: MockCrypto as any },
      [PAIR],
      { throttleMs: 0 }
    );

    const reg = db.queries.find(q => q.sql.includes("FROM raw_items"));
    expect(reg).toBeTruthy();

    // added
    await reg!.instance.emit({
      added: [{
        id: "a1",
        user_id: "u1",
        bucket_id: null,
        alg: "test/raw",
        aad: null,
        nonce_b64: "N",
        cipher_b64: Buffer.from(JSON.stringify({ text: "A", completed: false }), "utf8").toString("base64"),
        kdf_salt_b64: "",
        updated_at: "2025-01-01T00:00:00.000Z"
      }]
    });

    const ins = db.lastTx!.calls.find(c => (c.sql as string).includes(`INSERT INTO ${PAIR.mirrorTable}`));
    expect(ins).toBeTruthy();
    // order: id,user_id,bucket_id,updated_at,text,completed
    expect(ins!.params![0]).toBe("a1");
    expect(ins!.params![4]).toBe("A");
    expect(ins!.params![5]).toBe(0);

    // updated
    db.lastTx = null;
    await reg!.instance.emit({
      updated: [{
        id: "a1",
        user_id: "u1",
        bucket_id: null,
        alg: "test/raw",
        aad: null,
        nonce_b64: "N",
        cipher_b64: Buffer.from(JSON.stringify({ text: "A+", completed: true }), "utf8").toString("base64"),
        kdf_salt_b64: "",
        updated_at: "2025-01-01T01:00:00.000Z"
      }]
    });
    const upd = db.lastTx!.calls.find(c => (c.sql as string).includes(`ON CONFLICT(id) DO UPDATE`));
    expect(upd).toBeTruthy();
    expect(upd!.params![4]).toBe("A+");
    expect(upd!.params![5]).toBe(1);

    // removed
    db.lastTx = null;
    await reg!.instance.emit({ removed: [{ id: "a1" }] });
    const del = db.lastTx!.calls.find(c => (c.sql as string).startsWith(`DELETE FROM ${PAIR.mirrorTable}`));
    expect(del).toBeTruthy();

    stop();
  });
});