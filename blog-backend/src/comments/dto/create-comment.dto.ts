import { IsString, IsNotEmpty, MaxLength, IsOptional, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid parent comment ID' })
  parentId?: string;
}