import * as Comlink from 'comlink';
import { _openDB } from '../../shared/open-db';

Comlink.expose(async (dbFileName: string) => Comlink.proxy(await _openDB(dbFileName)));
