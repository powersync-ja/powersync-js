import { type SyncStatus } from '@powersync/node';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('powersync', {
  get: (sql: string, variables: any[]) => ipcRenderer.invoke('get', sql, variables),
  getAll: (sql: string, variables: any[]) => ipcRenderer.invoke('get', sql, variables),
  syncStatus: (cb: (status: SyncStatus) => void) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => cb(event.data);

    ipcRenderer.postMessage('port', null, [channel.port2]);
    channel.port1.postMessage({method: 'syncStatus'});
  },
  watch: (sql: string, args: any[], cb: (rows: any[]) => void) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => cb(event.data);

    const message = {method: 'watch', 'payload': {sql, args}};
    ipcRenderer.postMessage('port', null, [channel.port2]);
    channel.port1.postMessage(message);

    return () => channel.port1.close(); // Closign the port also closes resources on the main process
  },
});
