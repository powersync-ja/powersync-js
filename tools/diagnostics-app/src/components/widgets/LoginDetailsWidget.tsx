import React from 'react';
import { Formik, FormikErrors } from 'formik';
import { SyncClientImplementation } from '@powersync/web';
import { getTokenEndpoint } from '@/library/powersync/TokenConnector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Card className="w-full max-w-[600px] p-5">
        <CardHeader>
          <CardTitle className="text-2xl mb-5">Sync Diagnostics Client</CardTitle>
          <div className="flex flex-col items-center justify-center my-10">
            <img
              alt="PowerSync Logo"
              className="w-auto h-auto max-w-[400px] max-h-[100px] mb-2.5"
              src="/powersync-logo.svg"
            />
          </div>
        </CardHeader>
        <CardContent>
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
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="token-input">PowerSync Token</Label>
                  <Input
                    id="token-input"
                    name="token"
                    type="text"
                    autoComplete="off"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.token}
                    className={`mt-1.5 ${errors.token ? 'border-destructive' : ''}`}
                  />
                  {errors.token && <p className="text-sm text-destructive">{errors.token}</p>}
                </div>
                <div>
                  <Label htmlFor="endpoint-input">PowerSync Endpoint</Label>
                  <Input
                    id="endpoint-input"
                    name="endpoint"
                    type="url"
                    autoComplete="url"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    value={values.endpoint}
                    placeholder={getTokenEndpoint(values.token) ?? ''}
                    className={`mt-1.5 ${errors.endpoint ? 'border-destructive' : ''}`}
                  />
                  {errors.endpoint && <p className="text-sm text-destructive">{errors.endpoint}</p>}
                </div>
                <div className="flex items-center justify-between mt-5">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={values.clientImplementation == SyncClientImplementation.RUST}
                      onCheckedChange={(checked) =>
                        setFieldValue(
                          'clientImplementation',
                          checked ? SyncClientImplementation.RUST : SyncClientImplementation.JAVASCRIPT
                        )
                      }
                    />
                    <Label htmlFor="rust-client" className="cursor-pointer">
                      Rust sync client (
                      <a
                        className="text-info hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://releases.powersync.com/announcements/improved-sync-performance-in-our-client-sdks">
                        what's that?
                      </a>
                      )
                    </Label>
                  </div>
                  <Button type="submit" variant="outline" disabled={isSubmitting}>
                    Proceed
                  </Button>
                </div>
              </form>
            )}
          </Formik>
        </CardContent>
      </Card>
    </div>
  );
};
