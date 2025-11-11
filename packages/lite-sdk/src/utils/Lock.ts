/**
 * Basic serializing async lock.
 */
export class Lock {
  // Used to serialize requests
  private promise: Promise<any>;

  constructor() {
    this.promise = Promise.resolve();
  }

  async runExclusive<T>(callback: () => Promise<T>): Promise<T> {
    return (this.promise = this.promise.catch().then(
      () =>
        new Promise<T>(async (resolve, reject) => {
          try {
            resolve(await callback());
          } catch (error) {
            reject(error);
          }
        })
    ));
  }
}
