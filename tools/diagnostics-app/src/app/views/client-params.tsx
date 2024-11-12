import { NavigationPage } from '@/components/navigation/NavigationPage';
import { getParams, setParams as setParamsGlobal } from '@/library/powersync/ConnectionManager';
import {
  Box,
  Button,
  Grid,
  IconButton,
  styled,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import { FormEvent, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

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
      <S.MainContainer>
        <form onSubmit={onSubmit}>
          {params.map(({ key, value, type, error }, idx: number) => (
            <S.CenteredGrid container key={idx}>
              <S.CenteredGrid item xs={12} md={10}>
                <TextField
                  label="Key"
                  value={key}
                  sx={{ margin: '10px' }}
                  onChange={(v: { target: { value: string } }) => changeKey(idx, v.target.value, value, type)}
                />
                {/* TODO: Potentially add an explanation here about how users should write values for a given piece of text? */}
                <TextField
                  label="Value"
                  value={value}
                  sx={{ margin: '10px' }}
                  error={!!error}
                  title={error}
                  onChange={(v: { target: { value: string } }) => changeValue(idx, v.target.value, key, type)}
                />
                <FormControl sx={{ margin: '10px', width: '125px', minWidth: '95px' }}>
                  <InputLabel id="demo-simple-select-label">Type</InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    value={type}
                    label="Type"
                    onChange={(v: { target: { value: string } }) =>
                      changeType(idx, key, value, v.target.value as ParameterType)
                    }>
                    <MenuItem value={'string'}>String</MenuItem>
                    <MenuItem value={'number'}>Number</MenuItem>
                    <MenuItem value={'array'}>Array</MenuItem>
                    <MenuItem value={'object'}>Object</MenuItem>
                    <MenuItem value={'boolean'}>Boolean</MenuItem>
                  </Select>
                </FormControl>
                <IconButton sx={{ margin: '10px' }} color="error" onClick={() => removeIdx(idx)}>
                  <DeleteIcon />
                </IconButton>
              </S.CenteredGrid>
            </S.CenteredGrid>
          ))}
          <S.CenteredGrid container>
            <IconButton sx={{ margin: '10px' }} onClick={addRow}>
              <AddIcon />
            </IconButton>
          </S.CenteredGrid>
          <Button type="submit" sx={{ margin: '10px' }} variant="contained">
            Save
          </Button>
        </form>
      </S.MainContainer>
    </NavigationPage>
  );
}

namespace S {
  export const MainContainer = styled(Box)`
    padding: 20px;
  `;

  export const CenteredGrid = styled(Grid)`
    display: flex;
    justify-content: center;
    align-items: center;
  `;
}

export default ClientParamsPage;
