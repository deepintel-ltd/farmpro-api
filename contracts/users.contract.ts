import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  UserResourceSchema,
  UserCollectionSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  FarmCollectionSchema,
  OrderCollectionSchema,
  JsonApiErrorResponseSchema,
} from './schemas';
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
    body: c.noBody(),
    responses: {
      204: c.noBody(),
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
            id: z.string().uuid(),
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
            id: z.string().uuid(),
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
});

export type UserContract = typeof userContract;
