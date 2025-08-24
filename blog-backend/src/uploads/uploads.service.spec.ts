import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import * as fs from 'fs/promises';
import * as sharp from 'sharp';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('sharp');

describe('UploadsService', () => {
  let service: UploadsService;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024000, // 1MB
    destination: '/tmp/uploads',
    filename: 'test-image-123.jpg',
    path: '/tmp/uploads/test-image-123.jpg',
    buffer: Buffer.from('mock image data'),
    stream: null,
  };

  const mockSharpInstance = {
    metadata: jest.fn(),
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toFile: jest.fn(),
    toBuffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadsService],
    }).compile();

    service = module.get<UploadsService>(UploadsService);

    // Setup default Sharp mock
    (sharp as any).mockReturnValue(mockSharpInstance);
    mockSharpInstance.metadata.mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    });
    mockSharpInstance.toFile.mockResolvedValue({ size: 500000 });

    // Setup default fs mocks
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.readdir as jest.Mock).mockResolvedValue([]);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1024000 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processAvatar', () => {
    it('should process avatar successfully', async () => {
      const userId = 'user123';

      const result = await service.processAvatar(mockFile, userId);

      expect(result).toEqual(
        expect.stringContaining('/uploads/avatars/user123/'),
      );
      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(500, 500, {
        fit: 'cover',
        position: 'center',
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(
        service.processAvatar(null, 'user123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle image processing errors', async () => {
      const userId = 'user123';
      mockSharpInstance.toFile.mockRejectedValue(new Error('Processing failed'));

      await expect(
        service.processAvatar(mockFile, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processPostImage', () => {
    it('should process post image successfully', async () => {
      const result = await service.processPostImage(mockFile);

      expect(result).toEqual({
        url: expect.stringContaining('http://localhost:4000/uploads/posts/'),
        key: expect.stringContaining('/post-'),
        size: mockFile.size,
        dimensions: {
          width: 1920,
          height: 1080,
        },
      });
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(service.processPostImage(null)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cleanupOldAvatar', () => {
    it('should clean up old avatar files', async () => {
      const userId = 'user123';

      (fs.readdir as jest.Mock).mockResolvedValue([
        'avatar-old.webp',
        'other-file.txt',
      ]);

      await service.cleanupOldAvatar(userId);

      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('avatar-old.webp'),
      );
    });

    it('should handle non-existent directory', async () => {
      const userId = 'user123';

      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      await expect(service.cleanupOldAvatar(userId)).resolves.not.toThrow();
    });
  });

  describe('deleteImage', () => {
    it('should delete image files successfully', async () => {
      const imageKey = '2025-01/post-123456-uuid';

      (fs.readdir as jest.Mock).mockResolvedValue([
        'post-123456-uuid-original.webp',
        'post-123456-uuid-large.webp',
      ]);

      await service.deleteImage(imageKey);

      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for invalid key', async () => {
      await expect(service.deleteImage('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAllImages', () => {
    it('should return all images', async () => {
      (fs.readdir as jest.Mock)
        .mockResolvedValueOnce(['2025-01']) // year-month dirs
        .mockResolvedValueOnce(['post-123-original.webp']); // files in dir

      (fs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true,
        size: 1024000,
      });

      const result = await service.getAllImages();

      expect(result).toEqual([
        expect.objectContaining({
          url: expect.stringContaining('http://localhost:4000/uploads/posts/'),
          key: expect.stringContaining('2025-01/post-123'),
          size: 1024000,
          dimensions: {
            width: 1920,
            height: 1080,
          },
        }),
      ]);
    });

    it('should handle non-existent directory', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      const result = await service.getAllImages();

      expect(result).toEqual([]);
    });
  });

  describe('getImageUrl', () => {
    it('should return correct image URL', () => {
      const imageKey = '2025-01/post-123';
      
      const result = service.getImageUrl(imageKey, 'medium');

      expect(result).toBe(
        'http://localhost:4000/uploads/posts/2025-01/post-123-medium.webp',
      );
    });

    it('should return null for empty key', () => {
      const result = service.getImageUrl('');

      expect(result).toBeNull();
    });
  });
});