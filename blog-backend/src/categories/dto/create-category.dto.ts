import { IsString, IsOptional, MaxLength, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ 
    description: 'Category name',
    example: 'Technology',
    maxLength: 50
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ 
    description: 'Category description',
    example: 'Articles about technology and programming',
    maxLength: 200
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Category slug (auto-generated if not provided)',
    example: 'technology'
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ 
    description: 'Icon class or URL',
    example: 'fas fa-code'
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ 
    description: 'Category color for UI',
    example: '#3B82F6'
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ 
    description: 'Whether the category is active',
    default: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}