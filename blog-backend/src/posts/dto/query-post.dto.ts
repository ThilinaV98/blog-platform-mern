import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '../schemas/post.schema';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum PostSortBy {
  CREATED_AT = 'createdAt',
  PUBLISHED_AT = 'publishedAt',
  TITLE = 'title',
  VIEWS = 'metadata.views',
  LIKES = 'metadata.likes',
}

export class QueryPostDto {
  @ApiPropertyOptional({
    description: 'Page number',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search query for title and content',
    example: 'typescript',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by post status',
    enum: PostStatus,
    example: PostStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    type: [String],
    example: ['nestjs', 'mongodb'],
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(tag => tag.trim());
    }
    return value;
  })
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by author ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: PostSortBy,
    default: PostSortBy.PUBLISHED_AT,
    example: PostSortBy.PUBLISHED_AT,
  })
  @IsOptional()
  @IsEnum(PostSortBy)
  sortBy?: PostSortBy = PostSortBy.PUBLISHED_AT;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: 'Filter featured posts only',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  featured?: boolean;
}