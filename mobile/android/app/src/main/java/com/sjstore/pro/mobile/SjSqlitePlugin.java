package com.sjstore.pro.mobile;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Iterator;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "SjSqlite")
public class SjSqlitePlugin extends Plugin {
  private StoreDb db;

  @Override
  public void load() {
    db = new StoreDb(getContext());
  }

  private SQLiteDatabase writable() {
    return db.getWritableDatabase();
  }

  private long nowMs() {
    return System.currentTimeMillis();
  }

  private JSObject ok() {
    JSObject ret = new JSObject();
    ret.put("ok", true);
    return ret;
  }

  @PluginMethod
  public void init(PluginCall call) {
    writable();
    call.resolve(ok());
  }

  @PluginMethod
  public void getCollection(PluginCall call) {
    String uid = call.getString("uid", "");
    String col = call.getString("col", "");
    JSObject ret = ok();
    ret.put("records", readCollection(uid, col));
    call.resolve(ret);
  }

  @PluginMethod
  public void putCollection(PluginCall call) {
    String uid = call.getString("uid", "");
    String col = call.getString("col", "");
    JSArray records = call.getArray("records", new JSArray());
    writeCollection(uid, col, records.toString());
    call.resolve(ok());
  }

  @PluginMethod
  public void importSnapshot(PluginCall call) {
    String uid = call.getString("uid", "");
    JSObject snapshot = call.getObject("snapshot", new JSObject());
    SQLiteDatabase sql = writable();
    sql.beginTransaction();
    try {
      Iterator<String> keys = snapshot.keys();
      while (keys.hasNext()) {
        String col = keys.next();
        Object value = snapshot.get(col);
        String records = value instanceof JSONArray ? value.toString() : "[]";
        writeCollection(sql, uid, col, records);
      }
      sql.setTransactionSuccessful();
      call.resolve(ok());
    } catch (Exception e) {
      call.reject(e.getMessage());
    } finally {
      sql.endTransaction();
    }
  }

  @PluginMethod
  public void status(PluginCall call) {
    String uid = call.getString("uid", "");
    JSObject collections = new JSObject();
    try (Cursor cursor = writable().rawQuery(
      "SELECT collection_name, records_json FROM collections WHERE uid = ?",
      new String[] { uid }
    )) {
      while (cursor.moveToNext()) {
        String col = cursor.getString(0);
        String raw = cursor.getString(1);
        int count = 0;
        try {
          count = new JSONArray(raw).length();
        } catch (Exception ignored) {}
        collections.put(col, count);
      }
    }
    JSObject ret = ok();
    ret.put("collections", collections);
    call.resolve(ret);
  }

  @PluginMethod
  public void getSyncQueue(PluginCall call) {
    String uid = call.getString("uid", "");
    JSObject ret = ok();
    ret.put("ops", readQueue(uid));
    call.resolve(ret);
  }

  @PluginMethod
  public void replaceSyncQueue(PluginCall call) {
    String uid = call.getString("uid", "");
    JSArray ops = call.getArray("ops", new JSArray());
    ContentValues values = new ContentValues();
    values.put("uid", uid);
    values.put("ops_json", ops.toString());
    values.put("updated_at", nowMs());
    writable().replace("sync_queue", null, values);
    call.resolve(ok());
  }

  @PluginMethod
  public void clearSyncQueue(PluginCall call) {
    String uid = call.getString("uid", "");
    writable().delete("sync_queue", "uid = ?", new String[] { uid });
    call.resolve(ok());
  }

  private JSArray readCollection(String uid, String col) {
    try (Cursor cursor = writable().rawQuery(
      "SELECT records_json FROM collections WHERE uid = ? AND collection_name = ?",
      new String[] { uid, col }
    )) {
      if (cursor.moveToFirst()) return new JSArray(cursor.getString(0));
    } catch (Exception ignored) {}
    return new JSArray();
  }

  private JSArray readQueue(String uid) {
    try (Cursor cursor = writable().rawQuery(
      "SELECT ops_json FROM sync_queue WHERE uid = ?",
      new String[] { uid }
    )) {
      if (cursor.moveToFirst()) return new JSArray(cursor.getString(0));
    } catch (Exception ignored) {}
    return new JSArray();
  }

  private void writeCollection(String uid, String col, String records) {
    writeCollection(writable(), uid, col, records);
  }

  private void writeCollection(SQLiteDatabase sql, String uid, String col, String records) {
    ContentValues values = new ContentValues();
    values.put("uid", uid);
    values.put("collection_name", col);
    values.put("records_json", records);
    values.put("updated_at", nowMs());
    sql.replace("collections", null, values);
  }

  private static class StoreDb extends SQLiteOpenHelper {
    StoreDb(Context context) {
      super(context, "sj-store-pro.sqlite", null, 1);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
      db.execSQL(
        "CREATE TABLE IF NOT EXISTS collections (" +
          "uid TEXT NOT NULL, " +
          "collection_name TEXT NOT NULL, " +
          "records_json TEXT NOT NULL, " +
          "updated_at INTEGER NOT NULL, " +
          "PRIMARY KEY (uid, collection_name)" +
        ")"
      );
      db.execSQL(
        "CREATE TABLE IF NOT EXISTS sync_queue (" +
          "uid TEXT PRIMARY KEY, " +
          "ops_json TEXT NOT NULL, " +
          "updated_at INTEGER NOT NULL" +
        ")"
      );
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
      onCreate(db);
    }
  }
}
