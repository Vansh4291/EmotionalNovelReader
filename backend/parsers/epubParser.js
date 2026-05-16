const EPub = require('epub');
const { stripHtml } = require('string-strip-html');
const fs = require('fs').promises;

async function parseEpub(filePath) {
  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on('ready', async () => {
      try {
        const chapters = [];
        
        for (let i = 0; i < epub.flow.length; i++) {
          const chapterItem = epub.flow[i];
          
          if (!chapterItem.id) continue;
          
          const html = await getChapterText(epub, chapterItem.id);
          const text = stripHtml(html).result.trim();

          if (text.length > 100) {
            const cleanedText = cleanText(text);
            chapters.push({
              index: chapters.length,
              title: chapterItem.title || `Chapter ${chapters.length + 1}`,
              text: cleanedText,
              wordCount: cleanedText.split(/\s+/).length,
              rawHtml: html
            });
          }
        }

        resolve({
          title: epub.metadata?.title || 'Unknown Title',
          author: epub.metadata?.creator || 'Unknown Author',
          coverImagePath: null,
          chapters
        });
      } catch (err) {
        reject(err);
      }
    });

    epub.on('error', reject);
    epub.parse();
  });
}

function getChapterText(epub, chapterId) {
  return new Promise((resolve, reject) => {
    epub.getChapter(chapterId, (err, text) => {
      if (err) reject(err);
      else resolve(text || '');
    });
  });
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
    .trim();
}

module.exports = { parseEpub };