import { activeSubscriptions, db } from '@/library/powersync/ConnectionManager';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Formik, FormikErrors } from 'formik';

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
      {({ values, errors, handleChange, handleBlur, isSubmitting, handleSubmit }) => (
        <Dialog onClose={close} open={open}>
          <DialogTitle>Subscribe to sync stream</DialogTitle>
          <DialogContent>
            <form id="subscription-form" onSubmit={handleSubmit}>
              <DialogContentText>
                Enter stream name and parameters (as a JSON object or an empty string for null) to subscribe to a
                stream.
              </DialogContentText>
              <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 2, mb: 1 }}>
                <FormControl sx={{ flex: 2, minWidth: 120 }}>
                  <TextField
                    autoFocus
                    required
                    label="Stream name"
                    name="stream"
                    value={values.stream}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={!!errors.stream}
                    helperText={errors.stream}
                  />
                </FormControl>
                <FormControl sx={{ flex: 1, minWidth: 120 }}>
                  <InputLabel id="new-stream-priority">Override priority</InputLabel>
                  <Select
                    labelId="new-stream-priority"
                    value={`${values.override_priority}`}
                    label="Override priority"
                    name="override_priority"
                    onChange={handleChange}>
                    <MenuItem value="null">Use default</MenuItem>
                    <MenuItem value="0">0</MenuItem>
                    <MenuItem value="1">1</MenuItem>
                    <MenuItem value="2">2</MenuItem>
                    <MenuItem value="3">2</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack direction={'column'} sx={{ mt: 1, mb: 1 }}>
                <TextField
                  label="Parameters"
                  name="parameters"
                  value={values.parameters}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={!!errors.parameters}
                  helperText={errors.parameters}
                />
              </Stack>
            </form>
          </DialogContent>
          <DialogActions>
            <Button onClick={close}>Cancel</Button>
            <Button type="submit" form="subscription-form" disabled={isSubmitting}>
              Subscribe
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Formik>
  );
}
