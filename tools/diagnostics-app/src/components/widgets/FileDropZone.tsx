import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Upload, FileSearch, ExternalLink } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo & title */}
        <div className="flex flex-col items-center gap-3 mb-2">
          <FileSearch className="h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">SQLite File Inspector</h1>
          <p className="text-muted-foreground text-center max-w-md">
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
            'flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed cursor-pointer transition-colors',
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

        {/* Documentation links */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium">How to extract SQLite files from your app</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Android:</span>{' '}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">adb pull</code> from device storage
            </div>
            <div>
              <span className="font-medium text-foreground">iOS:</span> Xcode Devices &amp; Simulators → Download
              Container
            </div>
            <div>
              <span className="font-medium text-foreground">Web (OPFS):</span> OPFS Explorer browser extension
            </div>
            <div>
              <span className="font-medium text-foreground">React Native:</span> Device file browser or expo-file-system
            </div>
          </div>
          <Button variant="link" className="p-0 h-auto text-sm" asChild>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
              View full documentation
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
