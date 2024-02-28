import { ColumnType, Insertable, Selectable, Updateable } from 'kysely';

export interface Database {
  users: UsersTable;
}

export interface UsersTable {
  id: ColumnType<string, string, never>;
  name: string;
}

export type Users = Selectable<UsersTable>;
export type NewUsers = Insertable<UsersTable>;
export type UsersUpdate = Updateable<UsersTable>;
