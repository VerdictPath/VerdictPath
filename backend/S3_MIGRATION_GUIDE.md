# AWS S3 File Storage Migration Guide

## Overview
Verdict Path has been migrated from local file storage to AWS S3 cloud storage for all file uploads and downloads. This provides improved scalability, reliability, and HIPAA compliance.

## What Changed

### File Storage
- **Before**: Files stored locally in `backend/uploads/` directory
- **After**: Files stored in AWS S3 bucket with server-side encryption (AES-256)

### Upload System
- **Before**: Single-step upload to local disk (10MB limit)
- **After**: Multipart upload to S3 for all files (50MB limit)
  - Automatic chunking for efficient large file uploads
  - Progress tracking during upload
  - Automatic retry on failure

### Download System
- **Before**: Direct file serving from local disk
- **After**: Presigned URL generation (1-hour expiry)
  - Secure, temporary URLs for file access
  - No server bandwidth usage for downloads
  - Automatic URL expiration for security

### Database Schema
New columns added to all document tables:
- `s3_bucket` - AWS S3 bucket name
- `s3_key` - Unique file path in S3
- `s3_region` - AWS region (e.g., us-east-1)
- `s3_etag` - S3 entity tag for versioning

Tables updated:
- `medical_records`
- `medical_billing`
- `evidence`

## Required Environment Variables

You must set these secrets in your Replit environment:

```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=verdictpath-hipaa-storage
```

**Important**: Never commit these credentials to version control!

## AWS S3 Bucket Setup

### 1. Create S3 Bucket
```bash
aws s3api create-bucket --bucket verdictpath-hipaa-storage --region us-east-1
```

### 2. Enable Server-Side Encryption (HIPAA Required)
```bash
aws s3api put-bucket-encryption \
  --bucket verdictpath-hipaa-storage \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### 3. Enable Versioning (HIPAA Recommended)
```bash
aws s3api put-bucket-versioning \
  --bucket verdictpath-hipaa-storage \
  --versioning-configuration Status=Enabled
```

### 4. Block Public Access (HIPAA Required)
```bash
aws s3api put-public-access-block \
  --bucket verdictpath-hipaa-storage \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 5. Set Lifecycle Policy (Optional - Cost Optimization)
```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket verdictpath-hipaa-storage \
  --lifecycle-configuration file://lifecycle-policy.json
```

**lifecycle-policy.json**:
```json
{
  "Rules": [
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ],
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

## IAM Policy

Create an IAM user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::verdictpath-hipaa-storage/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::verdictpath-hipaa-storage"
    }
  ]
}
```

## File Organization in S3

Files are organized with this structure:
```
uploads/
  medical-records/
    user_123/
      1731234567890_abc123def456_hospital_report.pdf
  medical-bills/
    user_456/
      1731234567890_xyz789ghi012_medical_bill.pdf
  evidence/
    user_789/
      1731234567890_jkl345mno678_police_report.pdf
```

## Backward Compatibility

The system supports both local files (legacy) and S3 files:

- **New uploads**: Automatically go to S3
- **Old uploads**: Continue to work from local storage
- **Downloads**: System automatically detects storage location and serves accordingly

## HIPAA Compliance Features

✅ **Server-Side Encryption**: All files encrypted at rest with AES-256
✅ **Access Control**: Presigned URLs with 1-hour expiration
✅ **Audit Logging**: All uploads/downloads logged with S3 metadata
✅ **Authorization**: Law firm access requires patient consent
✅ **Secure Transit**: HTTPS for all S3 communications
✅ **Data Retention**: Configurable lifecycle policies

## API Changes

### Upload Response (Before)
```json
{
  "success": true,
  "message": "Medical record uploaded successfully",
  "document": {
    "id": 123,
    "document_url": "user1_1234567890_report.pdf",
    "file_name": "report.pdf"
  }
}
```

### Upload Response (After)
```json
{
  "success": true,
  "message": "Medical record uploaded successfully to S3",
  "document": {
    "id": 123,
    "document_url": "https://verdictpath-hipaa-storage.s3.amazonaws.com/...",
    "file_name": "report.pdf",
    "s3_bucket": "verdictpath-hipaa-storage",
    "s3_key": "uploads/medical-records/user_1/...",
    "s3_region": "us-east-1",
    "s3_etag": "\"abc123...\""
  },
  "s3Location": "https://verdictpath-hipaa-storage.s3.amazonaws.com/..."
}
```

### Download Response (Before)
Binary file stream sent directly

### Download Response (After)
```json
{
  "success": true,
  "presignedUrl": "https://verdictpath-hipaa-storage.s3.amazonaws.com/...",
  "fileName": "report.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1234567,
  "expiresIn": 3600,
  "expiresAt": "2025-11-21T18:43:15.000Z"
}
```

## Frontend Integration

Frontend clients should update download handling:

### Before (Direct Download)
```javascript
const response = await fetch(`/api/uploads/download/medical-record/${fileId}`);
const blob = await response.blob();
// Use blob directly
```

### After (Presigned URL)
```javascript
const response = await fetch(`/api/uploads/download/medical-record/${fileId}`);
const { presignedUrl, fileName } = await response.json();

// Option 1: Open in new tab
window.open(presignedUrl, '_blank');

// Option 2: Download programmatically
const fileResponse = await fetch(presignedUrl);
const blob = await fileResponse.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = fileName;
a.click();
```

## Cost Estimation

### Storage Costs (S3 Standard - us-east-1)
- First 50 TB: $0.023 per GB/month
- 1000 files @ 2MB average = 2GB = $0.05/month

### Request Costs
- PUT/POST (uploads): $0.005 per 1000 requests
- GET (downloads): $0.0004 per 1000 requests
- 10,000 uploads/month = $0.05/month
- 100,000 downloads/month = $0.04/month

### Data Transfer Costs
- Upload (IN): Free
- Download (OUT): $0.09 per GB
- 100GB downloads/month = $9/month

**Estimated Monthly Cost**: ~$10-15 for moderate usage

## Monitoring & Debugging

### Check S3 Service Status
```javascript
// In backend console
const s3Service = require('./services/s3Service');
console.log('Bucket:', s3Service.getBucketName());
console.log('Region:', s3Service.getRegion());
```

### View Upload Logs
```bash
grep "S3 Upload" /tmp/logs/Verdict_Path_Web_*.log
```

### View Download Logs
```bash
grep "S3 Presigned URL" /tmp/logs/Verdict_Path_Web_*.log
```

### Verify File Exists in S3
```bash
aws s3 ls s3://verdictpath-hipaa-storage/uploads/medical-records/user_1/
```

## Troubleshooting

### Error: "AWS S3 configuration incomplete"
**Solution**: Set all required environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME)

### Error: "S3 upload failed: Access Denied"
**Solution**: Check IAM user permissions and bucket policy

### Error: "S3 upload failed: NoSuchBucket"
**Solution**: Create the S3 bucket or verify bucket name

### Slow Uploads
**Solution**: Multipart upload is automatic - check network bandwidth

### Downloads Not Working
**Solution**: Presigned URLs expire after 1 hour - generate new URL

## Migration Checklist

- [ ] Create AWS S3 bucket
- [ ] Configure bucket encryption (AES-256)
- [ ] Enable bucket versioning
- [ ] Block public access
- [ ] Create IAM user with S3 permissions
- [ ] Set environment variables in Replit
- [ ] Test medical record upload
- [ ] Test medical bill upload
- [ ] Test evidence upload
- [ ] Test file download with presigned URL
- [ ] Verify audit logging
- [ ] Update frontend download handling (if needed)
- [ ] Monitor S3 costs in AWS Console

## Security Best Practices

1. **Rotate IAM Credentials**: Change AWS keys every 90 days
2. **Monitor Access Logs**: Enable S3 server access logging
3. **Set Bucket Policies**: Restrict access to specific IAM roles
4. **Enable MFA Delete**: Require MFA for object deletion (recommended)
5. **Use VPC Endpoints**: For production, route S3 traffic through VPC
6. **CloudTrail Logging**: Track all S3 API calls for audit trails

## Support

For issues or questions:
- Check backend logs: `grep S3 /tmp/logs/*.log`
- Review AWS CloudWatch metrics
- Contact AWS Support for S3-specific issues
