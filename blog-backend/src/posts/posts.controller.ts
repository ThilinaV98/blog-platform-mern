import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Session,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiBearerAuth, 
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PostStatus } from './schemas/post.schema';

@ApiTags('Posts')
@Controller('api/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create a new post',
    description: 'Create a new blog post. Requires authentication.'
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        title: { type: 'string', example: 'Getting Started with NestJS' },
        slug: { type: 'string', example: 'getting-started-with-nestjs' },
        content: { type: 'string', example: '<p>Post content...</p>' },
        author: { 
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            profile: {
              type: 'object',
              properties: {
                displayName: { type: 'string' },
                avatar: { type: 'string' },
              }
            }
          }
        },
        status: { type: 'string', example: 'draft' },
        metadata: {
          type: 'object',
          properties: {
            readTime: { type: 'number', example: 5 },
            wordCount: { type: 'number', example: 1000 },
            views: { type: 'number', example: 0 },
            likes: { type: 'number', example: 0 },
            comments: { type: 'number', example: 0 },
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing access token',
  })
  async create(
    @CurrentUser() user: any,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(user.userId, createPostDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all published posts',
    description: 'Retrieve a paginated list of published blog posts with optional filters'
  })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: { type: 'object' }
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          }
        }
      }
    }
  })
  async findAll(@Query() query: QueryPostDto, @Req() req: any) {
    // Force published status for public access
    query.status = PostStatus.PUBLISHED;
    const result = await this.postsService.findAll(query);
    
    // Check if user is authenticated and enrich posts with like status
    const userId = req.user?.userId || req.user?.sub;
    if (userId) {
      const enrichedPosts = await this.postsService.enrichPostsWithLikeStatus(result.posts, userId);
      return { ...result, posts: enrichedPosts };
    }
    
    // Add isLiked: false for non-authenticated users
    const postsWithLikeStatus = result.posts.map(post => ({ ...post, isLiked: false }));
    return { ...result, posts: postsWithLikeStatus };
  }

  @Get('my-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user posts',
    description: 'Retrieve all posts created by the authenticated user (including drafts)'
  })
  async getMyPosts(
    @CurrentUser() user: any,
    @Query() query: QueryPostDto,
  ) {
    return this.postsService.findUserPosts(user.userId, query);
  }

  @Get('my-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user statistics',
    description: 'Retrieve statistics for the authenticated user including post counts, views, likes, etc.'
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalPosts: { type: 'number', example: 10 },
        publishedPosts: { type: 'number', example: 5 },
        draftPosts: { type: 'number', example: 3 },
        archivedPosts: { type: 'number', example: 2 },
        totalViews: { type: 'number', example: 1500 },
        totalLikes: { type: 'number', example: 50 },
        totalComments: { type: 'number', example: 25 },
        recentPosts: { type: 'array', items: { type: 'object' } },
      }
    }
  })
  async getMyStats(
    @CurrentUser() user: any,
  ) {
    return this.postsService.getUserStats(user.userId);
  }

  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get user draft posts',
    description: 'Retrieve all draft posts created by the authenticated user'
  })
  async getDrafts(
    @CurrentUser() user: any,
    @Query() query: QueryPostDto,
  ) {
    query.status = PostStatus.DRAFT;
    return this.postsService.findUserPosts(user.userId, query);
  }

  @Get('trending')
  @ApiOperation({ 
    summary: 'Get trending posts',
    description: 'Retrieve the most viewed and liked posts'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Number of posts to return',
    example: 5 
  })
  async getTrending(@Query('limit') limit?: number) {
    return this.postsService.getTrendingPosts(limit);
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search posts',
    description: 'Full-text search across posts with filters and pagination'
  })
  @ApiQuery({ 
    name: 'q', 
    required: true, 
    type: String,
    description: 'Search query',
    example: 'typescript tutorial'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number,
    description: 'Page number',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number,
    description: 'Results per page',
    example: 10
  })
  @ApiQuery({ 
    name: 'category', 
    required: false, 
    type: String,
    description: 'Filter by category'
  })
  @ApiQuery({ 
    name: 'tags', 
    required: false, 
    type: [String],
    description: 'Filter by tags'
  })
  @ApiQuery({ 
    name: 'author', 
    required: false, 
    type: String,
    description: 'Filter by author ID'
  })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    enum: ['relevance', 'date', 'popularity'],
    description: 'Sort order',
    example: 'relevance'
  })
  async search(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('tags') tags?: string[],
    @Query('author') author?: string,
    @Query('sortBy') sortBy?: 'relevance' | 'date' | 'popularity',
  ) {
    return this.postsService.searchPosts({
      query,
      page: page || 1,
      limit: limit || 10,
      category,
      tags,
      author,
      sortBy: sortBy || 'relevance'
    });
  }

  @Get('categories')
  @ApiOperation({ 
    summary: 'Get all categories',
    description: 'Retrieve a list of all post categories with post counts'
  })
  async getCategories() {
    return this.postsService.getCategories();
  }

  @Get('tags')
  @ApiOperation({ 
    summary: 'Get all tags',
    description: 'Retrieve a list of all post tags with usage counts'
  })
  async getTags() {
    return this.postsService.getTags();
  }

  @Get('by-id/:id')
  @ApiOperation({ 
    summary: 'Get post by ID',
    description: 'Retrieve a single post by its database ID'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async findById(@Param('id') id: string) {
    return this.postsService.findById(id);
  }

  @Get(':slug')
  @ApiOperation({ 
    summary: 'Get post by slug',
    description: 'Retrieve a single post by its URL slug. Increments view count only once per session.'
  })
  @ApiParam({ 
    name: 'slug', 
    description: 'Post URL slug',
    example: 'getting-started-with-nestjs'
  })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async findBySlug(
    @Param('slug') slug: string,
    @Session() session: Record<string, any>,
    @Req() req: any,
  ) {
    // Check if session exists (it might not be available in all environments)
    let hasViewed = false;
    
    if (session) {
      // Initialize viewed posts in session if not exists
      if (!session.viewedPosts) {
        session.viewedPosts = [];
      }
      
      // Check if this post has been viewed in this session
      hasViewed = session.viewedPosts.includes(slug);
      
      // Mark post as viewed in this session
      if (!hasViewed) {
        session.viewedPosts.push(slug);
      }
    }
    
    // Get the post and increment view only if not viewed before
    const post = await this.postsService.findBySlug(slug, !hasViewed);
    
    // Check if user is authenticated and enrich with like status
    const userId = req.user?.userId || req.user?.sub;
    if (userId && post) {
      // Convert Mongoose document to plain object
      const postObject = (post as any).toObject ? (post as any).toObject() : post;
      const enrichedPost = await this.postsService.enrichPostWithLikeStatus(postObject, userId);
      return enrichedPost;
    }
    
    // Return post with isLiked: false for non-authenticated users
    const postObject = (post as any).toObject ? (post as any).toObject() : post;
    return { ...postObject, isLiked: false };
  }

  @Get(':id/related')
  @ApiOperation({ 
    summary: 'Get related posts',
    description: 'Retrieve posts related to the specified post based on tags and category'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Number of related posts to return',
    example: 4 
  })
  async getRelatedPosts(
    @Param('id') id: string,
    @Req() req: any,
    @Query('limit') limit?: number,
  ) {
    const posts = await this.postsService.getRelatedPosts(id, limit);
    
    // Check if user is authenticated and enrich posts with like status
    const userId = req.user?.userId || req.user?.sub;
    if (userId) {
      return this.postsService.enrichPostsWithLikeStatus(posts, userId);
    }
    
    // Add isLiked: false for non-authenticated users
    return posts.map(post => ({ ...post, isLiked: false }));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update a post',
    description: 'Update an existing post. Only the post author can update their post.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only edit your own posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, user.userId, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete a post',
    description: 'Delete a post. Only the post author can delete their post.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 204,
    description: 'Post deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only delete your own posts',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    await this.postsService.remove(id, user.userId);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Publish a draft post',
    description: 'Change post status from draft to published'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Post published successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Post is already published',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only publish your own posts',
  })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.publish(id, user.userId);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Archive a post',
    description: 'Change post status to archived'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Post archived successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Post is already archived',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only archive your own posts',
  })
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.archive(id, user.userId);
  }

  @Post(':id/unarchive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Unarchive a post',
    description: 'Change post status from archived to draft'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: 200,
    description: 'Post unarchived successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Post is not archived',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - You can only unarchive your own posts',
  })
  async unarchive(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.postsService.unarchive(id, user.userId);
  }
}