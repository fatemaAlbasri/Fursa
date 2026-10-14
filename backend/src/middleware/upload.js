const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

// Files are saved in backend/uploads/<folder>/ and served at /uploads/<folder>/<file>
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const RULES = {
  cv: { folder: 'cv', ext: /\.(pdf|docx?)$/i, message: 'CV must be a PDF or Word file' },
  logo: { folder: 'logos', ext: /\.(png|jpe?g|gif|webp|svg)$/i, message: 'Logo must be an image' },
};

for (const { folder } of Object.values(RULES)) {
  fs.mkdirSync(path.join(UPLOADS_DIR, folder), { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOADS_DIR, RULES[file.fieldname].folder)),
  // Random name so users can't overwrite each other's files
  filename: (req, file, cb) =>
    cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const rule = RULES[file.fieldname];
    if (!rule) return cb(Object.assign(new Error(`Unexpected file field "${file.fieldname}"`), { status: 400 }));
    if (!rule.ext.test(file.originalname)) return cb(Object.assign(new Error(rule.message), { status: 400 }));
    cb(null, true);
  },
});

// Public URL saved in the database for an uploaded file
const fileUrl = (file) => `/uploads/${RULES[file.fieldname].folder}/${file.filename}`;

// Deletes uploaded files when sign up fails, so we don't keep orphans
const removeFiles = (files) => {
  for (const file of files) fs.unlink(file.path, () => {});
};

module.exports = { upload, fileUrl, removeFiles, UPLOADS_DIR };
