import { z } from 'zod';
import { JsonApiResourceSchema } from './schemas';

// =============================================================================
// Authentication Request Schemas
// =============================================================================

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

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export const ValidateTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

// =============================================================================
// Authentication Response Schemas
// =============================================================================

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  tokenType: z.literal('Bearer'),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  avatar: z.string().nullable(),
  isActive: z.boolean(),
  emailVerified: z.boolean(),
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
  }),
  roles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    level: z.number(),
  })),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AuthResponseSchema = z.object({
  tokens: TokenResponseSchema,
  user: UserProfileSchema,
});

export const SessionSchema = z.object({
  id: z.string(),
  deviceInfo: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  lastActivity: z.string().datetime(),
  createdAt: z.string().datetime(),
  isActive: z.boolean(),
});

export const MessageResponseSchema = z.object({
  message: z.string(),
  success: z.boolean(),
});

// =============================================================================
// JSON API Wrapped Schemas
// =============================================================================

export const AuthResourceSchema = JsonApiResourceSchema(AuthResponseSchema);
export const UserProfileResourceSchema = JsonApiResourceSchema(UserProfileSchema);
export const TokenResourceSchema = JsonApiResourceSchema(TokenResponseSchema);
export const MessageResourceSchema = JsonApiResourceSchema(MessageResponseSchema);
export const SessionCollectionSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    type: z.literal('sessions'),
    attributes: SessionSchema,
  })),
  meta: z.object({
    totalCount: z.number(),
  }).optional(),
});

// =============================================================================
// OAuth Schemas
// =============================================================================

export const OAuthCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

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

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;
export type OAuthCallback = z.infer<typeof OAuthCallbackSchema>;
