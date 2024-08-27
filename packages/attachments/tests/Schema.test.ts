import { describe, it, expect } from 'vitest';
import { AttachmentTable, AttachmentState, ATTACHMENT_TABLE } from '../src/Schema';
import { column, TableV2 } from '@powersync/common';

describe('AttachmentTable', () => {
  it('should create a table with default options', () => {
    const table = new AttachmentTable();

    expect(table).toBeInstanceOf(TableV2);
    expect(table.options.viewName).toBe(ATTACHMENT_TABLE);
    expect(table.options.localOnly).toBe(true);
    expect(table.options.insertOnly).toBe(false);

    expect(table.columns).toEqual({
      filename: column.text,
      local_uri: column.text,
      timestamp: column.integer,
      size: column.integer,
      media_type: column.text,
      state: column.integer,
    });
  });

  it('should create a table with a custom name', () => {
    const customName = 'custom_attachments';
    const table = new AttachmentTable({ name: customName });

    expect(table.options.viewName).toBe(customName);
  });

  it('should create a table with additional columns', () => {
    const additionalColumns = {
      custom_field: column.text,
    };
    const table = new AttachmentTable({ additionalColumns });

    expect(table.columns).toEqual({
      filename: column.text,
      local_uri: column.text,
      timestamp: column.integer,
      size: column.integer,
      media_type: column.text,
      state: column.integer,
      custom_field: column.text,
    });
  });
});

describe('AttachmentState', () => {
  it('should have correct enum values', () => {
    expect(AttachmentState.QUEUED_SYNC).toBe(0);
    expect(AttachmentState.QUEUED_UPLOAD).toBe(1);
    expect(AttachmentState.QUEUED_DOWNLOAD).toBe(2);
    expect(AttachmentState.SYNCED).toBe(3);
    expect(AttachmentState.ARCHIVED).toBe(4);
  });
});
