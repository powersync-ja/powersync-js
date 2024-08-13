import React from 'react';
import { Box, Button, ButtonGroup, FormGroup, Paper, TextField, Typography, styled } from '@mui/material';
import { Formik, FormikErrors } from 'formik';

export type LoginDetailsFormValues = {
  token: string;
  endpoint: string;
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
        <S.LoginHeader variant="h4">Diagnostics Config</S.LoginHeader>
        <S.LogoBox>
          <S.Logo alt="PowerSync Logo" width={400} height={100} src="/powersync-logo.svg" />
        </S.LogoBox>
        <Formik<LoginDetailsFormValues>
          initialValues={{ token: '', endpoint: '' }}
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
                endpoint
              });
            } catch (ex: any) {
              console.error(ex);
              setSubmitting(false);
              setFieldError('endpoint', ex.message);
            }
          }}>
          {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit }) => (
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
    justify-content: end;
  `;

  export const TextInput = styled(TextField)`
    margin-bottom: 20px;
  `;
}

function getTokenEndpoint(token: string) {
  try {
    const [head, body, signature] = token.split('.');
    const payload = JSON.parse(atob(body));
    const aud = payload.aud as string | string[] | undefined;
    const audiences = Array.isArray(aud) ? aud : [aud];

    // Prioritize public powersync URL
    for (let aud of audiences) {
      if (aud?.match(/^https?:.*.journeyapps.com/)) {
        return aud;
      }
    }

    // Fallback to any URL
    for (let aud of audiences) {
      if (aud?.match(/^https?:/)) {
        return aud;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}
