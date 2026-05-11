/** Draft + submit payload for list metadata edited in the todo list modal (Formik). */
export type ListDetailsFormValues = {
  name: string;
  notes: string;
  tags: string[];
  priority: number;
};
