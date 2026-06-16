// ============================================================
// Cloud Lib — Multer Upload Middleware
// ============================================================
const multer = require('multer');

// Configure memory storage because we will upload to S3 or write locally
const storage = multer.memoryStorage();

// File filter to restrict uploads to images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const mimeType = allowedTypes.test(file.mimetype);
  const extName = allowedTypes.test(file.originalname.toLowerCase());

  if (mimeType && extName) {
    return cb(null, true);
  }
  cb(new Error('Only images (.jpeg, .jpg, .png, .webp) are allowed!'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
