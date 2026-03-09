use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use powersync::{env::PowerSyncEnvironment, ConnectionPool, PowerSyncDatabase};
use rusqlite::Connection;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};

pub use models::*;

mod commands;
mod error;
mod http_client;
mod models;

pub use error::Result;

use crate::http_client::TauriHttpClient;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the PowerSync
/// plugin.
pub trait PowerSyncExt<R: Runtime> {
    fn powersync(&self) -> &PowerSync<R>;
}

impl<R: Runtime, T: Manager<R>> PowerSyncExt<R> for T {
    fn powersync(&self) -> &PowerSync<R> {
        self.state::<PowerSync<R>>().inner()
    }
}

pub struct PowerSync<R: Runtime> {
    app: AppHandle<R>,
    databases: Mutex<HashMap<String, PowerSyncDatabase>>,
}

impl<R: Runtime> PowerSync<R> {
    pub fn open_database(&self, name: String) -> Result<()> {
        let mut map = self.databases.lock().unwrap();
        if map.contains_key(&name) {
            return Ok(());
        }

        PowerSyncEnvironment::powersync_auto_extension()?;
        let env = PowerSyncEnvironment::custom(
            Arc::new(TauriHttpClient::default()),
            ConnectionPool::single_connection(Connection::open_in_memory()?),
            Box::new(PowerSyncEnvironment::tokio_timer()),
        );

        let database = PowerSyncDatabase::new(env, Default::default());
        map.insert(name, database.clone());
        Ok(())
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("powersync")
        .invoke_handler(commands::command_handler())
        .setup(|app, api| {
            let powersync = PowerSync {
                app: app.clone(),
                databases: Default::default(),
            };
            app.manage(powersync);
            Ok(())
        })
        .build()
}
