/**
 * Browser shim for react-native-fs (validation harness ONLY).
 * localDatabase/bookProcessor only use RNFS.readFile for local TXT parsing;
 * the harness stages a picked File in globalThis.__PICKED_FILE__.
 */
const RNFS = {
  async readFile(filePath, encoding) {
    const staged = globalThis.__PICKED_FILE__;
    if (!staged) throw new Error('RNFS shim: no file staged (set globalThis.__PICKED_FILE__)');
    if (staged.path && staged.path !== filePath) {
      throw new Error(`RNFS shim: staged file is ${staged.path}, requested ${filePath}`);
    }
    return staged.text;
  },
  exists() { return Promise.resolve(false); },
  readDir() { return Promise.resolve([]); },
  DocumentDirectoryPath: '/validation',
  CachesDirectoryPath: '/validation/cache',
};

export default RNFS;
