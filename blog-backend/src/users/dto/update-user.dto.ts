import { IsString, IsOptional, MaxLength, IsUrl, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SocialLinksDto {
  @ApiPropertyOptional({
    description: 'Twitter profile URL',
    example: 'https://twitter.com/johndoe',
    format: 'url',
  })
  @ValidateIf(o => o.twitter !== '' && o.twitter != null)
  @IsUrl()
  twitter?: string;

  @ApiPropertyOptional({
    description: 'GitHub profile URL',
    example: 'https://github.com/johndoe',
    format: 'url',
  })
  @ValidateIf(o => o.github !== '' && o.github != null)
  @IsUrl()
  github?: string;

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL',
    example: 'https://linkedin.com/in/johndoe',
    format: 'url',
  })
  @ValidateIf(o => o.linkedin !== '' && o.linkedin != null)
  @IsUrl()
  linkedin?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Display name for the user profile',
    example: 'John Doe',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'User bio or description',
    example: 'Full-stack developer passionate about creating amazing user experiences.',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL (managed by avatar upload endpoint)',
    example: '/uploads/avatars/user123/avatar-1234567890-display.webp',
    readOnly: true,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Personal or professional website URL',
    example: 'https://johndoe.dev',
    format: 'url',
  })
  @ValidateIf(o => o.website !== '' && o.website != null)
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    description: 'User location (city, country)',
    example: 'San Francisco, CA',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({
    description: 'Social media profile links',
    type: SocialLinksDto,
    example: {
      twitter: 'https://twitter.com/johndoe',
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}