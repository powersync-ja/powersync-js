import { createFileRoute } from '@tanstack/react-router';
import SchemaPage from '@/app/views/schema';

export const Route = createFileRoute('/_authenticated/schema')({
  component: SchemaPage
});
