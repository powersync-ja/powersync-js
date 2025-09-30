import { LIST_TABLE } from "@/powersync/AppSchema";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { AppState } from "react-native";
import { system } from "@/powersync/SystemContext";

const BACKGROUND_SYNC_TASK = "background-powersync-task";
const MINIMUM_INTERVAL = 15; // Run this task every 15 minutes

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log(`[Background Task] Starting background task at ${new Date(Date.now()).toISOString()}`);

    // Ensure we don't create another connection to PowerSync if it's already connected
    if (system?.powersync?.connected) return;

    // Insert a mock list to simulate a pending transaction in `ps_crud`
    await system.powersync.execute(
      `INSERT INTO ${LIST_TABLE} (id, name, owner_id) VALUES (uuid(), 'From Inside BG', ?)`,
      [await system.connector.userId()]
    );

    console.log("[Background Task] Initializing PowerSync");

    await system.init();

    // Wait for first sync to complete to download any new data
    await new Promise<void>((resolve) => {
      console.log("[Background Task] Waiting for first sync to complete");
      const unregister = system.powersync.registerListener({
        statusChanged: (status) => {
          const hasSynced = Boolean(status.lastSyncedAt);
          const downloading = status.dataFlowStatus?.downloading || false;
          const uploading = status.dataFlowStatus?.uploading || false;

          // Resolve when all operations have been downloaded and pending transactions have been uploaded
          if (hasSynced && !downloading && !uploading) {
            console.log(
              "[Background Task] Download complete"
            );
            resolve();
            unregister();
          }
        },
      });
    });
  } catch (error) {
    console.error("[Background Task] Failed to execute the background task:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
  return BackgroundTask.BackgroundTaskResult.Success;
});

/**
 * Initializes and manages the background task based on app state changes.
 */
export const initializeBackgroundTask = async (innerAppMountedPromise: Promise<void>) => {
  // Delay registering the task until the inner app is mounted
  await innerAppMountedPromise;
  // This listener will manage task registration and unregistration
  AppState.addEventListener("change", async (nextAppState) => {
    console.log("App state changed:", nextAppState);

    if (nextAppState === "active") {
      // App is in the foreground, kill the background task
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (isTaskRegistered) {
        console.log("App is active. Unregistering background task.");
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      }
    } else if (nextAppState === "background") {
      // App is in the background, register the task to run
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (!isTaskRegistered) {
        console.log("App is in background. Registering background task.");
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: MINIMUM_INTERVAL,
        });
      }
    }
  });

  // Run an initial check in case the app starts in the background (e.g., from a deep link)
  const initialAppState = AppState.currentState;
  if (initialAppState === "background") {
    (async () => {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      if (!isTaskRegistered) {
        await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: MINIMUM_INTERVAL,
        });
      }
    })();
  }
};