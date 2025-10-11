import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Currency } from '@prisma/client';
import { CurrencyService } from '../common/services/currency.service';
import { PlanFeatureMapperService } from '../billing/services/plan-feature-mapper.service';
import {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  UpdateOrganizationSettingsRequest,
  OrganizationResource,
  OrganizationSettings,
  OrganizationAnalyticsQuery,
  OrganizationActivityQuery,
  OrganizationComplianceQuery,
  IntegrationConfig,
} from '../../contracts/schemas';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly planFeatureMapper: PlanFeatureMapperService,
  ) {}

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private getOrganizationIdFromRequest(request: any): string {
    // Check if organization impersonation is active
    if (request.organizationFilter?.organizationId) {
      return request.organizationFilter.organizationId;
    }
    
    // Fallback to user's organization
    if (request.user?.organizationId) {
      return request.user.organizationId;
    }
    
    throw new Error('Organization ID not found in request context');
  }

  // =============================================================================
  // Organization Profile & Settings
  // =============================================================================

  async getProfile(request: any): Promise<{ data: OrganizationResource['data'] }> {
    const organizationId = this.getOrganizationIdFromRequest(request);
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          farms: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      return {
        data: this.transformToJsonApi(organization),
      };
    } catch (error) {
      this.logger.error(`Failed to get organization profile ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve organization profile');
    }
  }

  async updateProfile(requestData: UpdateOrganizationRequest, request: any): Promise<{ data: OrganizationResource['data'] }> {
    const organizationId = this.getOrganizationIdFromRequest(request);
    const { data } = requestData;
    const { attributes } = data;

    try {
      // Check if organization exists
      const existingOrg = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!existingOrg) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Check for email conflicts if email is being updated
      if (attributes.email && attributes.email !== existingOrg.email) {
        const emailExists = await this.prisma.organization.findFirst({
          where: { 
            email: attributes.email,
            id: { not: organizationId }
          },
        });

        if (emailExists) {
          throw new ConflictException('Email is already in use by another organization');
        }
      }

      const organization = await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          ...(attributes.name && { name: attributes.name }),
          ...(attributes.email && { email: attributes.email }),
          ...(attributes.phone && { phone: attributes.phone }),
          ...(attributes.address && { address: attributes.address }),
          ...(attributes.taxId && { taxId: attributes.taxId }),
          ...(attributes.website && { website: attributes.website }),
          ...(attributes.description && { description: attributes.description }),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          farms: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      this.logger.log(`Organization profile updated: ${organization.name} (${organization.id})`);

      return {
        data: this.transformToJsonApi(organization),
      };
    } catch (error) {
      this.logger.error(`Failed to update organization profile ${organizationId}:`, error);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to update organization profile');
    }
  }

  async uploadLogo(file: any, request: any): Promise<{ data: { id: string; type: string; attributes: { logo: string } } }> {
    const organizationId = this.getOrganizationIdFromRequest(request);
    try {
      // Validate file
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException('File size too large. Maximum size is 5MB');
      }

      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // TODO: Implement actual file upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
      // For now, we'll just store the file path
      const fileExtension = file.originalname.split('.').pop() || 'jpg';
      const logoUrl = `/uploads/organizations/${organizationId}/logo.${fileExtension}`;

      // Update organization with logo URL
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { 
          metadata: {
            ...((await this.prisma.organization.findUnique({ where: { id: organizationId } }))?.metadata as any || {}),
            logo: logoUrl
          }
        },
      });

      this.logger.log(`Logo uploaded for organization ${organizationId}: ${logoUrl}`);

      return {
        data: {
          id: organizationId,
          type: 'organizations',
          attributes: {
            logo: logoUrl,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to upload logo for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload logo');
    }
  }

  async getSettings(organizationId: string): Promise<{ data: { id: string; type: string; attributes: OrganizationSettings } }> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          allowCustomRoles: true,
          features: true,
          metadata: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      const metadata = organization.metadata as Record<string, any> || {};
      
      const settings: OrganizationSettings = {
        allowCustomRoles: organization.allowCustomRoles,
        requireEmailVerification: metadata.requireEmailVerification ?? true,
        passwordPolicy: metadata.passwordPolicy || {
          minLength: 8,
          requireSpecialChar: true,
          requireNumbers: true,
        },
        defaultTimezone: metadata.defaultTimezone || 'UTC',
        defaultCurrency: metadata.defaultCurrency || 'USD',
        features: organization.features,
        integrations: metadata.integrations || {},
        notifications: {
          emailFromName: metadata.notifications?.emailFromName || '',
          emailFromAddress: metadata.notifications?.emailFromAddress || '',
        },
      };

      return {
        data: {
          id: organizationId,
          type: 'organization-settings',
          attributes: settings,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get organization settings ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve organization settings');
    }
  }

  async updateSettings(organizationId: string, requestData: UpdateOrganizationSettingsRequest): Promise<{ data: { id: string; type: string; attributes: OrganizationSettings } }> {
    const { data } = requestData;
    const { attributes } = data;

    try {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!existingOrg) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      const currentMetadata = (existingOrg.metadata as Record<string, any>) || {};
      const updatedMetadata = {
        ...currentMetadata,
        ...(attributes.passwordPolicy && { passwordPolicy: attributes.passwordPolicy }),
        ...(attributes.defaultTimezone && { defaultTimezone: attributes.defaultTimezone }),
        ...(attributes.defaultCurrency && { defaultCurrency: attributes.defaultCurrency }),
        ...(attributes.integrations && { integrations: attributes.integrations }),
        ...(attributes.notifications && { notifications: attributes.notifications }),
        ...(attributes.requireEmailVerification !== undefined && { requireEmailVerification: attributes.requireEmailVerification }),
      };

      const organization = await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          ...(attributes.allowCustomRoles !== undefined && { allowCustomRoles: attributes.allowCustomRoles }),
          ...(attributes.features && { features: attributes.features }),
          metadata: updatedMetadata,
        },
      });

      this.logger.log(`Organization settings updated: ${organization.id}`);

      const settings: OrganizationSettings = {
        allowCustomRoles: organization.allowCustomRoles,
        requireEmailVerification: updatedMetadata.requireEmailVerification ?? true,
        passwordPolicy: updatedMetadata.passwordPolicy || {
          minLength: 8,
          requireSpecialChar: true,
          requireNumbers: true,
        },
        defaultTimezone: updatedMetadata.defaultTimezone || 'UTC',
        defaultCurrency: updatedMetadata.defaultCurrency || 'USD',
        features: organization.features,
        integrations: updatedMetadata.integrations || {},
        notifications: updatedMetadata.notifications || {
          emailFromName: '',
          emailFromAddress: '',
        },
      };

      return {
        data: {
          id: organizationId,
          type: 'organization-settings',
          attributes: settings,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update organization settings ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to update organization settings');
    }
  }

  // =============================================================================
  // Organization Verification
  // =============================================================================

  async requestVerification(organizationId: string, requestData: any): Promise<{ data: { id: string; type: string; attributes: { status: string; submittedAt: string } } }> {
    const { data } = requestData;
    const { attributes } = data;

    try {
      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Check if verification is already pending or approved
      const currentMetadata = (organization.metadata as Record<string, any>) || {};
      const existingVerification = currentMetadata.verificationRequest;
      
      if (existingVerification?.status === 'pending') {
        throw new ConflictException('Verification request is already pending');
      }
      
      if (existingVerification?.status === 'approved') {
        throw new ConflictException('Organization is already verified');
      }

      const verificationRequest = {
        documents: attributes.documents,
        businessType: attributes.businessType,
        description: attributes.description,
        submittedAt: new Date().toISOString(),
        status: 'pending',
      };

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          metadata: {
            ...currentMetadata,
            verificationRequest,
          },
        },
      });

      this.logger.log(`Verification request submitted for organization: ${organizationId}`);

      return {
        data: {
          id: organizationId,
          type: 'verification-requests',
          attributes: {
            status: 'pending',
            submittedAt: verificationRequest.submittedAt,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to submit verification request for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to submit verification request');
    }
  }

  async getVerificationStatus(organizationId: string): Promise<{ data: { id: string; type: string; attributes: { status: string; requirements: string[]; submittedAt?: string; reviewedAt?: string; notes?: string } } }> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          isVerified: true,
          metadata: true,
        },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      const metadata = (organization.metadata as Record<string, any>) || {};
      const verificationRequest = metadata.verificationRequest;
      
      let status: string;
      if (organization.isVerified) {
        status = 'approved';
      } else if (verificationRequest?.status === 'rejected') {
        status = 'rejected';
      } else if (verificationRequest?.status === 'pending') {
        status = 'pending';
      } else {
        status = 'not_submitted';
      }

      return {
        data: {
          id: organizationId,
          type: 'verification-status',
          attributes: {
            status,
            requirements: ['Business license', 'Tax ID', 'Proof of address'],
            submittedAt: verificationRequest?.submittedAt,
            reviewedAt: verificationRequest?.reviewedAt,
            notes: verificationRequest?.notes,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get verification status for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve verification status');
    }
  }

  // =============================================================================
  // Data & Analytics
  // =============================================================================

  async getAnalytics(organizationId: string, query: OrganizationAnalyticsQuery): Promise<{ data: { id: string; type: string; attributes: any } }> {
    try {
      const { period = 'month', metric, farmId } = query;

      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Calculate date range based on period
      const now = new Date();
      const startDate = this.getDateRangeStart(period, now);
      
      // Build where clause for farm filtering
      const farmWhere = farmId ? { farmId } : {};

      // Execute analytics queries in parallel
      const [
        totalFarms,
        activeUsers,
        totalRevenue,
        ordersCompleted,
        inventoryValue,
        recentTransactions,
        farmStats
      ] = await Promise.all([
        // Total farms count
        this.prisma.farm.count({
          where: { 
            organizationId,
            ...farmWhere
          },
        }),
        
        // Active users count
        this.prisma.user.count({
          where: { 
            organizationId,
            isActive: true,
            lastLoginAt: { gte: startDate }
          },
        }),
        
        // Total revenue from transactions
        this.prisma.transaction.aggregate({
          where: {
            organizationId,
            type: 'FARM_REVENUE',
            createdAt: { gte: startDate },
            ...farmWhere
          },
          _sum: { amount: true },
        }),
        
        // Completed orders count
        this.prisma.order.count({
          where: {
            status: 'DELIVERED',
            createdAt: { gte: startDate },
            ...farmWhere
          },
        }),
        
        // Inventory value
        this.prisma.inventory.aggregate({
          where: {
            organizationId,
            ...farmWhere
          },
          _sum: { 
            quantity: true 
          },
        }),
        
        // Recent transactions for trends
        this.prisma.transaction.findMany({
          where: {
            organizationId,
            createdAt: { gte: startDate },
            ...farmWhere
          },
          select: {
            amount: true,
            createdAt: true,
            type: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        
        // Farm statistics
        this.prisma.farm.findMany({
          where: { 
            organizationId,
            ...farmWhere
          },
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        })
      ]);

      // Calculate trends data
      const trends = this.calculateTrends(recentTransactions);
      
      // Calculate farm metrics
      const farmMetrics = this.calculateFarmMetrics(farmStats);

      const analytics = {
        period,
        metric: metric || 'overview',
        farmId: farmId || null,
        metrics: {
          totalFarms: totalFarms,
          activeUsers: activeUsers,
          totalRevenue: totalRevenue._sum.amount || 0,
          ordersCompleted: ordersCompleted,
          inventoryValue: inventoryValue._sum.quantity || 0,
          activeFarms: farmMetrics.activeCount,
        },
        trends: trends,
        farmBreakdown: farmMetrics.breakdown,
        generatedAt: new Date().toISOString(),
      };

      this.logger.log(`Analytics retrieved for organization ${organizationId}, period: ${period}, metric: ${metric || 'overview'}`);

      return {
        data: {
          id: organizationId,
          type: 'analytics',
          attributes: analytics,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve analytics');
    }
  }

  private getDateRangeStart(period: string, now: Date): Date {
    const start = new Date(now);
    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start.setMonth(now.getMonth() - 1);
    }
    return start;
  }

  private calculateTrends(transactions: any[]): any[] {
    const trends: any[] = [];
    const grouped = new Map<string, number>();
    
    // Group transactions by date
    transactions.forEach(transaction => {
      const date = transaction.createdAt.toISOString().split('T')[0];
      const existing = grouped.get(date) || 0;
      grouped.set(date, existing + (transaction.amount || 0));
    });
    
    // Convert to trends array
    grouped.forEach((value, date) => {
      trends.push({ date, value });
    });
    
    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateFarmMetrics(farms: any[]): any {
    const activeFarms = farms.filter(farm => farm.isActive);
    
    const breakdown = farms.map(farm => ({
      id: farm.id,
      name: farm.name,
      isActive: farm.isActive,
      ageInDays: Math.floor((Date.now() - farm.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));
    
    return {
      activeCount: activeFarms.length,
      totalFarms: farms.length,
      breakdown,
    };
  }

  async getActivityFeed(organizationId: string, query: OrganizationActivityQuery): Promise<{ data: any[]; meta: { pagination: { page: number; limit: number; total: number; pages: number } } }> {
    try {
      const { limit = 20, days = 7, type, userId } = query;

      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      const where: Prisma.ActivityWhereInput = {
        organizationId,
        ...(type && { action: type }),
        ...(userId && { userId }),
        timestamp: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        },
      };

      const [activities, total] = await Promise.all([
        this.prisma.activity.findMany({
          where,
          take: limit,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.activity.count({ where }),
      ]);

      this.logger.log(`Activity feed retrieved for organization ${organizationId}, ${activities.length} activities`);

      return {
        data: activities.map(activity => ({
          id: activity.id,
          type: 'activities',
          attributes: {
            action: activity.action,
            entity: activity.entity,
            entityId: activity.entityId,
            details: activity.changes,
            timestamp: activity.timestamp.toISOString(),
            user: activity.user ? {
              id: activity.user.id,
              name: activity.user.name,
            } : null,
          },
        })),
        meta: {
          pagination: {
            page: 1,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get activity feed for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve activity feed');
    }
  }

  async getComplianceReport(organizationId: string, query: OrganizationComplianceQuery): Promise<{ data: { id: string; type: string; attributes: any } }> {
    try {
      const { period = 'month', standard = 'organic', farmId } = query;

      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // Calculate date range
      const now = new Date();
      const startDate = this.getDateRangeStart(period, now);
      
      // Build where clause for farm filtering
      const farmWhere = farmId ? { farmId } : {};

      // Execute compliance queries in parallel
      const [
        farmActivities,
        harvests,
        soilData,
        documents,
        observations,
        farmCount
      ] = await Promise.all([
        // Farm activities for compliance tracking
        this.prisma.farmActivity.findMany({
          where: {
            farm: { organizationId },
            createdAt: { gte: startDate },
            ...farmWhere
          },
          select: {
            id: true,
            type: true,
            description: true,
            createdAt: true,
            farm: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
        }),
        
        // Harvest data for traceability
        this.prisma.harvest.findMany({
          where: {
            cropCycle: {
              farmId: { in: await this.getFarmIdsForOrganization(organizationId, farmWhere) }
            },
            createdAt: { gte: startDate }
          },
          select: {
            id: true,
            quantity: true,
            quality: true,
            createdAt: true,
            cropCycle: {
              select: {
                farmId: true,
                commodity: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
        }),
        
        // Soil data for environmental compliance
        this.prisma.soilData.findMany({
          where: {
            area: {
              farmId: { in: await this.getFarmIdsForOrganization(organizationId, farmWhere) }
            },
            createdAt: { gte: startDate }
          },
          select: {
            id: true,
            results: true,
            createdAt: true,
            area: {
              select: {
                farm: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
        }),
        
        // Compliance documents
        this.prisma.document.findMany({
          where: {
            farmId: { in: await this.getFarmIdsForOrganization(organizationId, farmWhere) },
            type: { in: ['CERTIFICATE', 'AUDIT_REPORT', 'COMPLIANCE_DOCUMENT'] },
            createdAt: { gte: startDate }
          },
          select: {
            id: true,
            type: true,
            name: true,
            url: true,
            createdAt: true,
            metadata: true
          },
          orderBy: { createdAt: 'desc' },
        }),
        
        // Quality observations
        this.prisma.observation.findMany({
          where: {
            farmId: { in: await this.getFarmIdsForOrganization(organizationId, farmWhere) },
            createdAt: { gte: startDate }
          },
          select: {
            id: true,
            type: true,
            description: true,
            severity: true,
            createdAt: true,
            farm: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
        }),
        
        // Total farms for coverage calculation
        this.prisma.farm.count({
          where: { 
            organizationId,
            ...farmWhere
          },
        })
      ]);

      // Calculate compliance metrics
      const complianceMetrics = this.calculateComplianceMetrics(
        farmActivities,
        harvests,
        soilData,
        documents,
        observations,
        farmCount,
        standard
      );

      // Generate compliance requirements based on standard
      const requirements = this.generateComplianceRequirements(standard, complianceMetrics);

      // Calculate overall compliance score
      const score = this.calculateComplianceScore(requirements);

      const compliance = {
        period,
        standard,
        farmId: farmId || null,
        status: score >= 80 ? 'compliant' : score >= 60 ? 'partially_compliant' : 'non_compliant',
        score,
        requirements,
        metrics: complianceMetrics,
        coverage: {
          farmsCovered: farmCount,
          activitiesTracked: farmActivities.length,
          documentsOnFile: documents.length,
          observationsRecorded: observations.length,
        },
        generatedAt: new Date().toISOString(),
      };

      this.logger.log(`Compliance report retrieved for organization ${organizationId}, standard: ${standard}, score: ${score}`);

      return {
        data: {
          id: organizationId,
          type: 'compliance-reports',
          attributes: compliance,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get compliance report for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve compliance report');
    }
  }

  private calculateComplianceMetrics(
    activities: any[],
    harvests: any[],
    soilData: any[],
    documents: any[],
    observations: any[],
    farmCount: number,
    standard: string
  ): any {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Calculate activity compliance
    const recentActivities = activities.filter(a => a.createdAt >= thirtyDaysAgo);
    const activityCompliance = farmCount > 0 ? (recentActivities.length / farmCount) * 100 : 0;
    
    // Calculate document compliance
    const validDocuments = documents.filter(d => !d.expiresAt || d.expiresAt > now);
    const documentCompliance = this.getDocumentComplianceRate(validDocuments, standard);
    
    // Calculate soil health compliance
    const soilCompliance = this.calculateSoilCompliance(soilData);
    
    // Calculate quality compliance
    const qualityIssues = observations.filter(o => o.severity === 'HIGH' || o.severity === 'CRITICAL');
    const qualityCompliance = observations.length > 0 ? 
      ((observations.length - qualityIssues.length) / observations.length) * 100 : 100;
    
    return {
      activityCompliance: Math.min(activityCompliance, 100),
      documentCompliance,
      soilCompliance,
      qualityCompliance,
      totalActivities: activities.length,
      totalHarvests: harvests.length,
      totalDocuments: documents.length,
      totalObservations: observations.length,
      qualityIssues: qualityIssues.length,
    };
  }

  private getDocumentComplianceRate(documents: any[], standard: string): number {
    const requiredDocs = this.getRequiredDocuments(standard);
    const presentDocs = requiredDocs.filter(required => 
      documents.some(doc => doc.type === required.type)
    );
    return requiredDocs.length > 0 ? (presentDocs.length / requiredDocs.length) * 100 : 100;
  }

  private getRequiredDocuments(standard: string): any[] {
    const baseDocs = [
      { type: 'CERTIFICATE', name: 'Business License' },
      { type: 'CERTIFICATE', name: 'Tax Registration' },
    ];
    
    if (standard === 'organic') {
      return [
        ...baseDocs,
        { type: 'CERTIFICATE', name: 'Organic Certification' },
        { type: 'AUDIT_REPORT', name: 'Annual Organic Audit' },
        { type: 'COMPLIANCE_DOCUMENT', name: 'Organic Plan' },
      ];
    }
    
    return baseDocs;
  }

  private calculateSoilCompliance(soilData: any[]): number {
    if (soilData.length === 0) return 0;
    
    const recentSoilData = soilData.slice(0, 10); // Last 10 soil tests
    const compliantTests = recentSoilData.filter(soil => {
      const results = soil.results as any;
      return results && 
        results.ph >= 6.0 && results.ph <= 7.5 && 
        results.organicMatter >= 2.0;
    });
    
    return (compliantTests.length / recentSoilData.length) * 100;
  }

  private generateComplianceRequirements(standard: string, metrics: any): any[] {
    const requirements = [
      {
        id: 'activity_tracking',
        name: 'Farm Activity Tracking',
        description: 'Regular recording of farm activities and operations',
        status: metrics.activityCompliance >= 80 ? 'compliant' : 'non_compliant',
        score: metrics.activityCompliance,
        lastChecked: new Date().toISOString(),
        details: {
          required: '80%',
          current: `${metrics.activityCompliance.toFixed(1)}%`,
          activities: metrics.totalActivities
        }
      },
      {
        id: 'documentation',
        name: 'Documentation Compliance',
        description: 'Maintenance of required certificates and documents',
        status: metrics.documentCompliance >= 90 ? 'compliant' : 'non_compliant',
        score: metrics.documentCompliance,
        lastChecked: new Date().toISOString(),
        details: {
          required: '90%',
          current: `${metrics.documentCompliance.toFixed(1)}%`,
          documents: metrics.totalDocuments
        }
      },
      {
        id: 'soil_health',
        name: 'Soil Health Management',
        description: 'Maintenance of soil health and fertility standards',
        status: metrics.soilCompliance >= 70 ? 'compliant' : 'non_compliant',
        score: metrics.soilCompliance,
        lastChecked: new Date().toISOString(),
        details: {
          required: '70%',
          current: `${metrics.soilCompliance.toFixed(1)}%`
        }
      },
      {
        id: 'quality_control',
        name: 'Quality Control',
        description: 'Monitoring and addressing quality issues',
        status: metrics.qualityCompliance >= 85 ? 'compliant' : 'non_compliant',
        score: metrics.qualityCompliance,
        lastChecked: new Date().toISOString(),
        details: {
          required: '85%',
          current: `${metrics.qualityCompliance.toFixed(1)}%`,
          issues: metrics.qualityIssues
        }
      }
    ];

    // Add standard-specific requirements
    if (standard === 'organic') {
      requirements.push({
        id: 'organic_standards',
        name: 'Organic Production Standards',
        description: 'Compliance with organic farming practices and standards',
        status: 'compliant', // This would need more complex logic
        score: 95,
        lastChecked: new Date().toISOString(),
        details: {
          required: '95%',
          current: '95%'
        }
      });
    }

    return requirements;
  }

  private calculateComplianceScore(requirements: any[]): number {
    if (requirements.length === 0) return 0;
    
    const totalScore = requirements.reduce((sum, req) => sum + req.score, 0);
    return Math.round(totalScore / requirements.length);
  }

  private async getFarmIdsForOrganization(organizationId: string, farmWhere: any): Promise<string[]> {
    const farms = await this.prisma.farm.findMany({
      where: {
        organizationId,
        ...farmWhere
      },
      select: { id: true }
    });
    return farms.map(farm => farm.id);
  }

  // =============================================================================
  // Team Management
  // =============================================================================

  async getTeam(organizationId: string): Promise<{ data: any[] }> {
    try {
      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      const users = await this.prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          isPlatformAdmin: true,
        },
        orderBy: { name: 'asc' },
      });

      this.logger.log(`Team retrieved for organization ${organizationId}, ${users.length} members`);

      return {
        data: users.map(user => ({
          id: user.id,
          type: 'team-members',
          attributes: {
            name: user.name,
            email: user.email,
            isPlatformAdmin: user.isPlatformAdmin,
            isActive: user.isActive,
            lastActive: user.lastLoginAt?.toISOString(),
            // permissions removed - using plan-based permissions
          },
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get team for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve team');
    }
  }

  async getTeamStats(organizationId: string, query: { period?: string; roleId?: string; farmId?: string }): Promise<{ data: { id: string; type: string; attributes: any } }> {
    try {
      const { period = 'month', roleId, farmId } = query;

      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // TODO: Implement real team statistics calculation based on period, roleId, and farmId
      // For now, return mock data
      const stats = {
        period,
        roleId,
        farmId,
        totalMembers: 12,
        activeMembers: 10,
        productivity: 85,
        efficiency: 92,
        completedTasks: 156,
        hoursWorked: 1240,
      };

      this.logger.log(`Team stats retrieved for organization ${organizationId}, period: ${period}`);

      return {
        data: {
          id: organizationId,
          type: 'team-stats',
          attributes: stats,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get team stats for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve team stats');
    }
  }

  // =============================================================================
  // Integration Management
  // =============================================================================

  async getIntegrations(organizationId: string): Promise<{ data: any[] }> {
    try {
      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // TODO: Implement real integration management - query actual integration configurations
      // For now, return mock data
      const integrations = [
        {
          id: 'weather-api',
          name: 'Weather API',
          description: 'Real-time weather data integration',
          isActive: true,
          isConfigured: true,
          lastSync: new Date().toISOString(),
        },
        {
          id: 'market-data',
          name: 'Market Data',
          description: 'Commodity pricing and market information',
          isActive: false,
          isConfigured: false,
          lastSync: null,
        },
      ];

      this.logger.log(`Integrations retrieved for organization ${organizationId}, ${integrations.length} integrations`);

      return {
        data: integrations.map(integration => ({
          id: integration.id,
          type: 'integrations',
          attributes: integration,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get integrations for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve integrations');
    }
  }

  async configureIntegration(organizationId: string, integrationId: string, config: IntegrationConfig): Promise<{ data: { id: string; type: string; attributes: any } }> {
    try {
      // Check if organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException(`Organization with ID ${organizationId} not found`);
      }

      // TODO: Implement real integration configuration storage
      // For now, just log the configuration
      this.logger.log(`Configuring integration ${integrationId} for organization ${organizationId}`, {
        config: config.config,
        isActive: config.isActive,
      });

      return {
        data: {
          id: integrationId,
          type: 'integrations',
          attributes: {
            name: 'Integration Name',
            isActive: config.isActive,
            isConfigured: true,
            configuredAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to configure integration ${integrationId} for organization ${organizationId}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to configure integration');
    }
  }

  async updateIntegration(organizationId: string, integrationId: string, config: any) {
    // Mock integration update
    this.logger.log(`Updating integration ${integrationId} for organization ${organizationId}`);

    return {
      data: {
        id: integrationId,
        type: 'integrations',
        attributes: {
          name: 'Integration Name',
          isActive: config.isActive ?? true,
          isConfigured: true,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  async deleteIntegration(organizationId: string, integrationId: string) {
    // Mock integration deletion
    this.logger.log(`Deleting integration ${integrationId} for organization ${organizationId}`);

    return {
      data: {
        id: integrationId,
        type: 'integrations',
        attributes: {
          name: 'Integration Name',
          isActive: false,
          removedAt: new Date().toISOString(),
        },
      },
    };
  }

  async getIntegrationStatus(organizationId: string, integrationId: string) {
    // Mock integration status
    return {
      data: {
        id: integrationId,
        type: 'integration-status',
        attributes: {
          name: 'Integration Name',
          status: 'healthy',
          lastSync: new Date().toISOString(),
          nextSync: new Date(Date.now() + 3600000).toISOString(),
          errorMessage: null,
        },
      },
    };
  }

  // =============================================================================
  // Export & Backup
  // =============================================================================

  async requestExport(organizationId: string, requestData: any) {
    const { data } = requestData;
    const { attributes } = data;

    // Mock export job creation - in a real implementation, you would create an actual export job
    const exportJobId = `export_${Date.now()}`;

    this.logger.log(`Export job created for organization ${organizationId}: ${exportJobId}`);

    return {
      data: {
        id: exportJobId,
        type: 'export-jobs',
        attributes: {
          status: 'pending',
          format: attributes.format,
          dataTypes: attributes.dataTypes,
          createdAt: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    };
  }

  async getExports() {
    // Mock export jobs - in a real implementation, you would query actual export jobs
    const exports = [
      {
        id: 'export_1',
        status: 'completed',
        format: 'json',
        dataTypes: ['users', 'farms'],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        completedAt: new Date(Date.now() - 3600000).toISOString(),
        downloadUrl: '/api/organizations/exports/export_1/download',
        errorMessage: null,
      },
    ];

    return {
      data: exports.map(exportJob => ({
        id: exportJob.id,
        type: 'export-jobs',
        attributes: exportJob,
      })),
    };
  }

  async getExport(organizationId: string, exportId: string) {
    // Mock export details
    return {
      data: {
        id: exportId,
        type: 'export-jobs',
        attributes: {
          status: 'completed',
          format: 'json',
          dataTypes: ['users', 'farms'],
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 3600000).toISOString(),
          downloadUrl: `/api/organizations/exports/${exportId}/download`,
          errorMessage: null,
          fileSize: 1024000,
        },
      },
    };
  }

  async createBackup(organizationId: string, requestData: any) {
    const { data } = requestData;
    const { attributes } = data;

    // Mock backup job creation
    const backupJobId = `backup_${Date.now()}`;

    this.logger.log(`Backup job created for organization ${organizationId}: ${backupJobId}`);

    return {
      data: {
        id: backupJobId,
        type: 'backup-jobs',
        attributes: {
          status: 'pending',
          includeMedia: attributes.includeMedia,
          retention: attributes.retention,
          createdAt: new Date().toISOString(),
          estimatedCompletion: new Date(Date.now() + 7200000).toISOString(),
        },
      },
    };
  }

  // =============================================================================
  // Subscription & Billing
  // =============================================================================

  async getBilling(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        plan: true,
        metadata: true,
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Mock billing data
    const billing = {
      planId: organization.plan,
      billingCycle: 'monthly',
      paymentMethod: 'card_****1234',
      status: 'active',
      currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    };

    return {
      data: {
        id: organizationId,
        type: 'billing',
        attributes: billing,
      },
    };
  }

  async getUsage(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        maxUsers: true,
        maxFarms: true,
        users: { select: { id: true } },
        farms: { select: { id: true } },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    const userCount = organization.users.length;
    const farmCount = organization.farms.length;

    const usage = {
      users: {
        current: userCount,
        limit: organization.maxUsers,
        percentage: Math.round((userCount / organization.maxUsers) * 100),
      },
      farms: {
        current: farmCount,
        limit: organization.maxFarms,
        percentage: Math.round((farmCount / organization.maxFarms) * 100),
      },
      storage: {
        current: 1024, // Mock storage usage in MB
        limit: 10240, // Mock storage limit in MB
        percentage: 10,
      },
      apiCalls: {
        current: 5000, // Mock API calls
        limit: 10000, // Mock API limit
        percentage: 50,
      },
    };

    return {
      data: {
        id: organizationId,
        type: 'usage',
        attributes: usage,
      },
    };
  }

  async getPlans() {
    // Mock subscription plans
    const plans = [
      {
        id: 'basic',
        name: 'Basic Plan',
        description: 'Perfect for small farms',
        price: 29.99,
        billingCycle: 'monthly',
        features: ['Up to 5 users', '1 farm', 'Basic analytics'],
        limits: {
          users: 5,
          farms: 1,
          storage: 1024,
          apiCalls: 1000,
        },
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        description: 'For growing operations',
        price: 99.99,
        billingCycle: 'monthly',
        features: ['Up to 25 users', '5 farms', 'Advanced analytics', 'Integrations'],
        limits: {
          users: 25,
          farms: 5,
          storage: 10240,
          apiCalls: 10000,
        },
      },
    ];

    return {
      data: plans.map(plan => ({
        id: plan.id,
        type: 'plans',
        attributes: plan,
      })),
    };
  }

  async subscribe(organizationId: string, requestData: any) {
    const { data } = requestData;
    const { attributes } = data;

    try {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: attributes.planId,
          metadata: {
            billingCycle: attributes.billingCycle,
            paymentMethod: attributes.paymentMethod,
            subscriptionStatus: attributes.status,
          },
        },
      });

      this.logger.log(`Organization ${organizationId} subscribed to plan ${attributes.planId}`);

      return {
        data: {
          id: organizationId,
          type: 'subscriptions',
          attributes: {
            planId: attributes.planId,
            billingCycle: attributes.billingCycle,
            status: attributes.status,
            startDate: new Date().toISOString(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to subscribe organization ${organizationId}:`, error);
      throw new BadRequestException('Failed to subscribe to plan');
    }
  }

  async updateSubscription(organizationId: string, requestData: { planId: string; billingCycle: string }) {
    const { planId, billingCycle } = requestData;

    try {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: planId,
          metadata: {
            billingCycle,
            updatedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`Organization ${organizationId} subscription updated`);

      return {
        data: {
          id: organizationId,
          type: 'subscriptions',
          attributes: {
            planId,
            billingCycle,
            status: 'active',
            updatedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update subscription for organization ${organizationId}:`, error);
      throw new BadRequestException('Failed to update subscription');
    }
  }

  async getInvoices(_organizationId: string, query: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 10 } = query;

    // Mock invoices - in a real implementation, you would query actual invoices
    const invoices = [
      {
        id: 'inv_1',
        number: 'INV-2024-001',
        status: 'paid',
        amount: 99.99,
        currency: 'USD',
        dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        downloadUrl: '/api/organizations/invoices/inv_1/download',
      },
    ];

    return {
      data: invoices.map(invoice => ({
        id: invoice.id,
        type: 'invoices',
        attributes: invoice,
      })),
      meta: {
        pagination: {
          page,
          limit,
          total: invoices.length,
          pages: Math.ceil(invoices.length / limit),
        },
      },
    };
  }

  async getInvoice(_organizationId: string, invoiceId: string) {
    // Mock invoice details
    return {
      data: {
        id: invoiceId,
        type: 'invoices',
        attributes: {
          number: 'INV-2024-001',
          status: 'paid',
          amount: 99.99,
          currency: 'USD',
          dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          downloadUrl: `/api/organizations/invoices/${invoiceId}/download`,
          lineItems: [
            {
              description: 'Professional Plan - Monthly',
              quantity: 1,
              unitPrice: 99.99,
              total: 99.99,
            },
          ],
        },
      },
    };
  }

  // =============================================================================
  // Platform Admin Endpoints
  // =============================================================================

  async getOrganizations(query: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isActive?: boolean;
    plan?: string;
  }) {
    const { page = 1, limit = 10, search, type, isActive, plan } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(type && { type: type as any }),
      ...(isActive !== undefined && { isActive }),
      ...(plan && { plan }),
    };

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
          farms: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations.map(org => this.transformToJsonApi(org)),
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };
  }

  async getOrganization(orgId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        farms: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    return {
      data: this.transformToJsonApi(organization),
    };
  }

  async createOrganization(requestData: CreateOrganizationRequest) {
    const { data } = requestData;
    const { attributes } = data;

    try {
      // Determine plan tier - default to BASIC if not specified
      const planTier = attributes.plan || 'BASIC';
      
      // Initialize organization features using PlanFeatureMapper
      const { allowedModules, features } = this.planFeatureMapper.getOrganizationFeatures(
        attributes.type,
        planTier as any
      );

      const organization = await this.prisma.organization.create({
        data: {
          name: attributes.name,
          type: attributes.type as any,
          email: attributes.email,
          phone: attributes.phone,
          address: attributes.address,
          taxId: attributes.taxId,
          plan: planTier,
          maxUsers: attributes.maxUsers || 5,
          maxFarms: attributes.maxFarms || 1,
          features: features,
          allowedModules: allowedModules,
          isActive: true,
          isVerified: false,
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          farms: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      this.logger.log(`Organization created: ${organization.name} (${organization.id})`);

      return {
        data: this.transformToJsonApi(organization),
      };
    } catch (error) {
      this.logger.error('Failed to create organization:', error);
      throw new BadRequestException('Failed to create organization');
    }
  }

  async updateOrganization(orgId: string, requestData: UpdateOrganizationRequest) {
    const { data } = requestData;
    const { attributes } = data;

    const existingOrg = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!existingOrg) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    try {
      const organization = await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          ...(attributes.name && { name: attributes.name }),
          ...(attributes.type && { type: attributes.type as any }),
          ...(attributes.email && { email: attributes.email }),
          ...(attributes.phone && { phone: attributes.phone }),
          ...(attributes.address && { address: attributes.address }),
          ...(attributes.taxId && { taxId: attributes.taxId }),
          ...(attributes.website && { website: attributes.website }),
          ...(attributes.description && { description: attributes.description }),
          ...(attributes.isActive !== undefined && { isActive: attributes.isActive }),
          ...(attributes.isVerified !== undefined && { isVerified: attributes.isVerified }),
          ...(attributes.plan && { plan: attributes.plan }),
          ...(attributes.maxUsers && { maxUsers: attributes.maxUsers }),
          ...(attributes.maxFarms && { maxFarms: attributes.maxFarms }),
          ...(attributes.features && { features: attributes.features }),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          farms: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      this.logger.log(`Organization updated: ${organization.name} (${organization.id})`);

      return {
        data: this.transformToJsonApi(organization),
      };
    } catch (error) {
      this.logger.error(`Failed to update organization ${orgId}:`, error);
      throw new BadRequestException('Failed to update organization');
    }
  }

  async deleteOrganization(orgId: string) {
    const existingOrg = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!existingOrg) {
      throw new NotFoundException(`Organization with ID ${orgId} not found`);
    }

    try {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { isActive: false },
      });

      this.logger.log(`Organization soft deleted: ${orgId}`);

      return {
        data: {
          id: orgId,
          type: 'organizations',
          attributes: {
            isActive: false,
            deletedAt: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error(`Failed to delete organization ${orgId}:`, error);
      throw new BadRequestException('Failed to delete organization');
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private transformToJsonApi(organization: any): OrganizationResource['data'] {
    return {
      id: organization.id,
      type: 'organizations',
      attributes: {
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        address: organization.address,
        taxId: organization.taxId,
        website: organization.website,
        description: organization.description,
        type: organization.type,
        isActive: organization.isActive,
        isVerified: organization.isVerified,
        plan: organization.plan,
        maxUsers: organization.maxUsers,
        maxFarms: organization.maxFarms,
        features: organization.features || [],
        logo: organization.metadata?.logo,
        createdAt: organization.createdAt.toISOString(),
        updatedAt: organization.updatedAt.toISOString(),
      },
      relationships: {
        users: {
          data: organization.users?.map((user: any) => ({
            id: user.id,
            type: 'users',
          })) || [],
        },
        farms: {
          data: organization.farms?.map((farm: any) => ({
            id: farm.id,
            type: 'farms',
          })) || [],
        },
      },
    };
  }

  // =============================================================================
  // Currency Management
  // =============================================================================

  /**
   * Get organization currency
   */
  async getCurrency(organizationId: string): Promise<Currency> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return organization.currency;
  }

  /**
   * Update organization currency
   */
  async updateCurrency(organizationId: string, currency: Currency): Promise<{ data: { currency: Currency } }> {
    // Validate currency
    if (!this.currencyService.isSupportedCurrency(currency)) {
      throw new BadRequestException(`Unsupported currency: ${currency}`);
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    // Update organization currency
    const updatedOrganization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { currency },
      select: { currency: true },
    });

    this.logger.log(`Updated organization ${organizationId} currency to ${currency}`);

    return {
      data: {
        currency: updatedOrganization.currency,
      },
    };
  }

  /**
   * Get currency info for organization
   */
  async getCurrencyInfo(organizationId: string) {
    const currency = await this.getCurrency(organizationId);
    return this.currencyService.getCurrencyInfo(currency);
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): Currency[] {
    return this.currencyService.getSupportedCurrencies();
  }

  /**
   * Convert amount to organization currency
   */
  async convertToOrganizationCurrency(
    amount: number,
    fromCurrency: Currency,
    organizationId: string,
  ): Promise<number> {
    const organizationCurrency = await this.getCurrency(organizationId);
    
    if (fromCurrency === organizationCurrency) {
      return amount;
    }

    const conversion = this.currencyService.convertAmount(
      amount,
      fromCurrency,
      organizationCurrency,
    );

    return conversion.convertedAmount;
  }

  /**
   * Convert amount from organization currency to target currency
   */
  async convertFromOrganizationCurrency(
    amount: number,
    organizationId: string,
    toCurrency: Currency,
  ): Promise<number> {
    const organizationCurrency = await this.getCurrency(organizationId);
    
    if (organizationCurrency === toCurrency) {
      return amount;
    }

    const conversion = this.currencyService.convertAmount(
      amount,
      organizationCurrency,
      toCurrency,
    );

    return conversion.convertedAmount;
  }

  /**
   * Format amount in organization currency
   */
  async formatOrganizationAmount(amount: number, organizationId: string): Promise<string> {
    const organizationCurrency = await this.getCurrency(organizationId);
    return this.currencyService.formatAmount(amount, organizationCurrency);
  }
}
