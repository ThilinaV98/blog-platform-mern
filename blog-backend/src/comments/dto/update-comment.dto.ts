import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters' })
  @Transform(({ value }) => value?.trim())
  content: string;
}