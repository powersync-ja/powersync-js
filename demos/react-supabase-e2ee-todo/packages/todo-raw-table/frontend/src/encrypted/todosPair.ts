import type { EncryptedPairConfig } from "@crypto/sqlite";
import { utf8 } from "@crypto/sqlite";

// We keep the remote/encrypted table name as "todos" and create a local plaintext mirror "todos_plain".
export const TODOS_PAIR: EncryptedPairConfig<{
  text: string;
  completed: boolean;
}> = {
  name: "todos",
  encryptedTable: "todos",
  mirrorTable: "todos_plain",
  mirrorColumns: [
    { name: "text", type: "TEXT", notNull: true, defaultExpr: "''" },
    { name: "completed", type: "INTEGER", notNull: true, defaultExpr: "0" },
  ],
  parsePlain: ({ plaintext }) => {
    const decoded = new TextDecoder().decode(plaintext);
    try {
      const obj = JSON.parse(decoded) as { text?: string; completed?: boolean };
      return {
        text: obj.text ?? decoded,
        completed: obj.completed ? 1 : 0,
      } as any;
    } catch {
      return { text: decoded, completed: 0 } as any;
    }
  },
  serializePlain: (todo) => ({
    plaintext: utf8(JSON.stringify(todo)),
    aad: "todo-v1",
  }),
};
