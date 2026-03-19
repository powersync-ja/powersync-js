use async_trait::async_trait;
use futures_lite::StreamExt;
use log::warn;
use powersync::error::PowerSyncError;
use powersync::{
    BackendConnector, PowerSyncCredentials, PowerSyncDatabase, SyncOptions, UpdateType,
};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use tauri::{AppHandle, Runtime};
use tauri_plugin_powersync::PowerSyncExt;

#[tauri::command]
async fn connect<R: Runtime>(
    app: AppHandle<R>,
    handle: usize,
) -> tauri_plugin_powersync::Result<()> {
    let ps = app.powersync();
    let database = ps.database_from_javascript_handle(handle)?;

    let options = SyncOptions::new(MyRustConnector {
        db: database.clone(),
    });
    database.connect(options).await;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![connect])
        .plugin(tauri_plugin_powersync::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// A backend connector implementation based on the
/// [self-hosted demo](https://github.com/powersync-ja/self-host-demo/tree/main/demos/nodejs).
struct MyRustConnector {
    db: PowerSyncDatabase,
}

#[async_trait]
impl BackendConnector for MyRustConnector {
    async fn fetch_credentials(&self) -> Result<PowerSyncCredentials, PowerSyncError> {
        let response = reqwest::get("http://localhost:6060/api/auth/token").await?;

        #[derive(Deserialize)]
        struct TokenResponse {
            token: String,
        }

        let token: TokenResponse = response.json().await?;
        Ok(PowerSyncCredentials {
            endpoint: "http://localhost:8080".to_string(),
            token: token.token,
        })
    }

    async fn upload_data(&self) -> Result<(), PowerSyncError> {
        let mut transactions = self.db.crud_transactions();
        let mut last_tx = None;

        while let Some(mut tx) = transactions.try_next().await? {
            #[derive(Serialize)]
            struct BackendEntry {
                op: UpdateType,
                table: String,
                id: String,
                data: Option<Map<String, Value>>,
            }

            #[derive(Serialize)]
            struct BackendBatch {
                batch: Vec<BackendEntry>,
            }

            let mut entries = vec![];
            for crud in std::mem::take(&mut tx.crud) {
                entries.push(BackendEntry {
                    op: crud.update_type,
                    table: crud.table,
                    id: crud.id,
                    data: crud.data,
                });
            }

            let serialized = serde_json::to_string(&BackendBatch { batch: entries })?;

            let client = reqwest::Client::new();
            let response = client
                .post("http://localhost:6060/api/data")
                .header("Content-Type", "application/json")
                .body(serialized)
                .send()
                .await?;

            if response.status() != StatusCode::OK {
                let status = response.status();
                let body = response.text().await?;
                warn!("Received {} from /api/data: {}", status, body);
            }

            last_tx = Some(tx);
        }

        if let Some(tx) = last_tx {
            tx.complete().await?;
        }

        Ok(())
    }
}
