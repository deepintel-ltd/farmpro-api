import { Controller, UseGuards, Logger, Request, Body } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { authContract } from '../../contracts/auth.contract';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  VerifyEmailDto,
  ValidateTokenDto,
} from './dto/auth.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  // =============================================================================
  // Auth Flow & JWT Management
  // =============================================================================

  @TsRestHandler(authContract.register)
  public register(@Body() body: RegisterDto): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.register, async () => {
      try {
        const result = await this.authService.register(body);
        this.logger.log(`User registered successfully: ${body.email}`);

        return {
          status: 201 as const,
          body: {
            data: {
              id: 'register',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Registration failed for ${body.email}:`, error);

        const isConflict =
          error instanceof Error && error.message.includes('already exists');

        if (isConflict) {
          return {
            status: 409 as const,
            body: {
              errors: [
                {
                  status: '409',
                  title: 'Conflict',
                  detail: (error as Error).message || 'User already exists',
                  code: 'USER_EXISTS',
                },
              ],
            },
          };
        }

        return {
          status: 400 as const,
          body: {
            errors: [
              {
                status: '400',
                title: 'Bad Request',
                detail: (error as Error).message || 'Registration failed',
                code: 'REGISTRATION_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @UseGuards(LocalAuthGuard)
  @TsRestHandler(authContract.login)
  public login(@Body() body: LoginDto): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.login, async () => {
      try {
        const result = await this.authService.login(body);
        this.logger.log(`User logged in successfully: ${body.email}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'login',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Login failed for ${body.email}:`, error);

        const isUnauthorized =
          error instanceof Error &&
          (error.message.includes('Invalid credentials') ||
            error.message.includes('disabled'));

        if (isUnauthorized) {
          return {
            status: 401 as const,
            body: {
              errors: [
                {
                  status: '401',
                  title: 'Unauthorized',
                  detail: (error as Error).message || 'Authentication failed',
                  code: 'INVALID_CREDENTIALS',
                },
              ],
            },
          };
        }

        return {
          status: 400 as const,
          body: {
            errors: [
              {
                status: '400',
                title: 'Bad Request',
                detail: (error as Error).message || 'Authentication failed',
                code: 'LOGIN_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.refresh)
  public refresh(
    @Body() body: RefreshTokenDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.refresh, async () => {
      try {
        const result = await this.authService.refresh(body);
        this.logger.log('Token refreshed successfully');

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'refresh',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Token refresh failed:', error);

        return {
          status: 401 as const,
          body: {
            errors: [
              {
                status: '401',
                title: 'Unauthorized',
                detail: (error as Error).message || 'Token refresh failed',
                code: 'INVALID_REFRESH_TOKEN',
              },
            ],
          },
        };
      }
    });
  }

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
              id: 'logout',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(`Logout failed for user ${req.user.userId}:`, error);

        return {
          status: 500 as const,
          body: {
            errors: [
              {
                status: '500',
                title: 'Internal Server Error',
                detail: (error as Error).message || 'Logout failed',
                code: 'LOGOUT_FAILED',
              },
            ],
          },
        };
      }
    });
  }

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
              id: 'logout-all',
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

        return {
          status: 500 as const,
          body: {
            errors: [
              {
                status: '500',
                title: 'Internal Server Error',
                detail: (error as Error).message || 'Logout all failed',
                code: 'LOGOUT_ALL_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  // =============================================================================
  // Password Management
  // =============================================================================

  @TsRestHandler(authContract.forgotPassword)
  public forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.forgotPassword, async () => {
      try {
        const result = await this.authService.forgotPassword(body);
        this.logger.log(`Password reset requested for: ${body.email}`);

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
        this.logger.error(`Forgot password failed for ${body.email}:`, error);

        return {
          status: 400 as const,
          body: {
            errors: [
              {
                status: '400',
                title: 'Bad Request',
                detail:
                  (error as Error).message || 'Password reset request failed',
                code: 'FORGOT_PASSWORD_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.resetPassword)
  public resetPassword(
    @Body() body: ResetPasswordDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.resetPassword, async () => {
      try {
        const result = await this.authService.resetPassword(body);
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

        return {
          status: 400 as const,
          body: {
            errors: [
              {
                status: '400',
                title: 'Bad Request',
                detail: (error as Error).message || 'Password reset failed',
                code: 'RESET_PASSWORD_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.changePassword)
  public changePassword(
    @Body() body: ChangePasswordDto,
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.changePassword, async () => {
      try {
        const result = await this.authService.changePassword(
          req.user.userId,
          body,
        );
        this.logger.log(`Password changed for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'change-password',
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

        const isBadRequest =
          error instanceof Error && error.message.includes('incorrect');

        if (isBadRequest) {
          return {
            status: 400 as const,
            body: {
              errors: [
                {
                  status: '400',
                  title: 'Bad Request',
                  detail:
                    (error as Error).message || 'Current password is incorrect',
                  code: 'INVALID_CURRENT_PASSWORD',
                },
              ],
            },
          };
        }

        return {
          status: 500 as const,
          body: {
            errors: [
              {
                status: '500',
                title: 'Internal Server Error',
                detail: (error as Error).message || 'Password change failed',
                code: 'CHANGE_PASSWORD_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  // =============================================================================
  // Email & Account Verification
  // =============================================================================

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
              id: 'send-verification',
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

        const isConflict =
          error instanceof Error && error.message.includes('already verified');

        if (isConflict) {
          return {
            status: 409 as const,
            body: {
              errors: [
                {
                  status: '409',
                  title: 'Conflict',
                  detail: (error as Error).message || 'Email already verified',
                  code: 'EMAIL_ALREADY_VERIFIED',
                },
              ],
            },
          };
        }

        return {
          status: 500 as const,
          body: {
            errors: [
              {
                status: '500',
                title: 'Internal Server Error',
                detail: (error as Error).message || 'Send verification failed',
                code: 'SEND_VERIFICATION_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.verifyEmail)
  public verifyEmail(
    @Body() body: VerifyEmailDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.verifyEmail, async () => {
      try {
        const result = await this.authService.verifyEmail(body);
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

        const isConflict =
          error instanceof Error && error.message.includes('already verified');

        if (isConflict) {
          return {
            status: 409 as const,
            body: {
              errors: [
                {
                  status: '409',
                  title: 'Conflict',
                  detail: (error as Error).message || 'Email already verified',
                  code: 'EMAIL_ALREADY_VERIFIED',
                },
              ],
            },
          };
        }

        return {
          status: 400 as const,
          body: {
            errors: [
              {
                status: '400',
                title: 'Bad Request',
                detail: (error as Error).message || 'Email verification failed',
                code: 'VERIFY_EMAIL_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.me)
  public getCurrentUser(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.me, async () => {
      try {
        const result = await this.authService.getCurrentUser(req.user.userId);

        return {
          status: 200 as const,
          body: {
            data: {
              id: req.user.userId,
              type: 'users',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Get current user failed for user ${req.user.userId}:`,
          error,
        );

        return {
          status: 401 as const,
          body: {
            errors: [
              {
                status: '401',
                title: 'Unauthorized',
                detail:
                  (error as Error).message || 'Failed to get user profile',
                code: 'GET_PROFILE_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @TsRestHandler(authContract.validateToken)
  public validateToken(
    @Body() body: ValidateTokenDto,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.validateToken, async () => {
      try {
        const result = await this.authService.validateToken(body);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'validate-token',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Token validation failed:', error);

        return {
          status: 400 as const,
          body: {
            errors: [
              {
                status: '400',
                title: 'Bad Request',
                detail: (error as Error).message || 'Token validation failed',
                code: 'VALIDATE_TOKEN_FAILED',
              },
            ],
          },
        };
      }
    });
  }

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

        return {
          status: 500 as const,
          body: {
            errors: [
              {
                status: '500',
                title: 'Internal Server Error',
                detail: (error as Error).message || 'Get sessions failed',
                code: 'GET_SESSIONS_FAILED',
              },
            ],
          },
        };
      }
    });
  }

  @UseGuards(JwtAuthGuard)
  @TsRestHandler(authContract.revokeSession)
  public revokeSession(
    @Request() req: AuthenticatedRequest,
    @Body() body: { sessionId: string },
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(authContract.revokeSession, async () => {
      try {
        const result = await this.authService.revokeSession(
          req.user.userId,
          body.sessionId,
        );
        this.logger.log(`Session revoked for user: ${req.user.userId}`);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'revoke-session',
              type: 'auth',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error(
          `Revoke session failed for user ${req.user.userId}:`,
          error,
        );

        const isNotFound =
          error instanceof Error && error.message.includes('not found');

        if (isNotFound) {
          return {
            status: 404 as const,
            body: {
              errors: [
                {
                  status: '404',
                  title: 'Not Found',
                  detail: (error as Error).message || 'Session not found',
                  code: 'SESSION_NOT_FOUND',
                },
              ],
            },
          };
        }

        return {
          status: 500 as const,
          body: {
            errors: [
              {
                status: '500',
                title: 'Internal Server Error',
                detail: (error as Error).message || 'Revoke session failed',
                code: 'REVOKE_SESSION_FAILED',
              },
            ],
          },
        };
      }
    });
  }
}
