/**
 * Type definitions for User metadata field
 * Used throughout the auth system for storing various user-related data
 */

export interface SessionMetadata {
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  loginAt?: string;
}

export interface PasswordResetMetadata {
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
}

export interface LogoutMetadata {
  loggedOutAt?: string;
}

export interface UserMetadata {
  // Session information
  session?: SessionMetadata;
  
  // Password reset tokens (temporary)
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
  
  // Logout tracking for token invalidation
  loggedOutAt?: string;
  
  // Allow for future extension
  [key: string]: any;
}

/**
 * Type guard to check if metadata has logout information
 */
export function hasLogoutMetadata(metadata: any): metadata is UserMetadata & Required<LogoutMetadata> {
  return metadata && typeof metadata.loggedOutAt === 'string';
}

/**
 * Type guard to check if metadata has session information
 */
export function hasSessionMetadata(metadata: any): metadata is UserMetadata & Required<{ session: SessionMetadata }> {
  return metadata && metadata.session && typeof metadata.session === 'object';
}

/**
 * Type guard to check if metadata has password reset information
 */
export function hasPasswordResetMetadata(metadata: any): metadata is UserMetadata & Required<PasswordResetMetadata> {
  return metadata && typeof metadata.resetTokenHash === 'string' && typeof metadata.resetTokenExpiresAt === 'string';
}