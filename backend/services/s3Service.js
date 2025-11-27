const { S3Client, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

class S3Service {
  constructor() {
    this.s3Client = null;
    this.bucketName = null;
    this.region = null;
    this.initialized = false;
  }

  _ensureInitialized() {
    if (this.initialized) {
      return;
    }

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || 
        !process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
      throw new Error('AWS S3 configuration incomplete. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME environment variables.');
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    this.region = process.env.AWS_REGION;
    this.initialized = true;

    console.log(`[S3 Service] Initialized with bucket: ${this.bucketName}, region: ${this.region}`);
  }

  generateS3Key(userId, fileType, originalFilename) {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    return `uploads/${fileType}/user_${userId}/${timestamp}_${randomString}_${sanitizedFilename}`;
  }

  async uploadFileMultipart(fileBuffer, userId, fileType, originalFilename, mimeType) {
    this._ensureInitialized();
    
    try {
      const s3Key = this.generateS3Key(userId, fileType, originalFilename);

      console.log(`[S3 Upload] Starting multipart upload for ${originalFilename} (${fileBuffer.length} bytes) to ${s3Key}`);

      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: mimeType,
          ServerSideEncryption: 'AES256',
          Metadata: {
            'uploaded-by': `user-${userId}`,
            'original-filename': originalFilename,
            'upload-timestamp': new Date().toISOString()
          }
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false
      });

      upload.on('httpUploadProgress', (progress) => {
        const percentComplete = Math.round((progress.loaded / progress.total) * 100);
        console.log(`[S3 Upload Progress] ${originalFilename}: ${percentComplete}% (${progress.loaded}/${progress.total} bytes)`);
      });

      const result = await upload.done();

      console.log(`[S3 Upload] Successfully uploaded ${originalFilename} to ${s3Key}`);

      return {
        success: true,
        bucket: this.bucketName,
        key: s3Key,
        region: this.region,
        etag: result.ETag,
        location: result.Location,
        versionId: result.VersionId,
        fileSize: fileBuffer.length,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[S3 Upload] Multipart upload failed:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async generatePresignedDownloadUrl(s3Key, expiresInSeconds = 300, originalFilename = null) {
    this._ensureInitialized();
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ResponseContentDisposition: originalFilename 
          ? `inline; filename="${originalFilename}"`
          : 'inline'
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds
      });

      console.log(`[S3 Presigned URL] Generated URL for ${s3Key} (expires in ${expiresInSeconds}s)`);

      return {
        url: presignedUrl,
        expiresIn: expiresInSeconds,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      };
    } catch (error) {
      console.error('[S3 Presigned URL] Generation failed:', error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  async deleteFile(s3Key) {
    this._ensureInitialized();
    
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      await this.s3Client.send(command);
      console.log(`[S3 Delete] Successfully deleted ${s3Key}`);

      return { success: true, key: s3Key };
    } catch (error) {
      console.error('[S3 Delete] Failed:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async checkFileExists(s3Key) {
    this._ensureInitialized();
    
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      const response = await this.s3Client.send(command);
      
      return {
        exists: true,
        size: response.ContentLength,
        etag: response.ETag,
        lastModified: response.LastModified,
        contentType: response.ContentType
      };
    } catch (error) {
      if (error.name === 'NotFound') {
        return { exists: false };
      }
      throw error;
    }
  }

  async getFileMetadata(s3Key) {
    this._ensureInitialized();
    
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      const response = await this.s3Client.send(command);

      return {
        size: response.ContentLength,
        etag: response.ETag,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        metadata: response.Metadata,
        serverSideEncryption: response.ServerSideEncryption
      };
    } catch (error) {
      console.error('[S3 Metadata] Failed to retrieve metadata:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  getBucketName() {
    return this.bucketName;
  }

  getRegion() {
    return this.region;
  }
}

const s3Service = new S3Service();

module.exports = s3Service;
