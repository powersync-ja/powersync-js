use crate::error::{PowerSyncTauriError, Result};
use powersync::{LeasedConnection, PowerSyncDatabase, StreamSubscription};
use std::collections::HashMap;
use std::sync::atomic::AtomicUsize;
use std::sync::{Arc, Mutex};
use tauri::async_runtime::Mutex as AsyncMutex;

pub type Handle = usize;

/// A Rust value that is shared with JavaScript.
///
/// We expose these as numeric identifiers to the JavaScript client, which allows JS clients to
/// invoke methods on databases and other objects by passing the id back to Rust. We then have a
/// map of all active identifiers on the native side and can use that to recover the original Rust
/// value.
#[derive(Clone)]
pub enum SharedWithJavaScript {
    Database(PowerSyncDatabase),
    Connection(Arc<AsyncMutex<LeasedConnection>>),
    Subscription(StreamSubscription),
}

impl SharedWithJavaScript {
    pub fn as_database(&self) -> Result<&PowerSyncDatabase> {
        match self {
            Self::Database(database) => Ok(database),
            _ => Err(PowerSyncTauriError::IllegalHandleType),
        }
    }

    pub fn as_connection(&self) -> Result<&Arc<AsyncMutex<LeasedConnection>>> {
        match self {
            Self::Connection(conn) => Ok(conn),
            _ => Err(PowerSyncTauriError::IllegalHandleType),
        }
    }
}

#[derive(Default)]
pub struct JavaScriptHandles {
    next_handle_id: AtomicUsize,
    handles: Mutex<HashMap<Handle, SharedWithJavaScript>>,
}

impl JavaScriptHandles {
    pub fn put(&self, value: SharedWithJavaScript) -> Handle {
        let id = self
            .next_handle_id
            .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
        let mut handles = self.handles.lock().unwrap();
        handles.insert(id, value);

        id
    }

    pub fn lookup(&self, handle: Handle) -> Result<SharedWithJavaScript> {
        let handles = self.handles.lock().unwrap();
        handles
            .get(&handle)
            .cloned()
            .ok_or_else(|| PowerSyncTauriError::IllegalHandle(handle))
    }

    pub fn delete(&self, handle: Handle) -> Result<()> {
        let mut handles = self.handles.lock().unwrap();
        handles
            .remove(&handle)
            .ok_or_else(|| PowerSyncTauriError::IllegalHandle(handle))?;
        Ok(())
    }
}
