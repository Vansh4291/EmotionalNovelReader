const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex');

const mutex = new Mutex();

async function atomicWrite(filePath, data) {
  const tmpPath = filePath + '.tmp.' + Date.now();
  const handle = await fs.open(tmpPath, 'w');
  try {
    await handle.writeFile(JSON.stringify(data, null, 2), 'utf-8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmpPath, filePath);
}

async function loadMapFromJson(filePath, mapInstance) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    parsed.forEach(([k, v]) => mapInstance.set(k, v));
    return true;
  } catch (e) {
    return false;
  }
}

async function saveMapToJson(filePath, mapInstance) {
  const release = await mutex.acquire();
  try {
    await atomicWrite(filePath, Array.from(mapInstance.entries()));
  } finally {
    release();
  }
}

function validateId(id, pattern) {
  if (!id || typeof id !== 'string') return false;
  if (pattern && !pattern.test(id)) return false;
  return true;
}

function sanitizeError(error) {
  return error && error.message ? error.message : 'Internal server error';
}

module.exports = { atomicWrite, loadMapFromJson, saveMapToJson, validateId, sanitizeError };
