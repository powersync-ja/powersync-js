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
  const [params, setParams] = useState(jsonToObjectArray(getParams()));

  const convertValueForSave = (t: ParameterType, stringValue: string) => CONVERTERS[t](stringValue);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const newParams = params.reduce<Record<string, any>>(
        (curr: any, item: { key: string; type: string; value: string }) => ({
          ...curr,
          [`${item.key}`]: convertValueForSave(item.type as ParameterType, item.value)
        }),
        {}
      );
      setParamsGlobal(newParams);
    } catch (e) {}
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

  const removeIdx = (idx: number) =>
    setParams((a: any[]) => a.map((entity, i) => i !== idx && entity).filter((entity) => entity !== false));

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
      <div className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          {params.map(({ key, value, type, error }, idx: number) => (
            <div key={idx} className="flex flex-wrap items-center gap-2.5 justify-center">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label htmlFor={`key-${idx}`}>Key</Label>
                <Input
                  id={`key-${idx}`}
                  value={key}
                  onChange={(e) => changeKey(idx, e.target.value, value, type)}
                />
              </div>
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label htmlFor={`value-${idx}`}>Value</Label>
                <Input
                  id={`value-${idx}`}
                  value={value}
                  onChange={(e) => changeValue(idx, e.target.value, key, type)}
                  className={error ? 'border-destructive' : ''}
                  title={error}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="w-[125px] min-w-[95px] space-y-1.5">
                <Label htmlFor={`type-${idx}`}>Type</Label>
                <Select
                  value={type}
                  onValueChange={(newType) => changeType(idx, key, value, newType as ParameterType)}>
                  <SelectTrigger id={`type-${idx}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeIdx(idx)}
                className="mt-6">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-center">
            <Button type="button" variant="outline" size="icon" onClick={addRow}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button type="submit" className="m-2.5">
            Save
          </Button>
        </form>
      </div>
    </NavigationPage>
  );
}

export default ClientParamsPage;
