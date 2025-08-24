import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let model: jest.Mocked<Model<UserDocument>>;

  const mockUser = {
    _id: 'mockUserId',
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$10$hashedPassword',
    profile: {
      displayName: 'Test User',
      bio: 'Test bio',
      avatar: '/path/to/avatar.jpg',
    },
    role: 'user',
    emailVerified: true,
    refreshTokens: ['token1', 'token2'],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
    toObject: jest.fn(),
  };

  const mockUserDocument = {
    ...mockUser,
    save: jest.fn().mockResolvedValue(mockUser),
    toObject: jest.fn().mockReturnValue(mockUser),
  };

  beforeEach(async () => {
    const mockModel = {
      new: jest.fn(),
      constructor: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      exec: jest.fn(),
      select: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name));

    // Setup default mock behaviors
    mockModel.findOne.mockReturnValue({
      exec: jest.fn(),
    });
    mockModel.findById.mockReturnValue({
      exec: jest.fn(),
    });
    mockModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    });
    mockModel.findByIdAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn(),
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
        displayName: 'New User',
      };

      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword' as any);
      
      // Mock the model constructor to return an object with save method
      const mockSave = jest.fn().mockResolvedValue(mockUserDocument);
      (model as any).mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.create(createUserDto);

      expect(model.findOne).toHaveBeenCalledWith({
        $or: [
          { email: createUserDto.email.toLowerCase() },
          { username: createUserDto.username },
        ],
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'password123',
        displayName: 'New User',
      };

      const existingUser = { ...mockUser, email: 'existing@example.com' };
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      } as any);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('should throw ConflictException when username already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        username: 'existinguser',
        password: 'password123',
        displayName: 'New User',
      };

      const existingUser = { ...mockUser, username: 'existinguser' };
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      } as any);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createUserDto)).rejects.toThrow(
        'Username already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return all users without sensitive data', async () => {
      const users = [mockUser, { ...mockUser, _id: 'user2' }];
      model.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(users),
        }),
      } as any);

      const result = await service.findAll();

      expect(model.find).toHaveBeenCalled();
      expect(model.find().select).toHaveBeenCalledWith('-password -refreshTokens');
    });
  });

  describe('findById', () => {
    it('should return user by ID', async () => {
      const userId = 'mockUserId';
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findById(userId);

      expect(result).toEqual(mockUser);
      expect(model.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentId';
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(userId)).rejects.toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test@example.com';
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(model.findOne).toHaveBeenCalledWith({
        email: email.toLowerCase(),
      });
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return user by username', async () => {
      const username = 'testuser';
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByUsername(username);

      expect(result).toEqual(mockUser);
      expect(model.findOne).toHaveBeenCalledWith({ username });
    });
  });

  describe('findByEmailOrUsername', () => {
    it('should find user by email', async () => {
      const emailOrUsername = 'test@example.com';
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByEmailOrUsername(emailOrUsername);

      expect(result).toEqual(mockUser);
      expect(model.findOne).toHaveBeenCalledWith({
        $or: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
        ],
      });
    });

    it('should find user by username', async () => {
      const emailOrUsername = 'testuser';
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      const result = await service.findByEmailOrUsername(emailOrUsername);

      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user profile successfully', async () => {
      const userId = 'mockUserId';
      const updateUserDto: UpdateUserDto = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        website: 'https://example.com',
      };

      const updatedUser = { ...mockUser, profile: { ...mockUser.profile, ...updateUserDto } };
      
      model.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedUser),
        }),
      } as any);

      const result = await service.update(userId, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        {
          $set: {
            'profile.displayName': updateUserDto.displayName,
            'profile.bio': updateUserDto.bio,
            'profile.avatar': updateUserDto.avatar,
            'profile.website': updateUserDto.website,
            'profile.location': updateUserDto.location,
            'profile.socialLinks': updateUserDto.socialLinks,
          },
        },
        { new: true },
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentId';
      const updateUserDto: UpdateUserDto = {
        displayName: 'Updated Name',
      };

      model.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      await expect(service.update(userId, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'mockUserId';
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword' as any);

      model.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.changePassword(userId, changePasswordDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.currentPassword,
        mockUser.password,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(changePasswordDto.newPassword, 10);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $set: { password: 'hashedNewPassword' },
        $unset: { refreshTokens: 1 },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentId';
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };

      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      const userId = 'mockUserId';
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
      };

      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false as any);

      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.changePassword(userId, changePasswordDto),
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('addRefreshToken', () => {
    it('should add refresh token to user', async () => {
      const userId = 'mockUserId';
      const refreshToken = 'newRefreshToken';

      model.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.addRefreshToken(userId, refreshToken);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $push: { refreshTokens: refreshToken },
        $set: { lastLogin: expect.any(Date) },
      });
    });
  });

  describe('removeRefreshToken', () => {
    it('should remove refresh token from user', async () => {
      const userId = 'mockUserId';
      const refreshToken = 'tokenToRemove';

      model.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.removeRefreshToken(userId, refreshToken);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $pull: { refreshTokens: refreshToken },
      });
    });
  });

  describe('removeAllRefreshTokens', () => {
    it('should remove all refresh tokens from user', async () => {
      const userId = 'mockUserId';

      model.findByIdAndUpdate.mockResolvedValue(undefined);

      await service.removeAllRefreshTokens(userId);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
        $set: { refreshTokens: [] },
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true when refresh token is valid', async () => {
      const userId = 'mockUserId';
      const refreshToken = 'validToken';
      const userWithToken = { ...mockUser, refreshTokens: [refreshToken] };

      model.findById.mockResolvedValue(userWithToken as any);

      const result = await service.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(true);
      expect(model.findById).toHaveBeenCalledWith(userId);
    });

    it('should return false when user not found', async () => {
      const userId = 'nonexistentId';
      const refreshToken = 'token';

      model.findById.mockResolvedValue(null);

      const result = await service.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(false);
    });

    it('should return false when refresh token not found in user tokens', async () => {
      const userId = 'mockUserId';
      const refreshToken = 'invalidToken';
      const userWithoutToken = { ...mockUser, refreshTokens: ['otherToken'] };

      model.findById.mockResolvedValue(userWithoutToken as any);

      const result = await service.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should delete user successfully', async () => {
      const userId = 'mockUserId';

      model.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      } as any);

      await service.remove(userId);

      expect(model.deleteOne).toHaveBeenCalledWith({ _id: userId });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'nonexistentId';

      model.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      } as any);

      await expect(service.remove(userId)).rejects.toThrow(NotFoundException);
      await expect(service.remove(userId)).rejects.toThrow('User not found');
    });
  });
});