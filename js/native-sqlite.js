(function initNativeSqliteBridge() {
  const capacitorSqlite = () => window.Capacitor?.Plugins?.SjSqlite || null;
  const invoke = (...args) => {
    const coreInvoke = window.__TAURI__?.core?.invoke;
    const legacyInvoke = window.__TAURI__?.invoke;
    const fn = coreInvoke || legacyInvoke;
    if (!fn) throw new Error('Native invoke is not available');
    return fn(...args);
  };

  const hasTauri = () => !!(window.__TAURI__?.core?.invoke || window.__TAURI__?.invoke);
  const hasCapacitorSqlite = () => !!capacitorSqlite();
  if (!hasTauri() && !hasCapacitorSqlite()) return;

  const callNative = (command, payload = {}) => {
    const plugin = capacitorSqlite();
    if (plugin) {
      const methods = {
        sqlite_init: 'init',
        sqlite_get_collection: 'getCollection',
        sqlite_put_collection: 'putCollection',
        sqlite_import_snapshot: 'importSnapshot',
        sqlite_status: 'status',
        sqlite_get_sync_queue: 'getSyncQueue',
        sqlite_replace_sync_queue: 'replaceSyncQueue',
        sqlite_clear_sync_queue: 'clearSyncQueue'
      };
      const method = methods[command];
      if (!method || typeof plugin[method] !== 'function') {
        throw new Error(`Capacitor SQLite method is not available: ${command}`);
      }
      return plugin[method](payload);
    }
    return invoke(command, payload);
  };

  const collections = ['products', 'sales', 'transactions', 'installments', 'debts', 'repairs', 'warranties', 'workers'];
  const state = {
    ready: false,
    users: new Map(),
    queue: new Map(),
    status: new Map(),
    loading: new Map()
  };

  const clone = (value) => JSON.parse(JSON.stringify(value ?? null));
  const key = (uid, col) => `${uid || ''}:${col || ''}`;
  const currentUid = () => {
    try {
      return window.currentUserUid?.() || window._fsUid || localStorage.getItem('sj_uid') || '';
    } catch {
      return '';
    }
  };

  function setCollection(uid, col, records) {
    state.users.set(key(uid, col), Array.isArray(records) ? clone(records) : []);
  }

  function getCollection(uid, col) {
    const records = state.users.get(key(uid, col));
    return Array.isArray(records) ? clone(records) : null;
  }

  async function ensureUser(uid = currentUid()) {
    if (!uid) return false;
    if (state.loading.has(uid)) return state.loading.get(uid);
    const task = (async () => {
      await callNative('sqlite_init');
      const status = await callNative('sqlite_status', { uid });
      state.status.set(uid, status?.ok ? status : { ok: true, collections: {} });

      await Promise.all(collections.map(async (col) => {
        const response = await callNative('sqlite_get_collection', { uid, col });
        if (response?.ok && Array.isArray(response.records)) setCollection(uid, col, response.records);
      }));

      const queue = await callNative('sqlite_get_sync_queue', { uid });
      state.queue.set(uid, queue?.ok && Array.isArray(queue.ops) ? queue.ops : []);
      state.ready = true;
      return true;
    })().catch((error) => {
      console.warn('nativeSqlite.ensureUser:', error?.message || error);
      return false;
    }).finally(() => {
      state.loading.delete(uid);
    });
    state.loading.set(uid, task);
    return task;
  }

  function syncWrite(command, payload) {
    callNative(command, payload).catch((error) => {
      console.warn(`nativeSqlite.${command}:`, error?.message || error);
    });
  }

  window.nativeSqlite = {
    async init(uid = currentUid()) {
      await callNative('sqlite_init');
      state.ready = true;
      if (uid) await ensureUser(uid);
      return { ok: true };
    },

    async prepareUser(uid = currentUid()) {
      return ensureUser(uid);
    },

    statusSync(uid = currentUid()) {
      return state.status.get(uid) || { ok: true, collections: {} };
    },

    async status(uid = currentUid()) {
      await ensureUser(uid);
      return state.status.get(uid) || { ok: true, collections: {} };
    },

    getCollectionSync(uid = currentUid(), col) {
      return { ok: true, records: getCollection(uid, col) || [] };
    },

    async getCollection(uid = currentUid(), col) {
      await ensureUser(uid);
      return { ok: true, records: getCollection(uid, col) || [] };
    },

    putCollectionSync(uid = currentUid(), col, records = []) {
      setCollection(uid, col, records);
      syncWrite('sqlite_put_collection', { uid, col, records });
      return { ok: true };
    },

    async putCollection(uid = currentUid(), col, records = []) {
      setCollection(uid, col, records);
      const response = await callNative('sqlite_put_collection', { uid, col, records });
      const status = await callNative('sqlite_status', { uid });
      if (status?.ok) state.status.set(uid, status);
      return response;
    },

    importLocalSnapshotSync(uid = currentUid(), snapshot = {}) {
      Object.entries(snapshot || {}).forEach(([col, records]) => setCollection(uid, col, records));
      syncWrite('sqlite_import_snapshot', { uid, snapshot });
      return { ok: true };
    },

    async importLocalSnapshot(uid = currentUid(), snapshot = {}) {
      Object.entries(snapshot || {}).forEach(([col, records]) => setCollection(uid, col, records));
      const response = await callNative('sqlite_import_snapshot', { uid, snapshot });
      const status = await callNative('sqlite_status', { uid });
      if (status?.ok) state.status.set(uid, status);
      return response;
    },

    getSyncQueueSync(uid = currentUid()) {
      return { ok: true, ops: clone(state.queue.get(uid) || []) };
    },

    async getSyncQueue(uid = currentUid()) {
      await ensureUser(uid);
      return { ok: true, ops: clone(state.queue.get(uid) || []) };
    },

    replaceSyncQueueSync(uid = currentUid(), ops = []) {
      state.queue.set(uid, clone(Array.isArray(ops) ? ops : []));
      syncWrite('sqlite_replace_sync_queue', { uid, ops: state.queue.get(uid) });
      return { ok: true };
    },

    async replaceSyncQueue(uid = currentUid(), ops = []) {
      state.queue.set(uid, clone(Array.isArray(ops) ? ops : []));
      return callNative('sqlite_replace_sync_queue', { uid, ops: state.queue.get(uid) });
    },

    clearSyncQueueSync(uid = currentUid()) {
      state.queue.set(uid, []);
      syncWrite('sqlite_clear_sync_queue', { uid });
      return { ok: true };
    },

    async clearSyncQueue(uid = currentUid()) {
      state.queue.set(uid, []);
      return callNative('sqlite_clear_sync_queue', { uid });
    }
  };

  window.nativeSqlite.init().catch((error) => {
    console.warn('nativeSqlite initial load:', error?.message || error);
  });
})();
