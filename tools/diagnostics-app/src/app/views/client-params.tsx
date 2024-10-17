import { NavigationPage } from '@/components/navigation/NavigationPage';
import { setParams as setParamsGlobal } from '@/library/powersync/ConnectionManager';
import { Box, Button, Grid, IconButton, styled, TextField } from '@mui/material';
import { FormEvent, useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { safeParse } from '@/library/safeParse/safeParse';

const jsonToObjectArray = (json: Object) => {
  const entrySet = Object.entries(json);
  return entrySet.map(([key, value]) => ({
    key,
    value
  }));
};

function ClientParamsPage() {
  const [params, setParams] = useState(jsonToObjectArray(safeParse(localStorage.getItem('currentParams'))));

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const newParams = params.reduce((curr, item) => ({ ...curr, [`${item.key}`]: item.value }), {});
    setParamsGlobal(newParams);
  };

  const replace = (idx: number, val: any) => setParams((a) => a.map((entity, i) => (i === idx ? val : entity)));

  const removeIdx = (idx: number) =>
    setParams((a) => a.map((entity, i) => i !== idx && entity).filter((entity) => entity !== false));

  const addRow = () => {
    setParams((a) => [...a, { key: '', value: '' }]);
  };

  const changeValue = (idx: number, value: string, currKey: string) => {
    replace(idx, { key: currKey, value });
  };

  const changeKey = (idx: number, key: string, currValue: unknown) => {
    replace(idx, { key, value: currValue });
  };

  return (
    <NavigationPage title="Client Parameters">
      <S.MainContainer>
        <form onSubmit={onSubmit}>
          {params.map(({ key, value }, idx) => (
            <S.CenteredGrid container>
              <S.CenteredGrid item xs={12} md={10}>
                <TextField
                  label="Key"
                  value={key}
                  sx={{ margin: '10px' }}
                  onChange={(v) => changeKey(idx, v.target.value, value)}
                />
                <TextField
                  label="Value"
                  value={value}
                  sx={{ margin: '10px' }}
                  onChange={(v) => changeValue(idx, v.target.value, key)}
                />

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
