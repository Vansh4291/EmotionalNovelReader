/**
 * Validation harness entry (dev tooling only).
 *
 * 1. Registers the REAL Realm model schemas with the shim.
 * 2. Mounts the REAL App (App.tsx) — all screens/stores/services are the
 *    application's actual code.
 * 3. Seeds nothing: the DB starts EMPTY so empty states can be inspected, and
 *    exposes window.__VALIDATION__ hooks for the validator to import a
 *    realistic long-form novel through the real import pipeline
 *    (DocumentPicker shim → bookProcessor → backend → Realm).
 * 4. Exposes TTS/Web Speech availability and call log for journey assertions.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { registerSchemas, __resetRealm } from './realm.js';

// Real model classes (static .schema only; realm module itself is shimmed).
import { Book } from '../../src/models/Book';
import { Chapter } from '../../src/models/Chapter';
import { Sentence } from '../../src/models/Sentence';
import { UserProgress } from '../../src/models/UserProgress';
import { Bookmark } from '../../src/models/Bookmark';
import { UserSettings } from '../../src/models/UserSettings';

registerSchemas([Book, Chapter, Sentence, UserProgress, Bookmark, UserSettings]);

// Real application.
import App from '../../App';

async function boot() {
  // Same-origin config endpoint provided by validation-server (loopback only):
  // gives the harness the API key to inject so getApiKey() works without any
  // secret being written into harness files.
  try {
    const res = await fetch('/validation-config');
    const cfg = await res.json();
    if (cfg && cfg.apiKey) globalThis.__API_KEY__ = cfg.apiKey;
  } catch (e) {
    console.warn('[harness] no validation-config endpoint; API calls will 401');
  }
  const rootEl = document.getElementById('root');
  const root = createRoot(rootEl);
  root.render(<App />);
  return root;
}

// ---- Validation hooks -------------------------------------------------------

const VALIDATION = {
  resetDb: () => { __resetRealm(); location.reload(); },
  dumpDb: () => JSON.parse(localStorage.getItem('enr-validation-realm-v1') || '{}'),

  /**
   * Import a file through the real pipeline: stages bytes for the
   * DocumentPicker/RNFS shims, then the validator clicks the Library "+" FAB.
   */
  stageImport({ name, bytes, mime }) {
    const path = `/validation/${name}`;
    globalThis.__PICKED_FILE__ = { path, text: bytes };
    globalThis.__STAGE_IMPORT__ = async () => ({ path, name, bytes, mime });
    return path;
  },

  clearStagedImport() {
    delete globalThis.__PICKED_FILE__;
    delete globalThis.__STAGE_IMPORT__;
  },

  alerts: () => window.__ALERTS__ || [],
  ttsLog: () => window.__TTS_LOG__ || [],
  ttsAvailable: () => 'speechSynthesis' in window,

  /** Backend reachability from the harness (same origin checks as app). */
  backendUrl: () => null, // resolved by validator via API_BASE_URL export
};

// API base: on web, Platform.OS === 'web' resolves host to 'localhost' in
// config/api.js — but the harness page is served from :8088, so point the
// override at the same-origin /api proxy instead.
globalThis.__API_BASE_URL__ = '/api';

window.__VALIDATION__ = VALIDATION;

boot();
