import { IsEnum, IsOptional, IsNumber, Min, Max, IsString, IsBoolean, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { LikeTargetType } from '../schemas/like.schema';

export enum LikeSortBy {
  CREATED_AT = 'createdAt',
  USERNAME = 'username',
  USER_ACTIVITY = 'userActivity',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class CreateLikeDto {
  targetId: string; // Will be provided in route params
  targetType: LikeTargetType; // Will be determined by endpoint
}

export class QueryLikesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(LikeSortBy)
  sortBy?: LikeSortBy = LikeSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  searchUsername?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  verifiedOnly?: boolean;
}

export class LikeResponseDto {
  _id: string;
  userId: {
    _id: string;
    username: string;
    profile?: {
      displayName?: string;
      avatar?: string;
    };
  };
  targetId: string;
  targetType: LikeTargetType;
  createdAt: Date;
}

export class LikeStatusDto {
  liked: boolean;
  likesCount: number;
}

export class LikesListDto {
  likes: LikeResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}