import { z } from 'zod';
import { JsonApiResourceSchema } from './schemas';

// =============================================================================
// Authentication Request Schemas
// =============================================================================

/**
 * User registration schema
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().optional(),
  organizationName: z.string().min(1, 'Organization name is required'),
  organizationType: z.enum([
    'FARM_OPERATION',
    'COMMODITY_TRADER', 
    'FOOD_PROCESSOR',
    'LOGISTICS_PROVIDER',
    'COOPERATIVE',
    'OTHER'
  ]),
  inviteCode: z.string().optional(),
});

/**
 * User login schema
 */
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Refresh token schema
 */
export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Forgot password schema
 */
export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

/**
 * Reset password schema
 */
export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * Change password schema
 */
export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Email verification schema
 */
export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

/**
 * Token validation schema
 */
export const ValidateTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// =============================================================================
// Authentication Response Schemas
// =============================================================================

/**
 * JWT tokens schema
 */
export const TokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
});

/**
 * User profile schema for auth responses
 */
export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  avatar: z.string().nullable(),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  lastLoginAt: z.string().datetime().nullable(),
  organizationId: z.string(),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum([
      'FARM_OPERATION',
      'COMMODITY_TRADER',
      'FOOD_PROCESSOR', 
      'LOGISTICS_PROVIDER',
      'COOPERATIVE',
      'OTHER'
    ]),
    isVerified: z.boolean(),
    plan: z.string(),
  }),
  roles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    level: z.number(),
  })).optional(),
  metadata: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Login response schema
 */
export const LoginResponseSchema = z.object({
  tokens: TokensSchema,
  user: AuthUserSchema,
});

/**
 * Register response schema
 */
export const RegisterResponseSchema = z.object({
  tokens: TokensSchema,
  user: AuthUserSchema,
  message: z.string(),
});

/**
 * Refresh token response schema
 */
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

/**
 * Session schema
 */
export const SessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  lastActivity: z.string().datetime(),
  createdAt: z.string().datetime(),
  isCurrent: z.boolean(),
});

/**
 * Sessions response schema
 */
export const SessionsResponseSchema = z.object({
  sessions: z.array(SessionSchema),
});

/**
 * Token validation response schema
 */
export const TokenValidationResponseSchema = z.object({
  valid: z.boolean(),
  user: AuthUserSchema.optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Success message schema
 */
export const SuccessMessageSchema = z.object({
  message: z.string(),
  success: z.boolean().default(true),
});

// =============================================================================
// OAuth Schemas
// =============================================================================

/**
 * OAuth callback query parameters
 */
export const OAuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

/**
 * OAuth user info schema
 */
export const OAuthUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  provider: z.enum(['google', 'github']),
});

// =============================================================================
// JSON API Wrapped Schemas
// =============================================================================

export const AuthUserResourceSchema = JsonApiResourceSchema(AuthUserSchema);
export const LoginResourceSchema = JsonApiResourceSchema(LoginResponseSchema);
export const RegisterResourceSchema = JsonApiResourceSchema(RegisterResponseSchema);
export const RefreshTokenResourceSchema = JsonApiResourceSchema(RefreshTokenResponseSchema);
export const SessionsResourceSchema = JsonApiResourceSchema(SessionsResponseSchema);
export const TokenValidationResourceSchema = JsonApiResourceSchema(TokenValidationResponseSchema);
export const SuccessMessageResourceSchema = JsonApiResourceSchema(SuccessMessageSchema);

// =============================================================================
// Type Exports
// =============================================================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;
export type ValidateTokenRequest = z.infer<typeof ValidateTokenRequestSchema>;

export type Tokens = z.infer<typeof TokensSchema>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionsResponse = z.infer<typeof SessionsResponseSchema>;
export type TokenValidationResponse = z.infer<typeof TokenValidationResponseSchema>;
export type SuccessMessage = z.infer<typeof SuccessMessageSchema>;

export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;
export type OAuthUserInfo = z.infer<typeof OAuthUserInfoSchema>;
