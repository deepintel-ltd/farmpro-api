import { initContract } from '@ts-rest/core';
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ChangePasswordRequestSchema,
  VerifyEmailRequestSchema,
  ValidateTokenRequestSchema,
  AuthResourceSchema,
  AuthUserProfileResourceSchema,
  TokenResourceSchema,
  MessageResourceSchema,
  SessionCollectionSchema,
  OAuthCallbackSchema,
} from './auth.schemas';
import { JsonApiErrorResponseSchema } from './schemas';
import { UuidPathParam } from './common';
import { z } from 'zod';

const c = initContract();

// =============================================================================
// Authentication Contract
// =============================================================================

export const authContract = c.router({
  // Auth Flow & JWT Management
  register: {
    method: 'POST',
    path: '/auth/register',
    body: RegisterRequestSchema,
    responses: {
      201: AuthResourceSchema,
      400: JsonApiErrorResponseSchema,
      409: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Register new user with organization',
  },

  login: {
    method: 'POST',
    path: '/auth/login',
    body: LoginRequestSchema,
    responses: {
      200: AuthResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Authenticate user and get tokens',
  },

  refresh: {
    method: 'POST',
    path: '/auth/refresh',
    body: RefreshTokenRequestSchema,
    responses: {
      200: TokenResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Refresh JWT access token',
  },

  logout: {
    method: 'POST',
    path: '/auth/logout',
    body: c.noBody(),
    responses: {
      200: MessageResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Invalidate refresh token',
  },

  logoutAll: {
    method: 'POST',
    path: '/auth/logout-all',
    body: c.noBody(),
    responses: {
      200: MessageResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Invalidate all refresh tokens for user',
  },

  // Password Management
  forgotPassword: {
    method: 'POST',
    path: '/auth/forgot-password',
    body: ForgotPasswordRequestSchema,
    responses: {
      200: MessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Request password reset email',
  },

  resetPassword: {
    method: 'POST',
    path: '/auth/reset-password',
    body: ResetPasswordRequestSchema,
    responses: {
      200: MessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Reset password with token',
  },

  changePassword: {
    method: 'POST',
    path: '/auth/change-password',
    body: ChangePasswordRequestSchema,
    responses: {
      200: MessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Change password for authenticated user',
  },

  // Email & Account Verification
  sendVerification: {
    method: 'POST',
    path: '/auth/send-verification',
    body: c.noBody(),
    responses: {
      200: MessageResourceSchema,
      401: JsonApiErrorResponseSchema,
      429: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Send email verification',
  },

  verifyEmail: {
    method: 'POST',
    path: '/auth/verify-email',
    body: VerifyEmailRequestSchema,
    responses: {
      200: MessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Verify email with token',
  },

  resendVerification: {
    method: 'POST',
    path: '/auth/resend-verification',
    body: z.object({
      email: z.email(),
    }),
    responses: {
      200: MessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Resend email verification',
  },

  // OAuth Integration
  googleAuth: {
    method: 'GET',
    path: '/auth/google',
    responses: {
      302: c.type<never>(),
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Initiate Google OAuth',
  },

  googleCallback: {
    method: 'GET',
    path: '/auth/google/callback',
    query: OAuthCallbackSchema,
    responses: {
      302: c.type<never>(),
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Handle Google OAuth callback',
  },

  githubAuth: {
    method: 'GET',
    path: '/auth/github',
    responses: {
      302: c.type<never>(),
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Initiate GitHub OAuth',
  },

  githubCallback: {
    method: 'GET',
    path: '/auth/github/callback',
    query: OAuthCallbackSchema,
    responses: {
      302: c.type<never>(),
      400: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Handle GitHub OAuth callback',
  },

  // Session Management
  me: {
    method: 'GET',
    path: '/auth/me',
    responses: {
      200: AuthUserProfileResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get current user profile',
  },

  validateToken: {
    method: 'POST',
    path: '/auth/validate-token',
    body: ValidateTokenRequestSchema,
    responses: {
      200: AuthUserProfileResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Validate JWT token',
  },

  getSessions: {
    method: 'GET',
    path: '/auth/sessions',
    responses: {
      200: SessionCollectionSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'List active sessions',
  },

  revokeSession: {
    method: 'DELETE',
    path: '/auth/sessions/:sessionId',
    pathParams: UuidPathParam('Session'),
    body: c.noBody(),
    responses: {
      200: MessageResourceSchema,
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Revoke specific session',
  },
});

export type AuthContract = typeof authContract;
