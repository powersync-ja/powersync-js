import {
  Column,
  ColumnType,
  Index,
  IndexedColumn,
  Schema,
  Table,
} from "@powersync/react-native";

export const schema = new Schema([
  new Table({
    name: "profiles",
    columns: [
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
      new Column({ name: "name", type: ColumnType.TEXT }),
      new Column({ name: "handle", type: ColumnType.TEXT }),
      new Column({ name: "demo", type: ColumnType.INTEGER }),
    ],
    indexes: [
      new Index({
        name: "handle",
        columns: [new IndexedColumn({ name: "handle" })],
      }),
      new Index({
        name: "name",
        columns: [new IndexedColumn({ name: "name" })],
      }),
    ],
  }),
  new Table({
    name: "contacts",
    columns: [
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
      new Column({ name: "owner_id", type: ColumnType.TEXT }),
      new Column({ name: "profile_id", type: ColumnType.TEXT }),
    ],
    indexes: [
      new Index({
        name: "list",
        columns: [new IndexedColumn({ name: "profile_id" })],
      }),
    ],
  }),
  new Table({
    name: "groups",
    columns: [
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
      new Column({ name: "name", type: ColumnType.TEXT }),
      new Column({ name: "owner_id", type: ColumnType.TEXT }),
    ],
    indexes: [
      new Index({
        name: "name",
        columns: [new IndexedColumn({ name: "name" })],
      }),
    ],
  }),
  new Table({
    name: "memberships",
    columns: [
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
      new Column({ name: "group_id", type: ColumnType.TEXT }),
      new Column({ name: "profile_id", type: ColumnType.TEXT }),
    ],
    indexes: [
      new Index({
        name: "group_id",
        columns: [new IndexedColumn({ name: "group_id" })],
      }),
      new Index({
        name: "profile_id",
        columns: [new IndexedColumn({ name: "profile_id" })],
      }),
    ],
  }),
  new Table({
    name: "chats",
    columns: [new Column({ name: "profile_id", type: ColumnType.TEXT })],
    indexes: [],
  }),
  new Table({
    name: "messages",
    columns: [
      new Column({ name: "created_at", type: ColumnType.TEXT }),
      new Column({ name: "updated_at", type: ColumnType.TEXT }),
      new Column({ name: "sender_id", type: ColumnType.TEXT }),
      new Column({ name: "recipient_id", type: ColumnType.TEXT }),
      new Column({ name: "group_id", type: ColumnType.TEXT }),
      new Column({ name: "content", type: ColumnType.TEXT }),
      new Column({ name: "sent_at", type: ColumnType.TEXT }),
    ],
    indexes: [
      new Index({
        name: "sender_id",
        columns: [new IndexedColumn({ name: "sender_id" })],
      }),
      new Index({
        name: "recipient_id",
        columns: [new IndexedColumn({ name: "recipient_id" })],
      }),
      new Index({
        name: "group_id",
        columns: [new IndexedColumn({ name: "group_id" })],
      }),
      new Index({
        name: "sent_at",
        columns: [new IndexedColumn({ name: "sent_at" })],
      }),
    ],
  }),
]);
