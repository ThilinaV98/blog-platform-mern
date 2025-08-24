import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly avatarSizes = {
    thumbnail: { width: 150, height: 150 },
    display: { width: 500, height: 500 },
  };

  private readonly imageSizes = {
    thumbnail: { width: 300, height: 200 },
    medium: { width: 800, height: 600 },
    large: { width: 1920, height: 1080 },
  };

  async processAvatar(file: Express.Multer.File, userId: string): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Processing avatar for user: ${userId}, size: ${file.size} bytes`);

    try {
      // Create user-specific directory with absolute path
      const userDir = path.join(process.cwd(), 'uploads', 'avatars', userId);
      this.logger.debug(`Creating user directory: ${userDir}`);
      await fs.mkdir(userDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `avatar-${timestamp}`;

      // Process and save different sizes
      // Use buffer if available (memoryStorage), otherwise use path (diskStorage)
      const inputSource = file.buffer || file.path;
      const sharpInstance = sharp(inputSource);
      
      // Get metadata to check image dimensions
      const metadata = await sharpInstance.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image file');
      }

      // Save display size (500x500)
      const displayPath = path.join(userDir, `${filename}-display.webp`);
      this.logger.debug(`Creating display image at: ${displayPath}`);
      await sharp(inputSource)
        .resize(this.avatarSizes.display.width, this.avatarSizes.display.height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 90 })
        .toFile(displayPath);
      this.logger.debug('Display image created successfully');

      // Save thumbnail (150x150)
      const thumbnailPath = path.join(userDir, `${filename}-thumb.webp`);
      await sharp(inputSource)
        .resize(this.avatarSizes.thumbnail.width, this.avatarSizes.thumbnail.height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toFile(thumbnailPath);

      // Clean up the original uploaded file if it was saved to disk
      if (file.path) {
        this.logger.debug(`Cleaning up original file: ${file.path}`);
        await fs.unlink(file.path);
      }

      // Return the relative path to the display image
      const relativePath = path.relative(process.cwd(), displayPath);
      this.logger.log(`Avatar processed successfully: /${relativePath}`);
      return `/${relativePath}`;
    } catch (error) {
      this.logger.error('Error processing avatar', error.stack);
      // Clean up the uploaded file in case of error
      if (file.path) {
        this.logger.debug(`Cleaning up failed upload: ${file.path}`);
        await fs.unlink(file.path).catch(() => {});
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Failed to process image: ' + error.message);
    }
  }

  async deleteAvatar(avatarPath: string): Promise<void> {
    if (!avatarPath) return;

    try {
      // Extract the directory from the avatar path
      const dir = path.dirname(avatarPath.substring(1)); // Remove leading slash
      
      // Delete all avatar files in the user's directory
      const files = await fs.readdir(dir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(dir, file)).catch(() => {}))
      );
      
      // Try to remove the directory (will fail if not empty, which is fine)
      await fs.rmdir(dir).catch(() => {});
    } catch (error) {
      // Silently fail if files don't exist
      this.logger.warn('Error deleting avatar', error.message);
    }
  }

  async cleanupOldAvatar(userId: string, currentAvatarPath?: string): Promise<void> {
    try {
      const userDir = path.join(process.cwd(), 'uploads', 'avatars', userId);
      
      // Check if directory exists
      try {
        await fs.access(userDir);
      } catch {
        return; // Directory doesn't exist, nothing to clean
      }

      const files = await fs.readdir(userDir);
      
      // Delete all avatar files except the current one
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(userDir, file);
          if (!currentAvatarPath || !currentAvatarPath.includes(file)) {
            await fs.unlink(filePath).catch(() => {});
          }
        })
      );
    } catch (error) {
      this.logger.warn('Error cleaning up old avatars', error.message);
    }
  }

  getAvatarUrl(relativePath: string): string | null {
    if (!relativePath) return null;
    
    // In production, this would return a CDN URL
    // For development, return the relative path
    return relativePath;
  }

  async processPostImage(file: Express.Multer.File): Promise<{
    url: string;
    key: string;
    size: number;
    dimensions: { width: number; height: number };
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    this.logger.log(`Processing post image: ${file.originalname}, size: ${file.size} bytes`);

    try {
      // Create posts images directory
      const postsDir = path.join(process.cwd(), 'uploads', 'posts');
      await fs.mkdir(postsDir, { recursive: true });

      // Generate unique filename
      const fileId = uuidv4();
      const timestamp = Date.now();
      const filename = `post-${timestamp}-${fileId}`;

      // Get image metadata
      const inputSource = file.buffer || file.path;
      const sharpInstance = sharp(inputSource);
      const metadata = await sharpInstance.metadata();

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image file');
      }

      // Create year-month subdirectory for organization
      const date = new Date();
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const imageDir = path.join(postsDir, yearMonth);
      await fs.mkdir(imageDir, { recursive: true });

      // Save original image as WebP
      const originalPath = path.join(imageDir, `${filename}-original.webp`);
      await sharp(inputSource)
        .webp({ quality: 95 })
        .toFile(originalPath);

      // Generate different sizes
      const sizes = [
        { name: 'large', ...this.imageSizes.large },
        { name: 'medium', ...this.imageSizes.medium },
        { name: 'thumbnail', ...this.imageSizes.thumbnail },
      ];

      for (const size of sizes) {
        const sizePath = path.join(imageDir, `${filename}-${size.name}.webp`);
        await sharp(inputSource)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toFile(sizePath);
      }

      // Clean up temporary file if exists
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }

      // Return the relative path to the original image
      const relativePath = path.relative(process.cwd(), originalPath);
      const imageKey = `${yearMonth}/${filename}`;

      this.logger.log(`Image processed successfully: /${relativePath}`);

      return {
        url: `http://localhost:4000/${relativePath}`,
        key: imageKey,
        size: file.size,
        dimensions: {
          width: metadata.width,
          height: metadata.height,
        },
      };
    } catch (error) {
      this.logger.error('Error processing post image', error.stack);
      
      // Clean up on error
      if (file.path) {
        await fs.unlink(file.path).catch(() => {});
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to process image: ' + error.message);
    }
  }

  async processMultipleImages(files: Express.Multer.File[]): Promise<Array<{
    url: string;
    key: string;
    size: number;
    dimensions: { width: number; height: number };
  }>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const results: Array<{
      url: string;
      key: string;
      size: number;
      dimensions: { width: number; height: number };
    }> = [];
    for (const file of files) {
      try {
        const result = await this.processPostImage(file);
        results.push(result);
      } catch (error) {
        this.logger.warn(`Failed to process image ${file.originalname}`, error.message);
        // Continue processing other images
      }
    }

    if (results.length === 0) {
      throw new BadRequestException('Failed to process any images');
    }

    return results;
  }

  async deleteImage(imageKey: string): Promise<void> {
    if (!imageKey) {
      throw new BadRequestException('Image key is required');
    }

    try {
      const postsDir = path.join(process.cwd(), 'uploads', 'posts');
      const [yearMonth, filename] = imageKey.split('/');
      
      if (!yearMonth || !filename) {
        throw new BadRequestException('Invalid image key format');
      }

      const imageDir = path.join(postsDir, yearMonth);
      
      // Delete all size variations of the image
      const files = await fs.readdir(imageDir);
      const imageFiles = files.filter(file => file.startsWith(filename));
      
      if (imageFiles.length === 0) {
        throw new NotFoundException('Image not found');
      }

      await Promise.all(
        imageFiles.map(file => 
          fs.unlink(path.join(imageDir, file)).catch(err => {
            this.logger.warn(`Failed to delete ${file}`, err.message);
          })
        )
      );

      this.logger.log(`Deleted image: ${imageKey}`);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Error deleting image', error.stack);
      throw new BadRequestException('Failed to delete image');
    }
  }

  getImageUrl(imageKey: string, size: 'original' | 'large' | 'medium' | 'thumbnail' = 'original'): string | null {
    if (!imageKey) return null;

    const [yearMonth, filenameBase] = imageKey.split('/');
    const sizeStr = size === 'original' ? 'original' : size;
    const filename = `${filenameBase}-${sizeStr}.webp`;
    
    return `http://localhost:4000/uploads/posts/${yearMonth}/${filename}`;
  }

  async getAllImages(): Promise<Array<{
    url: string;
    key: string;
    size: number;
    dimensions: { width: number; height: number };
  }>> {
    try {
      const postsDir = path.join(process.cwd(), 'uploads', 'posts');
      
      // Check if directory exists
      try {
        await fs.access(postsDir);
      } catch {
        return []; // Directory doesn't exist, return empty array
      }

      const images: Array<{
        url: string;
        key: string;
        size: number;
        dimensions: { width: number; height: number };
      }> = [];

      // Read all year-month directories
      const yearMonthDirs = await fs.readdir(postsDir);
      
      for (const yearMonth of yearMonthDirs) {
        const yearMonthPath = path.join(postsDir, yearMonth);
        const stat = await fs.stat(yearMonthPath);
        
        if (!stat.isDirectory()) continue;

        // Read all files in this directory
        const files = await fs.readdir(yearMonthPath);
        
        // Group files by base name (without size suffix)
        const imageGroups = new Map<string, string[]>();
        
        for (const file of files) {
          if (!file.endsWith('.webp')) continue;
          
          // Extract base name by removing size suffix
          const match = file.match(/^(.+)-(original|large|medium|thumbnail)\.webp$/);
          if (match) {
            const baseName = match[1];
            if (!imageGroups.has(baseName)) {
              imageGroups.set(baseName, []);
            }
            imageGroups.get(baseName)!.push(file);
          }
        }

        // Process each image group
        for (const [baseName, groupFiles] of imageGroups) {
          // Find the original file to get metadata
          const originalFile = groupFiles.find(f => f.includes('-original.'));
          if (!originalFile) continue;

          const originalPath = path.join(yearMonthPath, originalFile);
          
          try {
            // Get file stats
            const fileStat = await fs.stat(originalPath);
            
            // Get image dimensions using Sharp
            const metadata = await sharp(originalPath).metadata();
            
            if (metadata.width && metadata.height) {
              images.push({
                url: `http://localhost:4000/uploads/posts/${yearMonth}/${originalFile}`,
                key: `${yearMonth}/${baseName}`,
                size: fileStat.size,
                dimensions: {
                  width: metadata.width,
                  height: metadata.height,
                },
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to process image ${originalPath}`, error.message);
            // Continue processing other images
          }
        }
      }

      // Sort by creation time (newest first) based on timestamp in filename
      images.sort((a, b) => {
        const getTimestamp = (key: string) => {
          const match = key.match(/post-(\d+)-/);
          return match ? parseInt(match[1], 10) : 0;
        };
        
        return getTimestamp(b.key) - getTimestamp(a.key);
      });

      return images;
    } catch (error) {
      this.logger.error('Error getting all images', error.stack);
      throw new BadRequestException('Failed to retrieve images');
    }
  }
}