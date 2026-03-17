use powersync::error::PowerSyncError;
use powersync::schema::SchemaOrCustom;
use powersync::{env::PowerSyncEnvironment, ConnectionPool, PowerSyncDatabase};
use rusqlite::Connection;
use std::marker::PhantomData;
use std::{collections::HashMap, sync::Mutex};
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};

pub use models::*;

mod commands;
mod error;
mod handle;
mod models;

use crate::handle::JavaScriptHandles;
pub use error::Result;

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
    app: PhantomData<AppHandle<R>>,
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
            ConnectionPool::single_connection(
                Connection::open_in_memory().map_err(PowerSyncError::from)?,
            ),
            PowerSyncEnvironment::tokio_timer(),
        );

        let database = PowerSyncDatabase::new(env, schema);
        database.async_tasks().spawn_with_tokio();

        map.insert(name, database.clone());
        Ok(database)
    }

    /// Resolves a [PowerSyncDatabase] from the handle obtained from
    /// `PowerSyncTauriDatabase.rustHandle` in JavaScript.
    pub fn database_from_javascript_handle(&self, handle: usize) -> Result<PowerSyncDatabase> {
        let handle = self.handles.lookup(handle)?;
        Ok(handle.as_database()?.clone())
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("powersync")
        .invoke_handler(tauri::generate_handler![commands::powersync])
        .setup(|app, _api| {
            let powersync = PowerSync {
                app: PhantomData::<AppHandle<R>>,
                databases: Default::default(),
                handles: Default::default(),
            };
            app.manage(powersync);
            Ok(())
        })
        .build()
}
