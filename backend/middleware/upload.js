const multer = require('multer');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['txt', 'epub', 'pdf', 'text'];
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!allowed.includes(ext)) {
      return cb(new Error('Unsupported file type: ' + ext), false);
    }
    cb(null, true);
  }
});

module.exports = { upload, uploadDir };
