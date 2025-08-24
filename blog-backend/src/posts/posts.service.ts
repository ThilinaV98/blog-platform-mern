import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
  Logger
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Post, PostDocument, PostStatus } from './schemas/post.schema';
import { Like, LikeDocument, LikeTargetType } from '../likes/schemas/like.schema';
import { Comment, CommentDocument } from '../comments/schemas/comment.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostDto } from './dto/query-post.dto';
import { LikesService } from '../likes/likes.service';
import { CommentsService } from '../comments/comments.service';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(forwardRef(() => LikesService))
    private likesService: LikesService,
    @Inject(forwardRef(() => CommentsService))
    private commentsService: CommentsService,
  ) {}

  /**
   * Create a new post
   */
  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    // Generate unique slug
    const slug = await this.generateUniqueSlug(createPostDto.title);
    
    // Calculate metadata
    const wordCount = this.countWords(createPostDto.content);
    const readTime = this.calculateReadTime(createPostDto.content);
    
    // Normalize category
    const normalizedCategory = this.normalizeCategory(createPostDto.category);
    
    const post = new this.postModel({
      ...createPostDto,
      category: normalizedCategory,
      slug,
      author: new Types.ObjectId(userId),
      metadata: {
        wordCount,
        readTime,
        views: 0,
        uniqueViews: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
    });
    
    const savedPost = await post.save();
    return savedPost.populate('author', 'username profile.displayName profile.avatar');
  }

  /**
   * Get all posts with pagination and filters
   */
  async findAll(query: QueryPostDto): Promise<{
    posts: Post[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status,
      category, 
      tags, 
      author,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      featured,
    } = query;

    // Build filter
    const filter: any = {};
    
    // Status filter - only apply if explicitly provided
    // For public access (no author), default to published
    // For user's own posts (with author), show all statuses unless specified
    if (status !== undefined && status !== null) {
      filter.status = status;
    } else if (!author) {
      // Default to published for public access when no author is specified
      filter.status = PostStatus.PUBLISHED;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    // Author filter
    if (author) {
      filter.author = new Types.ObjectId(author);
    }

    // Featured filter
    if (featured !== undefined) {
      filter.featured = featured;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [posts, total] = await Promise.all([
      this.postModel
        .find(filter)
        .populate('author', 'username profile.displayName profile.avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.postModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      posts,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get user's posts (including drafts)
   */
  async findUserPosts(userId: string, query: QueryPostDto): Promise<{
    posts: Post[];
    meta: any;
  }> {
    // Override author filter to ensure user's posts
    query.author = userId;
    // If no status is specified, show all statuses for the owner
    // But if a status is specified, respect it for filtering
    if (!query.status) {
      delete query.status; // This allows all statuses
    }
    
    return this.findAll(query);
  }

  /**
   * Get a single post by ID
   */
  async findById(id: string): Promise<Post> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postModel
      .findById(id)
      .populate('author', 'username profile.displayName profile.avatar');

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  /**
   * Get a single post by slug and increment view count
   */
  async findBySlug(slug: string, incrementView = true): Promise<Post> {
    const post = await this.postModel
      .findOne({ slug })
      .populate('author', 'username profile.displayName profile.avatar');

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Only increment views for published posts
    if (incrementView && post.status === PostStatus.PUBLISHED) {
      await this.postModel.findByIdAndUpdate(
        post._id,
        { $inc: { 'metadata.views': 1 } },
      );
      post.metadata.views += 1;
    }

    return post;
  }

  /**
   * Update a post
   */
  async update(
    id: string, 
    userId: string, 
    updatePostDto: UpdatePostDto
  ): Promise<Post> {
    const post = await this.findById(id);

    // Check ownership (handle both populated and non-populated author)
    let authorId: string;
    if (post.author instanceof Types.ObjectId) {
      authorId = post.author.toString();
    } else {
      // Author is populated, cast to any to access _id
      authorId = (post.author as any)._id.toString();
    }
    
    if (authorId !== userId) {
      throw new ForbiddenException('You can only edit your own posts');
    }

    // If title changed, generate new slug
    if (updatePostDto.title && updatePostDto.title !== post.title) {
      const slug = await this.generateUniqueSlug(updatePostDto.title);
      (updatePostDto as any).slug = slug;
    }

    // Normalize category if provided
    if (updatePostDto.category !== undefined) {
      updatePostDto.category = this.normalizeCategory(updatePostDto.category);
    }

    // Update metadata if content changed
    if (updatePostDto.content) {
      (updatePostDto as any).metadata = {
        ...post.metadata,
        wordCount: this.countWords(updatePostDto.content),
        readTime: this.calculateReadTime(updatePostDto.content),
      };
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        id,
        { $set: updatePostDto },
        { new: true, runValidators: true }
      )
      .populate('author', 'username profile.displayName profile.avatar');

    if (!updatedPost) {
      throw new NotFoundException('Post not found');
    }

    return updatedPost;
  }

  /**
   * Delete a post with cascade delete for comments and likes
   */
  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findById(id);

    // Check ownership (handle both populated and non-populated author)
    let authorId: string;
    if (post.author instanceof Types.ObjectId) {
      authorId = post.author.toString();
    } else {
      // Author is populated, cast to any to access _id
      authorId = (post.author as any)._id.toString();
    }
    
    if (authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Use a transaction for cascade delete to ensure data consistency
    const session = await this.connection.startSession();
    
    try {
      await session.withTransaction(async () => {
        const postObjectId = new Types.ObjectId(id);
        
        // Log the cascade delete operation
        this.logger.log(`Starting cascade delete for post ${id}`);
        
        // 1. Delete all likes for this post
        const likesDeleted = await this.likeModel.deleteMany(
          { 
            targetId: postObjectId,
            targetType: LikeTargetType.POST 
          },
          { session }
        );
        this.logger.log(`Deleted ${likesDeleted.deletedCount} likes for post ${id}`);
        
        // 2. Get all comments for this post to delete their likes too
        const comments = await this.commentModel.find(
          { postId: postObjectId },
          { _id: 1 },
          { session }
        ).lean();
        
        if (comments.length > 0) {
          const commentIds = comments.map(c => c._id);
          
          // 3. Delete all likes for comments of this post
          const commentLikesDeleted = await this.likeModel.deleteMany(
            {
              targetId: { $in: commentIds },
              targetType: LikeTargetType.COMMENT
            },
            { session }
          );
          this.logger.log(`Deleted ${commentLikesDeleted.deletedCount} likes for comments of post ${id}`);
          
          // 4. Delete all comments for this post
          const commentsDeleted = await this.commentModel.deleteMany(
            { postId: postObjectId },
            { session }
          );
          this.logger.log(`Deleted ${commentsDeleted.deletedCount} comments for post ${id}`);
        }
        
        // 5. Finally, delete the post itself
        await this.postModel.findByIdAndDelete(id, { session });
        this.logger.log(`Successfully deleted post ${id} and all related data`);
      });
    } catch (error) {
      this.logger.error(`Failed to delete post ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to delete post: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Publish a post
   */
  async publish(id: string, userId: string): Promise<Post> {
    const post = await this.findById(id);

    // Check ownership (handle both populated and non-populated author)
    let authorId: string;
    if (post.author instanceof Types.ObjectId) {
      authorId = post.author.toString();
    } else {
      // Author is populated, cast to any to access _id
      authorId = (post.author as any)._id.toString();
    }
    
    if (authorId !== userId) {
      throw new ForbiddenException('You can only publish your own posts');
    }

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Post is already published');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        id,
        { 
          $set: { 
            status: PostStatus.PUBLISHED,
            publishedAt: new Date(),
          }
        },
        { new: true }
      )
      .populate('author', 'username profile.displayName profile.avatar');

    if (!updatedPost) {
      throw new NotFoundException('Post not found');
    }

    return updatedPost;
  }

  /**
   * Archive a post
   */
  async archive(id: string, userId: string): Promise<Post> {
    const post = await this.findById(id);

    // Check ownership (handle both populated and non-populated author)
    let authorId: string;
    if (post.author instanceof Types.ObjectId) {
      authorId = post.author.toString();
    } else {
      // Author is populated, cast to any to access _id
      authorId = (post.author as any)._id.toString();
    }
    
    if (authorId !== userId) {
      throw new ForbiddenException('You can only archive your own posts');
    }

    if (post.status === PostStatus.ARCHIVED) {
      throw new BadRequestException('Post is already archived');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        id,
        { 
          $set: { 
            status: PostStatus.ARCHIVED,
          }
        },
        { new: true }
      )
      .populate('author', 'username profile.displayName profile.avatar');

    if (!updatedPost) {
      throw new NotFoundException('Post not found');
    }

    return updatedPost;
  }

  /**
   * Unarchive a post (back to draft)
   */
  async unarchive(id: string, userId: string): Promise<Post> {
    const post = await this.findById(id);

    // Check ownership (handle both populated and non-populated author)
    let authorId: string;
    if (post.author instanceof Types.ObjectId) {
      authorId = post.author.toString();
    } else {
      // Author is populated, cast to any to access _id
      authorId = (post.author as any)._id.toString();
    }
    
    if (authorId !== userId) {
      throw new ForbiddenException('You can only unarchive your own posts');
    }

    if (post.status !== PostStatus.ARCHIVED) {
      throw new BadRequestException('Post is not archived');
    }

    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        id,
        { 
          $set: { 
            status: PostStatus.DRAFT,
          }
        },
        { new: true }
      )
      .populate('author', 'username profile.displayName profile.avatar');

    if (!updatedPost) {
      throw new NotFoundException('Post not found');
    }

    return updatedPost;
  }

  /**
   * Get related posts
   */
  async getRelatedPosts(postId: string, limit = 4): Promise<Post[]> {
    const post = await this.findById(postId);
    
    // Find posts with similar tags or same category
    const relatedPosts = await this.postModel
      .find({
        _id: { $ne: postId },
        status: PostStatus.PUBLISHED,
        $or: [
          { tags: { $in: post.tags } },
          { category: post.category },
        ],
      })
      .populate('author', 'username profile.displayName profile.avatar')
      .sort('-publishedAt')
      .limit(limit)
      .lean();

    return relatedPosts;
  }

  /**
   * Get trending posts
   */
  async getTrendingPosts(limit = 5): Promise<Post[]> {
    const posts = await this.postModel
      .find({ status: PostStatus.PUBLISHED })
      .populate('author', 'username profile.displayName profile.avatar')
      .sort('-metadata.views -metadata.likes')
      .limit(limit)
      .lean();

    return posts;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<{ category: string; count: number }[]> {
    const categories = await this.postModel.aggregate([
      { $match: { status: PostStatus.PUBLISHED, category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);

    return categories;
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<{ tag: string; count: number }[]> {
    const tags = await this.postModel.aggregate([
      { $match: { status: PostStatus.PUBLISHED } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);

    return tags;
  }

  /**
   * Search posts with full-text search
   */
  async searchPosts(params: {
    query: string;
    page: number;
    limit: number;
    category?: string;
    tags?: string[];
    author?: string;
    sortBy: 'relevance' | 'date' | 'popularity';
  }): Promise<{
    posts: Post[];
    meta: any;
    searchMeta: any;
  }> {
    const { query, page, limit, category, tags, author, sortBy } = params;

    // Build search filter
    const filter: any = {
      status: PostStatus.PUBLISHED,
      $text: { $search: query }
    };

    // Add optional filters
    if (category) {
      filter.category = category;
    }

    if (tags && tags.length > 0) {
      filter.tags = { $in: tags };
    }

    if (author) {
      filter.author = new Types.ObjectId(author);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort options
    let sort: any = {};
    switch (sortBy) {
      case 'relevance':
        sort = { score: { $meta: 'textScore' } };
        break;
      case 'date':
        sort = { publishedAt: -1 };
        break;
      case 'popularity':
        sort = { 'metadata.views': -1, 'metadata.likes': -1 };
        break;
    }

    // Execute search query
    const searchQuery = this.postModel
      .find(filter, { score: { $meta: 'textScore' } })
      .populate('author', 'username profile.displayName profile.avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Count total results
    const countQuery = this.postModel.countDocuments(filter);

    const [posts, total] = await Promise.all([searchQuery, countQuery]);

    const totalPages = Math.ceil(total / limit);

    // Get search suggestions if no results
    let suggestions: any[] = [];
    if (posts.length === 0) {
      // Try to find posts with partial matches
      const partialFilter = {
        status: PostStatus.PUBLISHED,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      };

      suggestions = await this.postModel
        .find(partialFilter)
        .select('title slug')
        .limit(5)
        .lean();
    }

    return {
      posts,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      searchMeta: {
        query,
        resultsFound: total,
        suggestions
      }
    };
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    archivedPosts: number;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    recentPosts: Post[];
  }> {
    const userObjectId = new Types.ObjectId(userId);

    // Get post counts by status
    const [totalPosts, publishedPosts, draftPosts, archivedPosts] = await Promise.all([
      this.postModel.countDocuments({ author: userObjectId }),
      this.postModel.countDocuments({ author: userObjectId, status: PostStatus.PUBLISHED }),
      this.postModel.countDocuments({ author: userObjectId, status: PostStatus.DRAFT }),
      this.postModel.countDocuments({ author: userObjectId, status: PostStatus.ARCHIVED }),
    ]);

    // Get aggregated stats
    const stats = await this.postModel.aggregate([
      { $match: { author: userObjectId } },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$metadata.views' },
          totalLikes: { $sum: '$metadata.likes' },
          totalComments: { $sum: '$metadata.comments' },
        },
      },
    ]);

    // Get recent posts
    const recentPosts = await this.postModel
      .find({ author: userObjectId })
      .sort('-createdAt')
      .limit(5)
      .populate('author', 'username profile.displayName profile.avatar')
      .lean();

    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      archivedPosts,
      totalViews: stats[0]?.totalViews || 0,
      totalLikes: stats[0]?.totalLikes || 0,
      totalComments: stats[0]?.totalComments || 0,
      recentPosts,
    };
  }

  /**
   * Helper: Generate unique slug from title
   */
  private async generateUniqueSlug(title: string): Promise<string> {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    let existingPost = await this.postModel.findOne({ slug });
    let counter = 1;

    while (existingPost) {
      slug = `${slug}-${counter}`;
      existingPost = await this.postModel.findOne({ slug });
      counter++;
    }

    return slug;
  }

  /**
   * Helper: Count words in HTML content
   */
  private countWords(content: string): number {
    // Strip HTML tags
    const text = content.replace(/<[^>]*>/g, '');
    // Count words
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Helper: Calculate read time (200 words per minute)
   */
  private calculateReadTime(content: string): number {
    const words = this.countWords(content);
    return Math.ceil(words / 200);
  }

  /**
   * Helper: Normalize category name for consistency
   */
  private normalizeCategory(category?: string): string | undefined {
    if (!category) {
      return undefined;
    }
    
    // Trim whitespace, replace multiple spaces with single space
    const normalized = category.trim().replace(/\s+/g, ' ');
    
    // Convert to Title Case (capitalize first letter of each word)
    return normalized
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Increment comment count for a post
   */
  async incrementCommentCount(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { 'metadata.comments': 1 } }
    );
  }

  /**
   * Decrement comment count for a post
   */
  async decrementCommentCount(postId: string): Promise<void> {
    await this.postModel.findByIdAndUpdate(
      postId,
      { $inc: { 'metadata.comments': -1 } }
    );
  }

  /**
   * Get a single post by ID (public method for other services)
   */
  async findOne(id: string): Promise<Post> {
    return this.findById(id);
  }

  /**
   * Check if posts are liked by a user and enrich them with isLiked property
   */
  async enrichPostsWithLikeStatus(posts: Post[], userId?: string): Promise<any[]> {
    if (!userId) {
      return posts.map(post => ({ ...post, isLiked: false }));
    }

    // Get all post IDs that the user has liked
    const likedPostIds = await this.likeModel.find({
      userId: new Types.ObjectId(userId),
      targetType: LikeTargetType.POST,
      targetId: { $in: posts.map(post => new Types.ObjectId(post._id.toString())) }
    }).distinct('targetId');

    const likedPostIdStrings = likedPostIds.map(id => id.toString());

    return posts.map(post => ({
      ...post,
      isLiked: likedPostIdStrings.includes(post._id.toString())
    }));
  }

  /**
   * Check if a single post is liked by a user
   */
  async enrichPostWithLikeStatus(post: Post, userId?: string): Promise<any> {
    if (!userId) {
      return { ...post, isLiked: false };
    }

    const isLiked = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(post._id.toString()),
      targetType: LikeTargetType.POST
    });

    return { ...post, isLiked: !!isLiked };
  }
}