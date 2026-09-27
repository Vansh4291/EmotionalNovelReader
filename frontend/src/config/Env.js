/**
 * Build-time environment values.
 *
 * This file ships placeholder values. For local development, copy it to
 * `Env.local.js` (gitignored) and fill in your machine's values; Metro
 * resolves `./Env` to `Env.local.js` first via the metro config alias.
 *
 * In release builds, inject real values through your CI pipeline.
 */
import { Platform } from 'react-native';

const DEV_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';

export const API_BASE_URL_OVERRIDE = null; // e.g. 'http://192.168.1.20:3000/api'
export const API_KEY = ''; // set in Env.local.js for development

export default {
  API_BASE_URL_OVERRIDE,
  API_KEY,
};
