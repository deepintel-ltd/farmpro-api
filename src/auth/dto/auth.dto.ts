import { z } from 'zod';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ChangePasswordRequestSchema,
  VerifyEmailRequestSchema,
  ValidateTokenRequestSchema,
} from '../../../contracts/auth.schemas';

// Export DTOs based on contract schemas
export type RegisterDto = z.infer<typeof RegisterRequestSchema>;
export type LoginDto = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenDto = z.infer<typeof RefreshTokenRequestSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordRequestSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordRequestSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordRequestSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailRequestSchema>;
export type ValidateTokenDto = z.infer<typeof ValidateTokenRequestSchema>;

// Additional internal DTOs
export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface UserSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  lastActivity: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface EmailVerificationToken {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface PasswordResetToken {
  userId: string;
  token: string;
  expiresAt: Date;
}

// Response DTOs
export interface TokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUserResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    type: 'FARM_OPERATION' | 'COMMODITY_TRADER' | 'FOOD_PROCESSOR' | 'LOGISTICS_PROVIDER' | 'COOPERATIVE' | 'OTHER';
    isVerified: boolean;
    plan: string;
  };
  roles: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  tokens: TokensResponse;
  user: AuthUserResponse;
}

export interface RegisterResponse {
  tokens: TokensResponse;
  user: AuthUserResponse;
  message: string;
}

export interface SuccessMessageResponse {
  message: string;
  success: boolean;
}

export interface SessionResponse {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: string;
  createdAt: string;
  isCurrent?: boolean;
}

