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
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const jsonToObjectArray = (json: Object) => {
  const entrySet = Object.entries(json);
  return entrySet.map(([key, value]) => {
    const type = typeForValue(value);
    return {
      key,
      value: type === 'array' || type === 'object' ? JSON.stringify(value) : value,
      type
    };
  });
};

const CONVERTERS = {
  string: (v) => v,
  number: (v) => Number(v),
  boolean: (v) => v === 'true',
  array: (v) => JSON.parse(v),
  object: (v) => JSON.parse(v)
};

function ClientParamsPage() {
  const [params, setParams] = useState(jsonToObjectArray(getParams()));

  const convertValueForSave = (t, stringValue: string) => CONVERTERS[t](stringValue);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const newParams = params.reduce(
      (curr, item) => ({ ...curr, [`${item.key}`]: convertValueForSave(item.type, item.value) }),
      {}
    );
    setParamsGlobal(newParams);
  };

  const replace = (idx: number, val: any) => setParams((a) => a.map((entity, i) => (i === idx ? val : entity)));

  const removeIdx = (idx: number) =>
    setParams((a) => a.map((entity, i) => i !== idx && entity).filter((entity) => entity !== false));

  const addRow = () => {
    setParams((a) => [...a, { key: '', value: '' }]);
  };

  const changeValue = (idx: number, value: string, currKey: string, type: string) => {
    replace(idx, { key: currKey, value, type });
  };

  const changeKey = (idx: number, key: string, currValue: unknown, type: string) => {
    replace(idx, { key, value: currValue, type });
  };

  const changeType = (idx: number, key: string, value: unknown, newType: string) => {
    replace(idx, { key, value, type: newType });
  };

  return (
    <NavigationPage title="Client Parameters">
      <S.MainContainer>
        <form onSubmit={onSubmit}>
          {params.map(({ key, value, type }: { key: string; value: string; type: string }, idx: number) => (
            <S.CenteredGrid container>
              <S.CenteredGrid item xs={12} md={10}>
                <TextField
                  label="Key"
                  value={key}
                  sx={{ margin: '10px' }}
                  onChange={(v: { target: { value: string } }) => changeKey(idx, v.target.value, value, type)}
                />
                <TextField
                  label="Value"
                  value={value}
                  sx={{ margin: '10px' }}
                  onChange={(v: { target: { value: string } }) => changeValue(idx, v.target.value, key, type)}
                />
                <FormControl sx={{ margin: '10px', width: '125px', minWidth: '95px' }}>
                  <InputLabel id="demo-simple-select-label">Type</InputLabel>
                  <Select
                    labelId="demo-simple-select-label"
                    value={type}
                    label="Type"
                    onChange={(v: { target: { value: string } }) => changeType(idx, key, value, v.target.value)}>
                    <MenuItem value={'string'}>String</MenuItem>
                    <MenuItem value={'number'}>Number</MenuItem>
                    <MenuItem value={'array'}>Array</MenuItem>
                    <MenuItem value={'object'}>Object</MenuItem>
                    <MenuItem value={'boolean'}>boolean</MenuItem>
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
            Submit
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
