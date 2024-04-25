export enum OpTypeEnum {
  CLEAR = 1,
  MOVE = 2,
  PUT = 3,
  REMOVE = 4
}

export type OpTypeJSON = string;

/**
 * Used internally for sync buckets.
 */
export class OpType {
  static fromJSON(jsonValue: OpTypeJSON) {
    return new OpType(OpTypeEnum[jsonValue]);
  }

  constructor(public value: OpTypeEnum) {}

  toJSON() {
    return Object.entries(OpTypeEnum).find(([, value]) => value === this.value)![0];
  }
}
