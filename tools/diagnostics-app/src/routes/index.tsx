import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { connector } from '@/library/powersync/ConnectionManager';
import { getTokenEndpoint } from '@/library/powersync/TokenConnector';
import { SyncClientImplementation } from '@powersync/web';
import { z } from 'zod';
import { Formik, FormikErrors } from 'formik';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wifi, FileSearch, ArrowRight } from 'lucide-react';
import React from 'react';

const searchSchema = z.object({
  token: z.string().optional()
});

type LoginFormValues = {
  token: string;
  endpoint: string;
};

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  beforeLoad: async ({ search }) => {
    // Handle deep-link auto-sign-in with ?token= query param
    if (search.token) {
      const endpoint = getTokenEndpoint(search.token);
      if (!endpoint) {
        throw new Error('endpoint is required');
      }

      await connector.signIn({
        token: search.token,
        endpoint,
        clientImplementation: SyncClientImplementation.RUST
      });

      throw redirect({ to: '/sync-diagnostics' });
    }
  },
  component: LandingPage
});

function LandingPage() {
  const navigate = useNavigate();
  const [hasCredentials, setHasCredentials] = React.useState(false);

  React.useEffect(() => {
    connector.hasCredentials().then(setHasCredentials);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-[900px] space-y-8">
        {/* Logo & title */}
        <div className="flex flex-col items-center gap-4">
          <img alt="PowerSync Logo" className="w-auto max-w-[300px] max-h-[80px]" src="/powersync-logo.svg" />
          <h1 className="text-2xl font-semibold text-center">Sync Diagnostics Client</h1>
        </div>

        {/* Two-path cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Connect to PowerSync */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Connect to PowerSync</CardTitle>
              </div>
              <CardDescription>
                Live sync diagnostics with JWT token. View real-time sync status, bucket data, and manage client
                parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <Formik<LoginFormValues>
                initialValues={{ token: '', endpoint: '' }}
                validateOnChange={false}
                validateOnBlur={false}
                validate={(values) => {
                  const errors: FormikErrors<LoginFormValues> = {};
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
                    await connector.signIn({
                      token: values.token,
                      endpoint,
                      clientImplementation: SyncClientImplementation.RUST
                    });
                    navigate({ to: '/sync-diagnostics' });
                  } catch (ex: any) {
                    console.error(ex);
                    setSubmitting(false);
                    setFieldError('endpoint', ex.message);
                  }
                }}>
                {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit }) => (
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      {errors.token && <p className="text-sm text-destructive mt-1">{errors.token}</p>}
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
                      {errors.endpoint && <p className="text-sm text-destructive mt-1">{errors.endpoint}</p>}
                    </div>
                    <Button type="submit" variant="outline" disabled={isSubmitting} className="w-full">
                      Connect
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </form>
                )}
              </Formik>
            </CardContent>
          </Card>

          {/* Inspect SQLite File */}
          <Card
            className="flex flex-col cursor-pointer transition-colors hover:border-primary/50"
            onClick={() => navigate({ to: '/inspector' })}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileSearch className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Inspect SQLite File</CardTitle>
              </div>
              <CardDescription>
                Open a local .sqlite or .db file for offline inspection. View tables, indexes, run read-only queries —
                no authentication required.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <p className="text-sm text-muted-foreground mb-4">
                Ideal for post-mortem analysis of database files extracted from devices.
              </p>
              <Button variant="outline" className="w-full" tabIndex={-1}>
                Open Inspector
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resume session link */}
        {hasCredentials && (
          <div className="text-center">
            <Button
              variant="link"
              onClick={() => navigate({ to: '/sync-diagnostics' })}
              className="text-sm text-muted-foreground">
              Resume active session
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
