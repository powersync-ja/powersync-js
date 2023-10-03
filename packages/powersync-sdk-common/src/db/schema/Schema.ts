import type { Table } from './Table';

export class Schema {
  constructor(public tables: Table[]) {}

  toJSON() {
    return {
      tables: this.tables.map((t) => t.toJSON())
    };
  }
}
