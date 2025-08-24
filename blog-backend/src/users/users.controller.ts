import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Query,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadsService } from '../uploads/uploads.service';
import { multerConfig } from '../uploads/multer.config';
import { PostsService } from '../posts/posts.service';
import { QueryPostDto } from '../posts/dto/query-post.dto';

@ApiTags('Users')
@Controller('api/users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
    private readonly postsService: PostsService,
  ) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user\'s profile information'
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        email: { type: 'string', example: 'john.doe@example.com' },
        username: { type: 'string', example: 'johndoe123' },
        profile: {
          type: 'object',
          properties: {
            displayName: { type: 'string', example: 'John Doe' },
            bio: { type: 'string', example: 'Full-stack developer' },
            avatar: { type: 'string', example: '/uploads/avatars/user123/avatar-1234567890-display.webp' },
            website: { type: 'string', example: 'https://johndoe.dev' },
            location: { type: 'string', example: 'San Francisco, CA' },
            socialLinks: {
              type: 'object',
              properties: {
                twitter: { type: 'string', example: 'https://twitter.com/johndoe' },
                github: { type: 'string', example: 'https://github.com/johndoe' },
                linkedin: { type: 'string', example: 'https://linkedin.com/in/johndoe' },
              },
            },
          },
        },
        role: { type: 'string', example: 'user' },
        emailVerified: { type: 'boolean', example: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
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
  async getProfile(@CurrentUser() user: any) {
    const userData = await this.usersService.findById(user.userId);
    const { password, refreshTokens, ...profile } = userData.toObject();
    return profile;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update current user profile',
    description: 'Update the authenticated user\'s profile information'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        email: { type: 'string', example: 'john.doe@example.com' },
        username: { type: 'string', example: 'johndoe123' },
        profile: {
          type: 'object',
          properties: {
            displayName: { type: 'string', example: 'John Doe' },
            bio: { type: 'string', example: 'Full-stack developer passionate about creating amazing user experiences.' },
            avatar: { type: 'string', example: '/uploads/avatars/user123/avatar-1234567890-display.webp' },
            website: { type: 'string', example: 'https://johndoe.dev' },
            location: { type: 'string', example: 'San Francisco, CA' },
            socialLinks: {
              type: 'object',
              properties: {
                twitter: { type: 'string', example: 'https://twitter.com/johndoe' },
                github: { type: 'string', example: 'https://github.com/johndoe' },
                linkedin: { type: 'string', example: 'https://linkedin.com/in/johndoe' },
              },
            },
          },
        },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'array', 
          items: { type: 'string' }, 
          example: ['website must be a URL address', 'displayName must not exceed 50 characters'] 
        },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
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
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(user.userId, updateUserDto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Upload user avatar',
    description: 'Upload and process a new avatar image for the authenticated user'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Avatar image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP) - max 5MB',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Avatar uploaded and processed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Avatar uploaded successfully' },
        avatarUrl: { type: 'string', example: '/uploads/avatars/user123/avatar-1234567890-display.webp' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'File validation error',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string', 
          example: 'Validation failed (current file type is image/jpeg, expected type is /^image\\//)' 
        },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
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
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /^image\// }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Avatar upload started for user: ${user.userId}`);
      this.logger.debug(`File received: ${file.filename} at ${file.path}`);
      
      // Get current user data
      const currentUser = await this.usersService.findById(user.userId);
      this.logger.debug(`Current user avatar: ${currentUser.profile?.avatar || 'none'}`);
      
      // Clean up old avatar if exists
      if (currentUser.profile?.avatar) {
        this.logger.debug('Cleaning up old avatar');
        await this.uploadsService.cleanupOldAvatar(user.userId);
      }

      // Process the new avatar
      this.logger.debug('Processing new avatar');
      const avatarPath = await this.uploadsService.processAvatar(file, user.userId);
      this.logger.debug(`Avatar processed, path: ${avatarPath}`);

      // Update user profile with new avatar
      this.logger.debug('Updating user profile');
      await this.usersService.update(user.userId, {
        avatar: avatarPath,
      });

      this.logger.log('Avatar upload completed successfully');
      return {
        message: 'Avatar uploaded successfully',
        avatarUrl: avatarPath,
      };
    } catch (error) {
      this.logger.error('Avatar upload error', error.stack);
      throw error;
    }
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get public user profile by username' })
  async getPublicProfile(@Param('username') username: string) {
    const userData = await this.usersService.findByUsername(username);
    if (!userData) {
      throw new Error('User not found');
    }
    const { password, refreshTokens, email, ...publicProfile } = userData.toObject();
    return publicProfile;
  }

  @Get(':username/posts')
  @ApiOperation({ summary: 'Get posts by username' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'scheduled'] })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getUserPosts(
    @Param('username') username: string,
    @Query() query: QueryPostDto,
  ) {
    const userData = await this.usersService.findByUsername(username);
    if (!userData) {
      throw new Error('User not found');
    }
    
    // Fetch posts for the user
    const result = await this.postsService.findUserPosts(userData._id.toString(), query);
    
    return result;
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Change user password',
    description: 'Change the authenticated user\'s password. This will invalidate all existing sessions.'
  })
  @ApiResponse({
    status: 204,
    description: 'Password changed successfully. All refresh tokens have been invalidated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'array', 
          items: { type: 'string' }, 
          example: ['New password must be at least 8 characters long'] 
        },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Current password is incorrect or unauthorized',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Current password is incorrect' },
        statusCode: { type: 'number', example: 401 },
      },
    },
  })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.userId, changePasswordDto);
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account' })
  async deleteAccount(@CurrentUser() user: any) {
    await this.usersService.remove(user.userId);
  }
}