import { Worker } from 'node:worker_threads';

import { PowerSyncDatabase } from '@powersync/node';
import { app, BrowserWindow, ipcMain } from 'electron';
import { AppSchema } from './powersync';
import { default as Logger } from 'js-logger';

const logger = Logger.get('PowerSyncDemo');
Logger.useDefaults({ defaultLevel: logger.WARN });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const database = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'test.db',
    openWorker(_, options) {
      return new Worker(new URL('./worker.ts', import.meta.url), options);
    }
  },
  logger
});

// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  ipcMain.handle('get', async (_, sql: string, args: any[]) => {
    return await database.get(sql, args);
  });
  ipcMain.handle('getAll', async (_, sql: string, args: any[]) => {
    return await database.getAll(sql, args);
  });
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
