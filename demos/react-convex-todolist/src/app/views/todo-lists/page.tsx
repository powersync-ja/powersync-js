import { NavigationPage } from '@/components/navigation/NavigationPage';
import { TodoListsWidget } from '@/components/widgets/TodoListsWidget';
import { Box } from '@mui/material';

export default function TodoListsPage() {
  return (
    <NavigationPage title="Todo Lists">
      <Box>
        <TodoListsWidget />
      </Box>
    </NavigationPage>
  );
}
