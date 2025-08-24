import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    _id: 'mockUserId',
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$10$hashedPassword',
    profile: {
      displayName: 'Test User',
    },
    role: 'user',
    emailVerified: true,
    refreshTokens: [],
    toObject: jest.fn(() => ({
      _id: 'mockUserId',
      email: 'test@example.com',
      username: 'testuser',
      profile: { displayName: 'Test User' },
      role: 'user',
      emailVerified: true,
    })),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmailOrUsername: jest.fn(),
      create: jest.fn(),
      addRefreshToken: jest.fn(),
      removeRefreshToken: jest.fn(),
      findById: jest.fn(),
      validateRefreshToken: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const loginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };

      usersService.findByEmailOrUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        loginDto.emailOrUsername,
        loginDto.password,
      );

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmailOrUsername).toHaveBeenCalledWith(
        loginDto.emailOrUsername,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const loginDto = {
        emailOrUsername: 'nonexistent@example.com',
        password: 'password123',
      };

      usersService.findByEmailOrUsername.mockResolvedValue(null);

      await expect(
        service.validateUser(loginDto.emailOrUsername, loginDto.password),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.findByEmailOrUsername).toHaveBeenCalledWith(
        loginDto.emailOrUsername,
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const loginDto = {
        emailOrUsername: 'test@example.com',
        password: 'wrongpassword',
      };

      usersService.findByEmailOrUsername.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser(loginDto.emailOrUsername, loginDto.password),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token and refresh token for valid user', async () => {
      const loginDto = {
        emailOrUsername: 'test@example.com',
        password: 'password123',
      };
      const accessToken = 'mockAccessToken';
      const refreshToken = 'mockRefreshToken';

      // Mock validateUser to return user
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser as any);
      
      jwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      configService.get.mockReturnValue('refreshSecret');
      usersService.addRefreshToken.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: {
          id: 'mockUserId',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
          avatar: undefined,
          role: 'user',
        },
        accessToken,
        refreshToken,
      });

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenNthCalledWith(1,
        {
          sub: mockUser._id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
        },
        { expiresIn: '15m', secret: 'refreshSecret' },
      );
      expect(jwtService.sign).toHaveBeenNthCalledWith(2,
        {
          sub: mockUser._id,
          tokenId: expect.any(String),
        },
        { expiresIn: '7d', secret: 'refreshSecret' },
      );
      expect(usersService.addRefreshToken).toHaveBeenCalledWith(
        mockUser._id,
        refreshToken,
      );
    });
  });

  describe('register', () => {
    it('should create and return new user with tokens', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        displayName: 'New User',
      };

      const createdUser = { ...mockUser, ...createUserDto };
      const accessToken = 'mockAccessToken';
      const refreshToken = 'mockRefreshToken';

      usersService.create.mockResolvedValue(createdUser as any);
      jwtService.sign
        .mockReturnValueOnce(accessToken)
        .mockReturnValueOnce(refreshToken);
      configService.get.mockReturnValue('refreshSecret');
      usersService.addRefreshToken.mockResolvedValue(undefined);

      const result = await service.register(createUserDto);

      expect(result).toEqual({
        user: expect.objectContaining({
          email: createUserDto.email,
          username: createUserDto.username,
        }),
        accessToken,
        refreshToken,
      });

      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshToken = 'validRefreshToken';
      const newAccessToken = 'newAccessToken';
      const newRefreshToken = 'newRefreshToken';

      const payload = {
        sub: mockUser._id,
        tokenId: 'tokenId123',
      };

      jwtService.verify.mockReturnValue(payload);
      usersService.findById.mockResolvedValue(mockUser as any);
      usersService.validateRefreshToken.mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce(newAccessToken)
        .mockReturnValueOnce(newRefreshToken);
      configService.get.mockReturnValue('refreshSecret');
      usersService.removeRefreshToken.mockResolvedValue(undefined);
      usersService.addRefreshToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens(mockUser._id, refreshToken);

      expect(result).toEqual({
        user: {
          id: mockUser._id,
          email: mockUser.email,
          username: mockUser.username,
          displayName: 'Test User',
          avatar: undefined,
          role: mockUser.role,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'refreshSecret',
      });
      expect(usersService.validateRefreshToken).toHaveBeenCalledWith(
        mockUser._id,
        refreshToken,
      );
      expect(usersService.removeRefreshToken).toHaveBeenCalledWith(
        mockUser._id,
        refreshToken,
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidRefreshToken = 'invalidToken';

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(null, invalidRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const refreshToken = 'validToken';
      const payload = { sub: 'nonexistentUserId', tokenId: 'tokenId123' };

      jwtService.verify.mockReturnValue(payload);
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshTokens(null, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when refresh token not in database', async () => {
      const refreshToken = 'validToken';
      const payload = { sub: mockUser._id, tokenId: 'tokenId123' };

      jwtService.verify.mockReturnValue(payload);
      usersService.findById.mockResolvedValue(mockUser as any);
      usersService.validateRefreshToken.mockResolvedValue(false);

      await expect(service.refreshTokens(null, refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should remove refresh token for user', async () => {
      const userId = 'mockUserId';
      const refreshToken = 'mockRefreshToken';

      usersService.removeRefreshToken.mockResolvedValue(undefined);

      await service.logout(userId, refreshToken);

      expect(usersService.removeRefreshToken).toHaveBeenCalledWith(
        userId,
        refreshToken,
      );
    });
  });

  describe('sanitizeUser', () => {
    it('should remove password and refresh tokens from user object', () => {
      const userWithSensitiveData = {
        ...mockUser,
        password: 'hashedPassword',
        refreshTokens: ['token1', 'token2'],
      };

      const result = service.sanitizeUser(userWithSensitiveData as any);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshTokens');
      expect(result).toEqual({
        id: 'mockUserId',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        avatar: undefined,
        role: 'user',
      });
    });
  });
});