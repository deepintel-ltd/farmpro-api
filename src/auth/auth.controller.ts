import { Controller, UseGuards, Logger, Request } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { EmailVerificationService } from './email-verification.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { authContract } from '../../contracts/auth.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
// DTOs are handled by ts-rest contracts

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@ApiTags('auth')
@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // =============================================================================
  // Auth Flow & JWT Management
  // =============================================================================

  @ApiOperation({ 
    summary: 'Register new user',
    description: 'Create a new user account with email and password'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 409, description: 'Conflict - user already exists' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.register)
  public register(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.register, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.register(requestBody);
        this.logger.log(`User registered successfully: ${requestBody.email}`);

        return {
          status: 201 as const,
          body: {
            data: {
              id: result.user.id,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Registration failed for ${requestBody.email}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          conflictMessage: 'User already exists',
          conflictCode: 'USER_EXISTS',
          badRequestMessage: 'Registration failed',
          badRequestCode: 'REGISTRATION_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'User login',
    description: 'Authenticate user with email and password'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @UseGuards(LocalAuthGuard)
  @TsRestHandler(authContract.login)
  public login(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.login, async ({ body: requestBody, headers }) => {
      try {
        // Extract session metadata from request headers
        const forwardedFor = headers['x-forwarded-for'];
        const realIp = headers['x-real-ip'];
        const ipAddress = Array.isArray(forwardedFor) 
          ? forwardedFor[0] 
          : Array.isArray(realIp)
          ? realIp[0]
          : forwardedFor || realIp || 'Unknown IP';

        const sessionInfo = {
          deviceInfo: headers['user-agent'] || 'Unknown Device',
          ipAddress: String(ipAddress),
          userAgent: headers['user-agent'] || 'Unknown User Agent',
        };

        const result = await this.authService.login(requestBody, sessionInfo);
        this.logger.log(`User logged in successfully: ${requestBody.email}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: result.user.id,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Login failed for ${requestBody.email}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Invalid credentials or account disabled',
          unauthorizedCode: 'INVALID_CREDENTIALS',
          badRequestMessage: 'Authentication failed',
          badRequestCode: 'LOGIN_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Refresh access token',
    description: 'Refresh JWT access token using refresh token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                tokenType: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid refresh token' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.refresh)
  public refresh(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.refresh, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.refresh(requestBody);
        this.logger.log('Token refreshed successfully');

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'refresh',
              type: 'tokens',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Token refresh failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Invalid or expired refresh token',
          unauthorizedCode: 'INVALID_REFRESH_TOKEN',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Logout user',
    description: 'Invalidate refresh token and logout user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.logout)
  public logout(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.logout, async () => {
      try {
        const result = await this.authService.logout(req.user.userId);
        this.logger.log(`User logged out: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: req.user.userId,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Logout failed for user ${req.user.userId}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Logout failed',
          internalErrorCode: 'LOGOUT_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Logout from all devices',
    description: 'Invalidate all refresh tokens for user across all devices'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logout from all devices successful',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.logoutAll)
  public logoutAll(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.logoutAll, async () => {
      try {
        const result = await this.authService.logoutAll(req.user.userId);
        this.logger.log(`User logged out from all devices: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: req.user.userId,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Logout all failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Logout all failed',
          internalErrorCode: 'LOGOUT_ALL_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Password Management
  // =============================================================================

  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send password reset email to user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.forgotPassword)
  public forgotPassword(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.forgotPassword, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.forgotPassword(requestBody);
        this.logger.log(`Password reset requested for: ${requestBody.email}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'forgot-password',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Forgot password failed for ${requestBody.email}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Password reset request failed',
          badRequestCode: 'FORGOT_PASSWORD_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Reset password',
    description: 'Reset password using reset token from email'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid or expired token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.resetPassword)
  public resetPassword(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.resetPassword, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.resetPassword(requestBody);
        this.logger.log('Password reset successfully');

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'reset-password',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Password reset failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Invalid or expired reset token',
          badRequestCode: 'RESET_PASSWORD_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Change password',
    description: 'Change password for authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - current password incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.changePassword)
  public changePassword(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.changePassword, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.changePassword(
          req.user.userId,
          requestBody,
        );
        this.logger.log(`Password changed for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: req.user.userId,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Password change failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Current password is incorrect',
          badRequestCode: 'INVALID_CURRENT_PASSWORD',
          internalErrorMessage: 'Password change failed',
          internalErrorCode: 'CHANGE_PASSWORD_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // OAuth Profile Completion
  // =============================================================================

  @ApiOperation({
    summary: 'Complete OAuth user profile',
    description: 'Complete profile setup for OAuth users who need to provide organization details. Creates organization and updates user profile.'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile completed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                tokens: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 409, description: 'Conflict - profile already complete or organization name exists' })
  @ApiResponse({ status: 422, description: 'Validation error - invalid organization type' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.completeProfile)
  public completeProfile(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.completeProfile, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.completeProfile(
          req.user.userId,
          requestBody,
        );
        this.logger.log(`Profile completed for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: result.user.id,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Profile completion failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          conflictMessage: 'Profile already complete or organization name already exists',
          conflictCode: 'PROFILE_COMPLETION_FAILED',
          badRequestMessage: 'Invalid profile data',
          badRequestCode: 'INVALID_PROFILE_DATA',
          unauthorizedMessage: 'User not found or not authenticated',
          unauthorizedCode: 'UNAUTHORIZED',
        });
      }
    });
  }

  // =============================================================================
  // Email & Account Verification
  // =============================================================================

  @ApiOperation({ 
    summary: 'Send email verification',
    description: 'Send email verification link to authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Verification email sent',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 409, description: 'Conflict - email already verified' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.sendVerification)
  public sendVerification(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.sendVerification, async () => {
      try {
        const result = await this.authService.sendVerification(req.user.userId);
        this.logger.log(`Verification email sent for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: req.user.userId,
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Send verification failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          conflictMessage: 'Email already verified',
          conflictCode: 'EMAIL_ALREADY_VERIFIED',
          internalErrorMessage: 'Send verification failed',
          internalErrorCode: 'SEND_VERIFICATION_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Verify email',
    description: 'Verify email address using verification token'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid or expired token' })
  @ApiResponse({ status: 409, description: 'Conflict - email already verified' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.verifyEmail)
  public verifyEmail(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.verifyEmail, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.verifyEmail(requestBody);
        this.logger.log('Email verified successfully');

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'verify-email',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Email verification failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          conflictMessage: 'Email already verified',
          conflictCode: 'EMAIL_ALREADY_VERIFIED',
          badRequestMessage: 'Invalid or expired verification token',
          badRequestCode: 'VERIFY_EMAIL_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Resend email verification',
    description: 'Resend email verification link to user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Verification email resent',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.resendVerification)
  public resendVerification(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.resendVerification, async ({ body: requestBody }) => {
      try {
        const result = await this.emailVerificationService.resendEmailVerification(requestBody.email);
        this.logger.log(`Resend verification requested for email: ${requestBody.email}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'resend-verification',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Resend verification failed for ${requestBody.email}:`, error);

        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to resend verification email',
          badRequestCode: 'RESEND_VERIFICATION_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Get current authenticated user profile with roles and permissions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                organizationId: { type: 'string' },
                isPlatformAdmin: { type: 'boolean' },
                roles: { type: 'array' },
                organization: { type: 'object' },
                permissions: { type: 'array' },
                capabilities: { type: 'array' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.me)
  public getCurrentUser(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.me, async () => {
      try {
        const user = await this.authService.getCurrentUser(req.user.userId);
        return {
          status: 200 as const,
          body: {
            data: {
              id: req.user.userId,
              type: 'user',
              attributes: {
                ...user,
                isPlatformAdmin: req.user.isPlatformAdmin,
                roles: req.user.roles,
                permissions: req.user.permissions,
                capabilities: req.user.capabilities,
              },
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get current user failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Failed to get user profile',
          unauthorizedCode: 'GET_PROFILE_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Validate JWT token',
    description: 'Validate JWT token and return user information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                organizationId: { type: 'string' },
                isActive: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.validateToken)
  public validateToken(
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.validateToken, async ({ body: requestBody }) => {
      try {
        const result = await this.authService.validateToken(requestBody);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'validate-token',
              type: 'tokens',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Token validation failed:', error);

        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Invalid token',
          unauthorizedCode: 'VALIDATE_TOKEN_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'List active sessions',
    description: 'Get list of active sessions for the authenticated user'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              attributes: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  deviceInfo: { type: 'string' },
                  ipAddress: { type: 'string' },
                  userAgent: { type: 'string' },
                  lastActivity: { type: 'string' },
                  createdAt: { type: 'string' },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            totalCount: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.getSessions)
  public getSessions(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.getSessions, async () => {
      try {
        const result = await this.authService.getSessions(req.user.userId);

        return {
          status: 200 as const,
          body: result,
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get sessions failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Get sessions failed',
          internalErrorCode: 'GET_SESSIONS_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Revoke specific session',
    description: 'Revoke a specific session by session ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Session revoked successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                success: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 404, description: 'Not found - session not found' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid session ID' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.revokeSession)
  public revokeSession(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.revokeSession, async ({ params }) => {
      try {
        const result = await this.authService.revokeSession(
          req.user.userId,
          params.sessionId,
        );
        this.logger.log(`Session revoked for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: params.sessionId,
              type: 'messages',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Revoke session failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Session not found',
          notFoundCode: 'SESSION_NOT_FOUND',
          badRequestMessage: 'Invalid session ID',
          badRequestCode: 'INVALID_SESSION_ID',
          internalErrorMessage: 'Revoke session failed',
          internalErrorCode: 'REVOKE_SESSION_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Update session status',
    description: 'Update session status (active/revoked)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Session updated successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            id: { type: 'string' },
            attributes: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - not authenticated' })
  @ApiResponse({ status: 404, description: 'Not found - session not found' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid session status' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.updateSession)
  public updateSession(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.updateSession, async ({ params, body }) => {
      try {
        const { status } = body.data.attributes;
        
        if (status === 'revoked') {
          await this.authService.revokeSession(req.user.userId, params.sessionId);
          this.logger.log(`Session ${params.sessionId} revoked for user: ${req.user.userId}`);
          
          return {
            status: 200 as const,
            body: {
              data: {
                type: 'sessions' as const,
                id: params.sessionId,
                attributes: {
                  status: 'revoked',
                  message: 'Session revoked successfully',
                },
              },
            },
          };
        } else if (status === 'active') {
          // For now, we don't support reactivating sessions
          // This could be implemented if needed
          throw new Error('Session reactivation not supported');
        } else {
          throw new Error('Invalid session status');
        }
      } catch (error: unknown) {
        this.logger.error(
          `Update session failed for user ${req.user.userId}:`,
          error,
        );

        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'Session not found',
          notFoundCode: 'SESSION_NOT_FOUND',
          badRequestMessage: 'Invalid session status or session ID',
          badRequestCode: 'INVALID_SESSION_STATUS',
          internalErrorMessage: 'Update session failed',
          internalErrorCode: 'UPDATE_SESSION_FAILED',
        });
      }
    });
  }


  // =============================================================================
  // OAuth Integration
  // =============================================================================

  @ApiOperation({ 
    summary: 'Initiate Google OAuth',
    description: 'Redirect to Google OAuth for authentication'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirect to Google OAuth'
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.googleAuth)
  public googleAuth(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.googleAuth, async () => {
      try {
        const result = await this.authService.initiateGoogleOAuth();
        this.logger.log('Google OAuth initiated successfully');

        return {
          status: 302 as const,
          body: null as never,
          headers: {
            Location: result.authUrl,
          },
        };
      } catch (error: unknown) {
        this.logger.error('Google OAuth initiation failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to initiate Google OAuth',
          internalErrorCode: 'GOOGLE_OAUTH_FAILED',
        });
      }
    });
  }

  @ApiOperation({ 
    summary: 'Handle Google OAuth callback',
    description: 'Process Google OAuth callback and authenticate user'
  })
  @ApiResponse({ 
    status: 302, 
    description: 'Redirect after OAuth processing'
  })
  @ApiResponse({ status: 400, description: 'Bad request - OAuth error' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Public()
  @TsRestHandler(authContract.googleCallback)
  public googleCallback(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.googleCallback, async ({ query }) => {
      try {
        const result = await this.authService.handleGoogleOAuthCallback(query);
        this.logger.log('Google OAuth callback processed successfully');

        return {
          status: 302 as const,
          body: null as never,
          headers: {
            Location: result.redirectUrl,
          },
        };
      } catch (error: unknown) {
        this.logger.error('Google OAuth callback failed:', error);
        return {
          status: 302 as const,
          body: null as never,
          headers: {
            Location: `${process.env.FRONTEND_URL}/auth/error?error=oauth_failed`,
          },
        };
      }
    });
  }

  @Public()
  @TsRestHandler(authContract.githubAuth)
  public githubAuth(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.githubAuth, async () => {
      try {
        // This should redirect to GitHub OAuth
        // Implementation depends on your OAuth strategy
        return {
          status: 302 as const,
          body: null as never,
        };
      } catch (error: unknown) {
        this.logger.error('GitHub OAuth initiation failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to initiate GitHub OAuth',
          internalErrorCode: 'GITHUB_OAUTH_FAILED',
        });
      }
    });
  }

  @Public()
  @TsRestHandler(authContract.githubCallback)
  public githubCallback(): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.githubCallback, async () => {
      try {
        // Handle GitHub OAuth callback
        // Implementation depends on your OAuth strategy
        return {
          status: 302 as const,
          body: null as never,
        };
      } catch (error: unknown) {
        this.logger.error('GitHub OAuth callback failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'GitHub OAuth callback failed',
          badRequestCode: 'GITHUB_OAUTH_CALLBACK_FAILED',
          internalErrorMessage: 'GitHub OAuth callback processing failed',
          internalErrorCode: 'GITHUB_OAUTH_CALLBACK_FAILED',
        });
      }
    });
  }
}
