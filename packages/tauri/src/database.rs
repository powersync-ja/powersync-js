use powersync::error::PowerSyncError;
use powersync::{PowerSyncDatabase, SyncStatusData};
use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::task::JoinHandle;
use tokio_stream::StreamExt;

pub struct TauriDatabaseState {
    pub database: PowerSyncDatabase,
    forward_updates: JoinHandle<()>,
    forward_sync_status: JoinHandle<()>,
}

impl TauriDatabaseState {
    pub fn new<R: Runtime>(handle: AppHandle<R>, name: &str, source: PowerSyncDatabase) -> Self {
        let forward_updates = {
            let handle = handle.clone();
            let db = source.clone();
            let event_key = format!("table-updates:{}", name);

            tokio::spawn(async move {
                let mut stream = db.watch_all_updates();

                while let Some(update) = stream.next().await {
                    handle
                        .emit(&event_key, &update)
                        .expect("should emit table update");
                }
            })
        };
        let forward_sync_status = {
            let db = source.clone();
            let event_key = format!("sync-status:{}", name);

            tokio::spawn(async move {
                let mut stream = db.watch_status();
                while let Some(status) = stream.next().await {
                    handle
                        .emit(&event_key, SerializableSyncStatus(status))
                        .expect("should emit sync status change");
                }
            })
        };

        Self {
            database: source,
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
        // Note: This must match SyncStatusOptions in common/src/db/crud/SyncStatus.ts
        let mut inner = serializer.serialize_struct("SyncStatusOptions", 4)?;
        inner.serialize_field("connected", &status.is_connected())?;
        inner.serialize_field("connecting", &status.is_connecting())?;
        inner.serialize_field("dataFlow", &SerializableDataFlowStatus(status))?;
        // TODO: lastSyncedAt, hasSynced and priorityStatusEntries are not available from the Rust
        // SDK since it's centered around Sync Streams.
        inner.serialize_field("clientImplementation", "RUST")?;

        inner.end()
    }
}

struct SerializableDataFlowStatus<'a>(&'a SyncStatusData);

impl Serialize for SerializableDataFlowStatus<'_> {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        #[derive(Serialize)]
        struct EmptyDownloadProgress {}

        let status = self.0;
        // Note: This must match SyncDataFlowStatus in common/src/db/crud/SyncStatus.ts
        let mut inner = serializer.serialize_struct("DataFlowOptions", 10)?;
        inner.serialize_field("downloading", &status.is_downloading())?;
        inner.serialize_field("uploading", &status.is_uploading())?;
        inner.serialize_field(
            "downloadError",
            &status.download_error().map(SerializeAsJavaScriptError),
        )?;
        inner.serialize_field(
            "uploadError",
            &status.upload_error().map(SerializeAsJavaScriptError),
        )?;
        inner.serialize_field(
            "downloadProgress",
            if status.is_downloading() {
                &Some(EmptyDownloadProgress {})
            } else {
                &None
            },
        )?;
        inner.serialize_field("internalStreamSubscriptions", status.internal_streams())?;

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
