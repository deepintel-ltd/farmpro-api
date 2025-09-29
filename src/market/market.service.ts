import {
  Injectable,
  Logger,
  NotFoundException,
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

  async getPriceAlerts(_user: CurrentUser) {
    // Suppress unused parameter warnings
    void _user;
    // Mock implementation - would fetch user's price alerts
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

  async createPriceAlert(_user: CurrentUser, alertData: z.infer<typeof PriceAlertRequestSchema>) {
    // Mock implementation - would create price alert
    const alert = {
      id: 'mock-alert-id',
      type: 'price-alerts',
      attributes: {
        ...alertData.data.attributes,
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    };

    return { data: alert };
  }

  async deletePriceAlert(_user: CurrentUser, _alertId: string) {
    // Suppress unused parameter warnings
    void _alertId;
    // Mock implementation - would delete price alert
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

  async getContractTemplate(_user: CurrentUser, _templateId: string) {
    // Suppress unused parameter warnings
    void _templateId;
    // Mock implementation - would fetch contract template
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
    _user: CurrentUser,
    _filters: {
      status?: string;
      commodityId?: string;
      expiryDate?: string;
    } = {},
    _pagination: PaginationOptions = {},
  ) {
    // Suppress unused parameter warnings
    void _filters;
    void _pagination;
    // Mock implementation - would fetch user's listings
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

  async createListing(_user: CurrentUser, listingData: z.infer<typeof CreateListingRequestSchema>) {
    // Mock implementation - would create listing
    const listing = {
      id: 'mock-listing-id',
      type: 'marketplace-listings',
      attributes: {
        ...listingData.data.attributes,
        status: 'active' as const,
        views: 0,
        inquiries: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    return { data: listing };
  }

  async updateListing(_user: CurrentUser, listingId: string, listingData: z.infer<typeof UpdateListingRequestSchema>) {
    // Mock implementation - would update listing
    const listing = {
      id: listingId,
      type: 'marketplace-listings',
      attributes: {
        ...listingData.data.attributes,
        updatedAt: new Date().toISOString(),
      },
    };

    return { data: listing };
  }

  async deleteListing(_user: CurrentUser, _listingId: string) {
    // Suppress unused parameter warnings
    void _listingId;
    // Mock implementation - would delete listing
    return { message: 'Listing deleted successfully' };
  }

  async getListing(_user: CurrentUser, _listingId: string) {
    // Suppress unused parameter warnings
    void _listingId;
    // Mock implementation - would fetch listing
    return {
      data: {
        id: 'mock-listing-id',
        type: 'marketplace-listings',
        attributes: {
          inventoryId: 'mock-inventory-id',
          title: 'Mock Marketplace Listing',
          description: 'A mock marketplace listing for testing',
          quantity: 100,
          unitPrice: 25.50,
          priceType: 'fixed' as 'fixed' | 'negotiable' | 'auction',
          minQuantity: 10,
          qualityGrade: 'grade_a' as 'premium' | 'grade_a' | 'grade_b' | 'standard',
          certifications: ['organic', 'non-gmo'],
          availableFrom: new Date().toISOString(),
          availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          deliveryOptions: ['pickup', 'delivery'] as ('pickup' | 'delivery')[],
          deliveryRadius: 50,
          paymentTerms: ['cash', 'credit', 'escrow'] as ('cash' | 'credit' | 'escrow')[],
          isPublic: true,
          images: ['https://example.com/image1.jpg'],
          status: 'active' as 'active' | 'inactive' | 'expired' | 'sold',
          views: 0,
          inquiries: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

  private getOrganizationLocation(_org: any): any {
    // Suppress unused parameter warnings
    void _org;
    // Mock location - would use actual farm location
    return {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Farm Road, City, State',
      region: 'North America',
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
