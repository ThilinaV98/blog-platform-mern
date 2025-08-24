import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Like, LikeDocument, LikeTargetType } from './schemas/like.schema';
import { Post, PostDocument } from '../posts/schemas/post.schema';
import { Comment, CommentDocument } from '../comments/schemas/comment.schema';
import { QueryLikesDto, LikeStatusDto, LikesListDto, LikeResponseDto } from './dto/like.dto';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  async likePost(postId: string, userId: string): Promise<LikeStatusDto> {
    // Validate post exists
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if already liked
    const existingLike = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(postId),
      targetType: LikeTargetType.POST,
    });

    if (existingLike) {
      throw new BadRequestException('Post already liked');
    }

    try {
      // Create the like
      const like = new this.likeModel({
        userId: new Types.ObjectId(userId),
        targetId: new Types.ObjectId(postId),
        targetType: LikeTargetType.POST,
      });

      await like.save();

      // Increment post like count atomically
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        { $inc: { 'metadata.likes': 1 } },
        { new: true }
      );

      // Return current like status
      return {
        liked: true,
        likesCount: updatedPost?.metadata.likes || 1,
      };

    } catch (error) {
      // If duplicate key error (user already liked), handle gracefully
      if (error.code === 11000) {
        throw new BadRequestException('Post already liked');
      }
      throw error;
    }
  }

  async unlikePost(postId: string, userId: string): Promise<LikeStatusDto> {
    // Validate post exists
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if like exists
    const existingLike = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(postId),
      targetType: LikeTargetType.POST,
    });

    if (!existingLike) {
      throw new BadRequestException('Post not liked');
    }

    try {
      // Remove the like
      await this.likeModel.deleteOne({ _id: existingLike._id });

      // Decrement post like count atomically and ensure it doesn't go below 0
      const updatedPost = await this.postModel.findByIdAndUpdate(
        postId,
        [
          {
            $set: {
              'metadata.likes': {
                $max: [0, { $subtract: ['$metadata.likes', 1] }]
              }
            }
          }
        ],
        { new: true }
      );

      // Return current like status
      return {
        liked: false,
        likesCount: Math.max(updatedPost?.metadata.likes || 0, 0),
      };

    } catch (error) {
      throw error;
    }
  }

  async likeComment(commentId: string, userId: string): Promise<LikeStatusDto> {
    // Validate comment exists
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if already liked
    const existingLike = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(commentId),
      targetType: LikeTargetType.COMMENT,
    });

    if (existingLike) {
      throw new BadRequestException('Comment already liked');
    }

    try {
      // Create the like
      const like = new this.likeModel({
        userId: new Types.ObjectId(userId),
        targetId: new Types.ObjectId(commentId),
        targetType: LikeTargetType.COMMENT,
      });

      await like.save();

      // Increment comment like count atomically
      const updatedComment = await this.commentModel.findByIdAndUpdate(
        commentId,
        { $inc: { likes: 1 } },
        { new: true }
      );

      // Return current like status
      return {
        liked: true,
        likesCount: updatedComment?.likes || 1,
      };

    } catch (error) {
      // If duplicate key error (user already liked), handle gracefully
      if (error.code === 11000) {
        throw new BadRequestException('Comment already liked');
      }
      throw error;
    }
  }

  async unlikeComment(commentId: string, userId: string): Promise<LikeStatusDto> {
    // Validate comment exists
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if like exists
    const existingLike = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(commentId),
      targetType: LikeTargetType.COMMENT,
    });

    if (!existingLike) {
      throw new BadRequestException('Comment not liked');
    }

    try {
      // Remove the like
      await this.likeModel.deleteOne({ _id: existingLike._id });

      // Decrement comment like count atomically and ensure it doesn't go below 0
      const updatedComment = await this.commentModel.findByIdAndUpdate(
        commentId,
        [
          {
            $set: {
              likes: {
                $max: [0, { $subtract: ['$likes', 1] }]
              }
            }
          }
        ],
        { new: true }
      );

      // Return current like status
      return {
        liked: false,
        likesCount: Math.max(updatedComment?.likes || 0, 0),
      };

    } catch (error) {
      throw error;
    }
  }

  async getPostLikes(postId: string, query: QueryLikesDto): Promise<LikesListDto> {
    const { 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      searchUsername,
      verifiedOnly
    } = query;
    const skip = (page - 1) * limit;

    // Validate post exists
    const post = await this.postModel.findById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Build filter
    const filter: any = {
      targetId: new Types.ObjectId(postId),
      targetType: LikeTargetType.POST,
    };

    // Add date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Build sort options
    let sortOptions: any = {};
    if (sortBy === 'username') {
      sortOptions = { 'userId.username': sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'userActivity') {
      // Sort by user activity (would need additional aggregation in real scenario)
      sortOptions = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    } else {
      sortOptions = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    }

    // Build the query
    let likesQuery = this.likeModel
      .find(filter)
      .populate({
        path: 'userId',
        select: 'username profile.displayName profile.avatar role emailVerified',
        match: verifiedOnly ? { emailVerified: true } : {}
      });

    // Apply username search if provided
    if (searchUsername) {
      likesQuery = likesQuery.populate({
        path: 'userId',
        select: 'username profile.displayName profile.avatar role emailVerified',
        match: {
          ...(verifiedOnly ? { emailVerified: true } : {}),
          username: { $regex: searchUsername, $options: 'i' }
        }
      });
    }

    // Get likes with filters and sorting
    const likes = await likesQuery
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out null users (from population match)
    const filteredLikes = likes.filter((like: any) => like.userId !== null);

    // Get total count with filters (adjust for filtered users)
    const total = filteredLikes.length;

    const formattedLikes: LikeResponseDto[] = filteredLikes.map((like: any) => ({
      _id: like._id.toString(),
      userId: {
        _id: like.userId._id.toString(),
        username: like.userId.username,
        profile: like.userId.profile,
      },
      targetId: like.targetId.toString(),
      targetType: like.targetType,
      createdAt: like.createdAt,
    }));

    return {
      likes: formattedLikes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async getCommentLikes(commentId: string, query: QueryLikesDto): Promise<LikesListDto> {
    const { 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      searchUsername,
      verifiedOnly
    } = query;
    const skip = (page - 1) * limit;

    // Validate comment exists
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Build filter
    const filter: any = {
      targetId: new Types.ObjectId(commentId),
      targetType: LikeTargetType.COMMENT,
    };

    // Add date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Build sort options
    let sortOptions: any = {};
    if (sortBy === 'username') {
      sortOptions = { 'userId.username': sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'userActivity') {
      // Sort by user activity (would need additional aggregation in real scenario)
      sortOptions = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    } else {
      sortOptions = { createdAt: sortOrder === 'asc' ? 1 : -1 };
    }

    // Build the query
    let likesQuery = this.likeModel
      .find(filter)
      .populate({
        path: 'userId',
        select: 'username profile.displayName profile.avatar role emailVerified',
        match: verifiedOnly ? { emailVerified: true } : {}
      });

    // Apply username search if provided
    if (searchUsername) {
      likesQuery = likesQuery.populate({
        path: 'userId',
        select: 'username profile.displayName profile.avatar role emailVerified',
        match: {
          ...(verifiedOnly ? { emailVerified: true } : {}),
          username: { $regex: searchUsername, $options: 'i' }
        }
      });
    }

    // Get likes with filters and sorting
    const likes = await likesQuery
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Filter out null users (from population match)
    const filteredLikes = likes.filter((like: any) => like.userId !== null);

    // Get total count with filters (adjust for filtered users)
    const total = filteredLikes.length;

    const formattedLikes: LikeResponseDto[] = filteredLikes.map((like: any) => ({
      _id: like._id.toString(),
      userId: {
        _id: like.userId._id.toString(),
        username: like.userId.username,
        profile: like.userId.profile,
      },
      targetId: like.targetId.toString(),
      targetType: like.targetType,
      createdAt: like.createdAt,
    }));

    return {
      likes: formattedLikes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    const like = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(postId),
      targetType: LikeTargetType.POST,
    });
    return !!like;
  }

  async isCommentLiked(commentId: string, userId: string): Promise<boolean> {
    const like = await this.likeModel.findOne({
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(commentId),
      targetType: LikeTargetType.COMMENT,
    });
    return !!like;
  }

  async getUserLikes(userId: string, query: QueryLikesDto): Promise<LikesListDto> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      this.likeModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('targetId', 'title slug content', 'Post')
        .populate('targetId', 'content', 'Comment') 
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.likeModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    const formattedLikes: LikeResponseDto[] = likes.map((like: any) => ({
      _id: like._id.toString(),
      userId: {
        _id: userId,
        username: '', // Won't be used since this is for current user
      },
      targetId: like.targetId?._id?.toString() || like.targetId.toString(),
      targetType: like.targetType,
      createdAt: like.createdAt,
    }));

    return {
      likes: formattedLikes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }
}