use tauri::{ipc::Invoke, Runtime};

mod database;

pub fn command_handler<R: Runtime>() -> impl Fn(Invoke<R>) -> bool + Send + Sync + 'static {
    tauri::generate_handler![]
}
