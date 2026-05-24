class RealmObject {}

class Realm {
  static Object = RealmObject;
  static open() {
    return Promise.resolve(new Realm());
  }
  objects() {
    return {
      filtered: () => [],
      snapshot: () => [],
    };
  }
  write(callback) {
    if (callback) callback();
  }
  create() {}
  delete() {}
  close() {}
  get isClosed() { return false; }
}

Realm.schema = {};
Realm.defaultPath = '';
Realm.clearTestState = () => {};

module.exports = Realm;
