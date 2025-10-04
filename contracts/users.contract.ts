import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UserResourceSchema,
  UserCollectionSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  FarmCollectionSchema,
  JsonApiErrorResponseSchema,
  UpdateProfileRequestSchema,
  UserQueryParamsSchema,
  AssignRoleRequestSchema,
  UserPreferencesSchema,
  NotificationSettingsSchema,
  ActivityQueryParamsSchema,
  StatsQueryParamsSchema,
  UserProfileResourceSchema,
  ActivityLogCollectionSchema,
  PreferencesResourceSchema,
  NotificationSettingsResourceSchema,
  StatsResourceSchema,
} from './schemas';
import {
  OrderCollectionSchema,
} from './orders.schemas';
import {
  CommonQueryParams,
  ResourceFieldsParams,
  AllQueryParams,
  CommonErrorResponses,
  CollectionErrorResponses,
  UuidPathParam,
} from './common';

const c = initContract();

// =============================================================================
// User Contracts
// =============================================================================

export const userContract = c.router({
  // Get all users
  getUsers: {
    method: 'GET',
    path: '/users',
    query: AllQueryParams,
    responses: {
      200: UserCollectionSchema,
      ...CollectionErrorResponses,
    },
    summary: 'Get all users with optional filtering, sorting, and pagination',
  },

  // Get single user
  getUser: {
    method: 'GET',
    path: '/users/:id',
    pathParams: UuidPathParam('User'),
    query: CommonQueryParams.merge(ResourceFieldsParams),
    responses: {
      200: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get a single user by ID',
  },

  // Create user
  createUser: {
    method: 'POST',
    path: '/users',
    body: CreateUserRequestSchema,
    responses: {
      201: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Create a new user',
  },

  // Update user
  updateUser: {
    method: 'PATCH',
    path: '/users/:id',
    pathParams: UuidPathParam('User'),
    body: UpdateUserRequestSchema,
    responses: {
      200: UserResourceSchema,
      ...CommonErrorResponses,
    },
    summary: 'Update an existing user',
  },

  // Delete user
  deleteUser: {
    method: 'DELETE',
    path: '/users/:id',
    pathParams: UuidPathParam('User'),
    body: z.object({}),
    responses: {
      204: z.object({}),
      404: JsonApiErrorResponseSchema,
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete a user',
  },

  // Get user farms
  getUserFarms: {
    method: 'GET',
    path: '/users/:id/farms',
    pathParams: UuidPathParam('User'),
    query: AllQueryParams,
    responses: {
      200: FarmCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all farms owned by a specific user',
  },

  // Get user orders
  getUserOrders: {
    method: 'GET',
    path: '/users/:id/orders',
    pathParams: UuidPathParam('User'),
    query: AllQueryParams,
    responses: {
      200: OrderCollectionSchema,
      ...CommonErrorResponses,
    },
    summary: 'Get all orders for a specific user',
  },

  // Get user relationship data - farms
  getUserFarmRelationships: {
    method: 'GET',
    path: '/users/:id/relationships/farms',
    pathParams: UuidPathParam('User'),
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('farms'),
            id: z.string().cuid(),
          }),
        ),
        links: z
          .object({
            self: z.string().url(),
            related: z.string().url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get user-farm relationship identifiers',
  },

  // Get user relationship data - orders
  getUserOrderRelationships: {
    method: 'GET',
    path: '/users/:id/relationships/orders',
    pathParams: UuidPathParam('User'),
    responses: {
      200: z.object({
        data: z.array(
          z.object({
            type: z.literal('orders'),
            id: z.string().cuid(),
          }),
        ),
        links: z
          .object({
            self: z.string().url(),
            related: z.string().url(),
          })
          .optional(),
      }),
      ...CommonErrorResponses,
    },
    summary: 'Get user-order relationship identifiers',
  },

  // =============================================================================
  // User Profile Management
  // =============================================================================
  
  getProfile: {
    method: 'GET',
    path: '/users/profile',
    responses: {
      200: UserProfileResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get current user profile',
  },

  updateProfile: {
    method: 'PUT',
    path: '/users/profile',
    body: UpdateProfileRequestSchema,
    responses: {
      200: UserProfileResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update user profile',
  },

  uploadAvatar: {
    method: 'POST',
    path: '/users/avatar',
    body: z.any(), // multipart/form-data
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('avatars'),
          attributes: z.object({
            url: z.string().url(),
            message: z.string(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Upload user avatar',
  },

  deleteAvatar: {
    method: 'DELETE',
    path: '/users/avatar',
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('avatars'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Delete user avatar',
  },

  // =============================================================================
  // Enhanced User Management
  // =============================================================================

  getUsersWithQuery: {
    method: 'GET',
    path: '/users/search',
    query: UserQueryParamsSchema,
    responses: {
      200: UserCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Search and filter users',
  },

  activateUser: {
    method: 'POST',
    path: '/users/:id/activate',
    pathParams: UuidPathParam('User'),
    body: z.object({}),
    responses: {
      200: UserResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Activate user',
  },

  // =============================================================================
  // Role Management
  // =============================================================================

  getUserRoles: {
    method: 'GET',
    path: '/users/:id/roles',
    pathParams: UuidPathParam('User'),
    responses: {
      200: z.object({
        data: z.array(z.object({
          id: z.string(),
          type: z.literal('roles'),
          attributes: z.object({
            name: z.string(),
            permissions: z.array(z.string()),
            farmId: z.string().cuid().nullable(),
            expiresAt: z.string().datetime().nullable(),
          }),
        })),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get user roles',
  },

  assignRole: {
    method: 'POST',
    path: '/users/:id/roles',
    pathParams: UuidPathParam('User'),
    body: AssignRoleRequestSchema,
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('role-assignments'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Assign role to user',
  },

  removeRole: {
    method: 'DELETE',
    path: '/users/:id/roles/:roleId',
    pathParams: z.object({
      id: z.string().cuid(),
      roleId: z.string().cuid(),
    }),
    query: z.object({
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal('role-assignments'),
          attributes: z.object({
            message: z.string(),
            success: z.boolean(),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Remove role from user',
  },

  // =============================================================================
  // User Preferences
  // =============================================================================

  getPreferences: {
    method: 'GET',
    path: '/users/preferences',
    responses: {
      200: PreferencesResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get user preferences',
  },

  updatePreferences: {
    method: 'PUT',
    path: '/users/preferences',
    body: UserPreferencesSchema,
    responses: {
      200: PreferencesResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update user preferences',
  },

  getNotificationSettings: {
    method: 'GET',
    path: '/users/notifications/settings',
    responses: {
      200: NotificationSettingsResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get notification settings',
  },

  updateNotificationSettings: {
    method: 'PUT',
    path: '/users/notifications/settings',
    body: NotificationSettingsSchema,
    responses: {
      200: NotificationSettingsResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update notification settings',
  },

  // =============================================================================
  // Activity & Analytics
  // =============================================================================

  getMyActivity: {
    method: 'GET',
    path: '/users/activity',
    query: ActivityQueryParamsSchema,
    responses: {
      200: ActivityLogCollectionSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get current user activity',
  },

  getUserActivity: {
    method: 'GET',
    path: '/users/:id/activity',
    pathParams: UuidPathParam('User'),
    query: ActivityQueryParamsSchema,
    responses: {
      200: ActivityLogCollectionSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get user activity (admin)',
  },

  getMyStats: {
    method: 'GET',
    path: '/users/stats',
    query: StatsQueryParamsSchema,
    responses: {
      200: StatsResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get current user stats',
  },

  getUserStats: {
    method: 'GET',
    path: '/users/:id/stats',
    pathParams: UuidPathParam('User'),
    query: StatsQueryParamsSchema,
    responses: {
      200: StatsResourceSchema,
      401: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get user stats (manager)',
  },
});

export type UserContract = typeof userContract;
