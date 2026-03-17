use crate::database::TauriDatabaseState;
use crate::error::PowerSyncTauriError;
use crate::handle::{Handle, SharedWithJavaScript};
use crate::{PowerSync, Result};
use http_client::http_types::convert::Serialize;
use powersync::error::PowerSyncError;
use powersync::schema::SchemaOrCustom;
use powersync::{StreamPriority, StreamSubscriptionOptions};
use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ToSqlOutput, ValueRef};
use rusqlite::{params_from_iter, Connection, ToSql};
use serde::de::{Error, SeqAccess, Visitor};
use serde::ser::SerializeSeq;
use serde::{Deserialize, Deserializer, Serializer};
use serde_json::value::RawValue;
use std::fmt::Formatter;
use std::sync::Arc;
use std::time::Duration;
use tauri::async_runtime::Mutex;
use tauri::{command, AppHandle, Runtime, State};

#[derive(Deserialize)]
pub enum Command {
    OpenDatabase(OpenDatabase),
    CloseHandle(Handle),
    AcquireConnection {
        database: Handle,
        write: bool,
        timeout: Option<f64>,
    },
    ExecuteSql(ExecuteSql),
    ExecuteBatch(ExecuteBatch),
    Disconnect(Handle),
    SubscribeToStream(SubscribeToStream),
    UnsubscribeAll {
        database: Handle,
        name: String,
        parameters: Option<serde_json::Value>,
    },
}

#[derive(Deserialize)]
pub struct OpenDatabase {
    pub name: String,
    pub schema: Box<RawValue>,
}

#[derive(Deserialize)]
pub struct ExecuteSql {
    pub connection: Handle,
    pub sql: String,
    pub params: Vec<SqliteValue>,
}

impl ExecuteSql {
    fn run(
        &self,
        connection: &Connection,
    ) -> std::result::Result<ExecuteSqlResult, PowerSyncError> {
        let mut stmt = connection.prepare(&self.sql)?;
        let params = params_from_iter(&self.params);

        let column_names = stmt.column_names().iter().map(|s| s.to_string()).collect();
        let num_columns = stmt.column_count();
        let mut cursor = stmt.query(params)?;
        let mut rows = Vec::new();

        while let Some(row) = cursor.next()? {
            let mut wrapped_row: Vec<SqliteValue> = Vec::with_capacity(num_columns);
            for i in 0..num_columns {
                wrapped_row.push(row.get(i)?);
            }

            rows.push(wrapped_row);
        }

        Ok(ExecuteSqlResult {
            is_autocommit: connection.is_autocommit(),
            last_insert_rowid: connection.last_insert_rowid(),
            changes: connection.changes(),
            column_names,
            rows,
        })
    }
}

#[derive(Deserialize)]
pub struct ExecuteBatch {
    pub connection: Handle,
    pub sql: String,
    pub params: Vec<Vec<SqliteValue>>,
}

impl ExecuteBatch {
    fn run(&self, connection: &Connection) -> std::result::Result<CommandResult, PowerSyncError> {
        let mut stmt = connection.prepare(&self.sql)?;
        for instantiation in &self.params {
            let mut cursor = stmt.query(params_from_iter(instantiation.iter()))?;
            while let Some(_) = cursor.next()? {}
        }

        Ok(CommandResult::ExecuteBatchResult {
            last_insert_rowid: connection.last_insert_rowid(),
            changes: connection.changes(),
        })
    }
}

pub enum SqliteValue {
    Text(String),
    Integer(i64),
    Real(f64),
    Blob(Vec<u8>),
    Null,
}

impl<'de> Deserialize<'de> for SqliteValue {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct ValueVisitor;

        impl<'de> Visitor<'de> for ValueVisitor {
            type Value = SqliteValue;

            fn expecting(&self, formatter: &mut Formatter) -> std::fmt::Result {
                write!(
                    formatter,
                    "Expected a SQLite value (string, number, array of bytes, null)"
                )
            }

            fn visit_i64<E>(self, v: i64) -> std::result::Result<Self::Value, E>
            where
                E: Error,
            {
                Ok(SqliteValue::Integer(v))
            }

            fn visit_f64<E>(self, v: f64) -> std::result::Result<Self::Value, E>
            where
                E: Error,
            {
                Ok(SqliteValue::Real(v))
            }

            fn visit_str<E>(self, v: &str) -> std::result::Result<Self::Value, E>
            where
                E: Error,
            {
                Ok(SqliteValue::Text(v.to_owned()))
            }

            fn visit_unit<E>(self) -> std::result::Result<Self::Value, E>
            where
                E: Error,
            {
                Ok(SqliteValue::Null)
            }

            fn visit_seq<A>(self, mut seq: A) -> std::result::Result<Self::Value, A::Error>
            where
                A: SeqAccess<'de>,
            {
                let mut items: Vec<u8> = match seq.size_hint() {
                    Some(size) => Vec::with_capacity(size),
                    None => Vec::new(),
                };

                while let Some(item) = seq.next_element()? {
                    items.push(item);
                }

                Ok(SqliteValue::Blob(items))
            }
        }

        deserializer.deserialize_any(ValueVisitor)
    }
}

impl Serialize for SqliteValue {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            SqliteValue::Text(text) => serializer.serialize_str(text),
            SqliteValue::Integer(int) => serializer.serialize_i64(*int),
            SqliteValue::Real(double) => serializer.serialize_f64(*double),
            SqliteValue::Blob(bytes) => {
                let mut seq = serializer.serialize_seq(Some(bytes.len()))?;
                for byte in bytes {
                    seq.serialize_element(byte)?;
                }
                seq.end()
            }
            SqliteValue::Null => serializer.serialize_unit(),
        }
    }
}

impl FromSql for SqliteValue {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        Ok(match value {
            ValueRef::Null => Self::Null,
            ValueRef::Integer(int) => Self::Integer(int),
            ValueRef::Real(double) => Self::Real(double),
            ValueRef::Text(text) => Self::Text(
                str::from_utf8(text)
                    .map_err(FromSqlError::other)?
                    .to_string(),
            ),
            ValueRef::Blob(bytes) => Self::Blob(bytes.into()),
        })
    }
}

impl ToSql for SqliteValue {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        Ok(match self {
            SqliteValue::Text(text) => ToSqlOutput::Borrowed(ValueRef::Text(text.as_bytes())),
            SqliteValue::Integer(int) => ToSqlOutput::Borrowed(ValueRef::Integer(*int)),
            SqliteValue::Real(double) => ToSqlOutput::Borrowed(ValueRef::Real(*double)),
            SqliteValue::Blob(bytes) => ToSqlOutput::Borrowed(ValueRef::Blob(bytes)),
            SqliteValue::Null => ToSqlOutput::Borrowed(ValueRef::Null),
        })
    }
}

#[derive(Serialize)]
pub struct ExecuteSqlResult {
    pub is_autocommit: bool,
    pub last_insert_rowid: i64,
    pub changes: u64,
    pub column_names: Vec<String>,
    pub rows: Vec<Vec<SqliteValue>>,
}

#[derive(Deserialize)]
pub struct SubscribeToStream {
    database: Handle,
    name: String,
    parameters: Option<serde_json::Value>,
    ttl: Option<f64>,
    priority: Option<StreamPriority>,
}

#[derive(Serialize)]
pub enum CommandResult {
    CreatedHandle(Handle),
    ExecuteSqlResult(ExecuteSqlResult),
    ExecuteBatchResult {
        last_insert_rowid: i64,
        changes: u64,
    },
    Void,
}

#[command]
pub(crate) async fn powersync<R: Runtime>(
    app: AppHandle<R>,
    powersync: State<'_, PowerSync<R>>,
    command: Command,
) -> Result<CommandResult> {
    let response = match command {
        Command::OpenDatabase(open) => {
            let db =
                powersync.open_database(&open.name, SchemaOrCustom::from(open.schema.as_ref()))?;

            CommandResult::CreatedHandle(powersync.handles.put(SharedWithJavaScript::Database(
                Arc::new(TauriDatabaseState::new(app, &open.name, db)),
            )))
        }
        Command::CloseHandle(handle) => {
            powersync.handles.delete(handle)?;
            CommandResult::Void
        }
        Command::AcquireConnection {
            database,
            write,
            timeout,
        } => {
            let timeout = timeout.map(Duration::from_secs_f64);

            let handle = powersync.handles.lookup(database)?;
            let resolved = handle.as_database()?;

            let obtain_connection = async {
                if write {
                    resolved.writer().await
                } else {
                    resolved.reader().await
                }
            };

            let conn = Arc::new(Mutex::new(match timeout {
                Some(timeout) => tokio::time::timeout(timeout, obtain_connection)
                    .await
                    .map_err(|_| PowerSyncTauriError::TimeoutExpired)?,
                None => obtain_connection.await,
            }?));
            CommandResult::CreatedHandle(
                powersync
                    .handles
                    .put(SharedWithJavaScript::Connection(conn)),
            )
        }
        Command::ExecuteSql(ref stmt) => {
            let handle = powersync.handles.lookup(stmt.connection)?;
            let connection = handle.as_connection()?;
            let connection = connection.lock().await;

            CommandResult::ExecuteSqlResult(stmt.run(&*connection)?)
        }
        Command::ExecuteBatch(batch) => {
            let handle = powersync.handles.lookup(batch.connection)?;
            let connection = handle.as_connection()?;
            let connection = connection.lock().await;

            batch.run(&*connection)?
        }
        Command::Disconnect(handle) => {
            let handle = powersync.handles.lookup(handle)?;
            let database = handle.as_database()?;
            database.disconnect().await;

            CommandResult::Void
        }
        Command::SubscribeToStream(subscribe) => {
            let handle = powersync.handles.lookup(subscribe.database)?;
            let database = handle.as_database()?;
            let subscription = database
                .sync_stream(&subscribe.name, subscribe.parameters.as_ref())
                .subscribe_with({
                    let mut options: StreamSubscriptionOptions = Default::default();
                    if let Some(ttl) = subscribe.ttl {
                        options.with_ttl(Duration::from_secs_f64(ttl));
                    }
                    if let Some(priority) = subscribe.priority {
                        options.with_priority(priority);
                    }

                    options
                })
                .await?;

            CommandResult::CreatedHandle(
                powersync
                    .handles
                    .put(SharedWithJavaScript::Subscription(subscription)),
            )
        }
        Command::UnsubscribeAll {
            database,
            name,
            parameters,
        } => {
            let handle = powersync.handles.lookup(database)?;
            let database = handle.as_database()?;
            database
                .sync_stream(&name, parameters.as_ref())
                .unsubscribe_all()
                .await?;

            CommandResult::Void
        }
    };

    Ok(response)
}
