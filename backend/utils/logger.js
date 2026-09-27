/**
 * Leveled logger for the backend.
 *
 * - debug/info/warn/error levels, selected via LOG_LEVEL (config/env.js).
 * - Never logs request bodies, headers, or API keys.
 * - Error stacks are printed only outside production; production gets
 *   name + message so stack traces (which may reveal paths/versions)
 *   stay out of stdout.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let currentLevel = 'debug';
let isProduction = false;

function configure({ level, isProd }) {
  if (LEVELS[level] !== undefined) currentLevel = level;
  isProduction = !!isProd;
}

function write(level, args) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] ${args
    .map((a) => (a instanceof Error ? (isProduction ? a.message : (a.stack || a.message)) : String(a)))
    .join(' ')}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  configure,
  debug: (...args) => write('debug', args),
  info: (...args) => write('info', args),
  warn: (...args) => write('warn', args),
  error: (...args) => write('error', args),
};
