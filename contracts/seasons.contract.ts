import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CuidQueryParam } from './common';
import {
  JsonApiErrorResponseSchema,
} from './schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  AllQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  CuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// Season Schemas
// =============================================================================

/**
 * Season status enum
 */
export const SeasonStatusSchema = z.enum([
  'planned',    // Season is planned but not started
  'current',    // Season is currently active
  'completed',  // Season has ended
  'archived',   // Season is archived for historical reference
]);

/**
 * Season type enum (based on climate/region)
 */
export const SeasonTypeSchema = z.enum([
  'spring',
  'summer',
  'autumn',
  'winter',
  'dry',      // For regions with dry seasons
  'wet',      // For regions with wet seasons
  'custom',   // User-defined season type
]);

/**
 * Season attributes schema
 */
export const SeasonAttributesSchema = z.object({
  // Basic Information
  name: z.string().min(1).max(100),
  seasonType: SeasonTypeSchema,
  status: SeasonStatusSchema,
  
  // Date Range
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  
  // Farm Association
  farmId: CuidQueryParam('farmId'),
  
  // Weather Information (optional)
  expectedWeather: z.string().max(500).optional(),
  expectedTemperatureMin: z.number().optional(), // in Celsius
  expectedTemperatureMax: z.number().optional(), // in Celsius
  expectedRainfall: z.number().optional(), // in mm
  
  // Planned Crops
  plannedCrops: z.array(z.string()).optional(),
  
  // Planned Activities
  plannedActivities: z.array(z.string()).optional(),
  
  // Goals and Targets
  targetYield: z.number().optional(),
  targetYieldUnit: z.string().optional(),
  budgetAllocated: z.number().optional(),
  budgetCurrency: z.string().length(3).optional(), // ISO 4217 currency code
  
  // Notes
  description: z.string().max(1000).optional(),
  notes: z.string().max(5000).optional(),
  
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: CuidQueryParam('createdBy').optional(),
  updatedBy: CuidQueryParam('updatedBy').optional(),
});

/**
 * Season resource schema (JSON:API format)
 */
export const SeasonResourceSchema = z.object({
  data: z.object({
    type: z.literal('seasons'),
    id: CuidQueryParam('id'),
    attributes: SeasonAttributesSchema,
    relationships: z
      .object({
        farm: z
          .object({
            data: z.object({
              type: z.literal('farms'),
              id: CuidQueryParam('farmId'),
            }),
            links: z
              .object({
                self: z.string().url(),
                related: z.string().url(),
              })
              .optional(),
          })
          .optional(),
        activities: z
          .object({
            data: z.array(
              z.object({
                type: z.literal('activities'),
                id: CuidQueryParam('activityId'),
              })
            ),
            links: z
              .object({
                self: z.string().url(),
                related: z.string().url(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
    links: z
      .object({
        self: z.string().url(),
      })
      .optional(),
  }),
});

/**
 * Season collection schema (JSON:API format)
 */
export const SeasonCollectionSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('seasons'),
      id: CuidQueryParam('id'),
      attributes: SeasonAttributesSchema,
      relationships: z
        .object({
          farm: z
            .object({
              data: z.object({
                type: z.literal('farms'),
                id: CuidQueryParam('farmId'),
              }),
            })
            .optional(),
          activities: z
            .object({
              data: z.array(
                z.object({
                  type: z.literal('activities'),
                  id: CuidQueryParam('activityId'),
                })
              ),
            })
            .optional(),
        })
        .optional(),
      links: z
        .object({
          self: z.string().url(),
        })
        .optional(),
    })
  ),
  meta: z
    .object({
      total: z.number(),
      page: z.number().optional(),
      pageSize: z.number().optional(),
      totalPages: z.number().optional(),
    })
    .optional(),
  links: z
    .object({
      self: z.string().url(),
      first: z.string().url().optional(),
      last: z.string().url().optional(),
      prev: z.string().url().optional(),
      next: z.string().url().optional(),
    })
    .optional(),
});

/**
 * Create season request schema
 */
export const CreateSeasonRequestSchema = z.object({
  data: z.object({
    type: z.literal('seasons'),
    attributes: SeasonAttributesSchema.omit({
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
    }),
  }),
});

/**
 * Update season request schema
 */
export const UpdateSeasonRequestSchema = z.object({
  data: z.object({
    type: z.literal('seasons'),
    id: CuidQueryParam('id'),
    attributes: SeasonAttributesSchema.omit({
      farmId: true, // Cannot change farm association
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
    }).partial(),
  }),
});

/**
 * Season query parameters schema
 */
export const SeasonQueryParamsSchema = AllQueryParams.extend({
  'filter[farmId]': z.string().optional(),
  'filter[status]': SeasonStatusSchema.optional(),
  'filter[seasonType]': SeasonTypeSchema.optional(),
  'filter[startDate]': z.string().optional(), // ISO 8601 date
  'filter[endDate]': z.string().optional(),   // ISO 8601 date
  'filter[year]': z.string().optional(),      // Filter by year (e.g., "2025")
});

// =============================================================================
// Season Contracts
// =============================================================================

export const seasonContract = c.router({
  // Get all seasons
  getSeasons: {
    method: 'GET',
    path: '/seasons',
    query: SeasonQueryParamsSchema,
    responses: {
      200: SeasonCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all seasons with optional filtering, sorting, and pagination',
    description: 'Retrieve all farming seasons. Can be filtered by farm, status, type, or date range.',
  },

  // Get single season
  getSeason: {
    method: 'GET',
    path: '/seasons/:id',
    pathParams: CuidPathParam('Season'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: SeasonResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single season by ID',
    description: 'Retrieve detailed information about a specific season.',
  },

  // Create season
  createSeason: {
    method: 'POST',
    path: '/seasons',
    body: CreateSeasonRequestSchema,
    responses: {
      201: SeasonResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new season',
    description: 'Create a new farming season for a specific farm.',
  },

  // Update season
  updateSeason: {
    method: 'PATCH',
    path: '/seasons/:id',
    pathParams: CuidPathParam('Season'),
    body: UpdateSeasonRequestSchema,
    responses: {
      200: SeasonResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing season',
    description: 'Update season details. Farm association cannot be changed.',
  },

  // Delete season
  deleteSeason: {
    method: 'DELETE',
    path: '/seasons/:id',
    pathParams: CuidPathParam('Season'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete a season',
    description: 'Permanently delete a season. This action cannot be undone.',
  },

  // Get seasons by farm
  getFarmSeasons: {
    method: 'GET',
    path: '/farms/:farmId/seasons',
    pathParams: z.object({
      farmId: CuidQueryParam('farmId'),
    }),
    query: SeasonQueryParamsSchema.omit({ 'filter[farmId]': true }),
    responses: {
      200: SeasonCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all seasons for a specific farm',
    description: 'Retrieve all seasons associated with a particular farm.',
  },

  // Get current season for farm
  getCurrentFarmSeason: {
    method: 'GET',
    path: '/farms/:farmId/seasons/current',
    pathParams: z.object({
      farmId: CuidQueryParam('farmId'),
    }),
    query: CommonQueryParams,
    responses: {
      200: SeasonResourceSchema,
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get the current active season for a farm',
    description: 'Retrieve the season that is currently active (status = "current") for the specified farm.',
  },

  // Archive season
  archiveSeason: {
    method: 'POST',
    path: '/seasons/:id/archive',
    pathParams: CuidPathParam('Season'),
    body: z.object({}),
    responses: {
      200: SeasonResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Archive a completed season',
    description: 'Mark a completed season as archived for historical reference.',
  },

  // Clone season (for planning next season based on previous)
  cloneSeason: {
    method: 'POST',
    path: '/seasons/:id/clone',
    pathParams: CuidPathParam('Season'),
    body: z.object({
      data: z.object({
        type: z.literal('seasons'),
        attributes: z.object({
          name: z.string().min(1).max(100),
          startDate: z.string().datetime(),
          endDate: z.string().datetime(),
          status: SeasonStatusSchema.optional().default('planned'),
        }),
      }),
    }),
    responses: {
      201: SeasonResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Clone an existing season',
    description: 'Create a new season based on an existing one, copying planned crops and activities.',
  },

  // Get season statistics
  getSeasonStatistics: {
    method: 'GET',
    path: '/seasons/:id/statistics',
    pathParams: CuidPathParam('Season'),
    query: CommonQueryParams,
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('season-statistics'),
          id: CuidQueryParam('id'),
          attributes: z.object({
            seasonId: CuidQueryParam('seasonId'),
            
            // Activity metrics
            totalActivities: z.number(),
            completedActivities: z.number(),
            pendingActivities: z.number(),
            completionRate: z.number(), // percentage
            
            // Budget metrics
            budgetAllocated: z.number().optional(),
            budgetSpent: z.number().optional(),
            budgetRemaining: z.number().optional(),
            budgetUtilization: z.number().optional(), // percentage
            
            // Yield metrics
            targetYield: z.number().optional(),
            actualYield: z.number().optional(),
            yieldAchievement: z.number().optional(), // percentage
            yieldUnit: z.string().optional(),
            
            // Time metrics
            daysInSeason: z.number(),
            daysCompleted: z.number(),
            daysRemaining: z.number(),
            
            // Weather summary (if tracked)
            averageTemperature: z.number().optional(),
            totalRainfall: z.number().optional(),
            
            // Metadata
            calculatedAt: z.string().datetime(),
          }),
        }),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get statistics and metrics for a season',
    description: 'Retrieve aggregated statistics including activity completion, budget utilization, and yield achievement.',
  },
});

export type SeasonContract = typeof seasonContract;

// Export types for TypeScript usage
export type SeasonStatus = z.infer<typeof SeasonStatusSchema>;
export type SeasonType = z.infer<typeof SeasonTypeSchema>;
export type SeasonAttributes = z.infer<typeof SeasonAttributesSchema>;
export type SeasonResource = z.infer<typeof SeasonResourceSchema>;
export type SeasonCollection = z.infer<typeof SeasonCollectionSchema>;
export type CreateSeasonRequest = z.infer<typeof CreateSeasonRequestSchema>;
export type UpdateSeasonRequest = z.infer<typeof UpdateSeasonRequestSchema>;
