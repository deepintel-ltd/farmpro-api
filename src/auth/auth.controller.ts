import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Body, 
  Param,
  UseGuards, 
  HttpCode,
  HttpStatus,
  Req,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '@/auth/auth.service';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Public } from '@/auth/decorators/public.decorator';
import { GetCurrentUser, CurrentUser } from '@/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { UuidValidationPipe } from '@/common/pipes/uuid-validation.pipe';
import { createJsonApiResource } from '@/common/utils/json-api-response.util';
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
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ChangePasswordRequestSchema,
  VerifyEmailRequestSchema,
  ValidateTokenRequestSchema,
} from '../../contracts/auth.schemas';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // =============================================================================
  // Auth Flow & JWT Management
  // =============================================================================

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(RegisterRequestSchema))
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return createJsonApiResource('register', 'auth', result);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: Request & { user: any }) {
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    
    const result = await this.authService.login(req.user, ipAddress, userAgent);
    return createJsonApiResource('login', 'auth', result);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RefreshTokenRequestSchema))
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refresh(refreshTokenDto);
    return createJsonApiResource('refresh', 'auth', result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@GetCurrentUser() user: CurrentUser) {
    const result = await this.authService.logout(user.userId);
    return createJsonApiResource('logout', 'auth', result);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(@GetCurrentUser() user: CurrentUser) {
    const result = await this.authService.logoutAll(user.userId);
    return createJsonApiResource('logout-all', 'auth', result);
  }

  // =============================================================================
  // Password Management
  // =============================================================================

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ForgotPasswordRequestSchema))
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return createJsonApiResource('forgot-password', 'auth', result);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResetPasswordRequestSchema))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return createJsonApiResource('reset-password', 'auth', result);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ZodValidationPipe(ChangePasswordRequestSchema))
  async changePassword(
    @GetCurrentUser() user: CurrentUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user.userId, changePasswordDto);
    return createJsonApiResource('change-password', 'auth', result);
  }

  // =============================================================================
  // Email & Account Verification
  // =============================================================================

  @Post('send-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async sendVerification(@GetCurrentUser() user: CurrentUser) {
    const result = await this.authService.sendVerification(user.userId);
    return createJsonApiResource('send-verification', 'auth', result);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailRequestSchema))
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(verifyEmailDto);
    return createJsonApiResource('verify-email', 'auth', result);
  }

  // =============================================================================
  // OAuth Integration (Placeholder - would need actual OAuth implementation)
  // =============================================================================

  @Public()
  @Get('google')
  async googleAuth() {
    // This would redirect to Google OAuth
    // Implementation would use Passport Google OAuth2 strategy
    throw new Error('Google OAuth not implemented yet');
  }

  @Public()
  @Get('google/callback')
  async googleCallback() {
    // This would handle Google OAuth callback
    throw new Error('Google OAuth callback not implemented yet');
  }

  @Public()
  @Get('github')
  async githubAuth() {
    // This would redirect to GitHub OAuth
    // Implementation would use Passport GitHub OAuth2 strategy
    throw new Error('GitHub OAuth not implemented yet');
  }

  @Public()
  @Get('github/callback')
  async githubCallback() {
    // This would handle GitHub OAuth callback
    throw new Error('GitHub OAuth callback not implemented yet');
  }

  // =============================================================================
  // Session Management
  // =============================================================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@GetCurrentUser() user: CurrentUser) {
    const result = await this.authService.getCurrentUser(user.userId);
    return createJsonApiResource(user.userId, 'users', result);
  }

  @Public()
  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ValidateTokenRequestSchema))
  async validateToken(@Body() validateTokenDto: ValidateTokenDto) {
    const result = await this.authService.validateToken(validateTokenDto);
    return createJsonApiResource('validate-token', 'auth', result);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@GetCurrentUser() user: CurrentUser) {
    const result = await this.authService.getSessions(user.userId);
    return createJsonApiResource('sessions', 'auth', result);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UsePipes(UuidValidationPipe)
  async revokeSession(
    @GetCurrentUser() user: CurrentUser,
    @Param('sessionId') sessionId: string,
  ) {
    const result = await this.authService.revokeSession(user.userId, sessionId);
    return createJsonApiResource('revoke-session', 'auth', result);
  }
}
