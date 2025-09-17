import React from 'react';
import { Box, Button, ButtonGroup, FormGroup, Paper, TextField, Typography, styled } from '@mui/material';
import { Formik, FormikErrors } from 'formik';

export type LoginDetailsFormValues = {
  email: string;
  password: string;
};

export type LoginAction = {
  title: string;
  onClick: (values: LoginDetailsFormValues) => any;
};

export type LoginDetailsWidgetProps = {
  title: string;
  secondaryActions: LoginAction[];
  onSubmit: (values: LoginDetailsFormValues) => any;
  submitTitle: string;
};

export const LoginDetailsWidget: React.FC<LoginDetailsWidgetProps> = (props) => {
  return (
    <S.MainContainer>
      <S.LoginContainer elevation={1}>
        <S.LoginHeader variant="h4">{props.title}</S.LoginHeader>
        <S.LogoBox>
          <S.Logo alt="PowerSync Logo" width={400} height={100} src="/powersync-logo.svg" />
          <S.Logo alt="Supabase Logo" width={300} height={80} src="/supabase-logo.png" />
        </S.LogoBox>
        <Formik<LoginDetailsFormValues>
          initialValues={{ email: '', password: '' }}
          validateOnChange={false}
          validateOnBlur={false}
          validate={(values) => {
            const errors: FormikErrors<LoginDetailsFormValues> = {};
            if (!values.email) {
              errors.email = 'Required';
            } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)) {
              errors.email = 'Invalid email address';
            }

            if (!values.password) {
              errors.password = 'Required';
            }
            return errors;
          }}
          onSubmit={async (values, { setSubmitting, setFieldError }) => {
            try {
              await props.onSubmit(values);
            } catch (ex: any) {
              console.error(ex);
              setSubmitting(false);
              setFieldError('password', ex.message);
            }
          }}
        >
          {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit }) => (
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <S.TextInput
                  id="email-input"
                  label="Email Address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.email}
                  error={!!errors.email}
                  helperText={errors.email}
                />
                <S.TextInput
                  id="password-input"
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  onChange={handleChange}
                  onBlur={handleBlur}
                  value={values.password}
                  error={!!errors.password}
                  helperText={errors.password}
                />
              </FormGroup>
              <S.ActionButtonGroup>
                {props.secondaryActions.map((action) => {
                  return (
                    <Button
                      key={action.title}
                      variant="text"
                      disabled={isSubmitting}
                      onClick={() => {
                        action.onClick(values);
                      }}
                    >
                      {action.title}
                    </Button>
                  );
                })}
                <Button variant="outlined" type="submit" disabled={isSubmitting}>
                  {props.submitTitle}
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
