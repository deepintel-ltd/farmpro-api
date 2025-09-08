import { OrganizationType } from '@prisma/client';

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  organizationName: string;
  organizationType: OrganizationType;
  inviteCode?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ValidateTokenDto {
  token: string;
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
  lastLoginAt?: Date;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    type: OrganizationType;
    isVerified: boolean;
    plan: string;
  };
  roles?: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
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

export interface SessionResponse {
  id: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export interface TokenValidationResponse {
  valid: boolean;
  user?: AuthUserResponse;
  expiresAt?: Date;
}

export interface SuccessMessageResponse {
  message: string;
  success: boolean;
}
