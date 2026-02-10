import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { InspectorDatabase, InspectorFileInfo, openInspectorDatabase } from './InspectorDatabaseManager';

interface InspectorContextValue {
  database: InspectorDatabase | null;
  fileInfo: InspectorFileInfo | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  openFile: (file: File) => Promise<void>;
  closeFile: () => Promise<void>;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [database, setDatabase] = useState<InspectorDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<InspectorDatabase | null>(null);

  const closeFile = useCallback(async () => {
    if (dbRef.current) {
      await dbRef.current.close();
      dbRef.current = null;
    }
    setDatabase(null);
    setError(null);
  }, []);

  const openFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        // Close existing database if open
        if (dbRef.current) {
          await dbRef.current.close();
          dbRef.current = null;
          setDatabase(null);
        }

        const db = await openInspectorDatabase(file);
        dbRef.current = db;
        setDatabase(db);
      } catch (err: any) {
        const message = err?.message || 'Failed to open database file';
        setError(message);
        console.error('Failed to open inspector database:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      dbRef.current?.close();
    };
  }, []);

  const value: InspectorContextValue = {
    database,
    fileInfo: database?.fileInfo ?? null,
    isLoaded: database !== null,
    isLoading,
    error,
    openFile,
    closeFile
  };

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector() {
  const context = useContext(InspectorContext);
  if (!context) {
    throw new Error('useInspector must be used within an InspectorProvider');
  }
  return context;
}

export function useInspectorDatabase() {
  const { database } = useInspector();
  if (!database) {
    throw new Error('No database loaded. Upload a SQLite file first.');
  }
  return database;
}
