import { column, Schema, Table } from '@powersync/common';

const assetsDef = {
  name: 'assets',
  columns: {
    created_at: column.text,
    make: column.text,
    model: column.text,
    serial_number: column.text,
    quantity: column.integer,
    user_id: column.text,
    customer_id: column.text,
    description: column.text
  },
  options: {}
};

const customersDef = {
  name: 'customers',
  columns: {
    name: column.text,
    email: column.text
  },
  options: {}
};

export function makeOptionalSyncSchema(synced: boolean) {
  const syncedName = (table: string): string => {
    if (synced) {
      return table;
    } else {
      return `inactive_synced_${table}`;
    }
  };

  const localName = (table: string): string => {
    if (synced) {
      return `inactive_local_${table}`;
    } else {
      return table;
    }
  };

  return new Schema({
    assets: new Table(assetsDef.columns, { ...assetsDef.options, viewName: syncedName(assetsDef.name) }),
    local_assets: new Table(assetsDef.columns, {
      ...assetsDef.options,
      localOnly: true,
      viewName: localName(assetsDef.name)
    }),
    customers: new Table(customersDef.columns, { ...customersDef.options, viewName: syncedName(customersDef.name) }),
    local_customers: new Table(customersDef.columns, {
      ...customersDef.options,
      localOnly: true,
      viewName: localName(customersDef.name)
    })
  });
}
