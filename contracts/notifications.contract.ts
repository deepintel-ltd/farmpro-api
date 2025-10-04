import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import {
  JsonApiQuerySchema,
  JsonApiErrorResponseSchema,
  JsonApiResourceSchema,
  JsonApiCollectionSchema,
} from './schemas';

const c = initContract();

// =============================================================================
// Notification Schemas
// =============================================================================

/**
 * Notification types
 */
export const NotificationTypeSchema = z.enum([
  'alert',
  'reminder',
  'task',
  'order',
  'payment',
  'system',
  'weather',
  'pest',
  'harvest',
  'irrigation',
  'equipment',
  'marketplace',
]);

/**
 * Notification priority
 */
export const NotificationPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Notification status
 */
export const NotificationStatusSchema = z.enum(['unread', 'read', 'archived', 'dismissed']);

/**
 * Notification delivery channel
 */
export const DeliveryChannelSchema = z.enum(['in_app', 'email', 'sms', 'push']);

/**
 * Core notification attributes
 */
export const NotificationAttributesSchema = z.object({
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema,
  status: NotificationStatusSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  icon: z.string().optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().optional(),
  actionText: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  relatedEntityType: z
    .enum(['farm', 'activity', 'order', 'commodity', 'user', 'invoice'])
    .optional(),
  relatedEntityId: z.string().cuid().optional(),
  deliveryChannels: z.array(DeliveryChannelSchema).optional(),
  expiresAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().optional(),
  dismissedAt: z.string().datetime().optional(),
});

/**
 * Alert-specific attributes
 */
export const AlertAttributesSchema = NotificationAttributesSchema.extend({
  type: z.literal('alert'),
  alertType: z.enum([
    'pest',
    'disease',
    'weather',
    'irrigation',
    'harvest',
    'equipment_maintenance',
    'price_change',
    'inventory_low',
  ]),
  severity: z.enum(['info', 'warning', 'critical']),
  recommendations: z.array(z.string()).optional(),
  affectedAreas: z.array(z.string()).optional(),
  isActive: z.boolean(),
});

/**
 * Reminder-specific attributes
 */
export const ReminderAttributesSchema = NotificationAttributesSchema.extend({
  type: z.literal('reminder'),
  reminderType: z.enum(['task', 'activity', 'payment', 'maintenance', 'harvest', 'planting']),
  dueDate: z.string().datetime(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().optional(),
  snoozeUntil: z.string().datetime().optional(),
});

// =============================================================================
// Request Schemas
// =============================================================================

/**
 * Create notification request
 */
export const CreateNotificationRequestSchema = z.object({
  data: z.object({
    type: z.literal('notifications'),
    attributes: z.object({
      type: NotificationTypeSchema,
      priority: NotificationPrioritySchema,
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(1000),
      icon: z.string().optional(),
      imageUrl: z.string().url().optional(),
      actionUrl: z.string().optional(),
      actionText: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      relatedEntityType: z
        .enum(['farm', 'activity', 'order', 'commodity', 'user', 'invoice'])
        .optional(),
      relatedEntityId: z.string().cuid().optional(),
      deliveryChannels: z.array(DeliveryChannelSchema).optional().default(['in_app']),
      expiresAt: z.string().datetime().optional(),
    }),
  }),
});

/**
 * Create alert request
 */
export const CreateAlertRequestSchema = z.object({
  data: z.object({
    type: z.literal('alerts'),
    attributes: z.object({
      alertType: z.enum([
        'pest',
        'disease',
        'weather',
        'irrigation',
        'harvest',
        'equipment_maintenance',
        'price_change',
        'inventory_low',
      ]),
      severity: z.enum(['info', 'warning', 'critical']),
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(1000),
      recommendations: z.array(z.string()).optional(),
      affectedAreas: z.array(z.string()).optional(),
      farmId: z.string().cuid().optional(),
      expiresAt: z.string().datetime().optional(),
    }),
  }),
});

/**
 * Update notification request
 */
export const UpdateNotificationRequestSchema = z.object({
  data: z.object({
    type: z.literal('notifications'),
    id: z.string().cuid(),
    attributes: z
      .object({
        status: NotificationStatusSchema.optional(),
        readAt: z.string().datetime().optional(),
        dismissedAt: z.string().datetime().optional(),
      })
      .partial(),
  }),
});

/**
 * Notification preferences request
 */
export const NotificationPreferencesRequestSchema = z.object({
  data: z.object({
    type: z.literal('notification-preferences'),
    attributes: z.object({
      channels: z.object({
        email: z
          .object({
            enabled: z.boolean(),
            types: z.array(NotificationTypeSchema).optional(),
          })
          .optional(),
        sms: z
          .object({
            enabled: z.boolean(),
            types: z.array(NotificationTypeSchema).optional(),
          })
          .optional(),
        push: z
          .object({
            enabled: z.boolean(),
            types: z.array(NotificationTypeSchema).optional(),
          })
          .optional(),
        inApp: z
          .object({
            enabled: z.boolean(),
            types: z.array(NotificationTypeSchema).optional(),
          })
          .optional(),
      }),
      quietHours: z
        .object({
          enabled: z.boolean(),
          start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/), // HH:MM format
          end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        })
        .optional(),
      priorityFilter: NotificationPrioritySchema.optional(),
    }),
  }),
});

// =============================================================================
// Response Schemas
// =============================================================================

export const NotificationResourceSchema = JsonApiResourceSchema(NotificationAttributesSchema)

export const AlertResourceSchema = JsonApiResourceSchema(AlertAttributesSchema)

export const NotificationCollectionSchema = JsonApiCollectionSchema(NotificationResourceSchema)

export const AlertCollectionSchema = JsonApiCollectionSchema(AlertResourceSchema)




export const NotificationPreferencesResponseSchema = z.object({
  data: z.object({
    type: z.literal('notification-preferences'),
    id: z.string(),
    attributes: z.object({
      channels: z.object({
        email: z.object({
          enabled: z.boolean(),
          types: z.array(NotificationTypeSchema).optional(),
        }),
        sms: z.object({
          enabled: z.boolean(),
          types: z.array(NotificationTypeSchema).optional(),
        }),
        push: z.object({
          enabled: z.boolean(),
          types: z.array(NotificationTypeSchema).optional(),
        }),
        inApp: z.object({
          enabled: z.boolean(),
          types: z.array(NotificationTypeSchema).optional(),
        }),
      }),
      quietHours: z
        .object({
          enabled: z.boolean(),
          start: z.string(),
          end: z.string(),
        })
        .optional(),
      priorityFilter: NotificationPrioritySchema.optional(),
    }),
  }),
});

// =============================================================================
// Notifications Contract
// =============================================================================

export const notificationsContract = c.router({
  /**
   * Get user notifications
   */
  getNotifications: {
    method: 'GET',
    path: '/notifications',
    query: JsonApiQuerySchema.extend({
      status: NotificationStatusSchema.optional(),
      type: NotificationTypeSchema.optional(),
      priority: NotificationPrioritySchema.optional(),
      unreadOnly: z.coerce.boolean().optional(),
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: NotificationCollectionSchema,
      400: JsonApiErrorResponseSchema,
    },
    summary: 'Get user notifications',
    description: 'Retrieve notifications for the authenticated user with filtering options.',
  },

  /**
   * Get notification by ID
   */
  getNotification: {
    method: 'GET',
    path: '/notifications/:id',
    pathParams: z.object({
      id: z.string().cuid(),
    }),
    query: JsonApiQuerySchema.optional(),
    responses: {
      200: z.object({ data: NotificationResourceSchema }),
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get notification by ID',
    description: 'Retrieve a specific notification by its ID.',
  },

  /**
   * Create notification
   */
  createNotification: {
    method: 'POST',
    path: '/notifications',
    body: CreateNotificationRequestSchema,
    responses: {
      201: z.object({ data: NotificationResourceSchema }),
      400: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
    },
    summary: 'Create notification',
    description: 'Create a new notification (admin only).',
  },

  /**
   * Mark notification as read
   */
  markAsRead: {
    method: 'PATCH',
    path: '/notifications/:id/read',
    pathParams: z.object({
      id: z.string().cuid(),
    }),
    body: z.object({}),
    responses: {
      200: z.object({ data: NotificationResourceSchema }),
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Mark notification as read',
    description: 'Mark a notification as read.',
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: {
    method: 'POST',
    path: '/notifications/mark-all-read',
    body: z.object({
      type: NotificationTypeSchema.optional(),
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('bulk-operation'),
          attributes: z.object({
            markedCount: z.number(),
            message: z.string(),
          }),
        }),
      }),
      400: JsonApiErrorResponseSchema,
    },
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications as read, optionally filtered by type or farm.',
  },

  /**
   * Dismiss notification
   */
  dismissNotification: {
    method: 'DELETE',
    path: '/notifications/:id',
    pathParams: z.object({
      id: z.string().cuid(),
    }),
    body: z.object({}),
    responses: {
      204: z.object({}),
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Dismiss notification',
    description: 'Dismiss/delete a notification.',
  },

  /**
   * Get alerts
   */
  getAlerts: {
    method: 'GET',
    path: '/notifications/alerts',
    query: JsonApiQuerySchema.extend({
      alertType: z
        .enum([
          'pest',
          'disease',
          'weather',
          'irrigation',
          'harvest',
          'equipment_maintenance',
          'price_change',
          'inventory_low',
        ])
        .optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      activeOnly: z.coerce.boolean().optional().default(true),
      farmId: z.string().cuid().optional(),
    }),
    responses: {
      200: AlertCollectionSchema,
      400: JsonApiErrorResponseSchema,
    },
    summary: 'Get alerts',
    description: 'Get farm alerts with filtering options.',
  },

  /**
   * Create alert
   */
  createAlert: {
    method: 'POST',
    path: '/notifications/alerts',
    body: CreateAlertRequestSchema,
    responses: {
      201: z.object({ data: AlertResourceSchema }),
      400: JsonApiErrorResponseSchema,
      403: JsonApiErrorResponseSchema,
    },
    summary: 'Create alert',
    description: 'Create a new farm alert.',
  },

  /**
   * Acknowledge alert
   */
  acknowledgeAlert: {
    method: 'POST',
    path: '/notifications/alerts/:id/acknowledge',
    pathParams: z.object({
      id: z.string().cuid(),
    }),
    body: z.object({}),
    responses: {
      200: z.object({ data: AlertResourceSchema }),
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Acknowledge alert',
    description: 'Acknowledge an alert (marks it as read/handled).',
  },

  /**
   * Get notification preferences
   */
  getPreferences: {
    method: 'GET',
    path: '/notifications/preferences',
    responses: {
      200: NotificationPreferencesResponseSchema,
      404: JsonApiErrorResponseSchema,
    },
    summary: 'Get notification preferences',
    description: 'Get user notification preferences.',
  },

  /**
   * Update notification preferences
   */
  updatePreferences: {
    method: 'PUT',
    path: '/notifications/preferences',
    body: NotificationPreferencesRequestSchema,
    responses: {
      200: NotificationPreferencesResponseSchema,
      400: JsonApiErrorResponseSchema,
    },
    summary: 'Update notification preferences',
    description: 'Update user notification preferences.',
  },

  /**
   * Get unread count
   */
  getUnreadCount: {
    method: 'GET',
    path: '/notifications/unread-count',
    query: z.object({
      farmId: z.string().cuid().optional(),
      type: NotificationTypeSchema.optional(),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('unread-count'),
          attributes: z.object({
            total: z.number(),
            byType: z.record(NotificationTypeSchema, z.number()).optional(),
            byPriority: z.record(NotificationPrioritySchema, z.number()).optional(),
          }),
        }),
      }),
    },
    summary: 'Get unread notification count',
    description: 'Get count of unread notifications, optionally grouped by type or priority.',
  },
});

// =============================================================================
// Type Exports
// =============================================================================

export type NotificationsContract = typeof notificationsContract;
export type NotificationAttributes = z.infer<typeof NotificationAttributesSchema>;
export type AlertAttributes = z.infer<typeof AlertAttributesSchema>;
export type ReminderAttributes = z.infer<typeof ReminderAttributesSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type DeliveryChannel = z.infer<typeof DeliveryChannelSchema>;
export type CreateNotificationRequest = z.infer<typeof CreateNotificationRequestSchema>;
export type CreateAlertRequest = z.infer<typeof CreateAlertRequestSchema>;
export type UpdateNotificationRequest = z.infer<typeof UpdateNotificationRequestSchema>;
export type NotificationPreferencesRequest = z.infer<typeof NotificationPreferencesRequestSchema>;
