export interface TodoRecord {
  id: string;
  created_at: string;
  completed: boolean;
  description: string;
  completed_at?: string;

  created_by: string;
  completed_by?: string;
  list_id: string;
}

export const TODO_TABLE = 'todos';
