/**
 * Jest per-test-file setup: redirect all persisted backend data (books/
 * progress/bookmarks JSON stores and the uploads directory) into a unique
 * temp directory for THIS test file.
 *
 * setupFiles runs once per test file, before the file's requires, so every
 * suite gets fully isolated storage. This prevents:
 *  - parallel workers racing on backend/books_db.json (Windows EPERM on the
 *    atomic-rename save),
 *  - cross-suite flakiness when one suite counts files in a shared uploads
 *    dir while another suite has an import in flight,
 *  - tests ever touching the developer's real database.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const worker = process.env.JEST_WORKER_ID || 'main';
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `enr-backend-${worker}-`));
process.env.DATA_DIR = dataDir;
process.env.UPLOAD_DIR = path.join(dataDir, 'uploads');
fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
