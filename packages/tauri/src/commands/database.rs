use crate::{PowerSync, Result};
use tauri::{command, Runtime, State};

#[command]
pub fn open_database<R: Runtime>(ps: State<'_, PowerSync<R>>, name: String) -> Result<()> {
    ps.open_database(name)
}
