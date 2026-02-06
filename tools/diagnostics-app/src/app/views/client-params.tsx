import { NavigationPage } from '@/components/navigation/NavigationPage';
import { connect, CONVERTERS, ParameterType } from '@/library/powersync/ConnectionManager';
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
import { Trash2, Plus, Check, Info, Save } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StoredParam {
  id: string;
  key: string;
  value: string;
}

interface LocalEdit {
  key: string;
  type: ParameterType;
  value: string;
}

const validateType = (type: ParameterType, value: string): string | undefined => {
  if (!value) return undefined;
  try {
    const converted = CONVERTERS[type](value);
    if (type === 'number' && isNaN(converted as number)) return 'Invalid number';
    if (type === 'boolean' && value !== 'true' && value !== 'false') return 'Must be "true" or "false"';
    return undefined;
  } catch (e: any) {
    return e.message;
  }
};

const validate = (key: string, type: ParameterType, value: string) => {
  const keyError = key !== key.trim() ? 'No leading/trailing spaces allowed' : undefined;
  const valueError = (value !== value.trim() ? 'No leading/trailing spaces allowed' : undefined) || validateType(type, value);
  return { keyError, valueError };
};

const parseStored = (raw: string): { type: ParameterType; value: string } => {
  try {
    const parsed = JSON.parse(raw);
    return { type: parsed.type as ParameterType, value: parsed.value };
  } catch {
    return { type: 'string', value: raw };
  }
};

function ClientParamsContent() {
  const localDb = usePowerSync()!;
  const [localEdits, setLocalEdits] = useState<Record<string, LocalEdit>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const savedTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const connectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: storedParams } = useQuery<StoredParam & { created_at?: string | null }>(
    `SELECT id, key, value, created_at FROM client_parameters ORDER BY created_at ASC`
  );

  useEffect(() => {
    return () => {
      Object.values(savedTimeouts.current).forEach(clearTimeout);
      if (connectTimeout.current) clearTimeout(connectTimeout.current);
    };
  }, []);

  const debouncedConnect = () => {
    if (connectTimeout.current) clearTimeout(connectTimeout.current);
    connectTimeout.current = setTimeout(async () => {
      try {
        await connect();
      } catch (err) {
        console.error('Failed to connect after parameter change', err);
      }
    }, 500);
  };

  const getRowState = (p: StoredParam) => {
    const stored = parseStored(p.value);
    const edit = localEdits[p.id];
    const key = edit?.key ?? p.key;
    const type = edit?.type ?? stored.type;
    const value = edit?.value ?? stored.value;
    const dirty = edit ? (key !== p.key || type !== stored.type || value !== stored.value) : false;
    return { key, type, value, dirty };
  };

  const showSaved = (id: string) => {
    setSavedIds((prev) => new Set(prev).add(id));
    if (savedTimeouts.current[id]) clearTimeout(savedTimeouts.current[id]);
    savedTimeouts.current[id] = setTimeout(() => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2000);
  };

  const saveParam = async (id: string) => {
    const edit = localEdits[id];
    if (!edit) return;
    const { keyError, valueError } = validate(edit.key, edit.type, edit.value);
    if (keyError || valueError) return;

    try {
      const paramData = JSON.stringify({ type: edit.type, value: edit.value });
      await localDb.execute(`UPDATE client_parameters SET key = ?, value = ? WHERE id = ?`, [edit.key, paramData, id]);
      debouncedConnect();
      showSaved(id);
    } catch (err) {
      console.error('Failed to save parameter', err);
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
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      debouncedConnect();
    } catch (err) {
      console.error('Failed to remove parameter', err);
    }
  };

  return (
    <NavigationPage title="Client Parameters">
      <div className="min-w-0 max-w-full overflow-x-hidden p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Parameters</CardTitle>
            <CardDescription>Configure key-value parameters that will be sent with sync requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(storedParams ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No parameters configured. Click the button below to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {(storedParams ?? []).map((p) => {
                  const { key, type, value, dirty } = getRowState(p);
                  const { keyError, valueError } = dirty ? validate(key, type, value) : {};
                  const hasErrors = !!keyError || !!valueError;
                  const saved = savedIds.has(p.id);

                  return (
                    <div key={p.id} className="grid grid-cols-[1fr_1fr_120px_auto] gap-3 items-end p-3 rounded-lg bg-muted/50">
                      <div>
                        <Label htmlFor={`key-${p.id}`} className="text-xs text-muted-foreground">
                          Key
                        </Label>
                        <Input
                          id={`key-${p.id}`}
                          value={key}
                          onChange={(e) => setLocalEdits((prev) => ({ ...prev, [p.id]: { key: e.target.value, type, value } }))}
                          placeholder="parameter_name"
                          className={`mt-1.5 ${keyError ? 'border-destructive' : ''}`}
                          title={keyError}
                        />
                        {keyError && <p className="text-xs text-destructive mt-1">{keyError}</p>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <Label htmlFor={`value-${p.id}`} className="text-xs text-muted-foreground">
                            Value
                          </Label>
                          {(type === 'array' || type === 'object') && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Use valid JSON with double quotes</p>
                                  <p className="text-muted-foreground">
                                    {type === 'array' ? 'e.g. ["a", "b"]' : 'e.g. {"key": "value"}'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <Input
                          id={`value-${p.id}`}
                          value={value}
                          onChange={(e) => setLocalEdits((prev) => ({ ...prev, [p.id]: { key, type, value: e.target.value } }))}
                          placeholder="value"
                          className={`mt-1.5 ${valueError ? 'border-destructive' : ''}`}
                          title={valueError}
                        />
                        {valueError && <p className="text-xs text-destructive mt-1">{valueError}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`type-${p.id}`} className="text-xs text-muted-foreground">
                          Type
                        </Label>
                        <Select value={type} onValueChange={(newType) => setLocalEdits((prev) => ({ ...prev, [p.id]: { key, type: newType as ParameterType, value } }))}>
                          <SelectTrigger id={`type-${p.id}`} className="mt-1.5">
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
                      <div className="flex items-center gap-1">
                        <span className="h-9 w-9 inline-flex items-center justify-center">
                          {dirty ? (
                            <button
                              type="button"
                              onClick={() => saveParam(p.id)}
                              disabled={hasErrors}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
                              title={hasErrors ? 'Fix errors before saving' : 'Save parameter'}>
                              <Save className="h-4 w-4" />
                            </button>
                          ) : saved ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeParam(p.id)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-accent">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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

export default function ClientParamsPage() {
  return (
    <PowerSyncContext.Provider value={localStateDb}>
      <ClientParamsContent />
    </PowerSyncContext.Provider>
  );
}
