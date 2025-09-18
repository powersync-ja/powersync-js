import { AbstractPowerSyncDatabase } from "@powersync/web";

type ExecCall = { sql: string; params?: any[] };

export class FakeTx {
  calls: ExecCall[] = [];
  async execute(sql: string, params?: any[]) { this.calls.push({ sql, params }); }
}

export class FakeQuerySub {
  constructor(public onClose?: () => void) {}
  close() { this.onClose?.(); }
  registerListener(opts: { onDiff: (diff: { added?: any[]; updated?: any[]; removed?: any[] }) => Promise<void> }) {

    return { close: () => this.close() };
  }
}

export class FakeQuery {
  private handler: any = null;
  differentialWatch(opts: any) {
    this.handler = opts;
    return new FakeQuerySub();
  }
  /** test helper */
  async emit(diff: { added?: any[]; updated?: any[]; removed?: any[] }) {
    if (this.handler?.onDiff) await this.handler.onDiff(diff);
  }
}

export class FakeDB {
  execCalls: ExecCall[] = [];
  lastTx: FakeTx | null = null;
  queries: Array<{ sql: string; parameters?: any[]; instance: FakeQuery }> = [];

  async execute(sql: string, params?: any[]) {
    this.execCalls.push({ sql, params });
  }

  query(args: { sql: string; parameters?: any[] }): {
    differentialWatch: (opts: any) => FakeQuerySub;
  } {
    const q = new FakeQuery();
    this.queries.push({ ...args, instance: q });
    return q;
  }

  async writeTransaction(fn: (tx: FakeTx) => Promise<void>) {
    const tx = new FakeTx();
    this.lastTx = tx;
    await fn(tx);
    return;
  }
}

/** Mock crypto engine: encrypt = base64(plain), decrypt = base64->bytes */
export const MockCrypto = {
  async encrypt(plain: Uint8Array, aad?: string) {
    const str = new TextDecoder().decode(plain);
    const b64 = Buffer.from(str, "utf8").toString("base64");
    return {
      header: { v: 1 as const, alg: "test/raw", aad, kdf: { saltB64: "" } },
      nB64: "N",
      cB64: b64
    };
  },
  async decrypt(env: { cB64: string }) {
    const buf = Buffer.from(env.cB64, "base64");
    return new Uint8Array(buf);
  }
};