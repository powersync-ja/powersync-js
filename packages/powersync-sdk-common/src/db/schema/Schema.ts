import type { Table } from './Table';

export class Schema {
  constructor(public tables: Table[]) {}

  validate() {
    for (const table of this.tables) {
      table.validate();
    }
  }

  toJSON() {
    this.validate();
    return {
      tables: this.tables.map((t) => t.toJSON())
    };
  }
}
