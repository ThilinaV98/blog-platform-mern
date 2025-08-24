import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';
import { UsersService } from '../users/users.service';
import { multerConfig } from './multer.config';

@ApiTags('Uploads')
@Controller('api/uploads')
export class UploadsController {
  constructor(
    private readonly uploadsService: UploadsService,
    private readonly usersService: UsersService,
  ) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
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
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Get current user data
    const currentUser = await this.usersService.findById(user.userId);
    
    // Clean up old avatar if exists
    if (currentUser.profile?.avatar) {
      await this.uploadsService.cleanupOldAvatar(user.userId);
    }

    // Process the new avatar
    const avatarPath = await this.uploadsService.processAvatar(file, user.userId);

    // Update user profile with new avatar
    await this.usersService.update(user.userId, {
      avatar: avatarPath,
    });

    return {
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarPath,
    };
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Upload single image for blog posts',
    description: 'Upload and process a single image for use in blog posts'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
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
    description: 'Image uploaded and processed successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: '/uploads/posts/2024-01/post-1234567890-uuid-original.webp' },
        key: { type: 'string', example: '2024-01/post-1234567890-uuid' },
        size: { type: 'number', example: 245678 },
        dimensions: {
          type: 'object',
          properties: {
            width: { type: 'number', example: 1920 },
            height: { type: 'number', example: 1080 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation error',
  })
  async uploadImage(
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
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return await this.uploadsService.processPostImage(file);
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig)) // Max 10 files
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Upload multiple images for blog posts',
    description: 'Upload and process multiple images (max 10) for use in blog posts'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multiple image files to upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Image files (JPEG, PNG, GIF, WebP) - max 5MB each, max 10 files',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded and processed successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          key: { type: 'string' },
          size: { type: 'number' },
          dimensions: {
            type: 'object',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async uploadImages(
    @CurrentUser() user: any,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB per file
          new FileTypeValidator({ fileType: /^image\// }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed');
    }

    return await this.uploadsService.processMultipleImages(files);
  }

  @Delete('image/:yearMonth/:filename')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete an uploaded image',
    description: 'Delete an uploaded image and all its size variations'
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Image deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
  })
  async deleteImage(
    @CurrentUser() user: any,
    @Param('yearMonth') yearMonth: string,
    @Param('filename') filename: string,
  ) {
    // In production, you would verify ownership here
    const key = `${yearMonth}/${filename}`;
    await this.uploadsService.deleteImage(key);
    
    return {
      message: 'Image deleted successfully',
    };
  }

  @Get('images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all uploaded images',
    description: 'Retrieve a list of all uploaded images for the authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Images retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: { type: 'string', example: 'http://localhost:4000/uploads/posts/2024-01/post-1234567890-uuid-original.webp' },
          key: { type: 'string', example: '2024-01/post-1234567890-uuid' },
          size: { type: 'number', example: 245678 },
          dimensions: {
            type: 'object',
            properties: {
              width: { type: 'number', example: 1920 },
              height: { type: 'number', example: 1080 },
            },
          },
        },
      },
    },
  })
  async getImages(@CurrentUser() user: any) {
    return await this.uploadsService.getAllImages();
  }
}