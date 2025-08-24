import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if user exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: createUserDto.email.toLowerCase() },
        { username: createUserDto.username },
      ],
    });

    if (existingUser) {
      if (existingUser.email === createUserDto.email.toLowerCase()) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const createdUser = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
      profile: {
        displayName: createUserDto.displayName || createUserDto.username,
      },
    });

    return createdUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel
      .find()
      .select('-password -refreshTokens')
      .exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmailOrUsername(
    emailOrUsername: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        $or: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
        ],
      })
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
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
      )
      .select('-password -refreshTokens')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async addRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $push: { refreshTokens: refreshToken },
      $set: { lastLogin: new Date() },
    });
  }

  async removeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: refreshToken },
    });
  }

  async removeAllRefreshTokens(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      return false;
    }
    return user.refreshTokens.includes(refreshToken);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password and clear all refresh tokens for security
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { password: hashedNewPassword },
      $unset: { refreshTokens: 1 }, // Remove all refresh tokens to force re-login
    });

    console.log(`Password changed successfully for user: ${userId}`);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('User not found');
    }
  }
}
