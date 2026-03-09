use powersync::error::PowerSyncError;

pub type Result<T> = std::result::Result<T, PowerSyncError>;
