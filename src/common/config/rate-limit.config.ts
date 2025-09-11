import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Rate limiting configuration for different environments
 */
export const getRateLimitConfig = (): ThrottlerModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Base configuration
  const baseConfig: ThrottlerModuleOptions = {
    // Multiple throttler configurations for different scenarios
    throttlers: [
      {
        name: 'default',
        ttl: 60 * 1000, // 1 minute in milliseconds
        limit: isDevelopment ? 200 : 60, // Higher limit in development
      },
      {
        name: 'burst',
        ttl: 10 * 1000, // 10 seconds in milliseconds
        limit: isDevelopment ? 50 : 20, // Burst protection
      },
      {
        name: 'strict',
        ttl: 60 * 1000, // 1 minute in milliseconds
        limit: isDevelopment ? 20 : 10, // Strict limiting for sensitive endpoints
      }
    ],

    // Error message configuration
    errorMessage: 'Rate limit exceeded. Please try again later.',
  };

  return baseConfig;
};

/**
 * Rate limiting configuration for specific analytics endpoints
 */
export const analyticsRateLimitConfig = {
  ttl: 60 * 1000, // 1 minute
  limit: process.env.NODE_ENV === 'development' ? 100 : 30,
};

/**
 * Rate limiting configuration for authentication endpoints
 */
export const authRateLimitConfig = {
  ttl: 60 * 1000, // 1 minute
  limit: process.env.NODE_ENV === 'development' ? 30 : 10,
};

/**
 * Rate limiting configuration for upload endpoints
 */
export const uploadRateLimitConfig = {
  ttl: 60 * 1000, // 1 minute
  limit: process.env.NODE_ENV === 'development' ? 20 : 5,
};