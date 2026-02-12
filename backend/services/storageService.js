const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StorageService {
  constructor() {
    this.useS3 = false;
    this.s3Service = null;
    this.uploadsDir = path.join(__dirname, '..', 'uploads');
    this._checkS3Availability();
  }

  _checkS3Availability() {
    const hasS3Config = process.env.AWS_ACCESS_KEY_ID && 
                        process.env.AWS_SECRET_ACCESS_KEY && 
                        process.env.AWS_REGION && 
                        process.env.AWS_S3_BUCKET_NAME;

    if (hasS3Config) {
      try {
        this.s3Service = require('./s3Service');
        this.useS3 = true;
      } catch (error) {
        this.useS3 = false;
      }
    } else {
      this.useS3 = false;
    }

    if (!this.useS3) {
      this._ensureUploadDirs();
    }
  }

  _ensureUploadDirs() {
    const dirs = [
      this.uploadsDir,
      path.join(this.uploadsDir, 'medical-records'),
      path.join(this.uploadsDir, 'medical-bills'),
      path.join(this.uploadsDir, 'evidence'),
      path.join(this.uploadsDir, 'documents')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  _generateLocalKey(userId, fileType, originalFilename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${fileType}/user_${userId}_${timestamp}_${randomString}_${sanitizedFilename}`;
  }

  async uploadFile(fileBuffer, userId, fileType, originalFilename, mimeType) {
    if (this.useS3) {
      return this._uploadToS3(fileBuffer, userId, fileType, originalFilename, mimeType);
    } else {
      return this._uploadToLocal(fileBuffer, userId, fileType, originalFilename, mimeType);
    }
  }

  async _uploadToS3(fileBuffer, userId, fileType, originalFilename, mimeType) {
    const result = await this.s3Service.uploadFileMultipart(
      fileBuffer,
      userId,
      fileType,
      originalFilename,
      mimeType
    );

    return {
      success: true,
      storageType: 's3',
      bucket: result.bucket,
      key: result.key,
      region: result.region,
      etag: result.etag,
      location: result.location,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      uploadedAt: result.uploadedAt
    };
  }

  async _uploadToLocal(fileBuffer, userId, fileType, originalFilename, mimeType) {
    try {
      const localKey = this._generateLocalKey(userId, fileType, originalFilename);
      const filePath = path.join(this.uploadsDir, localKey);
      const fileDir = path.dirname(filePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, fileBuffer);

      const location = `/uploads/${localKey}`;

      return {
        success: true,
        storageType: 'local',
        bucket: 'local',
        key: localKey,
        region: 'local',
        etag: crypto.createHash('md5').update(fileBuffer).digest('hex'),
        location: location,
        fileSize: fileBuffer.length,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Storage Service] Local upload failed:', error);
      throw new Error(`Local upload failed: ${error.message}`);
    }
  }

  async generateDownloadUrl(storageKey, expiresInSeconds = 300, originalFilename = null, storageType = null) {
    const effectiveStorageType = storageType || (this.useS3 ? 's3' : 'local');

    if (effectiveStorageType === 's3' && this.useS3) {
      return this._generateS3DownloadUrl(storageKey, expiresInSeconds, originalFilename);
    } else {
      return this._generateLocalDownloadUrl(storageKey, originalFilename);
    }
  }

  async _generateS3DownloadUrl(s3Key, expiresInSeconds, originalFilename) {
    const result = await this.s3Service.generatePresignedDownloadUrl(s3Key, expiresInSeconds, originalFilename);
    return {
      url: result.url,
      expiresIn: result.expiresIn,
      expiresAt: result.expiresAt,
      storageType: 's3'
    };
  }

  _generateLocalDownloadUrl(localKey, originalFilename) {
    const url = `/api/uploads/stream/${localKey}`;
    return {
      url: url,
      expiresIn: null,
      expiresAt: null,
      storageType: 'local',
      note: 'Local storage URLs do not expire'
    };
  }

  async deleteFile(storageKey, storageType = null) {
    const effectiveStorageType = storageType || (this.useS3 ? 's3' : 'local');

    if (effectiveStorageType === 's3' && this.useS3) {
      return this.s3Service.deleteFile(storageKey);
    } else {
      return this._deleteLocalFile(storageKey);
    }
  }

  _deleteLocalFile(localKey) {
    try {
      const filePath = path.join(this.uploadsDir, localKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, key: localKey };
      }
      return { success: false, key: localKey, reason: 'File not found' };
    } catch (error) {
      console.error('[Storage Service] Local delete failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async checkFileExists(storageKey, storageType = null) {
    const effectiveStorageType = storageType || (this.useS3 ? 's3' : 'local');

    if (effectiveStorageType === 's3' && this.useS3) {
      return this.s3Service.checkFileExists(storageKey);
    } else {
      return this._checkLocalFileExists(storageKey);
    }
  }

  _checkLocalFileExists(localKey) {
    try {
      const filePath = path.join(this.uploadsDir, localKey);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          exists: true,
          size: stats.size,
          lastModified: stats.mtime
        };
      }
      return { exists: false };
    } catch (error) {
      return { exists: false };
    }
  }

  getLocalFilePath(localKey) {
    return path.join(this.uploadsDir, localKey);
  }

  isUsingS3() {
    return this.useS3;
  }

  getStorageType() {
    return this.useS3 ? 's3' : 'local';
  }
}

const storageService = new StorageService();

module.exports = storageService;
