const { AppError } = require('./errorHandler');

// Allowed MIME types for uploads
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Max file sizes
const MAX_VIDEO_SIZE = 500 * 1024 * 1024;   // 500 MB
const MAX_DOC_SIZE = 50 * 1024 * 1024;      // 50 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;     // 10 MB

/**
 * Middleware factory: validates uploaded files for type and size.
 * @param {string} fieldName - The form field name (default: 'file')
 * @param {object} options
 * @param {string} options.fileType - 'video', 'document', 'image', or 'any'
 * @param {number} options.maxSize - custom max size in bytes (optional)
 */
const validateUpload = (fieldName = 'file', options = {}) => {
  const { fileType = 'any', maxSize } = options;

  return (req, res, next) => {
    const file = req.file || (req.files ? req.files[fieldName] : null) || req.body?.file;

    // If no file, skip (let the route handler decide if required)
    if (!file) return next();

    const mime = file.mimetype || file.type || '';
    const size = file.size || file.length || 0;

    // Determine allowed types based on fileType
    let allowedTypes;
    switch (fileType) {
      case 'video':
        allowedTypes = ALLOWED_VIDEO_TYPES;
        break;
      case 'document':
        allowedTypes = ALLOWED_DOC_TYPES;
        break;
      case 'image':
        allowedTypes = ALLOWED_IMAGE_TYPES;
        break;
      case 'any':
        allowedTypes = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES, ...ALLOWED_IMAGE_TYPES];
        break;
      default:
        return next(new AppError('Invalid file type validation config', 500));
    }

    if (!allowedTypes.includes(mime)) {
      return next(new AppError(`Ruxsat etilmagan fayl turi: ${mime}. Faqat ${allowedTypes.join(', ')} ruxsat etilgan.`, 400));
    }

    // Check file size
    const maxBytes = maxSize || (
      fileType === 'video' ? MAX_VIDEO_SIZE :
      fileType === 'document' ? MAX_DOC_SIZE :
      fileType === 'image' ? MAX_IMAGE_SIZE :
      MAX_DOC_SIZE
    );

    if (size > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      return next(new AppError(`Fayl hajmi ${maxMb} MB dan oshmasligi kerak (yuklangan: ${Math.round(size / (1024 * 1024))} MB)`, 400));
    }

    next();
  };
};

module.exports = { validateUpload, ALLOWED_VIDEO_TYPES, ALLOWED_DOC_TYPES };
