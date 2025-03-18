import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('powersync', {
  get: (sql: string, variables: any[]) => ipcRenderer.invoke('get', sql, variables)
});
