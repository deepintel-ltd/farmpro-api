# FarmPro API - DigitalOcean App Platform Deployment Guide

This guide will help you deploy the FarmPro API to DigitalOcean App Platform using Docker.

## Prerequisites

- DigitalOcean account
- GitHub repository with your code
- Required API keys and credentials (see Environment Variables section)

## Quick Start

### 1. Prepare Your Repository

Make sure your repository contains:
- `Dockerfile` (already created)
- `.dockerignore` (already created)
- `env.example` (already created)
- `.do/app.yaml` (already created)

### 2. Set Up DigitalOcean Resources

#### Create Managed Database
1. Go to DigitalOcean → Databases
2. Create a new PostgreSQL database
3. Choose the smallest size (1GB RAM, 1 vCPU)
4. Note the connection details

#### Create Managed Redis (Optional but Recommended)
1. Go to DigitalOcean → Databases
2. Create a new Redis database
3. Choose the smallest size
4. Note the connection details

#### Create Spaces Bucket (for file storage)
1. Go to DigitalOcean → Spaces
2. Create a new Space
3. Note the access keys and endpoint

### 3. Deploy to App Platform

#### Option A: Using DigitalOcean CLI (Recommended)

1. Install the DigitalOcean CLI:
```bash
# macOS
brew install doctl

# Linux
snap install doctl

# Windows
# Download from https://github.com/digitalocean/doctl/releases
```

2. Authenticate:
```bash
doctl auth init
```

3. Deploy the app:
```bash
doctl apps create --spec .do/app.yaml
```

#### Option B: Using DigitalOcean Web Interface

1. Go to DigitalOcean → Apps
2. Click "Create App"
3. Connect your GitHub repository
4. Select the repository and branch
5. DigitalOcean will auto-detect the Dockerfile
6. Configure environment variables (see below)
7. Deploy

### 4. Configure Environment Variables

Set these environment variables in your DigitalOcean App Platform:

#### Required Variables
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key-here
```

#### External Services (Optional)
```
OPENAI_API_KEY=sk-your-openai-api-key-here
WEATHER_API_KEY=your-openweathermap-api-key-here
BREVO_API_KEY=your-brevo-api-key-here
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret-here
PAYSTACK_SECRET_KEY=sk_test_your-paystack-secret-key-here
```

#### Storage Configuration
```
STORAGE_PROVIDER=aws
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=farmpro-media
```

#### Caching (Optional)
```
REDIS_URL=redis://username:password@host:port
```

#### Frontend Configuration
```
FRONTEND_URL=https://your-frontend-domain.com
BASE_URL=https://your-app-name.ondigitalocean.app
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://your-app-name.ondigitalocean.app
```

### 5. Database Migration

After deployment, run database migrations:

1. Connect to your app via SSH or use the console
2. Run the migration command:
```bash
npx prisma migrate deploy
```

### 6. Verify Deployment

1. Check the health endpoint: `https://your-app-name.ondigitalocean.app/api/health`
2. Check the API documentation: `https://your-app-name.ondigitalocean.app/api/docs`
3. Test a simple API endpoint

## Environment Variables Reference

See `env.example` for a complete list of all available environment variables with descriptions.

## Docker Configuration

### Dockerfile Features
- Multi-stage build for optimized image size
- Node.js 20 Alpine base image
- Non-root user for security
- Health check included
- Proper signal handling with dumb-init

### Build Optimization
- Uses `.dockerignore` to exclude unnecessary files
- Caches dependencies in separate layer
- Only copies production dependencies to final image

## Monitoring and Logs

### View Logs
```bash
doctl apps logs <app-id> --follow
```

### Monitor Performance
- Use DigitalOcean's built-in monitoring
- Check the `/api/health` endpoint for application health
- Monitor database and Redis performance

## Scaling

### Horizontal Scaling
- Increase `instance_count` in `.do/app.yaml`
- Or use the DigitalOcean web interface

### Vertical Scaling
- Upgrade `instance_size_slug` in `.do/app.yaml`
- Available sizes: basic-xxs, basic-xs, basic-s, basic-m, basic-l, basic-xl

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check if database is accessible from App Platform
   - Ensure SSL mode is set to `require`

2. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies are in package.json
   - Check build logs in DigitalOcean console

3. **Runtime Errors**
   - Check application logs
   - Verify all required environment variables are set
   - Check if external services are accessible

4. **Health Check Failures**
   - Verify the health endpoint is working
   - Check if the application is binding to the correct port
   - Ensure the health check path is correct

### Debug Commands

```bash
# Check app status
doctl apps get <app-id>

# View recent logs
doctl apps logs <app-id> --type run

# View build logs
doctl apps logs <app-id> --type build

# SSH into the app (if enabled)
doctl apps ssh <app-id>
```

## Security Considerations

1. **Environment Variables**: Mark sensitive variables as `SECRET` in App Platform
2. **Database**: Use managed database with SSL
3. **HTTPS**: App Platform provides HTTPS by default
4. **CORS**: Configure `ALLOWED_ORIGINS` properly
5. **Rate Limiting**: Configured in the application

## Cost Optimization

1. **Database**: Start with the smallest size and scale up as needed
2. **Redis**: Only create if you need caching
3. **App Instance**: Start with basic-xxs and scale up
4. **Storage**: Use DigitalOcean Spaces for file storage

## Support

For issues specific to:
- DigitalOcean App Platform: Check [DigitalOcean Documentation](https://docs.digitalocean.com/products/app-platform/)
- FarmPro API: Check the application logs and this repository's issues
- Database: Check DigitalOcean Managed Database documentation
