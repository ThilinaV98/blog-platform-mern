import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentpassword123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'newpassword123',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password must not exceed 128 characters' })
  newPassword: string;
}