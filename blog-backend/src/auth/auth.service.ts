import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token.dto';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    emailOrUsername: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.usersService.findByEmailOrUsername(emailOrUsername);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async register(registerDto: RegisterDto): Promise<TokenResponseDto> {
    // Create user
    const user = await this.usersService.create({
      email: registerDto.email,
      username: registerDto.username,
      password: registerDto.password,
      displayName: registerDto.displayName,
    });

    // Generate tokens
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.validateUser(
      loginDto.emailOrUsername,
      loginDto.password,
    );
    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.usersService.removeRefreshToken(userId, refreshToken);
  }

  async refreshTokens(
    userId: string | null,
    refreshToken: string,
  ): Promise<TokenResponseDto> {
    // Decode the refresh token to get userId
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
      
      // Extract userId from token if not provided
      const actualUserId = userId || payload.sub;
      
      // Validate refresh token exists in database
      const isValid = await this.usersService.validateRefreshToken(
        actualUserId,
        refreshToken,
      );
      
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.usersService.findById(actualUserId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Remove old refresh token
      await this.usersService.removeRefreshToken(actualUserId, refreshToken);

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(user: UserDocument): Promise<TokenResponseDto> {
    const userId = (user as any)._id.toString();
    const payload = {
      sub: userId,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    // Generate access token (15 minutes)
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: '15m',
    });

    // Generate refresh token (7 days)
    const refreshPayload = {
      sub: userId,
      tokenId: uuidv4(),
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: '7d',
    });

    // Store refresh token in database
    await this.usersService.addRefreshToken(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: UserDocument) {
    return {
      id: (user as any)._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      profile: {
        displayName: user.profile?.displayName || user.username,
        avatar: user.profile?.avatar,
        bio: user.profile?.bio,
        location: user.profile?.location,
        website: user.profile?.website,
      },
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if email exists for security
      return { message: 'If an account exists with this email, a password reset link has been sent.' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const hashedToken = await bcrypt.hash(resetToken, 10);
    
    // Save hashed token and expiry to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In production, send email with reset link
    // For now, we'll just log the token (in production, never log sensitive tokens!)
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    
    // TODO: Implement email sending with NodeMailer
    this.logger.log(`Password reset requested for email: ${email}`);
    this.logger.debug(`Reset URL would be: ${resetUrl}`);
    
    return { message: 'If an account exists with this email, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find user with valid reset token
    const users = await this.usersService.findAll();
    let validUser: UserDocument | null = null;
    
    for (const user of users) {
      if (user.passwordResetToken && user.passwordResetExpires) {
        const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
        const isTokenNotExpired = user.passwordResetExpires > new Date();
        
        if (isTokenValid && isTokenNotExpired) {
          validUser = user;
          break;
        }
      }
    }
    
    if (!validUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password and clear reset token
    validUser.password = hashedPassword;
    validUser.passwordResetToken = undefined;
    validUser.passwordResetExpires = undefined;
    await validUser.save();

    return { message: 'Password has been reset successfully' };
  }
}