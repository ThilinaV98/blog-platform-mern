import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { Comment } from './schemas/comment.schema';
import { PostsService } from '../posts/posts.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentModel: any;
  let postsService: any;

  const mockComment = {
    _id: '507f1f77bcf86cd799439011',
    postId: '507f1f77bcf86cd799439012',
    userId: '507f1f77bcf86cd799439013',
    content: 'This is a test comment',
    path: '507f1f77bcf86cd799439011',
    depth: 0,
    likes: 0,
    reports: 0,
    isEdited: false,
    isDeleted: false,
    isVisible: true,
    save: jest.fn().mockResolvedValue(this),
    populate: jest.fn().mockResolvedValue(this),
  };

  const mockCommentModel = {
    new: jest.fn().mockResolvedValue(mockComment),
    constructor: jest.fn().mockResolvedValue(mockComment),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    populate: jest.fn(),
    save: jest.fn(),
  };

  const mockPostsService = {
    findOne: jest.fn(),
    incrementCommentCount: jest.fn(),
    decrementCommentCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getModelToken(Comment.name),
          useValue: mockCommentModel,
        },
        {
          provide: getModelToken('Like'),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
            countDocuments: jest.fn(),
          },
        },
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentModel = module.get(getModelToken(Comment.name));
    postsService = module.get(PostsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new comment', async () => {
      const createCommentDto = { content: 'Test comment' };
      const postId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      mockPostsService.findOne.mockResolvedValue({ _id: postId });
      mockComment.save.mockResolvedValue(mockComment);
      mockComment.populate.mockResolvedValue(mockComment);

      const result = await service.create(postId, userId, createCommentDto);

      expect(mockPostsService.findOne).toHaveBeenCalledWith(postId);
      expect(mockPostsService.incrementCommentCount).toHaveBeenCalledWith(postId);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if post not found', async () => {
      const createCommentDto = { content: 'Test comment' };
      const postId = 'invalid-post-id';
      const userId = '507f1f77bcf86cd799439013';

      mockPostsService.findOne.mockResolvedValue(null);

      await expect(
        service.create(postId, userId, createCommentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle nested comments with max depth check', async () => {
      const createCommentDto = { 
        content: 'Test reply',
        parentId: '507f1f77bcf86cd799439014'
      };
      const postId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      const parentComment = {
        _id: '507f1f77bcf86cd799439014',
        postId: postId,
        depth: 2, // Already at max depth - 1
      };

      mockPostsService.findOne.mockResolvedValue({ _id: postId });
      mockCommentModel.findById.mockResolvedValue(parentComment);

      await expect(
        service.create(postId, userId, createCommentDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByPost', () => {
    it('should return paginated comments for a post', async () => {
      const postId = '507f1f77bcf86cd799439012';
      const query = { page: 1, limit: 20, sort: 'newest' };

      const mockComments = [mockComment];
      mockCommentModel.countDocuments.mockResolvedValue(1);
      mockCommentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockComments),
      });

      const result = await service.findByPost(postId, query as any);

      expect(result).toHaveProperty('comments');
      expect(result).toHaveProperty('meta');
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('update', () => {
    it('should update a comment', async () => {
      const commentId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439013';
      const updateDto = { content: 'Updated content' };

      const existingComment = {
        ...mockComment,
        userId: { toString: () => userId },
        isDeleted: false,
        save: jest.fn().mockResolvedValue(mockComment),
        populate: jest.fn().mockResolvedValue(mockComment),
      };

      mockCommentModel.findById.mockResolvedValue(existingComment);

      const result = await service.update(commentId, userId, updateDto);

      expect(mockCommentModel.findById).toHaveBeenCalledWith(commentId);
      expect(existingComment.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for non-owner', async () => {
      const commentId = '507f1f77bcf86cd799439011';
      const userId = 'different-user-id';
      const updateDto = { content: 'Updated content' };

      const existingComment = {
        ...mockComment,
        userId: { toString: () => '507f1f77bcf86cd799439013' },
      };

      mockCommentModel.findById.mockResolvedValue(existingComment);

      await expect(
        service.update(commentId, userId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete a comment', async () => {
      const commentId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439013';

      const existingComment = {
        ...mockComment,
        userId: { toString: () => userId },
        postId: { toString: () => '507f1f77bcf86cd799439012' },
        isDeleted: false,
        save: jest.fn().mockResolvedValue(mockComment),
      };

      mockCommentModel.findById.mockResolvedValue(existingComment);

      const result = await service.remove(commentId, userId);

      expect(existingComment.isDeleted).toBe(true);
      expect(existingComment.content).toBe('[This comment has been deleted]');
      expect(existingComment.save).toHaveBeenCalled();
      expect(mockPostsService.decrementCommentCount).toHaveBeenCalled();
      expect(result.message).toBe('Comment deleted successfully');
    });
  });

  describe('toggleLike', () => {
    it('should increment likes on a comment', async () => {
      const commentId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439013';

      const existingComment = {
        ...mockComment,
        likes: 5,
        isDeleted: false,
        save: jest.fn().mockResolvedValue(mockComment),
      };

      mockCommentModel.findById.mockResolvedValue(existingComment);

      const result = await service.toggleLike(commentId, userId);

      expect(existingComment.likes).toBe(6);
      expect(existingComment.save).toHaveBeenCalled();
      expect(result.liked).toBe(true);
      expect(result.likesCount).toBe(6);
    });
  });
});