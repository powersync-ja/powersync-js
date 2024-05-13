import _ from 'lodash';
import { action, makeObservable, observable } from 'mobx';
import { AbstractModel } from '../models/AbstractModel';
import { System } from './system';

export abstract class AbstractStore<Model extends AbstractModel> {
  collection: Model[];

  constructor(protected system: System) {
    this.collection = [];

    makeObservable(this, {
      collection: observable,
      createModel: action,
      removeModel: action
    });
  }

  getById(id: string): Model | undefined {
    return this.collection.find((i) => i.id == id);
  }

  init() {
    this.watchItems();
  }

  /**
   * Create the model and persist in DB
   */
  protected abstract _createModel(record: Partial<Model['record']>): Promise<Model>;

  /**
   * Creates a model and updates stored collection
   */
  async createModel(record: Partial<Model['record']>) {
    const model = await this._createModel(record);
    this.collection.push(model);
    return model;
  }

  /**
   * Removes a model from the collection. Does not delete from DB.
   */
  removeModel(model: Model) {
    _.pullAllWith(this.collection, [model], (a, b) => a.id == b.id);
  }

  protected abstract _watchItems(): AsyncIterable<Model[]>;
  /**
   * Watches the collection and updates the store
   */
  protected async watchItems() {
    for await (const items of this._watchItems()) {
      this.collection = items;
    }
  }
}
