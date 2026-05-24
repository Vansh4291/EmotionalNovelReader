const { spawn } = require('child_process');
const path = require('path');
const { EMOTION_KEYWORDS } = require('../../shared/emotionKeywords');

function analyzeSentence(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { emotion: 'neutral', confidence: 1.0 };
  }

  const lower = text.toLowerCase();
  const scores = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        score += 1;
      }
    }
    scores[emotion] = score;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { emotion: 'neutral', confidence: 1.0 };
  }

  const topEmotion = Object.keys(scores).find(k => scores[k] === maxScore);
  const confidence = Math.min(maxScore / 3, 1.0);

  return { emotion: topEmotion, confidence };
}

function analyzeChapter(sentences) {
  if (!Array.isArray(sentences)) {
    console.warn('analyzeChapter received non-array:', sentences);
    return [];
  }

  return sentences.map((text, index) => {
    if (typeof text !== 'string') {
      return { index, text: String(text), emotion: 'neutral', confidence: 1.0 };
    }
    return {
      index,
      text,
      ...analyzeSentence(text),
    };
  });
}

async function analyzeChapterAsync(sentences) {
  if (!Array.isArray(sentences) || sentences.length === 0) return [];

  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(__dirname, 'python_emotion_model.py');
      const pyProcess = spawn('python', [scriptPath]);

      let dataString = '';
      let errorString = '';

      pyProcess.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      pyProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`, errorString);
          resolve(analyzeChapter(sentences));
          return;
        }

        try {
          const results = JSON.parse(dataString);
          if (Array.isArray(results) && results.length > 0) {
            resolve(results);
          } else {
            resolve(analyzeChapter(sentences));
          }
        } catch (e) {
          console.error("Failed to parse Python output", e);
          resolve(analyzeChapter(sentences));
        }
      });

      pyProcess.on('error', (err) => {
        console.error("Python spawn error", err);
        resolve(analyzeChapter(sentences));
      });

      pyProcess.stdin.write(JSON.stringify({ sentences }));
      pyProcess.stdin.end();

    } catch (e) {
      console.error("Failed to setup Python process", e);
      resolve(analyzeChapter(sentences));
    }
  });
}

module.exports = { analyzeChapter, analyzeChapterAsync, analyzeSentence, emotionKeywords: EMOTION_KEYWORDS };