import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Create a new category
   */
  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, slug, ...rest } = createCategoryDto;

    // Generate slug if not provided
    const categorySlug = slug || this.generateSlug(name);

    // Check if category with same name or slug exists
    const existing = await this.categoryModel.findOne({
      $or: [
        { name: name },
        { slug: categorySlug }
      ]
    });

    if (existing) {
      throw new ConflictException('Category with this name or slug already exists');
    }

    const category = new this.categoryModel({
      name,
      slug: categorySlug,
      ...rest
    });

    return category.save();
  }

  /**
   * Get all categories
   */
  async findAll(activeOnly = true): Promise<Category[]> {
    const filter = activeOnly ? { isActive: true } : {};
    
    return this.categoryModel
      .find(filter)
      .sort({ postCount: -1, name: 1 })
      .exec();
  }

  /**
   * Get a single category by ID
   */
  async findOne(id: string): Promise<Category> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel.findById(id);
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Get a category by slug
   */
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryModel.findOne({ slug });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Update a category
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid category ID');
    }

    const { name, slug } = updateCategoryDto;

    // If updating name or slug, check for duplicates
    if (name || slug) {
      const existing = await this.categoryModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(name ? [{ name }] : []),
          ...(slug ? [{ slug }] : [])
        ]
      });

      if (existing) {
        throw new ConflictException('Category with this name or slug already exists');
      }
    }

    // Generate new slug if name changed but slug not provided
    if (name && !slug) {
      updateCategoryDto.slug = this.generateSlug(name);
    }

    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true, runValidators: true }
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Delete a category
   */
  async remove(id: string): Promise<void> {
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid category ID');
    }

    const result = await this.categoryModel.deleteOne({ _id: id });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Category not found');
    }
  }

  /**
   * Update post count for a category
   */
  async updatePostCount(categoryName: string, delta: number): Promise<void> {
    await this.categoryModel.updateOne(
      { name: categoryName },
      { $inc: { postCount: delta } }
    );
  }

  /**
   * Get categories with post counts
   */
  async getCategoriesWithCounts(): Promise<{ category: Category; count: number }[]> {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ postCount: -1, name: 1 })
      .lean();

    return categories.map(cat => ({
      category: cat,
      count: cat.postCount
    }));
  }

  /**
   * Helper: Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}