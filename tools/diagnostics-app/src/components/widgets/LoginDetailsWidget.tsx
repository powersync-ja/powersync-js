import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  FormControlLabel,
  FormGroup,
  Paper,
  Switch,
  TextField,
  Typography,
  styled
} from '@mui/material';
import { Formik, FormikErrors } from 'formik';
import { SyncClientImplementation } from '@powersync/web';
import { getTokenEndpoint } from '@/library/powersync/TokenConnector';

export type LoginDetailsFormValues = {
  token: string;
  endpoint: string;
  clientImplementation: SyncClientImplementation;
};

export type LoginAction = {
  title: string;
  onClick: (values: LoginDetailsFormValues) => any;
};

export type LoginDetailsWidgetProps = {
  onSubmit: (values: LoginDetailsFormValues) => Promise<void>;
};

export const LoginDetailsWidget: React.FC<LoginDetailsWidgetProps> = (props) => {
  return (
    <S.MainContainer>
      <S.LoginContainer elevation={1}>
        <S.LoginHeader variant="h4">Sync Diagnostics Client</S.LoginHeader>
        <S.LogoBox>
          <S.Logo alt="PowerSync Logo" width={400} height={100} src="/powersync-logo.svg" />
        </S.LogoBox>
        <Formik<LoginDetailsFormValues>
          initialValues={{ token: '', endpoint: '', clientImplementation: SyncClientImplementation.RUST }}
          validateOnChange={false}
          validateOnBlur={false}
          validate={(values) => {
            const errors: FormikErrors<LoginDetailsFormValues> = {};
            if (!values.token) {
              errors.token = 'Required';
            }

            return errors;
          }}
          onSubmit={async (values, { setSubmitting, setFieldError }) => {
            try {
              const endpoint = values.endpoint || getTokenEndpoint(values.token);
              if (endpoint == null) {
                throw new Error('endpoint is required');
              }
              await props.onSubmit({
                token: values.token,
                endpoint,
                clientImplementation: values.clientImplementation
              });
            } catch (ex: any) {
              console.error(ex);
              setSubmitting(false);
              setFieldError('endpoint', ex.message);
            }
          }}>
          {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit, setFieldValue }) => (
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <S.TextInput
                  id="token-input"
                  label="PowerSync Token"
                  name="token"
                  type="text"
                  autoComplete="disabled"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.token}
                  error={!!errors.token}
                  helperText={errors.token}
                  InputLabelProps={{ shrink: true }}
                />
                <S.TextInput
                  id="endpoint-input"
                  label="PowerSync Endpoint"
                  name="endpoint"
                  type="url"
                  autoComplete="url"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.endpoint}
                  placeholder={getTokenEndpoint(values.token) ?? ''}
                  error={!!errors.endpoint}
                  helperText={errors.endpoint}
                  InputLabelProps={{ shrink: true }}
                />
              </FormGroup>
              <S.ActionButtonGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.clientImplementation == SyncClientImplementation.RUST}
                      onChange={() =>
                        setFieldValue(
                          'clientImplementation',
                          values.clientImplementation == SyncClientImplementation.RUST
                            ? SyncClientImplementation.JAVASCRIPT
                            : SyncClientImplementation.RUST
                        )
                      }
                    />
                  }
                  label={
                    <span>
                      Rust sync client (
                      <a
                        style={{ color: 'lightblue' }}
                        target="_blank"
                        href="https://releases.powersync.com/announcements/improved-sync-performance-in-our-client-sdks">
                        what's that?
                      </a>
                      )
                    </span>
                  }
                />

                <Button variant="outlined" type="submit" disabled={isSubmitting}>
                  Proceed
                </Button>
              </S.ActionButtonGroup>
            </form>
          )}
        </Formik>
      </S.LoginContainer>
    </S.MainContainer>
  );
};

namespace S {
  export const MainContainer = styled(Box)`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  `;

  export const LoginContainer = styled(Paper)`
    width: 100%;
    padding: 20px;
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    justify-content: center;

    ${(props) => props.theme.breakpoints.up('sm')} {
      flex-grow: 0;
      max-width: 600px;
    }
  `;

  export const LoginHeader = styled(Typography)`
    margin-bottom: 20px;
  `;

  export const LogoBox = styled(Box)`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin: 40px;
  `;

  export const Logo = styled('img')`
    width: auto;
    height: auto;
    max-width: ${(props) => props.width}px;
    max-height: ${(props) => props.height}px;
    margin-bottom: 10px;
  `;

  export const ActionButtonGroup = styled(ButtonGroup)`
    margin-top: 20px;
    width: 100%;
    display: flex;
    justify-content: space-between;
  `;

  export const TextInput = styled(TextField)`
    margin-bottom: 20px;
  `;
}
