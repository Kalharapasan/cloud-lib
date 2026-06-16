// ============================================================
// Cloud Lib — Storage Service (S3 & Local Fallback)
// Handles uploading image buffers to S3 or local directory.
// ============================================================
const fs = require('fs');
const path = require('path');

let S3Client, PutObjectCommand;
let s3Client = null;

const initS3 = () => {
  if (s3Client) return s3Client;
  if (!process.env.S3_BUCKET_COVERS) return null;

  try {
    ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
    
    const config = {
      region: process.env.AWS_REGION || 'ap-southeast-1',
    };

    // If explicit AWS credentials are provided (often useful for local testing or custom Beanstalk setup)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    s3Client = new S3Client(config);
    console.log('✅ [S3] AWS S3 client initialised');
  } catch (err) {
    console.warn('⚠️  [S3] @aws-sdk/client-s3 not installed — using local fallback.');
  }

  return s3Client;
};

/**
 * Upload a file buffer to S3 or local storage depending on the environment configuration.
 * @param {object} file - The file object from multer (containing buffer, originalname, mimetype)
 * @param {object} req - Express request object (used to build local absolute URL)
 * @returns {Promise<string>} The public URL of the uploaded image
 */
const uploadBookCover = async (file, req) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
  
  const client = initS3();

  if (client && process.env.S3_BUCKET_COVERS) {
    // ── Upload to Amazon S3 ─────────────────────────────────
    const bucket = process.env.S3_BUCKET_COVERS;
    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await client.send(command);
      const s3Url = `https://${bucket}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${filename}`;
      console.log(`✅ [S3] Cover image uploaded to S3: ${s3Url}`);
      return s3Url;
    } catch (err) {
      console.error('❌ [S3] Failed to upload to S3, falling back to local storage:', err.message);
      // Fall through to local storage if S3 upload fails but client was configured
    }
  }

  // ── Fallback: Upload to Local Storage ───────────────────────
  console.log('📁 [Storage] Saving cover image locally...');
  const uploadsDir = path.join(__dirname, '../uploads');
  
  // Ensure local uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  await fs.promises.writeFile(filePath, file.buffer);

  // Construct local URL: e.g. http://localhost:5000/uploads/filename.jpg
  const protocol = req.protocol;
  const host = req.get('host');
  const localUrl = `${protocol}://${host}/uploads/${filename}`;
  
  console.log(`✅ [Storage] Cover image saved locally: ${localUrl}`);
  return localUrl;
};

module.exports = { uploadBookCover };
