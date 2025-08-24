import React from 'react';
import { render, screen } from '../utils/test-utils';
import { PostCard } from '@/components/posts/PostCard';
import { createMockPost } from '../utils/test-utils';
import { format } from 'date-fns';

// Mock the image utility
jest.mock('@/lib/utils/image', () => ({
  getImageUrl: (path: string) => `http://localhost:4000${path}`,
}));

describe('PostCard', () => {
  const mockPost = createMockPost({
    _id: '1',
    title: 'Test Post Title',
    slug: 'test-post-title',
    excerpt: 'This is a test excerpt for the post card',
    coverImage: '/uploads/posts/test-cover.jpg',
    category: 'Technology',
    tags: ['react', 'testing', 'frontend'],
    featured: true,
    author: {
      _id: 'author1',
      username: 'testauthor',
      profile: {
        displayName: 'Test Author',
        avatar: '/uploads/avatars/author.jpg',
      },
    },
    metadata: {
      readTime: 5,
      views: 100,
      likes: 25,
      comments: 10,
      wordCount: 500,
      shares: 5,
    },
    publishedAt: '2024-01-15T10:00:00Z',
  });

  it('renders post card with all elements', () => {
    render(<PostCard post={mockPost} />);
    
    // Title
    expect(screen.getByRole('heading', { name: /test post title/i })).toBeInTheDocument();
    
    // Excerpt
    expect(screen.getByText(/this is a test excerpt/i)).toBeInTheDocument();
    
    // Category
    expect(screen.getByText('Technology')).toBeInTheDocument();
    
    // Tags (only first 2 are shown)
    expect(screen.getByText('#react')).toBeInTheDocument();
    expect(screen.getByText('#testing')).toBeInTheDocument();
    expect(screen.queryByText('#frontend')).not.toBeInTheDocument();
    
    // Author
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    
    // Date
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    
    // Read time
    expect(screen.getByText('5 min')).toBeInTheDocument();
    
    // Stats
    expect(screen.getByText('100')).toBeInTheDocument(); // views
    expect(screen.getByText('25')).toBeInTheDocument(); // likes
    expect(screen.getByText('10')).toBeInTheDocument(); // comments
  });

  it('renders featured badge when post is featured', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('does not render featured badge when post is not featured', () => {
    const nonFeaturedPost = createMockPost({ featured: false });
    render(<PostCard post={nonFeaturedPost} />);
    
    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('renders cover image when available', () => {
    render(<PostCard post={mockPost} />);
    
    const coverImage = screen.getByAltText('Test Post Title') as HTMLImageElement;
    expect(coverImage).toBeInTheDocument();
    expect(coverImage.src).toBe('http://localhost:4000/uploads/posts/test-cover.jpg');
  });

  it('does not render cover image section when not available', () => {
    const postWithoutCover = createMockPost({ coverImage: null });
    render(<PostCard post={postWithoutCover} />);
    
    expect(screen.queryByAltText('Test Post')).not.toBeInTheDocument();
  });

  it('renders author avatar when available', () => {
    render(<PostCard post={mockPost} />);
    
    const authorAvatar = screen.getByAltText('Test Author') as HTMLImageElement;
    expect(authorAvatar).toBeInTheDocument();
    expect(authorAvatar.src).toBe('http://localhost:4000/uploads/avatars/author.jpg');
  });

  it('renders default avatar icon when author avatar is not available', () => {
    const postWithoutAvatar = createMockPost({
      author: {
        _id: 'author1',
        username: 'testauthor',
        profile: {
          displayName: 'Test Author',
          avatar: null,
        },
      },
    });
    
    const { container } = render(<PostCard post={postWithoutAvatar} />);
    
    expect(screen.queryByAltText('Test Author')).not.toBeInTheDocument();
    expect(container.querySelector('svg.lucide-user')).toBeInTheDocument();
  });

  it('uses username when display name is not available', () => {
    const postWithUsername = createMockPost({
      author: {
        _id: 'author1',
        username: 'testusername',
        profile: {
          displayName: '',
          avatar: null,
        },
      },
    });
    
    render(<PostCard post={postWithUsername} />);
    
    expect(screen.getByText('testusername')).toBeInTheDocument();
  });

  it('handles author as string ID gracefully', () => {
    const postWithStringAuthor = createMockPost({
      author: 'author-id-string' as any,
    });
    
    render(<PostCard post={postWithStringAuthor} />);
    
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('renders correct links to post detail page', () => {
    render(<PostCard post={mockPost} />);
    
    const titleLink = screen.getByRole('heading', { name: /test post title/i }).closest('a');
    expect(titleLink).toHaveAttribute('href', '/blog/test-post-title');
  });

  it('does not render excerpt when not available', () => {
    const postWithoutExcerpt = createMockPost({ excerpt: null });
    render(<PostCard post={postWithoutExcerpt} />);
    
    expect(screen.queryByText(/this is a test excerpt/i)).not.toBeInTheDocument();
  });

  it('does not render category when not available', () => {
    const postWithoutCategory = createMockPost({ category: null });
    render(<PostCard post={postWithoutCategory} />);
    
    expect(screen.queryByText('Technology')).not.toBeInTheDocument();
  });

  it('does not render tags when empty', () => {
    const postWithoutTags = createMockPost({ tags: [] });
    render(<PostCard post={postWithoutTags} />);
    
    expect(screen.queryByText(/#/)).not.toBeInTheDocument();
  });

  it('uses createdAt when publishedAt is not available', () => {
    const postWithCreatedAt = createMockPost({
      publishedAt: null,
      createdAt: '2024-02-20T10:00:00Z',
    });
    
    render(<PostCard post={postWithCreatedAt} />);
    
    expect(screen.getByText('Feb 20, 2024')).toBeInTheDocument();
  });

  it('displays all metadata correctly', () => {
    render(<PostCard post={mockPost} />);
    
    // Check all metadata icons are rendered
    const { container } = render(<PostCard post={mockPost} />);
    expect(container.querySelector('svg.lucide-clock')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-eye')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-heart')).toBeInTheDocument();
    expect(container.querySelector('svg.lucide-message-circle')).toBeInTheDocument();
  });

  it('applies hover styles classes', () => {
    const { container } = render(<PostCard post={mockPost} />);
    
    const article = container.querySelector('article');
    expect(article).toHaveClass('hover:shadow-md');
    
    const title = screen.getByRole('heading', { name: /test post title/i });
    expect(title).toHaveClass('hover:text-primary-600');
  });
});