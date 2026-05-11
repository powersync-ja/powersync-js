import TodoEditModalRoute from '@/components/todo-lists/TodoEditModalRoute';
import TodoListsPage from './page';

/**
 * Renders the main todo board with the list-detail dialog on top (same URL as `/views/todo-lists/:id`).
 */
export default function TodoListsModalLayout() {
  return (
    <>
      <TodoListsPage />
      <TodoEditModalRoute />
    </>
  );
}
