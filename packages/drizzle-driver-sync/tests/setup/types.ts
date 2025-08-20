import { TestSchema } from './db';

export type Database = (typeof TestSchema)['types'];

export type UsersTable = Database['users'];
