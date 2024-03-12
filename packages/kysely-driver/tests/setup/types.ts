import { Insertable, Selectable, Updateable } from 'kysely';
import { TestSchema } from './db';

export type Database = (typeof TestSchema)['types'];

export type UsersTable = Database['users'];

export type Users = Selectable<UsersTable>;
export type NewUsers = Insertable<UsersTable>;
export type UsersUpdate = Updateable<UsersTable>;
