import React from "react";
import { useQuery } from "@powersync/react";

type KeyRow = { id: string; provider: string; created_at: string };

export function ListPicker({
  userId,
  activeKeyId,
  onChange,
  onCreate,
}: {
  userId: string | null;
  activeKeyId: string | null;
  onChange: (keyId: string) => void;
  onCreate: () => void;
}) {
  const { data } = useQuery<KeyRow>(
    "SELECT id, provider, created_at FROM e2ee_keys WHERE user_id = ? ORDER BY created_at DESC",
    [userId ?? ""],
  );
  const keys = (data as any[]) || [];

  return (
    <div className="inline-flex items-center gap-2">
      <select
        className="input-sm"
        value={activeKeyId ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select list…
        </option>
        {keys.map((k) => (
          <option key={k.id} value={k.id}>
            {labelFromId(k.id)} ({k.provider})
          </option>
        ))}
      </select>
      <button className="btn-secondary-sm" onClick={onCreate}>
        New List…
      </button>
    </div>
  );
}

function labelFromId(id: string): string {
  const parts = id.split(":");
  return parts[2] || id;
}

export default ListPicker;
