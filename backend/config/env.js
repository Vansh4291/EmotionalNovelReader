/**
 * Centralized, validated environment configuration for the backend.
 *
 * Fails fast at boot when required values are missing in production so that
 * insecure defaults can never silently leak into a production deployment.
 */

function loadEnv() {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test' || process.env.JEST_WORKER_ID !== undefined;

  const apiKey = process.env.API_KEY;

  if (isProduction && (!apiKey || apiKey === 'dev-key-change-in-production')) {
    throw new Error(
      'API_KEY must be set to a strong value in production. ' +
      'Refusing to start with a missing or development API key.'
    );
  }

  const resolvedApiKey = apiKey || (isTest ? 'test-api-key' : 'dev-key-change-in-production');

  const port = parseInt(process.env.BACKEND_PORT || '3000', 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid BACKEND_PORT: ${process.env.BACKEND_PORT}`);
  }

  const corsOriginsRaw = process.env.CORS_ORIGIN;
  const corsOrigins = corsOriginsRaw
    ? corsOriginsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  // When true, trust the X-Forwarded-For header for client IPs (set when the
  // server runs behind a reverse proxy / load balancer). Defaults to false.
  const trustProxy = process.env.TRUST_PROXY === 'true';

  const maxUploadMb = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);
  if (Number.isNaN(maxUploadMb) || maxUploadMb <= 0 || maxUploadMb > 200) {
    throw new Error(`Invalid MAX_UPLOAD_MB: ${process.env.MAX_UPLOAD_MB}`);
  }

  const logLevel = (process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')).toLowerCase();

  return {
    nodeEnv,
    isProduction,
    isTest,
    apiKey: resolvedApiKey,
    port,
    corsOrigins, // null => reflect request origin (local single-user dev default)
    trustProxy,
    maxUploadBytes: maxUploadMb * 1024 * 1024,
    logLevel,
  };
}

const env = loadEnv();

module.exports = env;
