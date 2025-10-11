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
  CompleteProfileRequestSchema,
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
export type CompleteProfileDto = z.infer<typeof CompleteProfileRequestSchema>;

// Additional internal DTOs

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
  phone?: string | null;
  avatar?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  profileComplete: boolean;
  authProvider: 'LOCAL' | 'GOOGLE' | 'GITHUB' | null;
  lastLoginAt?: string | null;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
    type: 'FARM_OPERATION' | 'COMMODITY_TRADER' | 'LOGISTICS_PROVIDER' | 'INTEGRATED_FARM';
    isVerified: boolean;
    plan: string;
    features: string[];
    allowedModules: string[];
  } | null;
  isPlatformAdmin: boolean;
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


