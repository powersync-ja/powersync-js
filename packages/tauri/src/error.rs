use crate::handle::Handle;
use powersync::error::PowerSyncError;
use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum PowerSyncTauriError {
    #[error("{0}")]
    PowerSync(#[from] PowerSyncError),
    #[error("Handle {0} is not valid for the caller.")]
    IllegalHandle(Handle),
    #[error("Passed handle of wrong type")]
    IllegalHandleType,
    #[error("Could not obtain connection within timeout")]
    TimeoutExpired,
}

impl Serialize for PowerSyncTauriError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type Result<T> = std::result::Result<T, PowerSyncTauriError>;
