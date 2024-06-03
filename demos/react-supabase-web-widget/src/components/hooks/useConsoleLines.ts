import { useState, useCallback } from 'react';

export interface ConsoleLineProps {
  numLine?: number;
  initialLogs?: string[];
}
export function useConsoleLines(props: ConsoleLineProps = {}) {
  const { initialLogs, numLine = 3 } = props;
  const [logs, setLogs] = useState<string[]>(initialLogs ?? []);

  const addLog = useCallback(
    (log: string, clear = false) => {
      if (clear) {
        setLogs([log]);
        return;
      }
      setLogs((prevLogs) => [...prevLogs, log].slice(-numLine));
    },
    [numLine]
  );
  return { logs, addLog };
}
