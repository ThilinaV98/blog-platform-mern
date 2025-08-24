import { IsOptional, IsIn, IsNumberString, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryCommentDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'popular'], { 
    message: 'Sort must be one of: newest, oldest, popular' 
  })
  sort?: 'newest' | 'oldest' | 'popular' = 'newest';

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  includeDeleted?: boolean = false;
}