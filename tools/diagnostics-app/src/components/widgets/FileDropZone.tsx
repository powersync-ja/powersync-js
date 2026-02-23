import React, { useCallback, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Upload, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isValidSQLiteFile } from '@/library/inspector/InspectorDatabaseManager';

const ACCEPTED_EXTENSIONS = ['.sqlite', '.db', '.sqlite3'];
const DOCS_URL =
  'https://docs.powersync.com/maintenance-ops/client-database-diagnostics#get-the-sqlite-file';

interface FileDropZoneProps {
  onFileSelected: (file: File) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function FileDropZone({ onFileSelected, isLoading, error }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndOpen = useCallback(
    async (file: File) => {
      setValidationError(null);

      // Check file extension
      const name = file.name.toLowerCase();
      const hasValidExtension = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
      if (!hasValidExtension) {
        setValidationError(`Unsupported file type. Expected ${ACCEPTED_EXTENSIONS.join(', ')} file.`);
        return;
      }

      // Check SQLite header magic bytes
      const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (!isValidSQLiteFile(headerBytes)) {
        setValidationError('This file does not appear to be a valid SQLite database.');
        return;
      }

      await onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        await validateAndOpen(file);
      }
    },
    [validateAndOpen]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await validateAndOpen(file);
      }
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [validateAndOpen]
  );

  const displayError = validationError || error;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-2xl space-y-5">
        {/* Logo & title */}
        <div className="flex flex-col items-center gap-2">
          <FileSearch className="h-10 w-10 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">SQLite File Inspector</h1>
          <p className="text-muted-foreground text-center max-w-md text-sm">
            Drag and drop a SQLite database file to inspect its tables, views, indexes, and run read-only queries.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50'
          )}>
          {isLoading ? (
            <>
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">Opening database...</p>
            </>
          ) : (
            <>
              <Upload className={cn('h-10 w-10', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-center">
                <p className="text-sm font-medium">Drop your SQLite file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
              <p className="text-xs text-muted-foreground">Supports .sqlite, .db, .sqlite3 files</p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlite,.db,.sqlite3"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Error */}
        {displayError && (
          <Alert variant="destructive">
            <AlertDescription>{displayError}</AlertDescription>
          </Alert>
        )}

        {/* Documentation link */}
        <p className="text-center text-sm text-muted-foreground">
          Need help extracting a SQLite file?{' '}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            View documentation
          </a>
        </p>
      </div>
    </div>
  );
}
