import { NavigationPage } from '@/components/navigation/NavigationPage';
import { getParams, setParams as setParamsGlobal } from '@/library/powersync/ConnectionManager';
import { FormEvent, useState } from 'react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

const typeForValue = (value: unknown) => {
  //when using typeof arrays are "object" so we have to have this specific case
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const jsonToObjectArray = (json: Object): ParameterEntry[] => {
  const entrySet = Object.entries(json);
  return entrySet.map(([key, value]) => {
    const type = typeForValue(value) as ParameterType;
    return {
      key,
      // Only arrays and objects need special cases here since JS will take care of the rest.
      value: type === 'array' || type === 'object' ? JSON.stringify(value) : String(value),
      type
    };
  });
};

type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface ParameterEntry {
  key: string;
  type: ParameterType;
  value: string;
  error?: string;
}

// A simple set of mappers for converting a string to the correct value for saving
const CONVERTERS = {
  string: (v: string) => v,
  number: (v: string) => Number(v),
  boolean: (v: string) => v === 'true',
  array: (v: string) => JSON.parse(v),
  object: (v: string) => JSON.parse(v)
};

function ClientParamsPage() {
  const [params, setParams] = useState<ParameterEntry[]>(() => jsonToObjectArray(getParams()));

  const convertValueForSave = (t: ParameterType, stringValue: string) => CONVERTERS[t](stringValue);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      console.log('Saving params:', params);
      const newParams = params.reduce<Record<string, any>>(
        (curr: any, item: { key: string; type: string; value: string }) => ({
          ...curr,
          [`${item.key}`]: convertValueForSave(item.type as ParameterType, item.value)
        }),
        {}
      );
      console.log('Converted to:', newParams);
      setParamsGlobal(newParams);
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const validate = (val: ParameterEntry) => {
    if (val.type == 'object' || val.type == 'array') {
      try {
        JSON.parse(val.value);
        return val;
      } catch (e: any) {
        return {
          ...val,
          error: e.message
        };
      }
    } else {
      return val;
    }
  };

  const replace = (idx: number, val: ParameterEntry) => {
    setParams((a: any[]) => a.map((entity, i) => (i === idx ? validate(val) : entity)));
  };

  const removeIdx = (idx: number) => {
    const newParams = params.filter((_, i) => i !== idx);
    setParams(newParams);

    // Auto-save after deletion
    const paramsToSave = newParams.reduce<Record<string, any>>(
      (curr, item) => ({
        ...curr,
        [item.key]: convertValueForSave(item.type, item.value)
      }),
      {}
    );
    setParamsGlobal(paramsToSave);
  };

  const addRow = () => {
    setParams((a: any[]) => [...a, { key: '', value: '', type: 'string' }]);
  };

  const changeValue = (idx: number, value: string, currKey: string, type: ParameterType) => {
    replace(idx, { key: currKey, value, type });
  };

  const changeKey = (idx: number, key: string, currValue: string, type: ParameterType) => {
    replace(idx, { key, value: currValue, type });
  };

  const changeType = (idx: number, key: string, value: string, newType: ParameterType) => {
    replace(idx, { key, value, type: newType });
  };

  return (
    <NavigationPage title="Client Parameters">
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Parameters</CardTitle>
            <CardDescription>
              Configure key-value parameters that will be sent with sync requests.
            </CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              {params.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No parameters configured. Click the button below to add one.
                </div>
              ) : (
                <div className="space-y-3">
                  {params.map(({ key, value, type, error }, idx: number) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_1fr_120px_40px] gap-3 items-end p-3 rounded-lg bg-muted/50">
                      <div>
                        <Label htmlFor={`key-${idx}`} className="text-xs text-muted-foreground">
                          Key
                        </Label>
                        <Input
                          id={`key-${idx}`}
                          value={key}
                          onChange={(e) => changeKey(idx, e.target.value, value, type)}
                          placeholder="parameter_name"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`value-${idx}`} className="text-xs text-muted-foreground">
                          Value
                        </Label>
                        <Input
                          id={`value-${idx}`}
                          value={value}
                          onChange={(e) => changeValue(idx, e.target.value, key, type)}
                          placeholder="value"
                          className={`mt-1.5 ${error ? 'border-destructive' : ''}`}
                          title={error}
                        />
                        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`type-${idx}`} className="text-xs text-muted-foreground">
                          Type
                        </Label>
                        <Select
                          value={type}
                          onValueChange={(newType) => changeType(idx, key, value, newType as ParameterType)}>
                          <SelectTrigger id={`type-${idx}`} className="mt-1.5">
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
                        onClick={() => removeIdx(idx)}
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
            <CardFooter className="border-t pt-6">
              <Button type="submit">Save Parameters</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </NavigationPage>
  );
}

export default ClientParamsPage;
