import { Controller, UseInterceptors, Logger, Request, Body, Query, Param, UploadedFile } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request as ExpressRequest } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Secured } from '../common/decorators/secured.decorator';
import { FEATURES, PERMISSIONS } from '../common/constants';
import { userContract } from '../../contracts/users.contract';
import { ErrorResponseUtil } from '../common/utils/error-response.util';
import { UsersService } from './users.service';
import {
  RequirePermission,
  RequireRoleLevel,
} from '../common/decorators/authorization.decorators';

interface AuthenticatedRequest extends ExpressRequest {
  user: CurrentUser;
}

@Controller()
@Secured(FEATURES.USERS)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // =============================================================================
  // User Profile Management
  // =============================================================================

  @TsRestHandler(userContract.getProfile)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getProfile(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getProfile, async () => {
      try {
        const profile = await this.usersService.getProfile(req.user);

        this.logger.log(`Retrieved profile for user: ${req.user.userId}`);
        return {
          status: 200 as const,
          body: {
            data: {
              id: profile.id,
              type: 'users',
              attributes: profile,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get profile failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve user profile',
          internalErrorCode: 'GET_PROFILE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.updateProfile)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  public updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.updateProfile, async () => {
      try {
        this.logger.log(`Profile update requested for user: ${req.user.userId}`);
        
        const updatedProfile = await this.usersService.updateProfile(req.user, {
          name: body.name,
          phone: body.phone,
          avatar: body.avatar,
          metadata: body.metadata,
        });

        return {
          status: 200 as const,
          body: {
            data: {
              id: updatedProfile.id,
              type: 'users',
              attributes: updatedProfile,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Update profile failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to update profile',
          badRequestCode: 'UPDATE_PROFILE_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.uploadAvatar)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  @UseInterceptors(FileInterceptor('avatar'))
  public uploadAvatar(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.uploadAvatar, async () => {
      try {
        this.logger.log(`Avatar upload requested for user: ${req.user.userId}`);
        
        if (!file) {
          return {
            status: 400,
            body: {
              errors: [{
                status: '400',
                code: 'NO_FILE_PROVIDED',
                title: 'No file provided',
                detail: 'Please provide an avatar file to upload',
              }],
            },
          };
        }

        // For now, create a placeholder URL. In production, this would upload to S3/CloudStorage
        const avatarUrl = `https://storage.example.com/avatars/${req.user.userId}-${Date.now()}.${file.originalname.split('.').pop()}`;
        
        const result = await this.usersService.uploadAvatar(req.user, avatarUrl);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'avatar-upload',
              type: 'avatars',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Avatar upload failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to upload avatar',
          badRequestCode: 'AVATAR_UPLOAD_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.deleteAvatar)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  public deleteAvatar(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.deleteAvatar, async () => {
      try {
        this.logger.log(`Avatar delete requested for user: ${req.user.userId}`);

        const result = await this.usersService.deleteAvatar(req.user);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'avatar-delete',
              type: 'avatars',
              attributes: result,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Avatar delete failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to delete avatar',
          badRequestCode: 'AVATAR_DELETE_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // User Management (Admin/Manager)
  // =============================================================================

  @TsRestHandler(userContract.getUsersWithQuery)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getUsers(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getUsersWithQuery, async () => {
      try {
        this.logger.log(`User search requested by: ${req.user.userId}`);
        
        const result = await this.usersService.searchUsers(req.user, {
          page: query.page,
          limit: query.limit,
          search: query.search,
          role: query.role,
          isActive: query.isActive,
          farmId: query.farmId,
        });

        return {
          status: 200 as const,
          body: {
            data: result.data.map(user => ({
              id: user.id,
              type: 'users',
              attributes: user,
            })),
            meta: result.meta,
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get users failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view users',
          unauthorizedCode: 'USER_READ_FORBIDDEN',
        });
      }
    });
  }

  // =============================================================================
  // User Preferences
  // =============================================================================

  @TsRestHandler(userContract.getPreferences)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getPreferences(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getPreferences, async () => {
      try {
        this.logger.log(`Preferences requested for user: ${req.user.userId}`);
        
        const preferences = await this.usersService.getPreferences(req.user);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'preferences',
              type: 'preferences',
              attributes: preferences,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get preferences failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve preferences',
          internalErrorCode: 'GET_PREFERENCES_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.updatePreferences)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  public updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.updatePreferences, async () => {
      try {
        this.logger.log(`Preferences update requested for user: ${req.user.userId}`);

        const updatedPreferences = await this.usersService.updatePreferences(req.user, body);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'preferences',
              type: 'preferences',
              attributes: updatedPreferences,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Update preferences failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to update preferences',
          badRequestCode: 'UPDATE_PREFERENCES_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Activity & Analytics
  // =============================================================================

  @TsRestHandler(userContract.getMyActivity)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getMyActivity(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getMyActivity, async () => {
      try {
        this.logger.log(`Activity requested for user: ${req.user.userId}`);
        
        const result = await this.usersService.getMyActivity(req.user, {
          limit: query.limit,
          days: query.days,
          type: query.type,
        });

        return {
          status: 200 as const,
          body: {
            data: result.data.map(activity => ({
              id: activity.id,
              type: 'activity-logs',
              attributes: activity,
            })),
            meta: result.meta,
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve activity',
          internalErrorCode: 'GET_ACTIVITY_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.getMyStats)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getMyStats(
    @Request() req: AuthenticatedRequest,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getMyStats, async () => {
      try {
        this.logger.log(`Stats requested for user: ${req.user.userId}`);
        
        const stats = await this.usersService.getMyStats(req.user, {
          period: query.period,
        });

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'user-stats',
              type: 'user-stats',
              attributes: stats,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get stats failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve stats',
          internalErrorCode: 'GET_STATS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Additional User Management (Admin)
  // =============================================================================

  @TsRestHandler(userContract.getUser)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getUserById(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getUser, async () => {
      try {
        this.logger.log(`Get user by ID requested by: ${req.user.userId} for user: ${userId}`);
        
        const user = await this.usersService.getUserById(req.user, userId);

        return {
          status: 200 as const,
          body: {
            data: {
              id: user.id,
              type: 'users',
              attributes: user,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get user by ID failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'User not found',
          notFoundCode: 'USER_NOT_FOUND',
        });
      }
    });
  }

  @TsRestHandler(userContract.updateUser)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  @RequireRoleLevel(50)
  public updateUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.updateUser, async () => {
      try {
        this.logger.log(`User update requested by: ${req.user.userId} for user: ${userId}`);
        const updatedUser = await this.usersService.updateUser(req.user, userId,body.data.attributes);

        return {
          status: 200 as const,
          body: {
            data: {
              id: updatedUser.id,
              type: 'users',
              attributes: updatedUser,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Update user failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          notFoundMessage: 'User not found',
          notFoundCode: 'USER_NOT_FOUND',
          badRequestMessage: 'Failed to update user',
          badRequestCode: 'UPDATE_USER_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.activateUser)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  @RequireRoleLevel(50)
  public activateUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.activateUser, async () => {
      try {
        this.logger.log(`Activate user requested by: ${req.user.userId} for user: ${userId}`);
        
        const user = await this.usersService.activateUser(req.user, userId);

        return {
          status: 200 as const,
          body: {
            data: {
              id: user.id,
              type: 'users',
              attributes: user,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Activate user failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to activate user',
          unauthorizedCode: 'USER_ACTIVATE_FORBIDDEN',
        });
      }
    });
  }

  // =============================================================================
  // Notification Settings
  // =============================================================================

  @TsRestHandler(userContract.getNotificationSettings)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getNotificationSettings(
    @Request() req: AuthenticatedRequest,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getNotificationSettings, async () => {
      try {
        this.logger.log(`Notification settings requested for user: ${req.user.userId}`);
        
        const settings = await this.usersService.getNotificationSettings(req.user);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'notification-settings',
              type: 'notification-settings',
              attributes: settings,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get notification settings failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          internalErrorMessage: 'Failed to retrieve notification settings',
          internalErrorCode: 'GET_NOTIFICATION_SETTINGS_FAILED',
        });
      }
    });
  }

  @TsRestHandler(userContract.updateNotificationSettings)
  @RequirePermission(...PERMISSIONS.USERS.UPDATE)
  public updateNotificationSettings(
    @Request() req: AuthenticatedRequest,
    @Body() body: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.updateNotificationSettings, async () => {
      try {
        this.logger.log(`Notification settings update requested for user: ${req.user.userId}`);

        const updatedSettings = await this.usersService.updateNotificationSettings(req.user, body);

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'notification-settings',
              type: 'notification-settings',
              attributes: updatedSettings,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Update notification settings failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          badRequestMessage: 'Failed to update notification settings',
          badRequestCode: 'UPDATE_NOTIFICATION_SETTINGS_FAILED',
        });
      }
    });
  }

  // =============================================================================
  // Admin Activity & Stats
  // =============================================================================

  @TsRestHandler(userContract.getUserActivity)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getUserActivity(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getUserActivity, async () => {
      try {
        this.logger.log(`User activity requested by: ${req.user.userId} for user: ${userId}`);
        
        const result = await this.usersService.getUserActivity(req.user, userId, {
          limit: query.limit,
          days: query.days,
          type: query.type,
        });

        return {
          status: 200 as const,
          body: {
            data: result.data.map(activity => ({
              id: activity.id,
              type: 'activity-logs',
              attributes: activity,
            })),
            meta: result.meta,
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get user activity failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view user activity',
          unauthorizedCode: 'USER_ACTIVITY_FORBIDDEN',
        });
      }
    });
  }

  @TsRestHandler(userContract.getUserStats)
  @RequirePermission(...PERMISSIONS.USERS.READ)
  public getUserStats(
    @Request() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Query() query: any,
  ): ReturnType<typeof tsRestHandler> {
    return tsRestHandler(userContract.getUserStats, async () => {
      try {
        this.logger.log(`User stats requested by: ${req.user.userId} for user: ${userId}`);
        
        const stats = await this.usersService.getUserStats(req.user, userId, {
          period: query.period,
        });

        return {
          status: 200 as const,
          body: {
            data: {
              id: 'user-stats',
              type: 'user-stats',
              attributes: stats,
            },
          },
        };
      } catch (error: unknown) {
        this.logger.error('Get user stats failed:', error);
        return ErrorResponseUtil.handleCommonError(error, {
          unauthorizedMessage: 'Insufficient permissions to view user stats',
          unauthorizedCode: 'USER_STATS_FORBIDDEN',
        });
      }
    });
  }
}
