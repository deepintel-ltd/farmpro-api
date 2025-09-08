import { initContract } from '@ts-rest/core';
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
  LoginResourceSchema,
  RegisterResourceSchema,
  RefreshTokenResourceSchema,
  AuthUserResourceSchema,
  SessionsResourceSchema,
  TokenValidationResourceSchema,
  SuccessMessageResourceSchema,
  OAuthCallbackQuerySchema,
} from './auth.schemas';
import { JsonApiErrorResponseSchema } from './schemas';
import { UuidPathParam } from './common';

const c = initContract();

// =============================================================================
// Authentication Contract
// =============================================================================

export const authContract = c.router({
  // =============================================================================
  // Auth Flow & JWT Management
  // =============================================================================

  register: {
    method: 'POST',
    path: '/auth/register',
    body: RegisterRequestSchema,
    responses: {
      201: RegisterResourceSchema,
      400: JsonApiErrorResponseSchema,
      409: JsonApiErrorResponseSchema, // Email already exists
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Register new user with organization',
  },

  login: {
    method: 'POST',
    path: '/auth/login',
    body: LoginRequestSchema,
    responses: {
      200: LoginResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema, // Invalid credentials
      403: JsonApiErrorResponseSchema, // Account disabled
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Authenticate user and get tokens',
  },

  refresh: {
    method: 'POST',
    path: '/auth/refresh',
    body: RefreshTokenRequestSchema,
    responses: {
      200: RefreshTokenResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema, // Invalid refresh token
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Refresh JWT access token',
  },

  logout: {
    method: 'POST',
    path: '/auth/logout',
    body: c.noBody(),
    responses: {
      200: SuccessMessageResourceSchema,
      401: JsonApiErrorResponseSchema, // Not authenticated
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Invalidate refresh token',
  },

  logoutAll: {
    method: 'POST',
    path: '/auth/logout-all',
    body: c.noBody(),
    responses: {
      200: SuccessMessageResourceSchema,
      401: JsonApiErrorResponseSchema, // Not authenticated
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Invalidate all refresh tokens for user',
  },

  // =============================================================================
  // Password Management
  // =============================================================================

  forgotPassword: {
    method: 'POST',
    path: '/auth/forgot-password',
    body: ForgotPasswordRequestSchema,
    responses: {
      200: SuccessMessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Request password reset email',
  },

  resetPassword: {
    method: 'POST',
    path: '/auth/reset-password',
    body: ResetPasswordRequestSchema,
    responses: {
      200: SuccessMessageResourceSchema,
      400: JsonApiErrorResponseSchema, // Invalid or expired token
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Reset password with token',
  },

  changePassword: {
    method: 'POST',
    path: '/auth/change-password',
    body: ChangePasswordRequestSchema,
    responses: {
      200: SuccessMessageResourceSchema,
      400: JsonApiErrorResponseSchema, // Invalid current password
      401: JsonApiErrorResponseSchema, // Not authenticated
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Change password for authenticated user',
  },

  // =============================================================================
  // Email & Account Verification
  // =============================================================================

  sendVerification: {
    method: 'POST',
    path: '/auth/send-verification',
    body: c.noBody(),
    responses: {
      200: SuccessMessageResourceSchema,
      401: JsonApiErrorResponseSchema, // Not authenticated
      409: JsonApiErrorResponseSchema, // Already verified
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Send email verification',
  },

  verifyEmail: {
    method: 'POST',
    path: '/auth/verify-email',
    body: VerifyEmailRequestSchema,
    responses: {
      200: SuccessMessageResourceSchema,
      400: JsonApiErrorResponseSchema, // Invalid or expired token
      409: JsonApiErrorResponseSchema, // Already verified
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Verify email with token',
  },

  // =============================================================================
  // OAuth Integration
  // =============================================================================

  googleAuth: {
    method: 'GET',
    path: '/auth/google',
    responses: {
      302: z.void(), // Redirect to Google
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Initiate Google OAuth',
  },

  googleCallback: {
    method: 'GET',
    path: '/auth/google/callback',
    query: OAuthCallbackQuerySchema,
    responses: {
      302: z.void(), // Redirect with tokens
      400: JsonApiErrorResponseSchema, // OAuth error
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Handle Google OAuth callback',
  },

  githubAuth: {
    method: 'GET',
    path: '/auth/github',
    responses: {
      302: z.void(), // Redirect to GitHub
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Initiate GitHub OAuth',
  },

  githubCallback: {
    method: 'GET',
    path: '/auth/github/callback',
    query: OAuthCallbackQuerySchema,
    responses: {
      302: z.void(), // Redirect with tokens
      400: JsonApiErrorResponseSchema, // OAuth error
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Handle GitHub OAuth callback',
  },

  // =============================================================================
  // Session Management
  // =============================================================================

  me: {
    method: 'GET',
    path: '/auth/me',
    responses: {
      200: AuthUserResourceSchema,
      401: JsonApiErrorResponseSchema, // Not authenticated
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get current user profile',
  },

  validateToken: {
    method: 'POST',
    path: '/auth/validate-token',
    body: ValidateTokenRequestSchema,
    responses: {
      200: TokenValidationResourceSchema,
      400: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema, // Validation errors
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Validate JWT token',
  },

  getSessions: {
    method: 'GET',
    path: '/auth/sessions',
    responses: {
      200: SessionsResourceSchema,
      401: JsonApiErrorResponseSchema, // Not authenticated
      500: JsonApiErrorResponseSchema,
    },
    summary: 'List active sessions',
  },

  revokeSession: {
    method: 'DELETE',
    path: '/auth/sessions/:sessionId',
    pathParams: UuidPathParam('Session'),
    responses: {
      200: SuccessMessageResourceSchema,
      401: JsonApiErrorResponseSchema, // Not authenticated
      404: JsonApiErrorResponseSchema, // Session not found
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Revoke specific session',
  },
});

export type AuthContract = typeof authContract;
