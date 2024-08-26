import { app, BrowserWindow } from 'electron';
import express from 'express';
import * as url from 'node:url';
import path from 'path';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//   app.quit();
// }

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600
  });

  mainWindow.webContents.inspectSharedWorker();

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    /**
     * The PowerSync web SDK relies on SharedWorkers for multiple tab support.
     * Multiple tab support in Electron is required if multiple `BrowserWindow`s
     * require the PowerSync client simultaneously.
     *
     * The default solution of serving HTML assets from a file is sufficient if multiple
     * tab support is not required.
     *
     * ```js
     *  mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
     * ```
     *
     * Extra steps are required if multiple tab support is required.
     *
     * Serving from a file results in `window.origin` being set as `file://`.
     *
     * Usually creating multiple `SharedWorker` instances from the same JS context should
     * link to the same instance of the shared worker. However, multiple worker instances
     * will be created if the origin is not the same. Apparently `file://` origins cause
     * the latter.
     *
     * For example:
     * ```js
     *  const worker1 = new SharedWorker('url');
     *  const worker2 = new SharedWorker('url');
     *```
     *
     * Should only create 1 instance of a SharedWorker with `worker1` and `worker2`
     * pointing to the same instance.
     *
     * When the content is served from a file `worker1` and `worker2` point to different
     * (unique) instances of the shared worker code.
     *
     * The PowerSync SDK relies on a single shared worker instance being present.
     *
     * See: https://github.com/electron/electron/issues/13952
     *
     * This serves the production HTML assets via a HTTP server. This sets the Window
     * origin to a the server address. This results in expected SharedWorker
     * functionality.
     */
    const expressApp = express();

    // The Vite production output should all be here.
    const bundleDir = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`);

    // Serve the assets production assets
    expressApp.use(express.static(bundleDir));

    /**
     * If the port used here is dynamic e.g. `0` then the session would be cleared
     * if the port changes. A fixed port should be used in production.
     * Care should be taken when selecting this port to avoid conflicts.
     * This demo uses a random fixed port for demonstration purposes. More advanced
     * port management should be implemented if using this in production.
     */
    const port = process.env.PORT || 40031;
    const server = expressApp.listen(port, () => {
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
    });

    app.on('quit', () => server.close());
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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
