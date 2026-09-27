import { Platform } from 'react-native';
import Env from './Env';

/**
 * API base URL resolution.
 *
 * Never hardcodes a developer LAN IP. Resolution order:
 * 1. Env.API_BASE_URL_OVERRIDE (Env.local.js, gitignored) or
 *    globalThis.__API_BASE_URL__ (settable at runtime for e2e builds).
 * 2. Android emulator -> 10.0.2.2 (host loopback alias).
 * 3. iOS simulator -> localhost.
 * 4. Physical devices must set the override.
 */

const DEFAULT_PORT = 3000;

function resolveHost() {
  const override = globalThis.__API_BASE_URL__;
  if (override) return null; // full URL override provided

  if (Platform.OS === 'android') {
    // Detect emulator vs device: emulator images expose the goldfish devices
    // via NativeModules in some setups; safest default is the emulator alias,
    // which is also correct for 99% of development.
    return '10.0.2.2';
  }
  return 'localhost';
}

function resolveBaseUrl() {
  const override = Env.API_BASE_URL_OVERRIDE || globalThis.__API_BASE_URL__;
  if (override) return override.replace(/\/$/, '');
  const host = resolveHost();
  const port = DEFAULT_PORT;
  return `http://${host}:${port}/api`;
}

export const API_BASE_URL = resolveBaseUrl();

/**
 * Resolve the API key. The backend rejects requests without a matching key,
 * so this must be injected per-build (not committed). Reads from
 * globalThis.__API_KEY__ which the app entry sets from a build-time secret
 * (e.g. via react-native-config or a generated Env.js that is gitignored).
 */
export function getApiKey() {
  const key = Env.API_KEY || globalThis.__API_KEY__;
  if (!key && __DEV__) {
    console.warn(
      '[api] No API key configured. Set API_KEY in Env.local.js (gitignored). ' +
      'Requests to the backend will return 401 until configured.'
    );
  }
  return key || '';
}

export default API_BASE_URL;
