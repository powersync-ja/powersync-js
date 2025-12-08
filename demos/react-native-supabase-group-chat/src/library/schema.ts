import { column, Schema, Table } from '@powersync/react-native';

const profiles = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    updated_at: column.text,
    handle: column.text,
    name: column.text,
    demo: column.integer
  },
  { indexes: {} }
);

const memberships = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    updated_at: column.text,
    group_id: column.text,
    profile_id: column.text
  },
  { indexes: {} }
);

const contacts = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    updated_at: column.text,
    owner_id: column.text,
    profile_id: column.text
  },
  { indexes: {} }
);

const messages = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    updated_at: column.text,
    sender_id: column.text,
    recipient_id: column.text,
    group_id: column.text,
    content: column.text,
    sent_at: column.text
  },
  { indexes: {} }
);

const groups = new Table(
  {
    // id column (text) is automatically included
    created_at: column.text,
    updated_at: column.text,
    owner_id: column.text,
    name: column.text
  },
  { indexes: {} }
);

const chats = new Table(
  {
    // id column (text) is automatically included
    profile_id: column.text
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  profiles,
  memberships,
  contacts,
  messages,
  groups,
  chats
});
