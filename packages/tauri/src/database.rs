use powersync::error::PowerSyncError;
use powersync::{PowerSyncDatabase, SyncStatusData};
use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::task::JoinHandle;
use tokio_stream::StreamExt;

pub struct TauriDatabaseState {
    pub database: PowerSyncDatabase,
    pub event_key: i32,
    forward_updates: JoinHandle<()>,
    forward_sync_status: JoinHandle<()>,
}

impl TauriDatabaseState {
    pub fn new<R: Runtime>(
        handle: AppHandle<R>,
        event_key: i32,
        source: PowerSyncDatabase,
    ) -> Self {
        let forward_updates = {
            let handle = handle.clone();
            let db = source.clone();
            let event_key = Arc::new(format!("table-updates:{}", event_key));

            tokio::spawn(async move {
                let mut stream = db.watch_all_updates();

                while let Some(update) = stream.next().await {
                    let cloned_handle = handle.clone();
                    let event_key = event_key.clone();

                    handle
                        .run_on_main_thread(move || {
                            cloned_handle
                                .emit(&event_key, &update)
                                .expect("should emit table update")
                        })
                        .expect("should run on main thread");
                }
            })
        };
        let forward_sync_status = {
            let db = source.clone();
            let event_key = format!("sync-status:{}", event_key);

            tokio::spawn(async move {
                let mut stream = db.watch_status();
                while let Some(status) = stream.next().await {
                    let cloned_handle = handle.clone();
                    let event_key = event_key.clone();

                    handle
                        .run_on_main_thread(move || {
                            cloned_handle
                                .emit(&event_key, SerializableSyncStatus(status))
                                .expect("should emit sync status change")
                        })
                        .expect("should run on main thread");
                }
            })
        };

        Self {
            database: source,
            event_key,
            forward_updates,
            forward_sync_status,
        }
    }
}

impl Drop for TauriDatabaseState {
    fn drop(&mut self) {
        self.forward_updates.abort();
        self.forward_sync_status.abort();
    }
}

#[derive(Clone)]
pub(crate) struct SerializableSyncStatus(pub Arc<SyncStatusData>);

impl Serialize for SerializableSyncStatus {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let status = self.0.as_ref();
        // Note: This must match SyncStatusJson in shared-internals/src/db/crud/SyncStatus.ts
        let mut inner = serializer.serialize_struct("SyncStatusJson", 2)?;
        inner.serialize_field("core", &SerializableCoreSyncStatus(status))?;
        inner.serialize_field("dataFlow", &SerializableDataFlowStatus(status))?;

        inner.end()
    }
}

struct SerializableCoreSyncStatus<'a>(&'a SyncStatusData);

impl Serialize for SerializableCoreSyncStatus<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[derive(Serialize, Default)]
        struct EmptyDownloadProgress {
            buckets: HashMap<String, ()>,
        }

        let status = self.0;
        // Note: This must match CoreSyncStatus in shared-internals/src/client/sync/stream/core-instruction.ts
        let mut inner = serializer.serialize_struct("CoreSyncStatus", 5)?;
        inner.serialize_field("connected", &status.is_connected())?;
        inner.serialize_field("connecting", &&status.is_connecting())?;

        // Note: Priority status and download progress is not available outside of streams.
        inner.serialize_field::<[()]>("priority_status", &[])?;
        if status.is_downloading() {
            let progress = Some(EmptyDownloadProgress::default());
            inner.serialize_field("downloading", &progress)
        } else {
            inner.serialize_field("downloading", &None::<()>)
        }?;

        inner.serialize_field("streams", status.internal_streams())?;

        inner.end()
    }
}

struct SerializableDataFlowStatus<'a>(&'a SyncStatusData);

impl Serialize for SerializableDataFlowStatus<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let status = self.0;
        // Note: This must match JavaScriptSyncState in common/src/db/crud/SyncStatus.ts
        let mut inner = serializer.serialize_struct("JavaScriptSyncState", 3)?;
        inner.serialize_field("uploading", &status.is_uploading())?;
        inner.serialize_field(
            "downloadError",
            &status.download_error().map(SerializeAsJavaScriptError),
        )?;
        inner.serialize_field(
            "uploadError",
            &status.upload_error().map(SerializeAsJavaScriptError),
        )?;

        inner.end()
    }
}

struct SerializeAsJavaScriptError<'a>(&'a PowerSyncError);

impl<'a> Serialize for SerializeAsJavaScriptError<'a> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut inner = serializer.serialize_struct("Error", 2)?;
        inner.serialize_field("name", "PowerSyncRustError")?;
        inner.serialize_field("message", &self.0.to_string())?;

        inner.end()
    }
}
