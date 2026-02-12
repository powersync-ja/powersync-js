import { connect, db } from '@/library/powersync/ConnectionManager';
import { Formik, FormikErrors } from 'formik';
import Editor from '@monaco-editor/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { POWERSYNC_MONACO_THEME } from '@/components/providers/MonacoThemeProvider';

interface NewStreamSubscriptionValues {
  stream: string;
  parameters: string;
  override_priority: 0 | 1 | 2 | 3 | null;
}

export function NewStreamSubscription(props: { open: boolean; close: () => void }) {
  const { open, close } = props;
  const validate = (values: NewStreamSubscriptionValues) => {
    const errors: FormikErrors<NewStreamSubscriptionValues> = {};

    if (values.stream.length === 0) {
      errors.stream = 'Stream is required';
    }

    if (values.parameters.length) {
      try {
        JSON.parse(values.parameters);
      } catch (e) {
        errors.parameters = 'Must be empty or a JSON object';
      }
    }

    return errors;
  };

  const addSubscription = async (values: NewStreamSubscriptionValues) => {
    const parameters = values.parameters === '' ? null : JSON.parse(values.parameters);

    await db
      .syncStream(values.stream, parameters)
      .subscribe({ priority: values.override_priority ?? undefined });

    close();

    // Reconnect so the sync engine picks up the new subscription.
    // The Rust client persists subscription state across reconnects.
    try {
      await connect();
    } catch {
      // Reconnection may fail if credentials have expired
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent className="sm:max-w-md">
        <Formik<NewStreamSubscriptionValues>
          initialValues={{ stream: '', parameters: '', override_priority: null }}
          validateOnChange={true}
          onSubmit={addSubscription}
          validate={validate}>
          {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit, setFieldValue }) => (
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Subscribe to sync stream</DialogTitle>
                <DialogDescription>
                  Add a stream subscription with optional parameters and priority override.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="stream-name">Stream name</Label>
                    <Input
                      id="stream-name"
                      autoFocus
                      placeholder="e.g. my-stream"
                      name="stream"
                      value={values.stream}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={cn('mt-1.5', errors.stream && 'border-destructive')}
                    />
                    {errors.stream && <p className="text-xs text-destructive mt-1">{errors.stream}</p>}
                  </div>
                  <div>
                    <Label htmlFor="new-stream-priority">Priority</Label>
                    <Select
                      value={values.override_priority === null ? 'null' : `${values.override_priority}`}
                      onValueChange={(value) =>
                        setFieldValue('override_priority', value === 'null' ? null : Number(value))
                      }>
                      <SelectTrigger id="new-stream-priority" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Default</SelectItem>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Parameters (JSON)</Label>
                  <div
                    className={cn(
                      'mt-1.5 rounded-md border overflow-hidden relative',
                      errors.parameters && 'border-destructive'
                    )}>
                    {!values.parameters && (
                      <div className="absolute top-2 left-2 text-muted-foreground/50 text-[13px] pointer-events-none z-10 font-mono">
                        {'{ "key": "value" }'}
                      </div>
                    )}
                    <Editor
                      height="100px"
                      language="json"
                      theme={POWERSYNC_MONACO_THEME}
                      value={values.parameters}
                      onChange={(value) => setFieldValue('parameters', value ?? '')}
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'off',
                        glyphMargin: false,
                        folding: false,
                        lineDecorationsWidth: 8,
                        lineNumbersMinChars: 0,
                        overviewRulerLanes: 0,
                        overviewRulerBorder: false,
                        hideCursorInOverviewRuler: true,
                        padding: { top: 8, bottom: 8 },
                        fontSize: 13,
                        tabSize: 2,
                        automaticLayout: true
                      }}
                    />
                  </div>
                  {errors.parameters && <p className="text-xs text-destructive mt-1">{errors.parameters}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Subscribe
                </Button>
              </DialogFooter>
            </form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
}
