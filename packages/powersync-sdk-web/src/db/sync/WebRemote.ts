import { AbstractRemote, DataStream, StreamingSyncLine, SyncStreamOptions } from '@journeyapps/powersync-sdk-common';

export class WebRemote extends AbstractRemote {
  get fetchImpl() {
    return self.fetch;
  }

  async socketStream(options: SyncStreamOptions): Promise<DataStream<StreamingSyncLine>> {
    throw new Error('Method not implemented.');
  }
}
