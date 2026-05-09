use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

fn now_ms() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_millis() as i64)
    .unwrap_or(0)
}

fn sqlite_path(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("app data dir: {e}"))?;
  fs::create_dir_all(&dir).map_err(|e| format!("create app data dir: {e}"))?;
  Ok(dir.join("sj-store-pro.sqlite"))
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
  let path = sqlite_path(app)?;
  let conn = Connection::open(path).map_err(|e| format!("open sqlite: {e}"))?;
  conn.execute_batch(
    "
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS collections (
      uid TEXT NOT NULL,
      collection_name TEXT NOT NULL,
      records_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (uid, collection_name)
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      uid TEXT PRIMARY KEY,
      ops_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    ",
  )
  .map_err(|e| format!("init sqlite schema: {e}"))?;
  Ok(conn)
}

fn ok() -> Value {
  json!({ "ok": true })
}

#[tauri::command]
fn sqlite_init(app: AppHandle) -> Result<Value, String> {
  let path = sqlite_path(&app)?;
  open_db(&app)?;
  Ok(json!({ "ok": true, "path": path.to_string_lossy() }))
}

#[tauri::command]
fn sqlite_get_collection(app: AppHandle, uid: String, col: String) -> Result<Value, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT records_json FROM collections WHERE uid = ?1 AND collection_name = ?2")
    .map_err(|e| format!("prepare get collection: {e}"))?;
  let raw: Option<String> = stmt
    .query_row(params![uid, col], |row| row.get(0))
    .optional()
    .map_err(|e| format!("query collection: {e}"))?;
  let records: Vec<Value> = raw
    .and_then(|text| serde_json::from_str(&text).ok())
    .unwrap_or_default();
  Ok(json!({ "ok": true, "records": records }))
}

#[tauri::command]
fn sqlite_put_collection(app: AppHandle, uid: String, col: String, records: Vec<Value>) -> Result<Value, String> {
  let conn = open_db(&app)?;
  let raw = serde_json::to_string(&records).map_err(|e| format!("serialize records: {e}"))?;
  conn.execute(
    "
    INSERT INTO collections (uid, collection_name, records_json, updated_at)
    VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(uid, collection_name)
    DO UPDATE SET records_json = excluded.records_json, updated_at = excluded.updated_at
    ",
    params![uid, col, raw, now_ms()],
  )
  .map_err(|e| format!("put collection: {e}"))?;
  Ok(ok())
}

#[tauri::command]
fn sqlite_import_snapshot(app: AppHandle, uid: String, snapshot: HashMap<String, Vec<Value>>) -> Result<Value, String> {
  let mut conn = open_db(&app)?;
  let tx = conn.transaction().map_err(|e| format!("begin import: {e}"))?;
  for (col, records) in snapshot {
    let raw = serde_json::to_string(&records).map_err(|e| format!("serialize snapshot: {e}"))?;
    tx.execute(
      "
      INSERT INTO collections (uid, collection_name, records_json, updated_at)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(uid, collection_name)
      DO UPDATE SET records_json = excluded.records_json, updated_at = excluded.updated_at
      ",
      params![uid, col, raw, now_ms()],
    )
    .map_err(|e| format!("import collection: {e}"))?;
  }
  tx.commit().map_err(|e| format!("commit import: {e}"))?;
  Ok(ok())
}

#[tauri::command]
fn sqlite_status(app: AppHandle, uid: String) -> Result<Value, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT collection_name, records_json FROM collections WHERE uid = ?1")
    .map_err(|e| format!("prepare status: {e}"))?;
  let mut rows = stmt.query(params![uid]).map_err(|e| format!("query status: {e}"))?;
  let mut collections: HashMap<String, usize> = HashMap::new();
  while let Some(row) = rows.next().map_err(|e| format!("read status row: {e}"))? {
    let col: String = row.get(0).map_err(|e| format!("status col: {e}"))?;
    let raw: String = row.get(1).map_err(|e| format!("status json: {e}"))?;
    let count = serde_json::from_str::<Vec<Value>>(&raw).map(|items| items.len()).unwrap_or(0);
    collections.insert(col, count);
  }
  Ok(json!({ "ok": true, "collections": collections }))
}

#[tauri::command]
fn sqlite_get_sync_queue(app: AppHandle, uid: String) -> Result<Value, String> {
  let conn = open_db(&app)?;
  let mut stmt = conn
    .prepare("SELECT ops_json FROM sync_queue WHERE uid = ?1")
    .map_err(|e| format!("prepare queue: {e}"))?;
  let raw: Option<String> = stmt
    .query_row(params![uid], |row| row.get(0))
    .optional()
    .map_err(|e| format!("query queue: {e}"))?;
  let ops: Vec<Value> = raw
    .and_then(|text| serde_json::from_str(&text).ok())
    .unwrap_or_default();
  Ok(json!({ "ok": true, "ops": ops }))
}

#[tauri::command]
fn sqlite_replace_sync_queue(app: AppHandle, uid: String, ops: Vec<Value>) -> Result<Value, String> {
  let conn = open_db(&app)?;
  let raw = serde_json::to_string(&ops).map_err(|e| format!("serialize queue: {e}"))?;
  conn.execute(
    "
    INSERT INTO sync_queue (uid, ops_json, updated_at)
    VALUES (?1, ?2, ?3)
    ON CONFLICT(uid)
    DO UPDATE SET ops_json = excluded.ops_json, updated_at = excluded.updated_at
    ",
    params![uid, raw, now_ms()],
  )
  .map_err(|e| format!("replace queue: {e}"))?;
  Ok(ok())
}

#[tauri::command]
fn sqlite_clear_sync_queue(app: AppHandle, uid: String) -> Result<Value, String> {
  let conn = open_db(&app)?;
  conn.execute("DELETE FROM sync_queue WHERE uid = ?1", params![uid])
    .map_err(|e| format!("clear queue: {e}"))?;
  Ok(ok())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      sqlite_init,
      sqlite_get_collection,
      sqlite_put_collection,
      sqlite_import_snapshot,
      sqlite_status,
      sqlite_get_sync_queue,
      sqlite_replace_sync_queue,
      sqlite_clear_sync_queue
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
