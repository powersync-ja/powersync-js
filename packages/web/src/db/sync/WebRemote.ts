import { AbstractRemote, BSONImplementation } from '@powersync/common';

export class WebRemote extends AbstractRemote {
  private _bson: BSONImplementation | undefined;

  async getBSON(): Promise<BSONImplementation> {
    if (this._bson) {
      return this._bson;
    }

    /**
     * Dynamic import to be used only when needed.
     */
    const { BSON } = await import('bson');
    this._bson = BSON;
    return this._bson;
  }
}
