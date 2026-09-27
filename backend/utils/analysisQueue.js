const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');

const MAX_CONCURRENT = 2;
const MAX_QUEUE_DEPTH = 50;
const MAX_SENTENCES = 5000;
const PROCESS_TIMEOUT_MS = 30000;
let activeCount = 0;
const queue = [];

function processNext() {
  if (queue.length === 0 || activeCount >= MAX_CONCURRENT) return;
  const task = queue.shift();
  activeCount++;

  // Lazy require: emotionAnalyzer <-> analysisQueue form a module cycle, and
  // resolving it at call time avoids depending on partially-initialized
  // exports during load.
  const { analyzeChapter } = require('../emotion/emotionAnalyzer');

  runPythonAnalysis(task.sentences)
    .then((result) => task.resolve(mergeAnalysisResults(task.sentences, result) || analyzeChapter(task.sentences)))
    .catch(() => task.resolve(analyzeChapter(task.sentences)))
    .finally(() => {
      activeCount--;
      processNext();
    });
}

/**
 * Merge Python results onto the ORIGINAL sentence text. The Python model's
 * echoed text is never trusted: a stdin code-page mismatch would otherwise
 * corrupt sentence content. Only emotion/confidence come from the results;
 * text always stays byte-identical to what the parser extracted.
 */
function mergeAnalysisResults(sentences, results) {
  if (!Array.isArray(results) || results.length !== sentences.length) return null;
  return results.map((r, i) => ({
    index: i,
    text: sentences[i],
    emotion: typeof r?.emotion === 'string' ? r.emotion : 'neutral',
    confidence: typeof r?.confidence === 'number' ? r.confidence : 1.0,
  }));
}

/**
 * Spawn the Python emotion model. Tries `python` then `python3` so the
 * queue works across Windows/macOS/Linux. The child receives sentences on
 * stdin and returns JSON results on stdout. Always resolves (never rejects)
 * — null means "use the heuristic fallback".
 */
function runPythonAnalysis(sentences) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '..', 'emotion', 'python_emotion_model.py');

    const trySpawn = (command, onFail) => {
      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      let pyProcess;
      try {
        pyProcess = spawn(command, [scriptPath], {
          timeout: PROCESS_TIMEOUT_MS,
          // Guarantee UTF-8 stdio even on Pythons without reconfigure().
          env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        });
      } catch (err) {
        onFail();
        return;
      }

      let dataString = '';
      let spawnFailed = false;

      const timer = setTimeout(() => {
        try { pyProcess.kill(); } catch (e) { /* already dead */ }
        settle(null);
      }, PROCESS_TIMEOUT_MS);

      pyProcess.on('error', () => {
        spawnFailed = true;
        clearTimeout(timer);
        onFail();
      });

      pyProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pyProcess.on('close', (code) => {
        if (spawnFailed) return;
        clearTimeout(timer);
        if (code !== 0 || !dataString) {
          settle(null);
          return;
        }
        try {
          const results = JSON.parse(dataString);
          settle(Array.isArray(results) && results.length > 0 ? results : null);
        } catch (e) {
          settle(null);
        }
      });

      pyProcess.stdin.on('error', () => {
        // Ignore EPIPE if the child closed early; close handler decides.
      });

      const payload = JSON.stringify({ sentences: sentences.slice(0, MAX_SENTENCES) });
      try {
        const canContinue = pyProcess.stdin.write(payload);
        if (!canContinue) {
          pyProcess.stdin.once('drain', () => {
            try { pyProcess.stdin.end(); } catch (e) { /* closed */ }
          });
        } else {
          pyProcess.stdin.end();
        }
      } catch (err) {
        clearTimeout(timer);
        settle(null);
      }
    };

    trySpawn('python', () => {
      // `python` missing (common on macOS/Linux) — retry with python3.
      trySpawn('python3', () => settle(null));
    });
  });
}

function enqueueAnalysis(sentences) {
  return new Promise((resolve, reject) => {
    if (queue.length >= MAX_QUEUE_DEPTH) {
      reject(new Error('Analysis queue full'));
      return;
    }
    queue.push({ sentences, resolve });
    processNext();
  });
}

function queueStats() {
  return { active: activeCount, pending: queue.length };
}

module.exports = { enqueueAnalysis, queueStats, MAX_QUEUE_DEPTH };
