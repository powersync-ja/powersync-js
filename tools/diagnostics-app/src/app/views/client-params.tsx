import { NavigationPage } from '@/components/navigation/NavigationPage';
import { connect, ParameterType } from '@/library/powersync/ConnectionManager';
import { localStateDb } from '@/library/powersync/LocalStateManager';
import { useEffect, useRef, useState } from 'react';
import { PowerSyncContext, usePowerSync, useQuery } from '@powersync/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Check } from 'lucide-react';

interface ParameterEntry {
  id: string;
  key: string;
  type: ParameterType;
  value: string;
  keyError?: string;
  valueError?: string;
}

interface StoredParam {
  id: string;
  key: string;
  value: string;
}

const validateType = (type: ParameterType, value: string): string | undefined => {
  if (type === 'object' || type === 'array') {
    try {
      if (value) JSON.parse(value);
      return undefined;
    } catch (e: any) {
      return e.message;
    }
  }
  return undefined;
};

const hasLeadingOrTrailingWhitespace = (value: string): boolean => {
  return value !== value.trim();
};

/**
 * Inner component that uses the local state database via PowerSyncContext.
 * useQuery and usePowerSync will read from localStateDb provided by the wrapper.
 */
function ClientParamsContent() {
  // Non-null assertion safe here - component is always wrapped in PowerSyncContext.Provider
  const localDb = usePowerSync()!;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [keyErrors, setKeyErrors] = useState<Record<string, string>>({});
  const [valueErrors, setValueErrors] = useState<Record<string, string>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ORDER BY created_at so new params appear at bottom
  const { data: storedParams } = useQuery<StoredParam & { created_at?: string | null }>(
    `SELECT id, key, value, created_at FROM client_parameters ORDER BY created_at ASC`
  );

  const params: ParameterEntry[] = (storedParams ?? []).map((p) => {
    try {
      const parsed = JSON.parse(p.value);
      return {
        id: p.id,
        key: p.key,
        type: parsed.type as ParameterType,
        value: parsed.value,
        keyError: keyErrors[p.id],
        valueError: valueErrors[p.id]
      };
    } catch {
      return {
        id: p.id,
        key: p.key,
        type: 'string' as ParameterType,
        value: p.value,
        keyError: keyErrors[p.id],
        valueError: valueErrors[p.id]
      };
    }
  });

  const hasErrors = Object.keys(keyErrors).length > 0 || Object.keys(valueErrors).length > 0;

  const triggerSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

    if (hasErrors) return;

    setSaveStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await connect();
        setSaveStatus('saved');
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (err) {
        setSaveStatus('idle');
        console.error('Failed to connect after saving parameters', err);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const updateParam = async (id: string, key: string, type: ParameterType, value: string) => {
    // Validate key for whitespace
    const keyHasWhitespace = hasLeadingOrTrailingWhitespace(key);
    if (keyHasWhitespace) {
      setKeyErrors((prev) => ({ ...prev, [id]: 'No leading/trailing spaces allowed' }));
    } else {
      setKeyErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    // Validate value for whitespace and type
    const valueHasWhitespace = hasLeadingOrTrailingWhitespace(value);
    const typeError = validateType(type, value);
    const valueError = valueHasWhitespace ? 'No leading/trailing spaces allowed' : typeError;
    if (valueError) {
      setValueErrors((prev) => ({ ...prev, [id]: valueError }));
    } else {
      setValueErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }

    const hasValidationErrors = keyHasWhitespace || !!valueError;

    try {
      const paramData = JSON.stringify({ type, value });
      await localDb.execute(`UPDATE client_parameters SET key = ?, value = ? WHERE id = ?`, [key, paramData, id]);
      if (!hasValidationErrors) triggerSave();
    } catch (err) {
      console.error('Failed to update parameter', err);
      setValueErrors((prev) => ({ ...prev, [id]: 'Failed to save' }));
    }
  };

  const addRow = async () => {
    try {
      const paramData = JSON.stringify({ type: 'string', value: '' });
      await localDb.execute(
        `INSERT INTO client_parameters (id, key, value, created_at) VALUES (uuid(), '', ?, datetime('now'))`,
        [paramData]
      );
    } catch (err) {
      console.error('Failed to add parameter', err);
    }
  };

  const removeParam = async (id: string) => {
    try {
      await localDb.execute(`DELETE FROM client_parameters WHERE id = ?`, [id]);
      setKeyErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setValueErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      triggerSave();
    } catch (err) {
      console.error('Failed to remove parameter', err);
    }
  };

  return (
    <NavigationPage title="Client Parameters">
      <div className="min-w-0 max-w-full overflow-x-hidden p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Parameters</CardTitle>
                <CardDescription>Configure key-value parameters that will be sent with sync requests.</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {saveStatus === 'saving' && <span>Saving...</span>}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
                {hasErrors && <span className="text-destructive">Fix errors to save</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {params.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No parameters configured. Click the button below to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {params.map(({ id, key, value, type, keyError, valueError }) => (
                  <div key={id} className="grid grid-cols-[1fr_1fr_120px_40px] gap-3 items-end p-3 rounded-lg bg-muted/50">
                    <div>
                      <Label htmlFor={`key-${id}`} className="text-xs text-muted-foreground">
                        Key
                      </Label>
                      <Input
                        id={`key-${id}`}
                        value={key}
                        onChange={(e) => updateParam(id, e.target.value, type, value)}
                        placeholder="parameter_name"
                        className={`mt-1.5 ${keyError ? 'border-destructive' : ''}`}
                        title={keyError}
                      />
                      {keyError && <p className="text-xs text-destructive mt-1">{keyError}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`value-${id}`} className="text-xs text-muted-foreground">
                        Value
                      </Label>
                      <Input
                        id={`value-${id}`}
                        value={value}
                        onChange={(e) => updateParam(id, key, type, e.target.value)}
                        placeholder="value"
                        className={`mt-1.5 ${valueError ? 'border-destructive' : ''}`}
                        title={valueError}
                      />
                      {valueError && <p className="text-xs text-destructive mt-1">{valueError}</p>}
                    </div>
                    <div>
                      <Label htmlFor={`type-${id}`} className="text-xs text-muted-foreground">
                        Type
                      </Label>
                      <Select value={type} onValueChange={(newType) => updateParam(id, key, newType as ParameterType, value)}>
                        <SelectTrigger id={`type-${id}`} className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParam(id)}
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-accent">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" onClick={addRow} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Parameter
            </Button>
          </CardContent>
        </Card>
      </div>
    </NavigationPage>
  );
}

/**
 * Wrapper that provides localStateDb context for the entire page.
 * This allows useQuery and usePowerSync inside to use the local state database.
 */
export default function ClientParamsPage() {
  return (
    <PowerSyncContext.Provider value={localStateDb}>
      <ClientParamsContent />
    </PowerSyncContext.Provider>
  );
}
