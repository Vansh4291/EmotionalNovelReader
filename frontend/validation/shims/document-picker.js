/**
 * Browser shim for react-native-document-picker (validation harness ONLY).
 * The harness sets globalThis.__STAGE_IMPORT__ = ({name, bytes, mime}) => Promise
 * before triggering the import FAB; this shim routes DocumentPicker.pick()
 * through it so real import flow (upload → parse → save) is exercised.
 */

function cancelError() {
  const e = new Error('User canceled document picker');
  e.code = 'DOCUMENT_PICKER_CANCELED';
  return e;
}

const DocumentPicker = {
  types: {
    allFiles: '*/*',
    plainText: 'text/plain',
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
  },

  async pick(options) {
    if (typeof globalThis.__STAGE_IMPORT__ !== 'function') {
      throw cancelError();
    }
    const staged = await globalThis.__STAGE_IMPORT__();
    if (!staged) throw cancelError();
    return [
      {
        uri: staged.path,
        name: staged.name,
        type: staged.mime || 'application/octet-stream',
        size: staged.size != null ? staged.size : (staged.bytes ? staged.bytes.length : 0),
        __bytes: staged.bytes,
      },
    ];
  },

  isCancel(err) {
    return !!(err && (err.code === 'DOCUMENT_PICKER_CANCELED' || /cancel/i.test(err.message || '')));
  },

  releaseAccess() { return Promise.resolve(); },
};

export default DocumentPicker;
