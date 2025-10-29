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
  CompleteProfileRequestSchema,
  AuthResourceSchema,
  AuthUserProfileResourceSchema,
  TokenResourceSchema,
  MessageResourceSchema,
  SessionCollectionSchema,
  OAuthCallbackSchema,
  Verify2FARequestSchema,
  TwoFactorSetupResponseSchema,
  Verify2FAResponseSchema,
  BackupCodesResponseSchema,
} from './auth.schemas';
import { JsonApiErrorResponseSchema, JsonApiResourceSchema } from './schemas';
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
    body: z.object({}),
    responses: {
      200: AuthResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Invalidate refresh token',
  },

  logoutAll: {
    method: 'POST',
    path: '/auth/logout-all',
    body: z.object({}),
    responses: {
      200: AuthResourceSchema,
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
      200: AuthResourceSchema,
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
      200: AuthResourceSchema,
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
      200: AuthResourceSchema,
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
    body: z.object({}),
    responses: {
      200: AuthResourceSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Send email verification',
  },

  verifyEmail: {
    method: 'POST',
    path: '/auth/verify-email',
    body: VerifyEmailRequestSchema,
    responses: {
      200: AuthResourceSchema,
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
      email: z.string().email(),
    }),
    responses: {
      200: AuthResourceSchema,
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

  completeProfile: {
    method: 'POST',
    path: '/auth/complete-profile',
    body: CompleteProfileRequestSchema,
    responses: {
      200: AuthResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      409: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Complete OAuth user profile',
    description: 'Complete profile setup for OAuth users who need to provide organization details. Creates organization and updates user profile.',
  },

  validateToken: {
    method: 'POST',
    path: '/auth/validate-token',
    body: ValidateTokenRequestSchema,
    responses: {
      200: TokenResourceSchema,
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

  updateSession: {
    method: 'PATCH',
    path: '/auth/sessions/:sessionId',
    pathParams: UuidPathParam('Session'),
    body: z.object({
      data: z.object({
        type: z.literal('sessions'),
        id: z.string(),
        attributes: z.object({
          status: z.enum(['active', 'revoked']),
        }),
      }),
    }),
    responses: {
      200: z.object({
        data: z.object({
          type: z.literal('sessions'),
          id: z.string(),
          attributes: z.object({
            status: z.string(),
            message: z.string(),
          }),
        }),
      }),
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Update session status',
  },

  // Two-Factor Authentication
  setup2FA: {
    method: 'GET',
    path: '/auth/2fa/setup',
    responses: {
      200: JsonApiResourceSchema(TwoFactorSetupResponseSchema),
      401: JsonApiErrorResponseSchema,
      409: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get 2FA setup QR code and secret',
    description: 'Returns QR code URL and secret key for setting up 2FA. If 2FA is already enabled, returns 409.',
  },

  verify2FA: {
    method: 'POST',
    path: '/auth/2fa/verify',
    body: Verify2FARequestSchema,
    responses: {
      200: JsonApiResourceSchema(Verify2FAResponseSchema),
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      422: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Verify 2FA code and enable 2FA',
    description: 'Verifies the 6-digit code from authenticator app and enables 2FA. Returns backup codes.',
  },

  disable2FA: {
    method: 'POST',
    path: '/auth/2fa/disable',
    body: z.object({
      password: z.string().optional(), // Optional password verification for extra security
    }).optional(),
    responses: {
      200: MessageResourceSchema,
      400: JsonApiErrorResponseSchema,
      401: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Disable two-factor authentication',
  },

  getBackupCodes: {
    method: 'GET',
    path: '/auth/2fa/backup-codes',
    responses: {
      200: JsonApiResourceSchema(BackupCodesResponseSchema),
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Get backup codes for 2FA',
    description: 'Returns list of backup codes. Some codes may be marked as used.',
  },

  regenerateBackupCodes: {
    method: 'POST',
    path: '/auth/2fa/backup-codes/regenerate',
    body: z.object({}),
    responses: {
      200: JsonApiResourceSchema(BackupCodesResponseSchema),
      401: JsonApiErrorResponseSchema,
      404: JsonApiErrorResponseSchema,
      500: JsonApiErrorResponseSchema,
    },
    summary: 'Regenerate backup codes',
    description: 'Generates new backup codes and invalidates old ones. Returns new codes.',
  },
});

export type AuthContract = typeof authContract;
