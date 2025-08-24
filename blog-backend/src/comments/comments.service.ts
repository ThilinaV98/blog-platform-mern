import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Like, LikeDocument, LikeTargetType } from '../likes/schemas/like.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { PostsService } from '../posts/posts.service';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class CommentsService {
  private readonly MAX_DEPTH = 3; // Maximum nesting level
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(forwardRef(() => PostsService))
    private postsService: PostsService,
  ) {}

  /**
   * Create a new comment or reply
   */
  async create(
    postId: string, 
    userId: string, 
    createCommentDto: CreateCommentDto
  ): Promise<Comment> {
    // Verify post exists
    const post = await this.postsService.findOne(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = DOMPurify.sanitize(createCommentDto.content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });

    let depth = 0;
    
    // Generate the comment ID first
    const commentId = new Types.ObjectId();
    let path = commentId.toString();
    
    // Handle reply to existing comment
    if (createCommentDto.parentId) {
      const parentComment = await this.commentModel.findById(createCommentDto.parentId);
      
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      if (parentComment.postId.toString() !== postId) {
        throw new BadRequestException('Parent comment belongs to different post');
      }

      // Check max depth
      if (parentComment.depth >= this.MAX_DEPTH - 1) {
        throw new BadRequestException(`Maximum nesting level (${this.MAX_DEPTH}) reached`);
      }

      depth = parentComment.depth + 1;
      // Build the path from parent
      path = `${parentComment.path}/${commentId.toString()}`;
    }

    const comment = new this.commentModel({
      _id: commentId,
      postId: new Types.ObjectId(postId),
      userId: new Types.ObjectId(userId),
      content: sanitizedContent,
      parentId: createCommentDto.parentId ? new Types.ObjectId(createCommentDto.parentId) : undefined,
      depth,
      path, // Set the path explicitly
      likes: 0,
      reports: 0,
      isEdited: false,
      isDeleted: false,
      isVisible: true,
    });

    const savedComment = await comment.save();
    
    // Update post comment count
    await this.postsService.incrementCommentCount(postId);

    // Populate user info before returning
    await savedComment.populate('userId', 'username profile.displayName profile.avatar');
    
    return savedComment;
  }

  /**
   * Get all comments for a post with hierarchical structure
   */
  async findByPost(postId: string, query: QueryCommentDto): Promise<{
    comments: Comment[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 20, sort = 'newest', includeDeleted = false } = query;
    
    // Build filter
    const filter: any = { 
      postId: new Types.ObjectId(postId),
      depth: 0, // Only get root comments, replies will be fetched separately
    };
    
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    // Build sort options
    let sortOptions: any = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        sortOptions = { likes: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Get total count for pagination
    const total = await this.commentModel.countDocuments(filter);
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);
    
    // Fetch root comments
    const rootComments = await this.commentModel
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profile.displayName profile.avatar')
      .lean();

    // Fetch all replies for these root comments
    const commentsWithReplies = await this.populateReplies(rootComments, includeDeleted);

    return {
      comments: commentsWithReplies,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Populate replies for comments recursively
   */
  private async populateReplies(
    comments: any[], 
    includeDeleted: boolean = false
  ): Promise<any[]> {
    if (!comments || comments.length === 0) {
      return [];
    }

    const commentsWithReplies: any[] = [];
    
    for (const comment of comments) {
      // Find direct replies
      const filter: any = { 
        parentId: comment._id,
      };
      
      if (!includeDeleted) {
        filter.isDeleted = false;
      }

      const replies = await this.commentModel
        .find(filter)
        .sort({ createdAt: 1 }) // Replies in chronological order
        .populate('userId', 'username profile.displayName profile.avatar')
        .lean();

      // Recursively populate replies for each reply
      const repliesWithNested = await this.populateReplies(replies, includeDeleted);
      
      commentsWithReplies.push({
        ...comment,
        replies: repliesWithNested,
        repliesCount: repliesWithNested.length,
      });
    }

    return commentsWithReplies;
  }

  /**
   * Get a single comment with its replies
   */
  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentModel
      .findById(id)
      .populate('userId', 'username profile.displayName profile.avatar')
      .populate('postId', 'title slug');

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Get replies
    const replies = await this.commentModel
      .find({ parentId: comment._id, isDeleted: false })
      .sort({ createdAt: 1 })
      .populate('userId', 'username profile.displayName profile.avatar')
      .lean();

    const repliesWithNested = await this.populateReplies(replies);

    return {
      ...comment.toObject(),
      replies: repliesWithNested,
      repliesCount: repliesWithNested.length,
    } as any;
  }

  /**
   * Update a comment
   */
  async update(
    id: string, 
    userId: string, 
    updateCommentDto: UpdateCommentDto
  ): Promise<Comment> {
    const comment = await this.commentModel.findById(id);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot edit deleted comment');
    }

    // Check ownership
    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Sanitize new content
    const sanitizedContent = DOMPurify.sanitize(updateCommentDto.content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });

    comment.content = sanitizedContent;
    comment.isEdited = true;
    comment.editedAt = new Date();

    const updatedComment = await comment.save();
    await updatedComment.populate('userId', 'username profile.displayName profile.avatar');
    
    return updatedComment;
  }

  /**
   * Soft delete a comment with cascade delete for likes
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const comment = await this.commentModel.findById(id);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Comment already deleted');
    }

    // Check ownership
    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Use a transaction for cascade delete
    const session = await this.connection.startSession();
    
    try {
      await session.withTransaction(async () => {
        const commentObjectId = new Types.ObjectId(id);
        
        // Log the cascade delete operation
        this.logger.log(`Starting cascade delete for comment ${id}`);
        
        // 1. Delete all likes for this comment
        const likesDeleted = await this.likeModel.deleteMany(
          { 
            targetId: commentObjectId,
            targetType: LikeTargetType.COMMENT 
          },
          { session }
        );
        this.logger.log(`Deleted ${likesDeleted.deletedCount} likes for comment ${id}`);
        
        // 2. Get all child comments (replies) if any
        const childComments = await this.commentModel.find(
          { parentId: commentObjectId },
          { _id: 1 },
          { session }
        ).lean();
        
        if (childComments.length > 0) {
          const childCommentIds = childComments.map(c => c._id);
          
          // 3. Delete all likes for child comments
          const childLikesDeleted = await this.likeModel.deleteMany(
            {
              targetId: { $in: childCommentIds },
              targetType: LikeTargetType.COMMENT
            },
            { session }
          );
          this.logger.log(`Deleted ${childLikesDeleted.deletedCount} likes for child comments of comment ${id}`);
        }
        
        // 4. Soft delete to preserve thread structure
        comment.isDeleted = true;
        comment.deletedAt = new Date();
        comment.content = '[This comment has been deleted]';
        
        await comment.save({ session });
        
        // 5. Update post comment count
        await this.postsService.decrementCommentCount(comment.postId.toString());
        
        this.logger.log(`Successfully soft-deleted comment ${id} and removed all related likes`);
      });
      
      return { message: 'Comment deleted successfully' };
    } catch (error) {
      this.logger.error(`Failed to delete comment ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to delete comment: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Admin delete a comment (no ownership check)
   */
  async removeAsAdmin(id: string): Promise<{ message: string }> {
    const comment = await this.commentModel.findById(id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.isDeleted) {
      throw new BadRequestException('Comment already deleted');
    }
    
    // Admin can delete any comment - no ownership check
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content = '[This comment has been deleted by admin]';
    
    await comment.save();
    // Update post comment count
    await this.postsService.decrementCommentCount(comment.postId.toString());
    return { message: 'Comment deleted by admin successfully' };
  }

  /**
   * Check if comments are liked by a user and enrich them with isLiked property
   */
  async enrichCommentsWithLikeStatus(comments: Comment[], userId?: string): Promise<any[]> {
    if (!userId) {
      return comments.map(comment => ({ ...comment, isLiked: false }));
    }

    // Get all comment IDs that the user has liked
    const likedCommentIds = await this.likeModel.find({
      userId: new Types.ObjectId(userId),
      targetType: LikeTargetType.COMMENT,
      targetId: { $in: comments.map(comment => new Types.ObjectId(comment._id.toString())) }
    }).distinct('targetId');

    const likedCommentIdStrings = likedCommentIds.map(id => id.toString());

    return comments.map(comment => ({
      ...comment,
      isLiked: likedCommentIdStrings.includes(comment._id.toString())
    }));
  }

  /**
   * Check if a single comment is liked by a user
   */
  async enrichCommentWithLikeStatus(comment: Comment, userId?: string): Promise<any> {
    if (!userId) {
      return { ...comment, isLiked: false };
    }

    const isLiked = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(comment._id.toString()),
      targetType: LikeTargetType.COMMENT
    });

    return { ...comment, isLiked: !!isLiked };
  }

  /**
   * Report a comment
   */
  async report(commentId: string, userId: string, reason: string): Promise<{
    message: string;
  }> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Increment report count
    comment.reports = comment.reports + 1;

    // Auto-hide if too many reports
    if (comment.reports >= 5) {
      comment.isVisible = false;
    }

    await comment.save();

    // In production, you'd also want to:
    // 1. Store the report details (user, reason, timestamp)
    // 2. Notify moderators
    // 3. Prevent duplicate reports from same user

    return { message: 'Comment reported successfully' };
  }

  /**
   * Get user's comments
   */
  async findByUser(userId: string, page: number = 1, limit: number = 20): Promise<{
    comments: Comment[];
    meta: any;
  }> {
    const filter = { 
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    const total = await this.commentModel.countDocuments(filter);
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const comments = await this.commentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('postId', 'title slug')
      .populate('userId', 'username profile.displayName profile.avatar');

    return {
      comments,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get reported comments for admin
   */
  async getReportedComments(page: number = 1, limit: number = 20): Promise<{
    comments: any[];
    meta: any;
  }> {
    // Find comments with reports > 0
    const filter = { 
      reports: { $gt: 0 },
      isDeleted: false,
    };

    const total = await this.commentModel.countDocuments(filter);
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const reportedComments = await this.commentModel
      .find(filter)
      .sort({ reports: -1, updatedAt: -1 }) // Most reported first
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username profile.displayName profile.avatar')
      .populate('postId', 'title slug')
      .lean();

    // Transform to match the expected format
    const transformedComments = reportedComments.map(comment => ({
      _id: comment._id.toString(),
      commentId: {
        _id: comment._id.toString(),
        content: comment.content,
        userId: comment.userId,
        postId: comment.postId,
      },
      // For now, we'll use simplified report info
      // In a real system, you'd have a separate reports collection
      reporterId: { _id: 'system', username: 'system' },
      reason: `Multiple reports (${comment.reports} total)`,
      status: 'pending',
      createdAt: comment.updatedAt || comment.createdAt,
    }));

    return {
      comments: transformedComments,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Dismiss a report (reset report count for now)
   */
  async dismissReport(commentId: string): Promise<void> {
    const comment = await this.commentModel.findById(commentId);
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Reset report count
    comment.reports = 0;
    comment.isVisible = true; // Make sure it's visible again
    await comment.save();
  }
}