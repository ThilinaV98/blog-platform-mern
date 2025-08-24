import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Register a new user',
    description: 'Create a new user account with email, username, and password'
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', example: 'john.doe@example.com' },
            username: { type: 'string', example: 'johndoe123' },
            displayName: { type: 'string', example: 'John Doe' },
            role: { type: 'string', example: 'user' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or user already exists',
    schema: {
      type: 'object',
      properties: {
        message: { 
          oneOf: [
            { type: 'string', example: 'Email already exists' },
            { type: 'array', items: { type: 'string' }, example: ['Email is required', 'Password must be at least 8 characters'] }
          ]
        },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login with email/username and password',
    description: 'Authenticate user and receive access and refresh tokens'
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            email: { type: 'string', example: 'john.doe@example.com' },
            username: { type: 'string', example: 'johndoe123' },
            displayName: { type: 'string', example: 'John Doe' },
            role: { type: 'string', example: 'user' },
          },
        },
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' },
        statusCode: { type: 'number', example: 401 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'array', items: { type: 'string' }, example: ['Email or username is required'] },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Logout and invalidate refresh token',
    description: 'Logout user and invalidate the provided refresh token'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing access token',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Unauthorized' },
        statusCode: { type: 'number', example: 401 },
      },
    },
  })
  async logout(
    @CurrentUser() user: any,
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    await this.authService.logout(user.userId, refreshTokenDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh access token using refresh token',
    description: 'Generate new access token using a valid refresh token'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully refreshed tokens',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Invalid refresh token' },
        error: { type: 'string', example: 'Unauthorized' },
        statusCode: { type: 'number', example: 401 },
      },
    },
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(
      null, // userId will be extracted from token
      refreshTokenDto.refreshToken,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send a password reset link to the user email'
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if account exists',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'If an account exists with this email, a password reset link has been sent.' 
        },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Reset password with token',
    description: 'Reset user password using the token sent to email'
  })
  @ApiResponse({
    status: 200,
    description: 'Password successfully reset',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Password has been reset successfully' 
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }
}