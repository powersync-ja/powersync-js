use std::{
    collections::HashMap,
    sync::{ Mutex},
};

use powersync::{env::PowerSyncEnvironment, ConnectionPool, PowerSyncDatabase};
use powersync::error::PowerSyncError;
use powersync::schema::{Schema, SchemaOrCustom};
use rusqlite::Connection;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};

pub use models::*;

mod commands;
mod error;
mod models;
mod handle;

pub use error::Result;
use crate::handle::JavaScriptHandles;

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
    pub(crate) handles: JavaScriptHandles,
}

impl<R: Runtime> PowerSync<R> {
    pub fn open_database(&self, name: String, schema: SchemaOrCustom) -> Result<PowerSyncDatabase> {
        let mut map = self.databases.lock().unwrap();
        if let Some(database) = map.get(&name) {
            return Ok(database.clone());
        }

        PowerSyncEnvironment::powersync_auto_extension()?;
        let env = PowerSyncEnvironment::custom(
            reqwest::Client::new(),
            ConnectionPool::single_connection(Connection::open_in_memory().map_err(PowerSyncError::from)?),
            PowerSyncEnvironment::tokio_timer(),
        );

        let database = PowerSyncDatabase::new(env, schema);
        map.insert(name, database.clone());
        Ok(database)
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("powersync")
        .invoke_handler(tauri::generate_handler![commands::powersync])
        .setup(|app, api| {
            let powersync = PowerSync {
                app: app.clone(),
                databases: Default::default(),
                handles: Default::default(),
            };
            app.manage(powersync);
            Ok(())
        })
        .build()
}
