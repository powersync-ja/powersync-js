import { describe, it, expect } from "vitest";
import { insertEncrypted, updateEncrypted, deleteEncrypted } from "../mutations.js";
import { FakeDB, MockCrypto } from "./fakes";

const PAIR = {
  name: "todos",
  encryptedTable: "raw_items",
  mirrorTable: "raw_items_plain",
  mirrorColumns: [
    { name: "text", type: "TEXT" },
    { name: "completed", type: "INTEGER" }
  ],
  parsePlain: () => ({}),
  // Serialize domain object -> bytes (JSON as example)
  serializePlain: (obj: any) => {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    return { plaintext: bytes, aad: "todo-v1" };
  }
};

describe("mutations", () => {
  it("insert/update/delete write opaque envelopes to encrypted table", async () => {
    const db = new FakeDB();
    const runtime = { db, userId: "u1", crypto: MockCrypto as any };

    await insertEncrypted(runtime as any, PAIR, {
      id: "a1",
      bucketId: null,
      object: { text: "X", completed: false }
    });

    let call = db.execCalls.find(c => (c.sql as string).startsWith("INSERT INTO raw_items"));
    expect(call).toBeTruthy();
    expect(call!.params![0]).toBe("a1");
    expect(call!.params![1]).toBe("u1");
    expect(call!.params![3]).toBe("test/raw"); // alg
    expect(typeof call!.params![6]).toBe("string"); // cipher_b64

    await updateEncrypted(runtime as any, PAIR, {
      id: "a1",
      bucketId: null,
      object: { text: "Y", completed: true }
    });
    call = db.execCalls.find(c => (c.sql as string).startsWith("UPDATE raw_items"));
    expect(call).toBeTruthy();
    expect(call!.params![0]).toBe("test/raw");

    await deleteEncrypted(runtime as any, PAIR, { id: "a1" });
    call = db.execCalls.find(c => (c.sql as string).startsWith("DELETE FROM raw_items"));
    expect(call).toBeTruthy();
    expect(call!.params![0]).toBe("a1");
    expect(call!.params![1]).toBe("u1");
  });
});