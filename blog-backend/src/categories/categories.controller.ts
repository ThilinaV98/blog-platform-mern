import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete,
  UseGuards,
  Query
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Categories')
@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Category created successfully'
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Category already exists'
  })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiQuery({ 
    name: 'activeOnly', 
    required: false, 
    type: Boolean,
    description: 'Filter only active categories'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories retrieved successfully'
  })
  findAll(@Query('activeOnly') activeOnly: string) {
    const active = activeOnly !== 'false';
    return this.categoriesService.findAll(active);
  }

  @Get('with-counts')
  @ApiOperation({ summary: 'Get categories with post counts' })
  @ApiResponse({ 
    status: 200, 
    description: 'Categories with counts retrieved successfully'
  })
  getCategoriesWithCounts() {
    return this.categoriesService.getCategoriesWithCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ 
    name: 'id', 
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category retrieved successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Category not found'
  })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a category by slug' })
  @ApiParam({ 
    name: 'slug', 
    description: 'Category slug',
    example: 'technology'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category retrieved successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Category not found'
  })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  @ApiParam({ 
    name: 'id', 
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Category updated successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Category not found'
  })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiParam({ 
    name: 'id', 
    description: 'Category ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({ 
    status: 204, 
    description: 'Category deleted successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Category not found'
  })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}