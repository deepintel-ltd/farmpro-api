# Storage Configuration Guide

This guide explains how to configure file storage for the FarmPro API, supporting both AWS S3 and Cloudflare R2.

## Overview

The FarmPro API uses a unified storage service that supports both AWS S3 and Cloudflare R2. This allows you to choose the storage provider that best fits your needs and budget.

## Environment Variables

### Storage Provider Selection

Set the `STORAGE_PROVIDER` environment variable to choose your storage provider:

```bash
# For AWS S3
STORAGE_PROVIDER="aws"

# For Cloudflare R2
STORAGE_PROVIDER="cloudflare"
```

### AWS S3 Configuration

When using AWS S3, configure these environment variables:

```bash
STORAGE_PROVIDER="aws"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="farmpro-media"
```

### Cloudflare R2 Configuration

When using Cloudflare R2, configure these environment variables:

```bash
STORAGE_PROVIDER="cloudflare"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-key"
CLOUDFLARE_R2_BUCKET="farmpro-media"
CLOUDFLARE_R2_REGION="auto"
CLOUDFLARE_R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
CLOUDFLARE_ACCOUNT_ID="your-account-id"

# Optional: Custom domain for R2 (e.g., cdn.yourdomain.com)
CLOUDFLARE_R2_CUSTOM_DOMAIN="cdn.yourdomain.com"
```

## Features

### Unified Interface

The storage service provides a unified interface for both providers:

- **File Upload**: Upload files with metadata
- **File Deletion**: Delete files from storage
- **Signed URLs**: Generate temporary download URLs
- **Health Checks**: Monitor storage service status

### File Organization

Files are organized in the following structure:

```
organizations/{organizationId}/{context}/{contextId}/{timestamp}-{randomId}.{extension}
```

Examples:
- `organizations/org-123/activity/act-456/1703123456789-abc123.jpg`
- `organizations/org-123/order/ord-789/1703123456790-def456.pdf`

### Security Features

- **Server-side encryption**: All files are encrypted at rest
- **Signed URLs**: Temporary access URLs with expiration
- **Access control**: Files are scoped to organizations
- **Audit trail**: Complete file access history

## Usage Examples

### Upload a File

```typescript
const uploadResult = await storageService.uploadFile(
  'organizations/org-123/activity/act-456/image.jpg',
  fileBuffer,
  'image/jpeg',
  {
    context: 'activity',
    contextId: 'act-456',
    organizationId: 'org-123',
    uploadedBy: 'user-123'
  }
);
```

### Generate Download URL

```typescript
const downloadUrl = await storageService.generateSignedUrl(
  'organizations/org-123/activity/act-456/image.jpg',
  3600 // 1 hour expiration
);
```

### Delete a File

```typescript
await storageService.deleteFile('organizations/org-123/activity/act-456/image.jpg');
```

## Health Monitoring

The storage service includes health monitoring:

```typescript
const health = await storageService.healthCheck();
console.log(health);
// Output: { status: 'healthy', provider: 'aws', bucket: 'farmpro-media' }
```

The health check is also integrated into the main API health endpoint at `/health`.

## Migration Between Providers

To migrate from one storage provider to another:

1. Update the `STORAGE_PROVIDER` environment variable
2. Configure the new provider's environment variables
3. The service will automatically use the new provider for new uploads
4. Existing files will continue to work with their original URLs

## Cost Considerations

### AWS S3
- Pay for storage, requests, and data transfer
- More expensive for high-traffic applications
- Better for enterprise use cases

### Cloudflare R2
- No egress fees (free data transfer)
- Lower storage costs
- Better for high-traffic applications
- Good for global content delivery

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify your access keys and secret keys
2. **Bucket Not Found**: Ensure the bucket exists and is accessible
3. **Region Mismatch**: Verify the region configuration matches your bucket
4. **Custom Domain Issues**: Ensure DNS is properly configured for R2 custom domains

### Debug Mode

Enable debug logging by setting the log level:

```bash
LOG_LEVEL="debug"
```

This will provide detailed information about storage operations.

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible
2. **Rotate access keys** regularly
3. **Use least privilege** access policies
4. **Enable MFA** on your cloud accounts
5. **Monitor access logs** for suspicious activity
6. **Use custom domains** for better security and branding
