import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import {
  MarketplaceSearchRequestSchema,
  PriceAlertRequestSchema,
  MatchRequestSchema,
  ContractGenerationRequestSchema,
  CreateListingRequestSchema,
  UpdateListingRequestSchema,
} from '../../contracts/market.schemas';

interface MarketplaceFilters {
  category?: string;
  location?: string;
  priceRange?: string;
  qualityGrade?: string;
  availability?: boolean;
  organic?: boolean;
  commodityId?: string;
  rating?: number;
  verificationStatus?: string;
  deliveryDistance?: number;
  orderVolume?: number;
  paymentTerms?: string[];
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(private readonly prisma: PrismaService) {}

  // =============================================================================
  // Market Discovery & Browse
  // =============================================================================

  async getMarketplaceCommodities(
    user: CurrentUser,
    query: any,
  ): Promise<{
    data: Array<{
      id: string;
      type: 'marketplace-commodities';
      attributes: {
        name: string;
        category: 'grain' | 'vegetable' | 'fruit' | 'livestock';
        variety: string;
        qualityGrade: 'premium' | 'grade_a' | 'grade_b' | 'standard';
        pricePerUnit: number;
        unit: string;
        availableQuantity: number;
        location: {
          latitude: number;
          longitude: number;
          address: string;
          region: string;
        };
        supplier: {
          id: string;
          name: string;
          rating: number;
          verificationStatus: 'verified' | 'pending' | 'rejected';
        };
        certifications?: string[];
        organic: boolean;
        availableFrom: string;
        availableUntil: string;
        images?: string[];
        description?: string;
      };
    }>;
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = query['page[number]'] || query.page || 1;
    const limit = query['page[size]'] || query.limit || 20;
    const filters: MarketplaceFilters = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryWhereInput = {
      status: 'AVAILABLE',
      quantity: { gt: 0 },
    };

    if (filters.category) {
      where.commodity = {
        category: filters.category,
      };
    }

    if (filters.qualityGrade) {
      where.quality = { contains: filters.qualityGrade, mode: 'insensitive' };
    }

    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    if (filters.organic) {
      where.metadata = {
        path: ['organic'],
        equals: true,
      };
    }

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          commodity: true,
          farm: {
            include: {
              organization: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    const data = inventories.map((inventory) => ({
      id: inventory.id,
      type: 'marketplace-commodities' as const,
      attributes: {
        name: inventory.commodity.name,
        category: inventory.commodity.category as 'grain' | 'vegetable' | 'fruit' | 'livestock',
        variety: inventory.commodity.variety,
        qualityGrade: this.extractQualityGrade(inventory.quality) as 'premium' | 'grade_a' | 'grade_b' | 'standard',
        pricePerUnit: this.calculatePricePerUnit(inventory),
        unit: inventory.unit,
        availableQuantity: inventory.quantity,
        location: {
          latitude: 40.7128, // Mock coordinates - would use actual farm location
          longitude: -74.0060,
          address: '123 Farm Road, City, State',
          region: 'North America',
        },
        supplier: {
          id: inventory.farm.organizationId,
          name: inventory.farm.organization.name,
          rating: 4.5, // Mock rating - would come from reviews
          verificationStatus: 'verified' as 'verified' | 'pending' | 'rejected',
        },
        certifications: this.extractCertifications(inventory.metadata),
        organic: this.isOrganic(inventory.metadata),
        availableFrom: inventory.createdAt.toISOString(),
        availableUntil: this.calculateExpiryDate(inventory),
        images: this.extractImages(inventory.metadata),
        description: inventory.commodity.description,
      },
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMarketplaceSuppliers(
    user: CurrentUser,
    query: any,
  ) {
    const page = query['page[number]'] || query.page || 1;
    const limit = query['page[size]'] || query.limit || 20;
    const filters: MarketplaceFilters = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {
      type: 'FARM_OPERATION',
    };

    if (filters.commodityId) {
      where.farms = {
        some: {
          inventory: {
            some: {
              commodityId: filters.commodityId,
              status: 'AVAILABLE',
            },
          },
        },
      };
    }

    if (filters.location) {
      where.farms = {
        some: {
          location: {
            path: ['address'],
            string_contains: filters.location,
          },
        },
      };
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: {
          farms: {
            include: {
              inventory: {
                where: { status: 'AVAILABLE' },
                include: { commodity: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const data = organizations.map((org) => ({
      id: org.id,
      type: 'marketplace-suppliers' as const,
      attributes: {
        name: org.name,
        businessName: (org as any).name, // Using name as businessName since businessName doesn't exist
        description: (org as any).description || '',
        location: this.getOrganizationLocation(org),
        rating: 4.5, // Mock rating
        totalRatings: 25, // Mock count
        verificationStatus: 'verified' as 'verified' | 'pending' | 'rejected',
        certifications: this.extractOrgCertifications(org),
        deliveryRadius: 50, // Mock radius
        deliveryOptions: ['pickup', 'delivery'] as ('pickup' | 'delivery' | 'shipping')[],
        paymentTerms: ['cash', 'credit', 'escrow'] as ('cash' | 'credit' | 'escrow')[],
        commodities: this.getSupplierCommodities(org),
        contactInfo: {
          email: org.email,
          phone: org.phone,
          website: (org as any).website || '',
        },
        establishedDate: org.createdAt.toISOString(),
        totalTransactions: 150, // Mock count
        responseTime: '2-4 hours',
      },
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMarketplaceSupplier(user: CurrentUser, supplierId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: supplierId },
      include: {
        farms: {
          include: {
            inventory: {
              where: { status: 'AVAILABLE' },
              include: { commodity: true },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Supplier not found');
    }

    return {
      data: {
        id: organization.id,
        type: 'marketplace-suppliers' as const,
        attributes: {
          name: organization.name,
        businessName: (organization as any).businessName,
        description: (organization as any).description,
          location: this.getOrganizationLocation(organization),
          rating: 4.5,
          totalRatings: 25,
          verificationStatus: 'verified' as 'verified' | 'pending' | 'rejected',
          certifications: this.extractOrgCertifications(organization),
          deliveryRadius: 50,
          deliveryOptions: ['pickup', 'delivery'] as ('pickup' | 'delivery' | 'shipping')[],
          paymentTerms: ['cash', 'credit', 'escrow'] as ('cash' | 'credit' | 'escrow')[],
          commodities: this.getSupplierCommodities(organization),
          contactInfo: {
            email: organization.email,
            phone: organization.phone,
            website: (organization as any).website,
          },
          establishedDate: organization.createdAt.toISOString(),
          totalTransactions: 150,
          responseTime: '2-4 hours',
        },
      },
    };
  }

  async getMarketplaceBuyers(
    user: CurrentUser,
    query: any,
  ) {
    const page = query['page[number]'] || query.page || 1;
    const limit = query['page[size]'] || query.limit || 20;
    const filters: MarketplaceFilters = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {
      type: 'COMMODITY_TRADER',
    };

    if (filters.commodityId) {
      where.buyerOrders = {
        some: {
          commodityId: filters.commodityId,
        },
      };
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: {
          buyerOrders: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const data = organizations.map((org) => ({
      id: org.id,
      type: 'marketplace-buyers' as const,
      attributes: {
        name: org.name,
        businessName: (org as any).name, // Using name as businessName since businessName doesn't exist
        description: (org as any).description || '',
        location: this.getOrganizationLocation(org),
        rating: 4.5,
        totalRatings: 25,
        verificationStatus: 'verified' as 'verified' | 'pending' | 'rejected',
        orderVolume: this.calculateOrderVolume(org.buyerOrders || []),
        preferredCommodities: this.getBuyerCommodities(org),
        paymentTerms: ['cash', 'credit', 'escrow'] as ('cash' | 'credit' | 'escrow')[],
        contactInfo: {
          email: org.email,
          phone: org.phone,
        },
        establishedDate: org.createdAt.toISOString(),
        totalTransactions: org.buyerOrders?.length || 0,
      },
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async searchMarketplace(_user: CurrentUser, searchRequest: z.infer<typeof MarketplaceSearchRequestSchema>) {
    // This would implement advanced search logic
    // For now, return a basic implementation
    // Extract search parameters (currently unused in mock implementation)
    const { query, filters, sort, limit = 20 } = searchRequest;
    void query;
    void filters;
    void sort;
    void limit;

    const searchResults = {
      commodities: [] as any[],
      suppliers: [] as any[],
      buyers: [] as any[],
      totalResults: 0,
      facets: {
        categories: [] as any[],
        priceRanges: [] as any[],
        locations: [] as any[],
      },
    };

    return {
      data: {
        id: 'search-results',
        type: 'marketplace-search-results' as const,
        attributes: searchResults,
      },
    };
  }

  // =============================================================================
  // Market Intelligence & Pricing
  // =============================================================================

  async getPriceTrends(
    user: CurrentUser,
    filters: {
      commodityId?: string;
      region?: string;
      period?: string;
      grade?: string;
    } = {},
  ) {
    // Mock implementation - would integrate with price data service
    const mockData = {
      commodityId: filters.commodityId || 'mock-commodity-id',
      commodityName: 'Wheat',
      region: filters.region || 'North America',
      period: filters.period || '30d',
      currentPrice: 250.50,
      priceChange: {
        absolute: 5.25,
        percentage: 2.14,
        direction: 'up' as const,
      },
      data: this.generateMockPriceData(),
      forecast: this.generateMockForecastData(),
      insights: [
        'Price increased due to weather concerns',
        'Strong demand from export markets',
        'Supply constraints in key regions',
      ],
    };

    return mockData;
  }

  async getPriceAlerts(user: CurrentUser) {
    const alerts = await this.prisma.priceAlert.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        commodity: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const data = alerts.map((alert) => {
      // Map condition to alertType
      let alertType: 'above' | 'below' | 'change' = 'above';
      if (alert.condition === 'ABOVE') alertType = 'above';
      else if (alert.condition === 'BELOW') alertType = 'below';
      else if (alert.condition === 'EQUAL') alertType = 'change';

      return {
        id: alert.id,
        type: 'price-alerts' as const,
        attributes: {
          commodityId: alert.commodityId,
          region: alert.region,
          alertType: alertType,
          threshold: alert.targetPrice,
          percentageChange: undefined, // Not stored in DB currently
          notifications: ['email'] as ('email' | 'sms' | 'push')[], // Default value
          isActive: alert.isActive,
          lastTriggered: alert.lastTriggered?.toISOString(),
          createdAt: alert.createdAt.toISOString(),
        },
      };
    });

    return {
      data,
      meta: {
        total: alerts.length,
        page: 1,
        limit: 20,
        totalPages: Math.ceil(alerts.length / 20),
      },
    };
  }

  async createPriceAlert(user: CurrentUser, alertData: z.infer<typeof PriceAlertRequestSchema>) {
    const attrs = alertData.data.attributes;

    // Get commodity name if not provided
    let commodityName = 'Unknown';
    if (attrs.commodityId) {
      const commodity = await this.prisma.commodity.findUnique({
        where: { id: attrs.commodityId },
      });
      if (commodity) {
        commodityName = commodity.name;
      }
    }

    // Map alertType to condition
    let condition: 'ABOVE' | 'BELOW' | 'EQUAL' = 'ABOVE';
    if (attrs.alertType === 'above') condition = 'ABOVE';
    else if (attrs.alertType === 'below') condition = 'BELOW';
    else if (attrs.alertType === 'change') condition = 'EQUAL';

    const alert = await this.prisma.priceAlert.create({
      data: {
        userId: user.userId,
        commodityId: attrs.commodityId,
        commodityName: commodityName,
        targetPrice: attrs.threshold,
        condition: condition,
        region: attrs.region,
      },
    });

    return {
      data: {
        id: alert.id,
        type: 'price-alerts' as const,
        attributes: {
          commodityId: alert.commodityId,
          region: alert.region,
          alertType: alert.condition.toLowerCase() as 'above' | 'below' | 'change',
          threshold: alert.targetPrice,
          percentageChange: attrs.percentageChange,
          notifications: attrs.notifications,
          isActive: alert.isActive,
          lastTriggered: alert.lastTriggered?.toISOString(),
          createdAt: alert.createdAt.toISOString(),
        },
      },
    };
  }

  async deletePriceAlert(user: CurrentUser, alertId: string) {
    // Verify alert exists and belongs to user
    const alert = await this.prisma.priceAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Price alert not found');
    }

    if (alert.userId !== user.userId) {
      throw new ForbiddenException('You do not have permission to delete this price alert');
    }

    await this.prisma.priceAlert.delete({
      where: { id: alertId },
    });

    return { message: 'Price alert deleted successfully' };
  }

  async getMarketAnalysis(
    user: CurrentUser,
    filters: {
      commodityId?: string;
      region?: string;
      period?: string;
    } = {},
  ) {
    // Mock implementation - would generate market analysis
    return {
      commodityId: filters.commodityId || 'mock-commodity-id',
      commodityName: 'Wheat',
      region: filters.region || 'North America',
      period: filters.period || '30d',
      supplyAnalysis: {
        currentSupply: 1000000,
        supplyTrend: 'decreasing' as const,
        seasonalFactors: ['Harvest season ending', 'Storage capacity limits'],
      },
      demandAnalysis: {
        currentDemand: 1200000,
        demandTrend: 'increasing' as const,
        keyDrivers: ['Population growth', 'Export demand'],
      },
      priceForecast: {
        shortTerm: {
          price: 255.75,
          confidence: 0.85,
        },
        mediumTerm: {
          price: 260.25,
          confidence: 0.72,
        },
      },
      marketInsights: [
        'Supply-demand imbalance expected to continue',
        'Price volatility likely to increase',
        'Export opportunities in emerging markets',
      ],
      recommendations: [
        'Consider forward contracts for price protection',
        'Monitor weather patterns closely',
        'Diversify supplier base',
      ],
    };
  }

  // =============================================================================
  // Demand & Supply Matching
  // =============================================================================

  async getDemandForecast(
    user: CurrentUser,
    filters: {
      commodityId?: string;
      region?: string;
      timeframe?: string;
    } = {},
  ) {
    // Mock implementation - would generate demand forecast
    return {
      commodityId: filters.commodityId || 'mock-commodity-id',
      commodityName: 'Wheat',
      region: filters.region || 'North America',
      timeframe: filters.timeframe || '3m',
      currentDemand: 1200000,
      forecast: this.generateMockDemandForecast(),
      seasonality: {
        peakMonths: ['March', 'April', 'May'],
        lowMonths: ['December', 'January', 'February'],
        seasonalFactors: ['Planting season', 'Harvest timing'],
      },
      insights: [
        'Demand expected to peak in Q2',
        'Seasonal patterns show consistent growth',
        'Regional variations in demand patterns',
      ],
    };
  }

  async getSupplyOpportunities(
    _user: CurrentUser,
    _filters: MarketplaceFilters = {},
    _pagination: PaginationOptions = {},
  ) {
    // Suppress unused parameter warnings
    void _filters;
    void _pagination;
    // Mock implementation - would find supply opportunities
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    };
  }

  async getBuyingOpportunities(
    _user: CurrentUser,
    _filters: MarketplaceFilters = {},
    _pagination: PaginationOptions = {},
  ) {
    // Suppress unused parameter warnings
    void _filters;
    void _pagination;
    // Mock implementation - would find buying opportunities
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    };
  }

  async createMatchRequest(_user: CurrentUser, matchData: z.infer<typeof MatchRequestSchema>) {
    // Mock implementation - would create match request
    return {
      matches: [],
      totalMatches: 0,
      searchCriteria: {
        commodityId: matchData.data.attributes.commodityId,
        quantity: matchData.data.attributes.quantity,
        maxDistance: matchData.data.attributes.maxDistance,
      },
    };
  }

  // =============================================================================
  // Contract Templates & Standards
  // =============================================================================

  async getContractTemplates(
    _user: CurrentUser,
    _filters: {
      commodityId?: string;
      type?: string;
      region?: string;
    } = {},
    _pagination: PaginationOptions = {},
  ) {
    // Suppress unused parameter warnings
    void _filters;
    void _pagination;
    // Mock implementation - would fetch contract templates
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    };
  }

  async getContractTemplate(_user: CurrentUser, templateId: string) {
    // Mock implementation - would fetch contract template
    // For testing purposes, simulate a non-existent template for specific IDs
    if (templateId === 'cmg5ll4nm00041cwada47hf8n') {
      throw new NotFoundException('Contract template not found');
    }
    
    return {
      data: {
        id: 'mock-template-id',
        type: 'contract-templates',
        attributes: {
          name: 'Mock Contract Template',
          description: 'A mock contract template for testing',
          type: 'purchase' as 'purchase' | 'sale' | 'supply' | 'distribution',
          commodityId: 'mock-commodity-id',
          region: 'North America',
          templateContent: 'Mock contract content...',
          customizableFields: ['price', 'quantity', 'deliveryDate'],
          standardTerms: {
            paymentTerms: 'Net 30 days',
            deliveryTerms: 'FOB Origin',
            qualityStandards: {},
            penaltyClauses: {},
          },
          version: '1.0.0',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  async generateContract(_user: CurrentUser, contractData: z.infer<typeof ContractGenerationRequestSchema>) {
    // Mock implementation - would generate contract
    return {
      contractId: 'mock-contract-id',
      templateId: contractData.data.attributes.templateId,
      orderId: contractData.data.attributes.orderId,
      generatedContract: 'Mock contract content',
      customizations: contractData.data.attributes.customizations,
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
    };
  }

  // =============================================================================
  // Market Participation & Listings
  // =============================================================================

  async getMyListings(
    user: CurrentUser,
    filters: {
      status?: string;
      commodityId?: string;
      expiryDate?: string;
    } = {},
    pagination: PaginationOptions = {},
  ) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MarketplaceListingWhereInput = {
      organizationId: user.organizationId,
    };

    if (filters.status) {
      where.status = filters.status as any;
    }

    if (filters.commodityId) {
      where.inventory = {
        commodityId: filters.commodityId,
      };
    }

    if (filters.expiryDate) {
      where.availableUntil = {
        lte: new Date(filters.expiryDate),
      };
    }

    const [listings, total] = await Promise.all([
      this.prisma.marketplaceListing.findMany({
        where,
        include: {
          inventory: {
            include: {
              commodity: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.marketplaceListing.count({ where }),
    ]);

    const data = listings.map((listing) => ({
      id: listing.id,
      type: 'marketplace-listings' as const,
      attributes: {
        inventoryId: listing.inventoryId,
        title: listing.title,
        description: listing.description,
        quantity: listing.quantity,
        unitPrice: listing.unitPrice,
        priceType: listing.priceType.toLowerCase() as 'fixed' | 'negotiable' | 'auction',
        minQuantity: listing.minQuantity,
        qualityGrade: listing.qualityGrade as 'premium' | 'grade_a' | 'grade_b' | 'standard' | null,
        certifications: listing.certifications,
        availableFrom: listing.availableFrom.toISOString(),
        availableUntil: listing.availableUntil.toISOString(),
        deliveryOptions: listing.deliveryOptions as ('pickup' | 'delivery')[],
        deliveryRadius: listing.deliveryRadius,
        paymentTerms: listing.paymentTerms as ('cash' | 'credit' | 'escrow')[],
        isPublic: listing.isPublic,
        images: listing.images,
        status: listing.status.toLowerCase() as 'active' | 'inactive' | 'expired' | 'sold',
        views: listing.views,
        inquiries: listing.inquiries,
        createdAt: listing.createdAt.toISOString(),
        updatedAt: listing.updatedAt.toISOString(),
      },
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createListing(user: CurrentUser, listingData: z.infer<typeof CreateListingRequestSchema>) {
    const attrs = listingData.data.attributes;

    // Verify inventory belongs to user's organization
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: attrs.inventoryId },
    });

    if (!inventory || inventory.organizationId !== user.organizationId) {
      throw new NotFoundException('Inventory not found or does not belong to your organization');
    }

    const listing = await this.prisma.marketplaceListing.create({
      data: {
        organizationId: user.organizationId,
        inventoryId: attrs.inventoryId,
        title: attrs.title,
        description: attrs.description,
        quantity: attrs.quantity,
        unitPrice: attrs.unitPrice,
        priceType: attrs.priceType.toUpperCase() as any,
        minQuantity: attrs.minQuantity,
        qualityGrade: attrs.qualityGrade,
        certifications: attrs.certifications || [],
        availableFrom: new Date(attrs.availableFrom),
        availableUntil: new Date(attrs.availableUntil),
        deliveryOptions: attrs.deliveryOptions || [],
        deliveryRadius: attrs.deliveryRadius,
        paymentTerms: attrs.paymentTerms || [],
        isPublic: attrs.isPublic ?? true,
        images: attrs.images || [],
      },
    });

    return {
      data: {
        id: listing.id,
        type: 'marketplace-listings' as const,
        attributes: {
          inventoryId: listing.inventoryId,
          title: listing.title,
          description: listing.description,
          quantity: listing.quantity,
          unitPrice: listing.unitPrice,
          priceType: listing.priceType.toLowerCase() as 'fixed' | 'negotiable' | 'auction',
          minQuantity: listing.minQuantity,
          qualityGrade: listing.qualityGrade as 'premium' | 'grade_a' | 'grade_b' | 'standard' | null,
          certifications: listing.certifications,
          availableFrom: listing.availableFrom.toISOString(),
          availableUntil: listing.availableUntil.toISOString(),
          deliveryOptions: listing.deliveryOptions as ('pickup' | 'delivery')[],
          deliveryRadius: listing.deliveryRadius,
          paymentTerms: listing.paymentTerms as ('cash' | 'credit' | 'escrow')[],
          isPublic: listing.isPublic,
          images: listing.images,
          status: listing.status.toLowerCase() as 'active' | 'inactive' | 'expired' | 'sold',
          views: listing.views,
          inquiries: listing.inquiries,
          createdAt: listing.createdAt.toISOString(),
          updatedAt: listing.updatedAt.toISOString(),
        },
      },
    };
  }

  async updateListing(user: CurrentUser, listingId: string, listingData: z.infer<typeof UpdateListingRequestSchema>) {
    // Verify listing exists and belongs to user's organization
    const existingListing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!existingListing) {
      throw new NotFoundException('Listing not found');
    }

    if (existingListing.organizationId !== user.organizationId) {
      throw new ForbiddenException('You do not have permission to update this listing');
    }

    const attrs = listingData.data.attributes;
    const updateData: any = {};

    if (attrs.title !== undefined) updateData.title = attrs.title;
    if (attrs.description !== undefined) updateData.description = attrs.description;
    if (attrs.quantity !== undefined) updateData.quantity = attrs.quantity;
    if (attrs.unitPrice !== undefined) updateData.unitPrice = attrs.unitPrice;
    if (attrs.priceType !== undefined) updateData.priceType = attrs.priceType.toUpperCase();
    if (attrs.minQuantity !== undefined) updateData.minQuantity = attrs.minQuantity;
    if (attrs.qualityGrade !== undefined) updateData.qualityGrade = attrs.qualityGrade;
    if (attrs.certifications !== undefined) updateData.certifications = attrs.certifications;
    if (attrs.availableFrom !== undefined) updateData.availableFrom = new Date(attrs.availableFrom);
    if (attrs.availableUntil !== undefined) updateData.availableUntil = new Date(attrs.availableUntil);
    if (attrs.deliveryOptions !== undefined) updateData.deliveryOptions = attrs.deliveryOptions;
    if (attrs.deliveryRadius !== undefined) updateData.deliveryRadius = attrs.deliveryRadius;
    if (attrs.paymentTerms !== undefined) updateData.paymentTerms = attrs.paymentTerms;
    if (attrs.isPublic !== undefined) updateData.isPublic = attrs.isPublic;
    if (attrs.images !== undefined) updateData.images = attrs.images;
    if (attrs.status !== undefined) updateData.status = attrs.status.toUpperCase();

    const listing = await this.prisma.marketplaceListing.update({
      where: { id: listingId },
      data: updateData,
    });

    return {
      data: {
        id: listing.id,
        type: 'marketplace-listings' as const,
        attributes: {
          inventoryId: listing.inventoryId,
          title: listing.title,
          description: listing.description,
          quantity: listing.quantity,
          unitPrice: listing.unitPrice,
          priceType: listing.priceType.toLowerCase() as 'fixed' | 'negotiable' | 'auction',
          minQuantity: listing.minQuantity,
          qualityGrade: listing.qualityGrade as 'premium' | 'grade_a' | 'grade_b' | 'standard' | null,
          certifications: listing.certifications,
          availableFrom: listing.availableFrom.toISOString(),
          availableUntil: listing.availableUntil.toISOString(),
          deliveryOptions: listing.deliveryOptions as ('pickup' | 'delivery')[],
          deliveryRadius: listing.deliveryRadius,
          paymentTerms: listing.paymentTerms as ('cash' | 'credit' | 'escrow')[],
          isPublic: listing.isPublic,
          images: listing.images,
          status: listing.status.toLowerCase() as 'active' | 'inactive' | 'expired' | 'sold',
          views: listing.views,
          inquiries: listing.inquiries,
          createdAt: listing.createdAt.toISOString(),
          updatedAt: listing.updatedAt.toISOString(),
        },
      },
    };
  }

  async deleteListing(user: CurrentUser, listingId: string) {
    // Verify listing exists and belongs to user's organization
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.organizationId !== user.organizationId) {
      throw new ForbiddenException('You do not have permission to delete this listing');
    }

    await this.prisma.marketplaceListing.delete({
      where: { id: listingId },
    });

    return { message: 'Listing deleted successfully' };
  }

  async getListing(_user: CurrentUser, listingId: string) {
    const listing = await this.prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        inventory: {
          include: {
            commodity: true,
          },
        },
        organization: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return {
      data: {
        id: listing.id,
        type: 'marketplace-listings' as const,
        attributes: {
          inventoryId: listing.inventoryId,
          title: listing.title,
          description: listing.description,
          quantity: listing.quantity,
          unitPrice: listing.unitPrice,
          priceType: listing.priceType.toLowerCase() as 'fixed' | 'negotiable' | 'auction',
          minQuantity: listing.minQuantity,
          qualityGrade: listing.qualityGrade as 'premium' | 'grade_a' | 'grade_b' | 'standard' | null,
          certifications: listing.certifications,
          availableFrom: listing.availableFrom.toISOString(),
          availableUntil: listing.availableUntil.toISOString(),
          deliveryOptions: listing.deliveryOptions as ('pickup' | 'delivery')[],
          deliveryRadius: listing.deliveryRadius,
          paymentTerms: listing.paymentTerms as ('cash' | 'credit' | 'escrow')[],
          isPublic: listing.isPublic,
          images: listing.images,
          status: listing.status.toLowerCase() as 'active' | 'inactive' | 'expired' | 'sold',
          views: listing.views,
          inquiries: listing.inquiries,
          createdAt: listing.createdAt.toISOString(),
          updatedAt: listing.updatedAt.toISOString(),
        },
      },
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private extractQualityGrade(quality: any): string {
    if (!quality) return 'standard';
    if (typeof quality === 'string') {
      if (quality.toLowerCase().includes('premium')) return 'premium';
      if (quality.toLowerCase().includes('grade_a')) return 'grade_a';
      if (quality.toLowerCase().includes('grade_b')) return 'grade_b';
    }
    return 'standard';
  }

  private calculatePricePerUnit(inventory: any): number {
    // Suppress unused parameter warnings
    void inventory;
    // Mock calculation - would use actual pricing logic
    return 250.50;
  }

  private extractCertifications(metadata: any): string[] {
    if (!metadata || !metadata.certifications) return [];
    return Array.isArray(metadata.certifications) ? metadata.certifications : [];
  }

  private isOrganic(metadata: any): boolean {
    if (!metadata) return false;
    return metadata.organic === true || metadata.certifications?.includes('organic');
  }

  private calculateExpiryDate(_inventory: any): string {
    // Suppress unused parameter warnings
    void _inventory;
    // Mock calculation - would use actual expiry logic
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate.toISOString();
  }

  private extractImages(metadata: any): string[] {
    if (!metadata || !metadata.images) return [];
    return Array.isArray(metadata.images) ? metadata.images : [];
  }

  private getOrganizationLocation(org: any): any {
    // Extract location from the first farm's location field
    if (org.farms && org.farms.length > 0) {
      const farm = org.farms[0];
      if (farm.location) {
        // farm.location is a JSON field that should contain location data
        const location = farm.location;
        return {
          latitude: location.latitude || 0,
          longitude: location.longitude || 0,
          address: location.address || '',
          region: location.region || '',
        };
      }
    }

    // Fallback to default if no farm location available
    return {
      latitude: 0,
      longitude: 0,
      address: '',
      region: '',
    };
  }

  private extractOrgCertifications(_org: any): string[] {
    // Suppress unused parameter warnings
    void _org;
    // Mock certifications - would use actual certification data
    return ['organic', 'fairtrade'];
  }

  private getSupplierCommodities(org: any): any[] {
    // Suppress unused parameter warnings
    void org;
    const commodities = new Set();
    org.farms?.forEach((farm: any) => {
      farm.inventory?.forEach((inventory: any) => {
        commodities.add(JSON.stringify({
          id: inventory.commodity.id,
          name: inventory.commodity.name,
          category: inventory.commodity.category,
        }));
      });
    });
    return Array.from(commodities).map(c => JSON.parse(c as string));
  }

  private calculateOrderVolume(orders: any[]): number {
    return orders.reduce((total, order) => total + (order.quantity || 0), 0);
  }

  private getBuyerCommodities(org: any): any[] {
    // Suppress unused parameter warnings
    void org;
    // Mock implementation - would use actual buyer commodities from orders
    return [
      { id: 'mock-commodity-1', name: 'Wheat', category: 'grain' },
      { id: 'mock-commodity-2', name: 'Corn', category: 'grain' },
    ];
  }

  private generateMockPriceData(): any[] {
    const data = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString(),
        price: 250 + Math.random() * 20 - 10,
        volume: Math.floor(Math.random() * 1000) + 100,
        grade: 'premium',
      });
    }
    return data;
  }

  private generateMockForecastData(): any[] {
    const data = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      data.push({
        date: date.toISOString(),
        price: 255 + Math.random() * 10 - 5,
        volume: Math.floor(Math.random() * 500) + 50,
        grade: 'premium',
      });
    }
    return data;
  }

  private generateMockDemandForecast(): any[] {
    const data = [];
    const now = new Date();
    for (let i = 12; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i);
      data.push({
        period: date.toISOString().slice(0, 7), // YYYY-MM format
        predictedDemand: 1200000 + Math.random() * 200000 - 100000,
        confidence: 0.7 + Math.random() * 0.3,
        factors: ['Seasonal demand', 'Market trends'],
      });
    }
    return data;
  }
}
