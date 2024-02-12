export interface Todo {
  id: string;
  description: string;
  completed: boolean;
}

export type Todos = Todo[];

export interface List {
  id: string;
  name: string;
}

export type Lists = List[];
