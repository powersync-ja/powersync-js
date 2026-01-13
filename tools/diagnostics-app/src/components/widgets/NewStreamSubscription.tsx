import { activeSubscriptions, db } from '@/library/powersync/ConnectionManager';
import { Formik, FormikErrors } from 'formik';
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

interface NewStreamSubscriptionValues {
  stream: string;
  parameters: string;
  override_priority: 0 | 1 | 2 | 3 | null;
}

export function NewStreamSubscription(props: { open: boolean; close: () => void }) {
  const { open, close } = props;

  const validate = (values: NewStreamSubscriptionValues) => {
    const errors: FormikErrors<NewStreamSubscriptionValues> = {};

    if (values.stream.length == 0) {
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
    const parameters = values.parameters == '' ? null : JSON.parse(values.parameters);

    const subscription = await db
      .syncStream(values.stream, parameters)
      .subscribe({ priority: values.override_priority ?? undefined });

    // We need to store subscriptions globally, because they have a finalizer set on them that would eventually clear
    // them otherwise.
    activeSubscriptions.push(subscription);
    close();
  };

  return (
    <Formik<NewStreamSubscriptionValues>
      initialValues={{ stream: '', parameters: '', override_priority: null }}
      validateOnChange={true}
      onSubmit={addSubscription}
      validate={validate}>
      {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit, setFieldValue }) => (
        <Dialog open={open} onOpenChange={(open) => !open && close()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subscribe to sync stream</DialogTitle>
              <DialogDescription>
                Enter stream name and parameters (as a JSON object or an empty string for null) to subscribe to a
                stream.
              </DialogDescription>
            </DialogHeader>
            <form id="subscription-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-2.5">
                <div className="flex-[2] min-w-[120px] space-y-1.5">
                  <Label htmlFor="stream-name">Stream name</Label>
                  <Input
                    id="stream-name"
                    autoFocus
                    required
                    name="stream"
                    value={values.stream}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={errors.stream ? 'border-destructive' : ''}
                  />
                  {errors.stream && <p className="text-sm text-destructive">{errors.stream}</p>}
                </div>
                <div className="flex-1 min-w-[120px] space-y-1.5">
                  <Label htmlFor="new-stream-priority">Override priority</Label>
                  <Select
                    value={values.override_priority === null ? 'null' : `${values.override_priority}`}
                    onValueChange={(value) => setFieldValue('override_priority', value === 'null' ? null : Number(value))}>
                    <SelectTrigger id="new-stream-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Use default</SelectItem>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parameters">Parameters</Label>
                <Input
                  id="parameters"
                  name="parameters"
                  value={values.parameters}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={errors.parameters ? 'border-destructive' : ''}
                />
                {errors.parameters && <p className="text-sm text-destructive">{errors.parameters}</p>}
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" form="subscription-form" disabled={isSubmitting}>
                Subscribe
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Formik>
  );
}
