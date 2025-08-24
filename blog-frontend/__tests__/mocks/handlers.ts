import { http, HttpResponse } from 'msw';
import { createMockUser, createMockPost, createMockAuthResponse } from '../utils/test-utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/api/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.emailOrUsername === 'test@example.com' && body.password === 'Test123!@#') {
      return HttpResponse.json(createMockAuthResponse());
    }
    
    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/api/auth/register`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.email && body.username && body.password) {
      return HttpResponse.json(createMockAuthResponse({
        user: createMockUser({
          email: body.email,
          username: body.username,
          displayName: body.displayName || body.username,
        }),
      }));
    }
    
    return HttpResponse.json(
      { message: 'Validation failed' },
      { status: 400 }
    );
  }),

  http.get(`${API_URL}/api/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.includes('Bearer')) {
      return HttpResponse.json(createMockUser());
    }
    
    return HttpResponse.json(
      { message: 'Unauthorized' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/api/auth/refresh`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.refreshToken) {
      return HttpResponse.json(createMockAuthResponse());
    }
    
    return HttpResponse.json(
      { message: 'Invalid refresh token' },
      { status: 401 }
    );
  }),

  http.post(`${API_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // Posts endpoints
  http.get(`${API_URL}/api/posts`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    const posts = Array.from({ length: 3 }, (_, i) =>
      createMockPost({
        _id: `${i + 1}`,
        title: `Test Post ${i + 1}`,
        slug: `test-post-${i + 1}`,
      })
    );
    
    return HttpResponse.json({
      posts,
      meta: {
        total: posts.length,
        page,
        limit,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });
  }),

  http.get(`${API_URL}/api/posts/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json(createMockPost({ _id: id as string }));
  }),

  http.post(`${API_URL}/api/posts`, async ({ request }) => {
    const body = await request.json() as any;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json(createMockPost({
      ...body,
      _id: Math.random().toString(36).substr(2, 9),
      slug: body.title.toLowerCase().replace(/\s+/g, '-'),
      status: 'draft',
    }));
  }),

  http.patch(`${API_URL}/api/posts/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json() as any;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json(createMockPost({
      _id: id as string,
      ...body,
    }));
  }),

  http.delete(`${API_URL}/api/posts/:id`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({ message: 'Post deleted successfully' });
  }),

  http.patch(`${API_URL}/api/posts/:id/publish`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json(createMockPost({
      _id: id as string,
      status: 'published',
      publishedAt: new Date().toISOString(),
    }));
  }),

  // User endpoints
  http.get(`${API_URL}/api/users/profile`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json(createMockUser({
      profile: {
        displayName: 'Test User',
        bio: 'Test bio',
        avatar: null,
        website: 'https://example.com',
        location: 'Test City',
        socialLinks: {},
      },
    }));
  }),

  http.patch(`${API_URL}/api/users/profile`, async ({ request }) => {
    const body = await request.json() as any;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json(createMockUser({
      profile: {
        ...body,
      },
    }));
  }),

  http.post(`${API_URL}/api/users/change-password`, async ({ request }) => {
    const body = await request.json() as any;
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (body.currentPassword === 'Test123!@#') {
      return HttpResponse.json({ message: 'Password changed successfully' });
    }
    
    return HttpResponse.json(
      { message: 'Current password is incorrect' },
      { status: 401 }
    );
  }),

  // Upload endpoints
  http.post(`${API_URL}/api/users/avatar`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      avatarUrl: '/uploads/avatars/test-avatar.jpg',
    });
  }),

  http.post(`${API_URL}/api/upload/image`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return HttpResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      url: 'http://localhost:4000/uploads/posts/test-image.jpg',
      key: 'test-image',
      size: 1024000,
      dimensions: {
        width: 1920,
        height: 1080,
      },
    });
  }),
];