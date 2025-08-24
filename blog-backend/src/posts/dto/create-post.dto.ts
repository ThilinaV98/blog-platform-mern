import { 
  IsString, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  MaxLength, 
  MinLength,
  IsUrl,
  IsObject,
  ValidateNested,
  IsBoolean,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '../schemas/post.schema';

class SeoDto {
  @ApiPropertyOptional({
    description: 'SEO meta title',
    example: 'My Amazing Blog Post | Blog Platform',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO meta description',
    example: 'Discover insights about web development, best practices, and modern technologies in this comprehensive guide.',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'Canonical URL for the post',
    example: 'https://example.com/blog/my-post',
  })
  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @ApiPropertyOptional({
    description: 'Open Graph image URL',
    example: 'https://example.com/images/og-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  ogImage?: string;
}

export class CreatePostDto {
  @ApiProperty({
    description: 'Post title',
    example: 'Getting Started with NestJS and MongoDB',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Post content in HTML format',
    example: '<p>This is the post content with <strong>rich text</strong> formatting.</p>',
  })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiPropertyOptional({
    description: 'Post excerpt or summary',
    example: 'Learn how to build scalable applications with NestJS and MongoDB...',
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://example.com/images/cover.jpg',
  })
  @IsOptional()
  @IsUrl()
  coverImage?: string;

  @ApiPropertyOptional({
    description: 'Post tags',
    example: ['nestjs', 'mongodb', 'typescript', 'backend'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Post category',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Post status',
    enum: PostStatus,
    default: PostStatus.DRAFT,
    example: PostStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Schedule post for future publication',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Mark post as featured',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    description: 'SEO metadata',
    type: SeoDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;
}