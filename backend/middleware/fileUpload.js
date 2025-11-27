const multer = require('multer');
const crypto = require('crypto');

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.pdf', '.doc', '.docx'];

const MIME_TO_EXTENSION = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

const MAGIC_BYTES = {
  'image/jpeg': [
    { offset: 0, bytes: [0xFF, 0xD8, 0xFF] }
  ],
  'image/png': [
    { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
  ],
  'application/pdf': [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }
  ],
  'application/msword': [
    { offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] }
  ],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }
  ],
  'image/heic': [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63] },
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70, 0x6D, 0x69, 0x66, 0x31] }
  ]
};

const DANGEROUS_PATTERNS = [
  /<%/,
  /<\?php/i,
  /<script/i,
  /<html/i,
  /eval\s*\(/i,
  /document\./i,
  /window\./i,
  /\bonload\s*=/i,
  /\bonerror\s*=/i,
  /javascript:/i,
  /data:text\/html/i
];

const storage = multer.memoryStorage();

function getFileExtension(filename) {
  const ext = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return ext ? ext[0] : '';
}

function checkMagicBytes(buffer, mimeType) {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) {
    return true;
  }

  for (const sig of signatures) {
    if (buffer.length < sig.offset + sig.bytes.length) {
      continue;
    }

    let matches = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[sig.offset + i] !== sig.bytes[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return true;
    }
  }

  return false;
}

function containsDangerousContent(buffer) {
  const sampleSize = Math.min(buffer.length, 8192);
  const sample = buffer.slice(0, sampleSize).toString('utf8', 0, sampleSize);
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sample)) {
      return true;
    }
  }
  
  return false;
}

function generateSecureFilename(originalFilename) {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(16).toString('hex');
  return `${timestamp}_${randomId}${ext}`;
}

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, HEIC, PDF, DOC, and DOCX files are allowed.'), false);
  }

  const ext = getFileExtension(file.originalname);
  const allowedExtensions = MIME_TO_EXTENSION[file.mimetype] || [];
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error(`File extension ${ext} does not match the declared MIME type ${file.mimetype}.`), false);
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5
  }
});

async function validateFileContent(buffer, mimeType, originalFilename) {
  const errors = [];

  if (!checkMagicBytes(buffer, mimeType)) {
    errors.push(`File content does not match the declared type (${mimeType}). The file may be corrupted or misidentified.`);
  }

  if (containsDangerousContent(buffer)) {
    errors.push('File contains potentially dangerous content patterns and was rejected for security reasons.');
  }

  return {
    valid: errors.length === 0,
    errors,
    secureFilename: generateSecureFilename(originalFilename),
    fileHash: crypto.createHash('sha256').update(buffer).digest('hex')
  };
}

module.exports = upload;
module.exports.validateFileContent = validateFileContent;
module.exports.generateSecureFilename = generateSecureFilename;
module.exports.checkMagicBytes = checkMagicBytes;
module.exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;
module.exports.allowedMimeTypes = allowedMimeTypes;
