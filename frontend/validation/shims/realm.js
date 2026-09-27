/**
 * Browser shim for `realm` (validation harness ONLY).
 *
 * Implements the exact query/write surface localDatabase.js uses, persisted
 * to localStorage so "close app and reopen" is a real test:
 *   Realm.open(config), realm.objects(name).filtered(...).sorted(...),
 *   realm.objectForPrimaryKey, realm.write, realm.create, realm.delete,
 *   list push (chapter.sentences.push(...)), live-object mutation
 *   (progress.currentChapterIndex = n / Object.assign(settings, {...})).
 *
 * Live-object semantics: reads return proxies over the stored record; when a
 * proxy is mutated inside realm.write(fn), the change is written through to
 * the underlying record and persisted — matching Realm's behavior.
 */
const STORAGE_KEY = 'enr-validation-realm-v1';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch (e) { return {}; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

const db = load();

function defaultFor(type) {
  switch (type) {
    case 'string': return '';
    case 'int': case 'float': case 'double': return 0;
    case 'bool': return false;
    case 'date': return null;
    default: return null;
  }
}

let inWrite = false;

/** Wrap a stored record so get/set hit the store directly (write-through). */
function liveObject(name, record) {
  const schema = RealmShim._schemas[name];
  return new Proxy(record, {
    get(target, prop) {
      if (prop === '__schema') return name;
      if (prop === '__pk') return schema.primaryKey;
      const v = target[prop];
      if (v && typeof v === 'object' && v.__date) return new Date(v.__date);
      if (Array.isArray(v)) return liveList(name, record, prop);
      return v;
    },
    set(target, prop, value) {
      target[prop] = value instanceof Date ? { __date: value.toISOString() } : value;
      if (inWrite) save();
      return true;
    },
    deleteProperty(target, prop) {
      delete target[prop];
      if (inWrite) save();
      return true;
    },
  });
}

/** List property (chapter.sentences) — push writes through. */
function liveList(name, record, prop) {
  const arr = record[prop];
  return new Proxy(arr, {
    get(target, p) {
      if (p === 'push') {
        return (...items) => {
          for (const it of items) {
            const clean = {};
            for (const [k, v] of Object.entries(it)) clean[k] = v instanceof Date ? { __date: v.toISOString() } : v;
            target.push(clean);
          }
          if (inWrite) save();
          return target.length;
        };
      }
      return target[p];
    },
  });
}

function matches(obj, query, args) {
  if (!query) return true;
  const clauses = query.split(' AND ').map((c) => c.trim());
  return clauses.every((clause) => {
    const m = clause.match(/^(\w+)\s*==\s*\$(\d+)$/);
    if (!m) throw new Error('RealmShim: unsupported query: ' + query);
    return obj[m[1]] === args[parseInt(m[2], 10)];
  });
}

class Results {
  constructor(items) { this._items = items; }
  filtered(query, ...args) {
    return new Results(this._items.filter((r) => matches(r.__raw, query, args)));
  }
  sorted(prop, reverse = false) {
    const arr = [...this._items].sort((a, b) => {
      const av = a[prop] instanceof Date ? a[prop].getTime() : a[prop];
      const bv = b[prop] instanceof Date ? b[prop].getTime() : b[prop];
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
    if (reverse) arr.reverse();
    return new Results(arr);
  }
  toArray() { return this._items; }
  get length() { return this._items.length; }
  *[Symbol.iterator]() { yield* this._items; }
}

// localDatabase.js uses results[0] — provide index access for common indexes.
for (let i = 0; i < 10; i++) {
  Object.defineProperty(Results.prototype, i, {
    get() { return this._items[i]; },
    configurable: true,
  });
}

export default class RealmShim {
  static open() { return Promise.resolve(RealmShim._instance || (RealmShim._instance = new RealmShim())); }
  static close() {}

  constructor() {}

  get isClosed() { return false; }
  close() {}

  objects(name) {
    const raw = db[name] || (db[name] = []);
    return new Results(raw.map((r) => liveObject(name, r)));
  }

  objectForPrimaryKey(name, pk) {
    const schema = RealmShim._schemas[name];
    const raw = db[name] || (db[name] = []);
    const found = raw.find((o) => o[schema.primaryKey] === pk);
    return found ? liveObject(name, found) : null;
  }

  write(fn) {
    inWrite = true;
    let result;
    try { result = fn(); } finally { inWrite = false; save(); }
    return result;
  }

  create(name, props) {
    const schema = RealmShim._schemas[name];
    const raw = db[name] || (db[name] = []);
    const record = {};
    for (const [k, def] of Object.entries(schema.properties)) {
      let v = props[k];
      if (v === undefined) {
        if (Array.isArray(def)) v = [];
        else if (typeof def === 'object' && def !== null) {
          v = def.default !== undefined ? def.default : (def.optional ? null : defaultFor(def.type));
        } else v = defaultFor(def);
      }
      record[k] = v instanceof Date ? { __date: v.toISOString() } : v;
    }
    raw.push(record);
    if (inWrite) save();
    return liveObject(name, record);
  }

  delete(target) {
    const targets = (Array.isArray(target) || target instanceof Results) ? Array.from(target) : [target];
    for (const t of targets) {
      if (!t) continue;
      const name = t.__schema;
      const schema = RealmShim._schemas[name];
      const raw = db[name] || [];
      const idx = raw.findIndex((o) => o[schema.primaryKey] === t[schema.primaryKey]);
      if (idx >= 0) raw.splice(idx, 1);
    }
    if (inWrite) save();
  }
}

RealmShim._schemas = {};
RealmShim._instance = null;
// Model classes are declared as `class Book extends Realm.Object` — provide
// a plain base class so the real model definitions load unmodified.
RealmShim.Object = class RealmObject {};

/** Register the real model classes' static .schema definitions. */
export function registerSchemas(modelClasses) {
  for (const C of modelClasses) {
    RealmShim._schemas[C.schema.name] = C.schema;
  }
}

/** Test/reset helpers. */
export function __resetRealm() {
  for (const k of Object.keys(db)) delete db[k];
  save();
}
export function __dumpRealm() {
  return JSON.parse(JSON.stringify(db));
}
export { db as __db };
