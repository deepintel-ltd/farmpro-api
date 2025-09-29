import { TestContext } from '../src/test-utils/test-context';
import { hash } from '@node-rs/argon2';
import * as fs from 'fs';
import * as path from 'path';

describe('Media E2E Tests', () => {
  let testContext: TestContext;
  let accessToken: string;
  let organizationId: string;
  let userId: string;
  let farmId: string;
  let activityId: string;

  beforeAll(async () => {
    testContext = new TestContext();
    await testContext.setup();
  }, 60000);

  afterAll(async () => {
    await testContext.teardown();
  }, 30000);

  beforeEach(async () => {
    // Clean up media-related tables before each test
    await testContext.cleanupTables([
      'media',
      'farm_activities',
      'farms',
      'users',
      'organizations'
    ]);
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create test organization
    const organization = await testContext.createOrganization({
      name: 'Test Media Organization',
      type: 'FARM_OPERATION',
      email: 'media@farmpro.app',
      phone: '+1-555-0123',
      address: {
        street: '123 Media Road',
        city: 'Mediaville',
        state: 'CA',
        zipCode: '90210',
        country: 'US'
      },
      plan: 'enterprise',
      maxUsers: 100,
      maxFarms: 50,
      features: ['all_features'],
      allowCustomRoles: true,
      isVerified: true,
      isActive: true
    });

    organizationId = organization.id;

    // Create test user
    const hashedPassword = await hash('TestPassword123!');
    const user = await testContext.createUser({
      email: 'mediauser@farmpro.app',
      name: 'Test Media User',
      hashedPassword,
      organizationId,
      emailVerified: true,
      isActive: true
    });

    userId = user.id;

    // Create test farm
    const farm = await testContext.createFarm({
      name: 'Test Media Farm',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Media Farm Road, San Francisco, CA'
      },
      totalArea: 100.5,
      cropTypes: ['wheat', 'corn'],
      establishedDate: '2020-01-01T00:00:00Z',
      certifications: ['organic'],
      organization: { connect: { id: organizationId } },
      isActive: true
    });

    farmId = farm.id;

    // Create test farm activity
    const activity = await testContext.prisma.farmActivity.create({
      data: {
        name: 'Test Activity',
        description: 'Test activity for media uploads',
        type: 'PLANTING',
        status: 'PLANNED',
        scheduledAt: new Date(),
        farmId: farmId,
        createdById: userId
      }
    });

    activityId = activity.id;

    // Login to get access token
    const loginResponse = await testContext
      .request()
      .post('/auth/login')
      .send({
        email: 'mediauser@farmpro.app',
        password: 'TestPassword123!'
      })
      .expect(200);

    accessToken = loginResponse.body.data.attributes.tokens.accessToken;
  });

  describe('POST /media/upload', () => {
    it('should upload image file successfully', async () => {
      // Create a test image file
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      const response = await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath, 'test-image.jpg')
        .field('context', 'activity')
        .field('contextId', activityId)
        .field('description', 'Test image upload')
        .field('tags', JSON.stringify(['test', 'image']))
        .field('location', JSON.stringify({ lat: 37.7749, lng: -122.4194, address: 'Test Location' }));

      if (response.status !== 200) {
        console.log('Upload failed with status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      } else {
        console.log('Upload successful, response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);

      expect(response.body.data.type).toBe('media-file');
      expect(response.body.data.attributes.filename).toBe('test-image.jpg');
      expect(response.body.data.attributes.context).toBe('activity');
      expect(response.body.data.attributes.contextId).toBe(activityId);
      expect(response.body.data.attributes.description).toBe('Test image upload');
      expect(response.body.data.attributes.tags).toEqual(['test', 'image']);
      expect(response.body.data.attributes.location).toEqual({ lat: 37.7749, lng: -122.4194, address: 'Test Location' });

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should upload PDF file successfully', async () => {
      // Create a test PDF file
      const testPdfBuffer = Buffer.from('%PDF-1.4 fake pdf content');
      const testPdfPath = path.join(__dirname, 'test-document.pdf');
      fs.writeFileSync(testPdfPath, testPdfBuffer);

      const response = await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testPdfPath, 'test-document.pdf')
        .field('context', 'activity')
        .field('contextId', activityId)
        .field('description', 'Test PDF upload')
        .expect(200);

      expect(response.body.data.type).toBe('media-file');
      expect(response.body.data.attributes.filename).toBe('test-document.pdf');
      expect(response.body.data.attributes.mimeType).toBe('application/pdf');
      expect(response.body.data.attributes.context).toBe('activity');
      expect(response.body.data.attributes.contextId).toBe(activityId);

      // Clean up test file
      fs.unlinkSync(testPdfPath);
    });

    it('should fail without file', async () => {
      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('context', 'activity')
        .field('contextId', activityId)
        .expect(400);
    });

    it('should fail without context', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath, 'test-image.jpg')
        .field('contextId', activityId)
        .expect(400);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should fail without contextId', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath, 'test-image.jpg')
        .field('context', 'activity')
        .expect(400);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should fail with invalid context', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath, 'test-image.jpg')
        .field('context', 'invalid-context')
        .field('contextId', activityId)
        .expect(400);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should fail with non-existent contextId', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath, 'test-image.jpg')
        .field('context', 'activity')
        .field('contextId', 'non-existent-id')
        .expect(404);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should fail with file too large', async () => {
      // Create a large file (51MB)
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024);
      const largeFilePath = path.join(__dirname, 'large-file.jpg');
      fs.writeFileSync(largeFilePath, largeBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', largeFilePath, 'large-file.jpg')
        .field('context', 'activity')
        .field('contextId', activityId)
        .expect(400);

      // Clean up test file
      fs.unlinkSync(largeFilePath);
    });

    it('should fail with unsupported file type', async () => {
      const testBuffer = Buffer.from('fake-executable-content');
      const testFilePath = path.join(__dirname, 'test.exe');
      fs.writeFileSync(testFilePath, testBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testFilePath, 'test.exe')
        .field('context', 'activity')
        .field('contextId', activityId)
        .expect(400);

      // Clean up test file
      fs.unlinkSync(testFilePath);
    });

    it('should fail without authentication', async () => {
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      await testContext
        .request()
        .post('/media/upload')
        .attach('file', testImagePath, 'test-image.jpg')
        .field('context', 'activity')
        .field('contextId', activityId)
        .expect(401);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });
  });

  describe('GET /media/my-files', () => {
    let mediaId1: string;
    let mediaId2: string;

    beforeEach(async () => {
      // Create test media files
      const media1 = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'test1.jpg',
          url: 'https://example.com/test1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            description: 'First test image',
            tags: ['test', 'image1']
          }
        }
      });

      const media2 = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'test2.pdf',
          url: 'https://example.com/test2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            description: 'Second test document',
            tags: ['test', 'document']
          }
        }
      });

      mediaId1 = media1.id;
      mediaId2 = media2.id;
    });

    it('should get user files successfully', async () => {
      const response = await testContext
        .request()
        .get('/media/my-files')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.totalFiles).toBe(2);
      expect(response.body.meta.totalSize).toBe(3072);
      expect(response.body.data[0].type).toBe('media-file');
      expect(response.body.data[0].attributes.filename).toBeDefined();
    });

    it('should filter files by context', async () => {
      const response = await testContext
        .request()
        .get('/media/my-files?context=activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((file: any) => {
        expect(file.attributes.context).toBe('activity');
      });
    });

    it('should filter files by contextId', async () => {
      const response = await testContext
        .request()
        .get(`/media/my-files?contextId=${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      response.body.data.forEach((file: any) => {
        expect(file.attributes.contextId).toBe(activityId);
      });
    });

    it('should paginate files correctly', async () => {
      const response = await testContext
        .request()
        .get('/media/my-files?limit=1&offset=0')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get('/media/my-files')
        .expect(401);
    });
  });

  describe('GET /media/context/:context/:contextId', () => {
    let mediaId1: string;
    let mediaId2: string;

    beforeEach(async () => {
      // Create test media files for the activity
      const media1 = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'activity-image1.jpg',
          url: 'https://example.com/activity-image1.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            description: 'Activity image 1'
          }
        }
      });

      const media2 = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'activity-doc1.pdf',
          url: 'https://example.com/activity-doc1.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            description: 'Activity document 1'
          }
        }
      });

      mediaId1 = media1.id;
      mediaId2 = media2.id;
    });

    it('should get context files successfully', async () => {
      const response = await testContext
        .request()
        .get(`/media/context/activity/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.context).toBe('activity');
      expect(response.body.meta.contextId).toBe(activityId);
      expect(response.body.meta.totalFiles).toBe(2);
      expect(response.body.data[0].type).toBe('media-file');
    });

    it('should fail with non-existent context', async () => {
      await testContext
        .request()
        .get(`/media/context/invalid-context/${activityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail with non-existent contextId', async () => {
      await testContext
        .request()
        .get('/media/context/activity/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/media/context/activity/${activityId}`)
        .expect(401);
    });
  });

  describe('GET /media/:mediaId', () => {
    let mediaId: string;

    beforeEach(async () => {
      const media = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'test-file.jpg',
          url: 'https://example.com/test-file.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            description: 'Test file for get test'
          }
        }
      });

      mediaId = media.id;
    });

    it('should get file details successfully', async () => {
      const response = await testContext
        .request()
        .get(`/media/${mediaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('media-file');
      expect(response.body.data.id).toBe(mediaId);
      expect(response.body.data.attributes.filename).toBe('test-file.jpg');
      expect(response.body.data.attributes.context).toBe('activity');
      expect(response.body.data.attributes.contextId).toBe(activityId);
    });

    it('should fail with non-existent mediaId', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .get(`/media/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with invalid mediaId format', async () => {
      await testContext
        .request()
        .get('/media/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/media/${mediaId}`)
        .expect(401);
    });
  });

  describe('GET /media/:mediaId/download', () => {
    let mediaId: string;

    beforeEach(async () => {
      const media = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'download-test.jpg',
          url: 'https://example.com/download-test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            s3Key: 'test-s3-key',
            s3Bucket: 'test-bucket'
          }
        }
      });

      mediaId = media.id;
    });

    it('should get download URL successfully', async () => {
      const response = await testContext
        .request()
        .get(`/media/${mediaId}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('download-url');
      expect(response.body.data.id).toBe(mediaId);
      expect(response.body.data.attributes.downloadUrl).toBeDefined();
      expect(response.body.data.attributes.expiresIn).toBe(3600);
      expect(response.body.data.attributes.mediaId).toBe(mediaId);
    });

    it('should fail with non-existent mediaId', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .get(`/media/${nonExistentId}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/media/${mediaId}/download`)
        .expect(401);
    });
  });

  describe('DELETE /media/:mediaId', () => {
    let mediaId: string;

    beforeEach(async () => {
      const media = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'delete-test.jpg',
          url: 'https://example.com/delete-test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            s3Key: 'test-s3-key',
            s3Bucket: 'test-bucket',
            auditTrail: [{
              action: 'UPLOADED',
              userId: userId,
              timestamp: new Date().toISOString(),
              details: 'File uploaded successfully'
            }]
          }
        }
      });

      mediaId = media.id;
    });

    it('should delete file successfully', async () => {
      const response = await testContext
        .request()
        .delete(`/media/${mediaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Test deletion' })
        .expect(200);

      expect(response.body.data.success).toBe(true);
      expect(response.body.data.message).toBe('File deleted successfully');
      expect(response.body.data.auditTrail).toBeDefined();
    });

    it('should fail with non-existent mediaId', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .delete(`/media/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Test deletion' })
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .delete(`/media/${mediaId}`)
        .send({ reason: 'Test deletion' })
        .expect(401);
    });

    it('should fail when trying to delete file uploaded by another user', async () => {
      // Create another user
      const hashedPassword = await hash('AnotherPassword123!');
      const anotherUser = await testContext.createUser({
        email: 'anotheruser@farmpro.app',
        name: 'Another User',
        hashedPassword,
        organizationId,
        emailVerified: true,
        isActive: true
      });

      // Create media file uploaded by another user
      const anotherMedia = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'another-user-file.jpg',
          url: 'https://example.com/another-user-file.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: anotherUser.id,
            organizationId: organizationId
          }
        }
      });

      await testContext
        .request()
        .delete(`/media/${anotherMedia.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Test deletion' })
        .expect(403);
    });
  });

  describe('GET /media/:mediaId/audit', () => {
    let mediaId: string;

    beforeEach(async () => {
      const media = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'audit-test.jpg',
          url: 'https://example.com/audit-test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            auditTrail: [
              {
                action: 'UPLOADED',
                userId: userId,
                timestamp: new Date().toISOString(),
                details: 'File uploaded successfully'
              },
              {
                action: 'UPDATED',
                userId: userId,
                timestamp: new Date().toISOString(),
                details: 'File metadata updated',
                changes: { description: 'Updated description' }
              }
            ]
          }
        }
      });

      mediaId = media.id;
    });

    it('should get file audit trail successfully', async () => {
      const response = await testContext
        .request()
        .get(`/media/${mediaId}/audit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.type).toBe('media-audit');
      expect(response.body.data.id).toBe(mediaId);
      expect(response.body.data.attributes.mediaId).toBe(mediaId);
      expect(response.body.data.attributes.filename).toBe('audit-test.jpg');
      expect(response.body.data.attributes.auditTrail).toHaveLength(2);
      expect(response.body.data.attributes.auditTrail[0].action).toBe('UPLOADED');
      expect(response.body.data.attributes.auditTrail[1].action).toBe('UPDATED');
    });

    it('should fail with non-existent mediaId', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      
      await testContext
        .request()
        .get(`/media/${nonExistentId}/audit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      await testContext
        .request()
        .get(`/media/${mediaId}/audit`)
        .expect(401);
    });
  });

  describe('POST /media/:mediaId/update', () => {
    let mediaId: string;

    beforeEach(async () => {
      const media = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'update-test.jpg',
          url: 'https://example.com/update-test.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: userId,
            organizationId: organizationId,
            description: 'Original description',
            tags: ['original', 'tag'],
            auditTrail: [{
              action: 'UPLOADED',
              userId: userId,
              timestamp: new Date().toISOString(),
              details: 'File uploaded successfully'
            }]
          }
        }
      });

      mediaId = media.id;
    });

    it('should update file metadata successfully', async () => {
      const updateData = {
        description: 'Updated description',
        tags: ['updated', 'tags'],
        reason: 'Testing metadata update'
      };

      const response = await testContext
        .request()
        .post(`/media/${mediaId}/update`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.type).toBe('media-file');
      expect(response.body.data.attributes.description).toBe('Updated description');
      expect(response.body.data.attributes.tags).toEqual(['updated', 'tags']);
    });

    it('should update only description', async () => {
      const updateData = {
        description: 'Only description updated'
      };

      const response = await testContext
        .request()
        .post(`/media/${mediaId}/update`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.description).toBe('Only description updated');
    });

    it('should update only tags', async () => {
      const updateData = {
        tags: ['only', 'tags', 'updated']
      };

      const response = await testContext
        .request()
        .post(`/media/${mediaId}/update`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.attributes.tags).toEqual(['only', 'tags', 'updated']);
    });

    it('should fail with non-existent mediaId', async () => {
      const nonExistentId = 'cmg4g0000000000000000000000';
      const updateData = {
        description: 'Updated description'
      };

      await testContext
        .request()
        .post(`/media/${nonExistentId}/update`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(404);
    });

    it('should fail when trying to update file uploaded by another user', async () => {
      // Create another user
      const hashedPassword = await hash('AnotherPassword123!');
      const anotherUser = await testContext.createUser({
        email: 'anotheruser@farmpro.app',
        name: 'Another User',
        hashedPassword,
        organizationId,
        emailVerified: true,
        isActive: true
      });

      // Create media file uploaded by another user
      const anotherMedia = await testContext.prisma.media.create({
        data: {
          farmActivityId: activityId,
          filename: 'another-user-file.jpg',
          url: 'https://example.com/another-user-file.jpg',
          mimeType: 'image/jpeg',
          size: 1024,
          metadata: {
            context: 'activity',
            contextId: activityId,
            uploadedBy: anotherUser.id,
            organizationId: organizationId
          }
        }
      });

      const updateData = {
        description: 'Trying to update another user\'s file'
      };

      await testContext
        .request()
        .post(`/media/${anotherMedia.id}/update`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(403);
    });

    it('should fail without authentication', async () => {
      const updateData = {
        description: 'Updated description'
      };

      await testContext
        .request()
        .post(`/media/${mediaId}/update`)
        .send(updateData)
        .expect(401);
    });
  });

  describe('Media Integration Tests', () => {
    it('should complete full media lifecycle', async () => {
      // 1. Upload file
      const testImageBuffer = Buffer.from('fake-image-data');
      const testImagePath = path.join(__dirname, 'lifecycle-test.jpg');
      fs.writeFileSync(testImagePath, testImageBuffer);

      const uploadResponse = await testContext
        .request()
        .post('/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', testImagePath, 'lifecycle-test.jpg')
        .field('context', 'activity')
        .field('contextId', activityId)
        .field('description', 'Lifecycle test image')
        .field('tags', JSON.stringify(['lifecycle', 'test']))
        .expect(200);

      const mediaId = uploadResponse.body.data.id;

      // 2. Get file details
      await testContext
        .request()
        .get(`/media/${mediaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 3. Get download URL
      await testContext
        .request()
        .get(`/media/${mediaId}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 4. Update metadata
      await testContext
        .request()
        .post(`/media/${mediaId}/update`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          description: 'Updated lifecycle description',
          tags: ['lifecycle', 'test', 'updated']
        })
        .expect(200);

      // 5. Get audit trail
      await testContext
        .request()
        .get(`/media/${mediaId}/audit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // 6. Delete file
      await testContext
        .request()
        .delete(`/media/${mediaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ reason: 'Lifecycle test completion' })
        .expect(200);

      // Clean up test file
      fs.unlinkSync(testImagePath);
    });

    it('should handle multiple file uploads for same context', async () => {
      const filePromises = [];
      const testFiles = [];

      // Upload multiple files concurrently
      for (let i = 1; i <= 3; i++) {
        const testImageBuffer = Buffer.from(`fake-image-data-${i}`);
        const testImagePath = path.join(__dirname, `concurrent-test-${i}.jpg`);
        fs.writeFileSync(testImagePath, testImageBuffer);
        testFiles.push(testImagePath);

        filePromises.push(
          testContext
            .request()
            .post('/media/upload')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('file', testImagePath, `concurrent-test-${i}.jpg`)
            .field('context', 'activity')
            .field('contextId', activityId)
            .field('description', `Concurrent test image ${i}`)
        );
      }

      const responses = await Promise.all(filePromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.attributes.context).toBe('activity');
        expect(response.body.data.attributes.contextId).toBe(activityId);
      });

      // Clean up test files after all uploads are complete
      testFiles.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // Verify files were created in the database
      const listResponse = await testContext
        .request()
        .get('/media/my-files')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });
});
