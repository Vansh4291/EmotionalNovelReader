const { spawn } = require('child_process');
const path = require('path');
const { analyzeChapter } = require('../emotion/emotionAnalyzer');

const MAX_CONCURRENT = 2;
const MAX_QUEUE_DEPTH = 50;
const MAX_SENTENCES = 5000;
let activeCount = 0;
const queue = [];

function processNext() {
  if (queue.length === 0 || activeCount >= MAX_CONCURRENT) return;
  const task = queue.shift();
  activeCount++;

  runPythonAnalysis(task.sentences)
    .then((result) => task.resolve(result || analyzeChapter(task.sentences)))
    .catch(() => task.resolve(analyzeChapter(task.sentences)))
    .finally(() => {
      activeCount--;
      processNext();
    });
}

function runPythonAnalysis(sentences) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, '..', 'emotion', 'python_emotion_model.py');
    const pyProcess = spawn('python', [scriptPath], { timeout: 30000 });

    let dataString = '';
    let errorString = '';

    const timer = setTimeout(() => {
      pyProcess.kill();
      resolve(null);
    }, 30000);

    pyProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pyProcess.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 || !dataString) {
        resolve(null);
        return;
      }
      try {
        const results = JSON.parse(dataString);
        resolve(Array.isArray(results) && results.length > 0 ? results : null);
      } catch (e) {
        resolve(null);
      }
    });

    pyProcess.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });

    const payload = JSON.stringify({ sentences: sentences.slice(0, MAX_SENTENCES) });
    const canContinue = pyProcess.stdin.write(payload);
    if (!canContinue) {
      pyProcess.stdin.once('drain', () => pyProcess.stdin.end());
    } else {
      pyProcess.stdin.end();
    }
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

module.exports = { enqueueAnalysis };
