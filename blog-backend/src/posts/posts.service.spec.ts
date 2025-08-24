import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Model } from 'mongoose';
import { PostsService } from './posts.service';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

describe('PostsService', () => {
  let service: PostsService;
  let model: jest.Mocked<Model<PostDocument>>;

  const mockPost = {
    _id: '507f1f77bcf86cd799439011',
    title: 'Test Post',
    slug: 'test-post',
    content: '<p>This is test content</p>',
    excerpt: 'This is a test post',
    coverImage: '/path/to/image.jpg',
    author: { _id: '507f1f77bcf86cd799439012' },
    tags: ['test', 'jest'],
    category: 'technology',
    status: 'published',
    publishedAt: new Date(),
    featured: false,
    visibility: 'public',
    metadata: {
      readTime: 2,
      wordCount: 150,
      views: 0,
      uniqueViews: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    },
    seo: {
      metaTitle: 'Test Post',
      metaDescription: 'This is a test post',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
    toObject: jest.fn(),
  };

  const mockAuthor = {
    _id: '507f1f77bcf86cd799439012',
    username: 'testauthor',
    profile: {
      displayName: 'Test Author',
      avatar: '/path/to/avatar.jpg',
    },
  };

  beforeEach(async () => {
    const mockModel = {
      new: jest.fn(),
      constructor: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
      save: jest.fn(),
      exec: jest.fn(),
      select: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      lean: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getModelToken(Post.name),
          useValue: mockModel,
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
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    model = module.get<Model<PostDocument>>(getModelToken(Post.name));

    // Setup default mock behaviors
    mockModel.findOne.mockReturnValue({
      exec: jest.fn(),
    });
    mockModel.findById.mockReturnValue({
      exec: jest.fn(),
      populate: jest.fn().mockReturnThis(),
    });
    mockModel.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    });
    mockModel.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new post successfully', async () => {
      const userId = '507f1f77bcf86cd799439012';
      const createPostDto: CreatePostDto = {
        title: 'New Test Post',
        content: '<p>New test content</p>',
        excerpt: 'New test excerpt',
        tags: ['new', 'test'],
        category: 'technology',
        status: 'draft',
      };

      // Mock slug generation
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // No existing post with this slug
      } as any);

      const mockSave = jest.fn().mockResolvedValue({
        ...mockPost,
        ...createPostDto,
        author: userId,
        slug: 'new-test-post',
        populate: jest.fn().mockResolvedValue({
          ...mockPost,
          ...createPostDto,
          author: mockAuthor,
        }),
      });

      (model as any).mockImplementation(() => ({
        save: mockSave,
        populate: jest.fn().mockResolvedValue({
          ...mockPost,
          ...createPostDto,
          author: mockAuthor,
        }),
      }));

      const result = await service.create(userId, createPostDto);

      expect(mockSave).toHaveBeenCalled();
      // Verify slug was generated from title
      expect(model.findOne).toHaveBeenCalledWith({
        slug: 'new-test-post',
      });
    });

    it('should generate unique slug when duplicate exists', async () => {
      const userId = '507f1f77bcf86cd799439012';
      const createPostDto: CreatePostDto = {
        title: 'Test Post', // Same title as existing post
        content: '<p>Content</p>',
        excerpt: 'Excerpt',
        tags: ['test'],
        status: 'draft',
      };

      // Mock existing post with same slug
      model.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(mockPost), // First call finds existing
        } as any)
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null), // Second call finds no conflict
        } as any);

      const mockSave = jest.fn().mockResolvedValue({
        ...mockPost,
        slug: 'test-post-1',
        populate: jest.fn().mockResolvedValue({
          ...mockPost,
          author: mockAuthor,
        }),
      });

      (model as any).mockImplementation(() => ({
        save: mockSave,
        populate: jest.fn().mockResolvedValue({
          ...mockPost,
          author: mockAuthor,
        }),
      }));

      await service.create(userId, createPostDto);

      // Should check for 'test-post' first, then 'test-post-1'
      expect(model.findOne).toHaveBeenCalledWith({ slug: 'test-post' });
      expect(model.findOne).toHaveBeenCalledWith({ slug: 'test-post-1' });
    });
  });

  describe('findAll', () => {
    it('should return paginated posts with default parameters', async () => {
      const posts = [mockPost, { ...mockPost, _id: 'post2' }];
      const totalCount = 2;

      model.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(posts),
      } as any);

      model.countDocuments.mockResolvedValue(totalCount);

      const result = await service.findAll({});

      expect(result.posts).toEqual(posts);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: totalCount,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      expect(model.find).toHaveBeenCalledWith({ status: 'published' });
    });

    it('should filter posts by category and tags', async () => {
      const query = {
        page: 1,
        limit: 10,
        category: 'technology',
        tags: ['react', 'javascript'],
      };

      model.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.countDocuments.mockResolvedValue(0);

      await service.findAll(query);

      expect(model.find).toHaveBeenCalledWith({
        status: 'published',
        category: 'technology',
        tags: { $in: ['react', 'javascript'] },
      });
    });

    it('should search posts by text query', async () => {
      const query = {
        search: 'react programming',
      };

      model.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      } as any);

      model.countDocuments.mockResolvedValue(0);

      await service.findAll(query);

      expect(model.find).toHaveBeenCalledWith({
        status: 'published',
        $text: { $search: 'react programming' },
      });
    });
  });

  describe('findBySlug', () => {
    it('should return post by slug and increment view count', async () => {
      const slug = 'test-post';
      const postWithAuthor = { ...mockPost, author: mockAuthor, status: 'published' };

      model.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(postWithAuthor),
      } as any);

      model.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await service.findBySlug(slug);

      expect(result).toEqual({
        ...postWithAuthor,
        metadata: {
          ...postWithAuthor.metadata,
          views: postWithAuthor.metadata.views + 1,
        },
      });
      expect(model.findOne).toHaveBeenCalledWith({ slug });
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        mockPost._id,
        { $inc: { 'metadata.views': 1 } },
      );
    });

    it('should throw NotFoundException when post not found', async () => {
      const slug = 'nonexistent-post';

      model.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findBySlug(slug)).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug(slug)).rejects.toThrow('Post not found');
    });
  });

  describe('findById', () => {
    it('should return post by ID with author populated', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const postWithAuthor = { ...mockPost, author: mockAuthor };

      model.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(postWithAuthor),
      } as any);

      const result = await service.findById(postId);

      expect(result).toEqual(postWithAuthor);
      expect(model.findById).toHaveBeenCalledWith(postId);
    });

    it('should throw NotFoundException when post not found', async () => {
      const postId = '507f1f77bcf86cd799439015';

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findById(postId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update post successfully when user is author', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
        content: '<p>Updated content</p>',
        status: 'published',
      };

      const existingPost = { ...mockPost, author: { _id: userId } };
      const updatedPost = { ...existingPost, ...updatePostDto };

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(existingPost),
      } as any);

      model.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(updatedPost),
      } as any);

      const result = await service.update(postId, userId, updatePostDto);

      expect(result).toEqual(updatedPost);
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        postId,
        updatePostDto,
        { new: true },
      );
    });

    it('should throw NotFoundException when post not found', async () => {
      const postId = '507f1f77bcf86cd799439015';
      const userId = '507f1f77bcf86cd799439012';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
      };

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.update(postId, userId, updatePostDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not author', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439014';
      const updatePostDto: UpdatePostDto = {
        title: 'Updated Title',
      };

      const existingPost = { ...mockPost, author: { _id: '507f1f77bcf86cd799439013' } };

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(existingPost),
      } as any);

      await expect(
        service.update(postId, userId, updatePostDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(postId, userId, updatePostDto),
      ).rejects.toThrow('You can only update your own posts');
    });

    it('should update slug when title changes', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';
      const updatePostDto: UpdatePostDto = {
        title: 'Completely New Title',
      };

      const existingPost = { ...mockPost, author: { _id: userId } };

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(existingPost),
      } as any);

      // Mock slug check for uniqueness
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      model.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue({
          ...existingPost,
          ...updatePostDto,
          slug: 'completely-new-title',
        }),
      } as any);

      await service.update(postId, userId, updatePostDto);

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        postId,
        {
          ...updatePostDto,
          slug: 'completely-new-title',
        },
        { new: true },
      );
    });
  });

  describe('remove', () => {
    it('should delete post when user is author', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      const existingPost = { ...mockPost, author: { _id: userId } };

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(existingPost),
      } as any);

      model.findByIdAndDelete.mockResolvedValue(existingPost);

      await service.remove(postId, userId);

      expect(model.findByIdAndDelete).toHaveBeenCalledWith(postId);
    });

    it('should throw NotFoundException when post not found', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439012';

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.remove(postId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not author', async () => {
      const postId = '507f1f77bcf86cd799439011';
      const userId = '507f1f77bcf86cd799439014';

      const existingPost = { ...mockPost, author: { _id: '507f1f77bcf86cd799439013' } };

      model.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(existingPost),
      } as any);

      await expect(service.remove(postId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const userId = '507f1f77bcf86cd799439012';

      model.countDocuments
        .mockResolvedValueOnce(5) // totalPosts
        .mockResolvedValueOnce(3) // publishedPosts
        .mockResolvedValueOnce(1) // draftPosts
        .mockResolvedValueOnce(1); // archivedPosts

      model.aggregate.mockResolvedValue([{
        totalViews: 100,
        totalLikes: 20,
        totalComments: 5,
      }]);

      model.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([mockPost]),
      } as any);

      const result = await service.getUserStats(userId);

      expect(result).toEqual({
        totalPosts: 5,
        publishedPosts: 3,
        draftPosts: 1,
        archivedPosts: 1,
        totalViews: 100,
        totalLikes: 20,
        totalComments: 5,
        recentPosts: [mockPost],
      });
    });
  });

  describe('private methods', () => {
    describe('countWords', () => {
      it('should count words correctly stripping HTML tags', () => {
        const content = '<p>This is a test with <strong>HTML tags</strong> and content.</p>';
        const wordCount = (service as any).countWords(content);

        // Should strip HTML tags and count words
        expect(wordCount).toBe(9); // "This is a test with HTML tags and content"
      });
    });

    describe('calculateReadTime', () => {
      it('should calculate read time based on content', () => {
        const content = '<p>' + 'word '.repeat(400) + '</p>'; // 400 words
        const readTime = (service as any).calculateReadTime(content);

        expect(readTime).toBe(2); // 400 words / 200 words per minute = 2 minutes
      });

      it('should return minimum 1 minute read time', () => {
        const content = '<p>Short content</p>'; // 2 words
        const readTime = (service as any).calculateReadTime(content);

        expect(readTime).toBe(1);
      });
    });
  });
});