# 🚀 Blog Platform Implementation Plan

## 📋 Executive Summary

### Project Overview
**Project Name**: Modern Blog Platform with User Management  
**Position**: Software Engineer - MERN Stack  
**Timeline**: 21 days (3 weeks)  
**Complexity**: High (8.5/10)  

### Technology Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: NestJS + TypeScript  
- **Database**: MongoDB Atlas with Mongoose ODM
- **Cache**: Redis for session management
- **File Storage**: AWS S3 (production) / Local (development)
- **Authentication**: JWT with refresh token rotation
- **Deployment**: Vercel (Frontend) + Railway (Backend)

### Key Deliverables
1. GitHub repository with clean commit history
2. Live demo application
3. Comprehensive README documentation
4. API documentation (Swagger/OpenAPI)
5. Technical decisions document
6. Test coverage report (>70% critical paths)

---

## 🏗️ System Architecture

### High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
│                   (Desktop, Mobile, Tablet)                  │
├─────────────────────────────────────────────────────────────┤
│                    CDN (Cloudflare/Vercel)                   │
│                  (Static Assets, Images, CSS)                │
├─────────────────────────────────────────────────────────────┤
│                  Next.js Frontend (Vercel)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  App Router  │  Components  │  Hooks  │  Zustand Store│  │
│  │  Pages & Layouts │ UI Library │ Custom │ Global State │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        API Gateway                           │
│                   (Rate Limiting, CORS, Auth)                │
├─────────────────────────────────────────────────────────────┤
│                   NestJS Backend (Railway)                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │   Modules    │   Services   │   Guards   │   Pipes    │  │
│  │ Auth, Posts  │ Business Logic│  JWT Auth  │ Validation │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer Services                      │
│  ┌─────────────┬─────────────┬─────────────┬────────────┐  │
│  │  MongoDB    │    Redis    │   AWS S3    │  SendGrid  │  │
│  │  Database   │    Cache    │   Storage   │    Email   │  │
│  └─────────────┴─────────────┴─────────────┴────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Decisions Rationale

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Frontend Framework** | Next.js 14 | SEO optimization, SSR/SSG capabilities, built-in image optimization, App Router for better performance |
| **UI Library** | Shadcn/ui + Tailwind | Type-safe components, highly customizable, modern design system, excellent DX |
| **State Management** | Zustand + React Query | Lightweight, TypeScript-first, excellent DevEx, built-in cache management |
| **Rich Text Editor** | Tiptap v2 | Fully TypeScript, extensible, secure HTML sanitization, modern architecture |
| **Backend Framework** | NestJS | Enterprise-grade, modular architecture, excellent TypeScript support, built-in validation |
| **Database** | MongoDB Atlas | Flexible schema for blog content, built-in full-text search, managed service |
| **Caching** | Redis | Fast in-memory storage, session management, query result caching |
| **File Storage** | AWS S3 | Scalable, CDN-ready, cost-effective, industry standard |
| **Authentication** | JWT + Refresh | Stateless, scalable, secure with rotation strategy |

---

## 💾 Database Design

### MongoDB Collections Schema

#### Users Collection
```typescript
interface User {
  _id: ObjectId;
  email: string;                    // unique index
  username: string;                 // unique index
  password: string;                 // bcrypt hashed
  profile: {
    displayName: string;
    bio?: string;
    avatar?: string;              // S3 URL
    website?: string;
    location?: string;
    socialLinks?: {
      twitter?: string;
      github?: string;
      linkedin?: string;
    };
  };
  role: 'user' | 'author' | 'moderator' | 'admin';
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshTokens: string[];          // Active refresh tokens
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Posts Collection
```typescript
interface Post {
  _id: ObjectId;
  title: string;                    // text index
  slug: string;                     // unique index
  content: string;                  // Rich HTML content
  excerpt: string;                  // 160 chars for SEO
  coverImage?: string;              // S3 URL
  author: ObjectId;                 // ref: User, index
  tags: string[];                   // index for filtering
  category?: string;                // index
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;               // index
  scheduledAt?: Date;               // For scheduled publishing
  featured: boolean;
  visibility: 'public' | 'private' | 'unlisted';
  metadata: {
    readTime: number;               // Calculated in minutes
    wordCount: number;
    views: number;                  // Incremented on read
    uniqueViews: number;            // Track unique visitors
    likes: number;                  // Denormalized count
    comments: number;               // Denormalized count
    shares: number;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogImage?: string;
  };
  versions?: [{                    // Version history
    content: string;
    editedBy: ObjectId;
    editedAt: Date;
    changeNote?: string;
  }];
  createdAt: Date;                  // index
  updatedAt: Date;
}
```

#### Comments Collection (Materialized Path Pattern)
```typescript
interface Comment {
  _id: ObjectId;
  postId: ObjectId;                 // ref: Post, index
  userId: ObjectId;                 // ref: User, index
  content: string;                  // Plain text or markdown
  path: string;                     // "parentId1/parentId2/commentId"
  depth: number;                    // Nesting level (max 3)
  parentId?: ObjectId;              // Direct parent comment
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;               // Soft delete
  deletedAt?: Date;
  likes: number;                    // Denormalized count
  reports: number;                  // Flag count
  createdAt: Date;                  // index
  updatedAt: Date;
}
```

#### Likes Collection
```typescript
interface Like {
  _id: ObjectId;
  userId: ObjectId;                 // ref: User
  targetId: ObjectId;               // Post or Comment ID
  targetType: 'post' | 'comment';
  createdAt: Date;
}
// Compound unique index: userId + targetId + targetType
```

#### Categories Collection
```typescript
interface Category {
  _id: ObjectId;
  name: string;                     // unique
  slug: string;                     // unique index
  description?: string;
  icon?: string;                    // Icon identifier
  color?: string;                   // Hex color for UI
  parentId?: ObjectId;              // For nested categories
  order: number;                    // Display order
  postCount: number;                // Denormalized
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Indexes Strategy
```javascript
// Performance-critical indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

db.posts.createIndex({ slug: 1 }, { unique: true });
db.posts.createIndex({ author: 1, status: 1, publishedAt: -1 });
db.posts.createIndex({ tags: 1, status: 1 });
db.posts.createIndex({ category: 1, status: 1 });
db.posts.createIndex({ status: 1, publishedAt: -1 });
db.posts.createIndex({ "$**": "text" });  // Full-text search

db.comments.createIndex({ postId: 1, path: 1 });
db.comments.createIndex({ userId: 1, createdAt: -1 });
db.comments.createIndex({ postId: 1, createdAt: -1 });

db.likes.createIndex({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
db.likes.createIndex({ targetId: 1, targetType: 1 });

db.categories.createIndex({ slug: 1 }, { unique: true });
```

---

## 🔌 API Specification

### RESTful API Endpoints

#### Authentication Endpoints
```typescript
POST   /api/auth/register          
// Body: { email, username, password, displayName }
// Response: { user, accessToken, refreshToken }

POST   /api/auth/login             
// Body: { email/username, password }
// Response: { user, accessToken, refreshToken }

POST   /api/auth/logout            
// Headers: Authorization: Bearer {token}
// Response: { message }

POST   /api/auth/refresh           
// Body: { refreshToken }
// Response: { accessToken, refreshToken }

POST   /api/auth/forgot-password   
// Body: { email }
// Response: { message }

POST   /api/auth/reset-password    
// Body: { token, newPassword }
// Response: { message }

GET    /api/auth/verify-email      
// Query: { token }
// Response: { message }
```

#### User Management
```typescript
GET    /api/users/profile          
// Headers: Authorization
// Response: { user }

PATCH  /api/users/profile          
// Headers: Authorization
// Body: { displayName?, bio?, website?, location? }
// Response: { user }

GET    /api/users/:username        
// Response: { user, stats }

GET    /api/users/:username/posts  
// Query: { page?, limit?, status? }
// Response: { posts, meta }

POST   /api/users/avatar           
// Headers: Authorization, Content-Type: multipart/form-data
// Body: FormData with image file
// Response: { avatarUrl }

DELETE /api/users/account          
// Headers: Authorization
// Body: { password }
// Response: { message }
```

#### Blog Posts
```typescript
GET    /api/posts                  
// Query: { page?, limit?, category?, tags?, search?, sort? }
// Response: { posts, meta }

POST   /api/posts                  
// Headers: Authorization
// Body: { title, content, excerpt, tags, category, status }
// Response: { post }

GET    /api/posts/feed             
// Headers: Authorization
// Query: { page?, limit? }
// Response: { posts, meta }

GET    /api/posts/trending         
// Query: { period?, limit? }
// Response: { posts }

GET    /api/posts/search           
// Query: { q, page?, limit? }
// Response: { posts, meta }

GET    /api/posts/:slug            
// Response: { post, author, relatedPosts }

PATCH  /api/posts/:id              
// Headers: Authorization
// Body: { title?, content?, excerpt?, tags?, category?, status? }
// Response: { post }

DELETE /api/posts/:id              
// Headers: Authorization
// Response: { message }

POST   /api/posts/:id/publish      
// Headers: Authorization
// Body: { scheduledAt? }
// Response: { post }

POST   /api/posts/:id/unpublish    
// Headers: Authorization
// Response: { post }
```

#### Interactions
```typescript
POST   /api/posts/:id/like         
// Headers: Authorization
// Response: { liked: true, likesCount }

DELETE /api/posts/:id/like         
// Headers: Authorization
// Response: { liked: false, likesCount }

GET    /api/posts/:id/likes        
// Query: { page?, limit? }
// Response: { users, meta }
```

#### Comments
```typescript
GET    /api/posts/:id/comments     
// Query: { sort?, page?, limit? }
// Response: { comments, meta }

POST   /api/posts/:id/comments     
// Headers: Authorization
// Body: { content, parentId? }
// Response: { comment }

GET    /api/comments/:id           
// Response: { comment, replies }

PATCH  /api/comments/:id           
// Headers: Authorization
// Body: { content }
// Response: { comment }

DELETE /api/comments/:id           
// Headers: Authorization
// Response: { message }

POST   /api/comments/:id/reply     
// Headers: Authorization
// Body: { content }
// Response: { comment }

POST   /api/comments/:id/like      
// Headers: Authorization
// Response: { liked: true, likesCount }
```

#### File Upload
```typescript
POST   /api/upload/image           
// Headers: Authorization, Content-Type: multipart/form-data
// Body: FormData with image file
// Response: { url, key, size }

DELETE /api/upload/:key            
// Headers: Authorization
// Response: { message }
```

#### Categories & Tags
```typescript
GET    /api/categories             
// Response: { categories }

GET    /api/categories/:slug       
// Query: { page?, limit? }
// Response: { category, posts, meta }

GET    /api/tags                   
// Query: { limit? }
// Response: { tags }

GET    /api/tags/:name/posts       
// Query: { page?, limit? }
// Response: { posts, meta }
```

#### Analytics (Optional)
```typescript
GET    /api/analytics/posts/:id    
// Headers: Authorization
// Response: { views, likes, comments, shares, readTime }

GET    /api/analytics/dashboard    
// Headers: Authorization
// Response: { totalPosts, totalViews, totalLikes, recentActivity }
```

### API Response Formats

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/posts",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

### Authentication Flow

#### JWT Token Strategy
```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;        // user ID
  email: string;
  username: string;
  role: string;
  iat: number;        // issued at
  exp: number;        // expires in 15 minutes
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string;        // user ID
  tokenId: string;    // unique token ID for rotation
  iat: number;
  exp: number;        // expires in 7 days
}

// Token Configuration
Access Token:  15 minutes expiry (stored in memory/state)
Refresh Token: 7 days expiry (httpOnly secure cookie)
```

---

## 🎨 Frontend Architecture

### Project Structure
```
blog-frontend/
├── app/                           # Next.js 14 App Router
│   ├── (auth)/                   # Auth group route
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Protected routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Overview
│   │   │   ├── posts/
│   │   │   │   ├── page.tsx      # Post management
│   │   │   │   ├── new/page.tsx  # Create post
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   ├── comments/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   └── layout.tsx            # Dashboard layout
│   ├── blog/
│   │   ├── page.tsx              # Blog listing
│   │   ├── [slug]/
│   │   │   └── page.tsx          # Post detail
│   │   ├── category/
│   │   │   └── [category]/page.tsx
│   │   ├── tag/
│   │   │   └── [tag]/page.tsx
│   │   └── search/
│   │       └── page.tsx
│   ├── profile/
│   │   └── [username]/
│   │       └── page.tsx
│   ├── api/                      # API routes (if needed)
│   │   └── revalidate/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   ├── loading.tsx               # Global loading
│   ├── error.tsx                 # Error boundary
│   └── not-found.tsx             # 404 page
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── AuthGuard.tsx
│   │   └── PasswordResetForm.tsx
│   ├── blog/
│   │   ├── PostCard.tsx
│   │   ├── PostList.tsx
│   │   ├── PostDetail.tsx
│   │   ├── PostEditor.tsx
│   │   ├── PostFilters.tsx
│   │   └── RelatedPosts.tsx
│   ├── comments/
│   │   ├── CommentList.tsx
│   │   ├── CommentItem.tsx
│   │   ├── CommentForm.tsx
│   │   └── CommentThread.tsx
│   ├── editor/
│   │   ├── RichTextEditor.tsx
│   │   ├── EditorToolbar.tsx
│   │   └── ImageUpload.tsx
│   ├── ui/                       # Shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── skeleton.tsx
│   │   └── toast.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── Sidebar.tsx
│       ├── MobileNav.tsx
│       └── SearchBar.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePosts.ts
│   ├── useComments.ts
│   ├── useInfiniteScroll.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
├── lib/
│   ├── api/
│   │   ├── client.ts             # Axios instance
│   │   ├── auth.ts
│   │   ├── posts.ts
│   │   ├── comments.ts
│   │   ├── users.ts
│   │   └── upload.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── string.ts
│   │   ├── seo.ts
│   │   └── constants.ts
│   └── validations/
│       ├── auth.ts
│       ├── post.ts
│       └── comment.ts
├── store/
│   ├── authStore.ts              # Zustand store
│   ├── uiStore.ts
│   └── editorStore.ts
├── styles/
│   └── globals.css               # Tailwind imports
├── types/
│   ├── index.ts
│   ├── api.ts
│   └── components.ts
└── public/
    ├── images/
    └── fonts/
```

### Key Component Specifications

#### PostEditor Component
```typescript
interface PostEditorProps {
  initialPost?: Post;
  onSave: (post: PostData) => Promise<void>;
  onPublish: (post: PostData) => Promise<void>;
  mode: 'create' | 'edit';
}

// Features to implement:
- Rich text editing with Tiptap
- Toolbar: Bold, Italic, Headings (H1-H3)
- Lists: Ordered, Unordered, Checklist
- Media: Image upload with drag & drop
- Code blocks with syntax highlighting
- Link insertion with URL validation
- Table support
- Draft auto-save every 30 seconds
- Word count and estimated read time
- SEO meta fields
- Category and tag selection
- Cover image upload
- Preview mode toggle
```

#### CommentTree Component
```typescript
interface CommentTreeProps {
  postId: string;
  comments: Comment[];
  currentUser?: User;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
}

// Features to implement:
- Nested comment rendering (max depth: 3)
- Collapse/expand threads
- Load more replies pagination
- Real-time updates via polling
- Edit/delete own comments
- Like/unlike comments
- Report inappropriate content
- Markdown support in comments
- User avatars and timestamps
- "Edited" indicator
```

### State Management Strategy

#### Zustand Stores
```typescript
// Auth Store
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (data: UpdateProfileDto) => Promise<void>;
}

// UI Store
interface UIStore {
  isSidebarOpen: boolean;
  isSearchOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  toggleSearch: () => void;
  setTheme: (theme: Theme) => void;
}

// Editor Store
interface EditorStore {
  draft: PostData | null;
  isDirty: boolean;
  lastSaved: Date | null;
  saveDraft: (data: PostData) => void;
  clearDraft: () => void;
  setDirty: (dirty: boolean) => void;
}
```

#### React Query Integration
```typescript
// Posts Query
const usePosts = (filters?: PostFilters) => {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: () => api.posts.getAll(filters),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000,  // 10 minutes
  });
};

// Infinite Scroll Query
const useInfinitePosts = (filters?: PostFilters) => {
  return useInfiniteQuery({
    queryKey: ['posts', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      api.posts.getAll({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.meta.hasNext ? lastPage.meta.page + 1 : undefined,
  });
};

// Optimistic Update Example
const useLikePost = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId: string) => api.posts.like(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries(['post', postId]);
      const previous = queryClient.getQueryData(['post', postId]);
      
      queryClient.setQueryData(['post', postId], (old: any) => ({
        ...old,
        metadata: {
          ...old.metadata,
          likes: old.metadata.likes + 1,
        },
        isLiked: true,
      }));
      
      return { previous };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['post', postId], context?.previous);
    },
    onSettled: (data, error, postId) => {
      queryClient.invalidateQueries(['post', postId]);
    },
  });
};
```

---

## 🔧 Backend Architecture

### NestJS Project Structure
```
blog-backend/
├── src/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       ├── register.dto.ts
│   │       └── token.dto.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts
│   │   ├── users.controller.ts
│   │   ├── schemas/
│   │   │   └── user.schema.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   ├── posts/
│   │   ├── posts.module.ts
│   │   ├── posts.service.ts
│   │   ├── posts.controller.ts
│   │   ├── schemas/
│   │   │   └── post.schema.ts
│   │   └── dto/
│   │       ├── create-post.dto.ts
│   │       ├── update-post.dto.ts
│   │       └── query-post.dto.ts
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.service.ts
│   │   ├── comments.controller.ts
│   │   ├── schemas/
│   │   │   └── comment.schema.ts
│   │   └── dto/
│   │       ├── create-comment.dto.ts
│   │       └── update-comment.dto.ts
│   ├── likes/
│   │   ├── likes.module.ts
│   │   ├── likes.service.ts
│   │   ├── likes.controller.ts
│   │   └── schemas/
│   │       └── like.schema.ts
│   ├── uploads/
│   │   ├── uploads.module.ts
│   │   ├── uploads.service.ts
│   │   ├── uploads.controller.ts
│   │   └── multer.config.ts
│   ├── categories/
│   │   ├── categories.module.ts
│   │   ├── categories.service.ts
│   │   ├── categories.controller.ts
│   │   └── schemas/
│   │       └── category.schema.ts
│   ├── search/
│   │   ├── search.module.ts
│   │   ├── search.service.ts
│   │   └── search.controller.ts
│   ├── common/
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts
│   │   │   └── validation.filter.ts
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   ├── middleware/
│   │   │   └── logger.middleware.ts
│   │   └── utils/
│   │       ├── pagination.ts
│   │       └── slug.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   └── s3.config.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── package.json
```

### Key Service Implementations

#### Authentication Service
```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });
    
    const refreshToken = this.jwtService.sign(
      { sub: user._id, tokenId: uuidv4() },
      { 
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }
    );
    
    // Store refresh token in database
    await this.usersService.addRefreshToken(user._id, refreshToken);
    
    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // Rotate refresh token
      const newTokens = await this.login(user);
      await this.usersService.removeRefreshToken(user._id, refreshToken);
      
      return newTokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
```

#### Posts Service with Caching
```typescript
@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAll(query: QueryPostDto): Promise<PaginatedResult<Post>> {
    const { page = 1, limit = 10, category, tags, search, sort = '-publishedAt' } = query;
    
    // Build cache key
    const cacheKey = `posts:${JSON.stringify(query)}`;
    
    // Check cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;
    
    // Build query
    const filter: any = { status: 'published' };
    if (category) filter.category = category;
    if (tags?.length) filter.tags = { $in: tags };
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postModel
        .find(filter)
        .populate('author', 'username displayName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.postModel.countDocuments(filter),
    ]);
    
    const result = {
      data: posts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
    
    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300);
    
    return result;
  }

  async create(userId: string, createPostDto: CreatePostDto): Promise<Post> {
    const slug = await this.generateUniqueSlug(createPostDto.title);
    
    const post = new this.postModel({
      ...createPostDto,
      slug,
      author: userId,
      metadata: {
        wordCount: this.countWords(createPostDto.content),
        readTime: this.calculateReadTime(createPostDto.content),
        views: 0,
        likes: 0,
        comments: 0,
      },
    });
    
    const saved = await post.save();
    
    // Invalidate cache
    await this.cacheManager.reset();
    
    return saved.populate('author', 'username displayName avatar');
  }

  private generateUniqueSlug(title: string): string {
    let slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check uniqueness and append number if needed
    // Implementation details...
    
    return slug;
  }
  
  private countWords(content: string): number {
    const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  private calculateReadTime(content: string): number {
    const words = this.countWords(content);
    return Math.ceil(words / 200); // 200 words per minute
  }
}
```

---

## 📅 Implementation Timeline

### Phase 1: Foundation (Days 1-5)
**Goal**: Establish development environment and core authentication

#### Day 1-2: Project Setup & Configuration
- [ ] Initialize Next.js 14 with TypeScript and Tailwind CSS
- [ ] Setup NestJS with TypeScript and necessary modules
- [ ] Configure MongoDB Atlas and create database
- [ ] Setup Redis for caching (local Docker or cloud)
- [ ] Configure ESLint, Prettier, and Husky
- [ ] Initialize Git repository with .gitignore
- [ ] Setup environment variables (.env files)
- [ ] Configure CORS and security middleware

#### Day 3-4: Authentication System
- [ ] Implement JWT strategy with refresh tokens
- [ ] Create auth module with guards and decorators
- [ ] Build registration endpoint with validation
- [ ] Build login endpoint with password hashing
- [ ] Implement token refresh mechanism
- [ ] Create auth pages (login, register, forgot password)
- [ ] Setup protected routes in Next.js
- [ ] Implement auth context/store with Zustand

#### Day 5: User Management
- [ ] Create user schema and model
- [ ] Implement user CRUD operations
- [ ] Build user profile endpoints
- [ ] Create profile pages in frontend
- [ ] Implement avatar upload functionality
- [ ] Setup basic dashboard layout
- [ ] Add user settings page
- [ ] Test auth flow end-to-end

### Phase 2: Core Blog Features (Days 6-12)
**Goal**: Implement complete blog functionality

#### Day 6-8: Blog Post System
- [ ] Design post schema with all fields
- [ ] Create posts module and service
- [ ] Implement CRUD operations for posts
- [ ] Add slug generation and validation
- [ ] Integrate Tiptap rich text editor
- [ ] Create post editor component
- [ ] Build post listing page with cards
- [ ] Implement post detail page
- [ ] Add draft/publish workflow
- [ ] Setup SEO meta tags

#### Day 9-10: File Upload & Media Management
- [ ] Configure Multer for file handling
- [ ] Implement image validation (type, size)
- [ ] Setup Sharp for image resizing
- [ ] Create local storage service (development)
- [ ] Add S3 integration (production)
- [ ] Implement image upload in editor
- [ ] Add drag-and-drop functionality
- [ ] Create image optimization pipeline
- [ ] Build media library component
- [ ] Test upload with various file types

#### Day 11-12: Comments System
- [ ] Design comment schema with materialized path
- [ ] Create comments module and service
- [ ] Implement nested comment queries
- [ ] Build comment CRUD endpoints
- [ ] Create comment tree component
- [ ] Implement reply functionality
- [ ] Add comment editing/deletion
- [ ] Setup comment pagination
- [ ] Add comment like functionality
- [ ] Test nested comment rendering

### Phase 3: Interactive Features (Days 13-17)
**Goal**: Add social features and advanced functionality

#### Day 13: Likes & Social Interactions
- [ ] Create likes schema and service
- [ ] Implement like/unlike endpoints
- [ ] Add optimistic UI updates
- [ ] Create like button component
- [ ] Update post metadata on likes
- [ ] Build likes listing page
- [ ] Add user interaction history
- [ ] Implement view count tracking
- [ ] Create share functionality
- [ ] Test interaction features

#### Day 14-15: Search & Discovery
- [ ] Setup MongoDB text indexes
- [ ] Implement full-text search service
- [ ] Create search endpoint with filters
- [ ] Build search page UI
- [ ] Add search bar with debouncing
- [ ] Implement tag filtering
- [ ] Create category filtering
- [ ] Add sort options (date, popularity)
- [ ] Build advanced filter panel
- [ ] Implement infinite scroll pagination

#### Day 16-17: User Dashboard & Analytics
- [ ] Create dashboard layout
- [ ] Build post management table
- [ ] Add bulk actions (delete, archive)
- [ ] Create analytics service
- [ ] Build analytics dashboard
- [ ] Add post performance metrics
- [ ] Implement draft management
- [ ] Create scheduled posts feature
- [ ] Build settings pages
- [ ] Add notification preferences

### Phase 4: Testing & Optimization (Days 18-19)
**Goal**: Ensure quality, security, and performance

#### Day 18: Testing & Quality Assurance
- [ ] Write unit tests for auth service
- [ ] Write unit tests for posts service
- [ ] Create integration tests for API endpoints
- [ ] Add E2E tests for critical user flows
- [ ] Setup test coverage reporting
- [ ] Perform security audit (OWASP)
- [ ] Test cross-browser compatibility
- [ ] Load testing with k6 or Artillery
- [ ] Fix identified bugs and issues
- [ ] Validate responsive design

#### Day 19: Performance & Security Optimization
- [ ] Implement Redis caching for queries
- [ ] Add response compression
- [ ] Setup rate limiting (express-rate-limit)
- [ ] Configure proper CORS policies
- [ ] Add CSP headers for XSS protection
- [ ] Optimize database queries with explain
- [ ] Implement database connection pooling
- [ ] Add request/response logging
- [ ] Setup error monitoring (Sentry)
- [ ] Optimize bundle size and code splitting

### Phase 5: Deployment & Documentation (Days 20-21)
**Goal**: Deploy to production and complete documentation

#### Day 20: Production Deployment
- [ ] Setup production environment variables
- [ ] Configure GitHub Actions CI/CD
- [ ] Prepare production build scripts
- [ ] Deploy database to MongoDB Atlas
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Configure custom domains
- [ ] Setup SSL certificates
- [ ] Test production deployment
- [ ] Setup monitoring and alerts

#### Day 21: Documentation & Final Polish
- [ ] Write comprehensive README.md
- [ ] Generate API documentation with Swagger
- [ ] Create deployment guide
- [ ] Document environment setup
- [ ] Write technical decisions document
- [ ] Record demo video/screenshots
- [ ] Create Postman collection
- [ ] Final production testing
- [ ] Submit deliverables
- [ ] Prepare presentation materials

---

## 🧪 Testing Strategy

### Unit Testing
```typescript
// Example: Auth Service Test
describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            addRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();
    
    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });
  
  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const user = { email: 'test@example.com', password: 'hashedPassword' };
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      
      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual(user);
    });
    
    it('should throw UnauthorizedException if user not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      
      await expect(
        service.validateUser('test@example.com', 'password')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### Integration Testing
```typescript
// Example: Posts API Test
describe('Posts API', () => {
  let app: INestApplication;
  let mongoConnection: Connection;
  
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleRef.createNestApplication();
    await app.init();
    
    mongoConnection = moduleRef.get(getConnectionToken());
  });
  
  afterAll(async () => {
    await mongoConnection.close();
    await app.close();
  });
  
  describe('GET /api/posts', () => {
    it('should return paginated posts', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/posts')
        .expect(200);
      
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
  
  describe('POST /api/posts', () => {
    it('should create a post when authenticated', async () => {
      const token = await getAuthToken();
      
      const response = await request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Post',
          content: 'Test content',
          tags: ['test'],
        })
        .expect(201);
      
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data.title).toBe('Test Post');
    });
  });
});
```

### E2E Testing with Playwright
```typescript
// Example: Blog Flow Test
test.describe('Blog User Flow', () => {
  test('should allow user to create and publish a post', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Navigate to create post
    await page.waitForURL('/dashboard');
    await page.click('a[href="/dashboard/posts/new"]');
    
    // Fill post form
    await page.fill('[name="title"]', 'My Test Post');
    await page.fill('.tiptap-editor', 'This is my post content');
    await page.fill('[name="tags"]', 'test, e2e');
    
    // Save as draft
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('.toast')).toContainText('Draft saved');
    
    // Publish
    await page.click('button:has-text("Publish")');
    await expect(page).toHaveURL(/\/blog\/.+/);
    
    // Verify post is visible
    await expect(page.locator('h1')).toContainText('My Test Post');
  });
});
```

### Performance Testing
```javascript
// k6 Load Test Script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function () {
  // Test blog listing
  const res = http.get('https://api.example.com/api/posts');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## 🚀 Deployment Guide

### Frontend Deployment (Vercel)

#### Environment Configuration
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_GA_ID=UA-XXXXXXXXX
```

#### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url",
    "NEXT_PUBLIC_SITE_URL": "@site_url"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Backend Deployment (Railway)

#### Environment Variables
```bash
# Production Environment
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/blog-platform

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Redis
REDIS_URL=redis://default:password@redis-server:6379

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=blog-platform-uploads

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@yourdomain.com

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

#### Railway Configuration
```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/health"
healthcheckTimeout = 100

[env]
NODE_ENV = "production"
```

### MongoDB Atlas Setup

1. **Create Cluster**
   - Choose M10 or higher for production
   - Enable backup with point-in-time recovery
   - Configure 3-node replica set

2. **Network Access**
   - Whitelist Railway IPs
   - Enable VPC peering if available

3. **Database User**
   - Create dedicated user for application
   - Grant readWrite permissions only

4. **Indexes**
   - Create indexes via Atlas UI or migration script
   - Enable Atlas Search for full-text search

5. **Monitoring**
   - Setup performance alerts
   - Configure slow query logs
   - Enable profiler for optimization

### CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run E2E tests
        run: npm run test:e2e
  
  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
  
  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: blog-platform-api
```

---

## 🔒 Security Implementation

### Security Checklist

#### Authentication & Authorization
- [x] Passwords hashed with bcrypt (salt rounds: 10)
- [x] JWT tokens with short expiration (15 min)
- [x] Refresh token rotation
- [x] Role-based access control (RBAC)
- [x] Account lockout after failed attempts
- [x] Email verification required

#### Input Validation & Sanitization
- [x] class-validator for all DTOs
- [x] DOMPurify for rich text content
- [x] File type validation for uploads
- [x] File size limits (5MB images)
- [x] SQL/NoSQL injection prevention
- [x] Path traversal protection

#### Security Headers
```typescript
// NestJS Security Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests
    message: 'Too many requests from this IP',
  }),
);

// CORS Configuration
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### Data Protection
- [x] HTTPS only in production
- [x] Secure cookie flags (httpOnly, secure, sameSite)
- [x] Environment variables for secrets
- [x] No sensitive data in logs
- [x] PII encryption at rest
- [x] Regular security audits

### Performance Optimization

#### Frontend Optimization
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Bundle size analysis and optimization
- Preconnect to external domains
- Service worker for offline support
- Lighthouse score target: >90

#### Backend Optimization
- Database query optimization with explain
- Redis caching for frequently accessed data
- Connection pooling for database
- Pagination for large datasets
- Compression middleware (gzip)
- CDN for static assets

#### Monitoring & Observability
- Application Performance Monitoring (APM) with Sentry
- Custom metrics with Prometheus
- Structured logging with Winston
- Health check endpoints
- Uptime monitoring with UptimeRobot
- Real User Monitoring (RUM)

---

## 📊 Success Metrics & KPIs

### Performance Metrics
| Metric | Target | Measurement Tool |
|--------|--------|------------------|
| Page Load Time | <3s on 3G | Lighthouse, WebPageTest |
| Time to First Byte | <200ms | Chrome DevTools |
| First Contentful Paint | <1.5s | Lighthouse |
| API Response Time | <200ms avg | APM Tools |
| Bundle Size | <500KB initial | Webpack Bundle Analyzer |
| Image Load Time | <1s | Chrome DevTools |

### Quality Metrics
| Metric | Target | Measurement Tool |
|--------|--------|------------------|
| Code Coverage | >70% critical paths | Jest Coverage |
| TypeScript Coverage | 100% | TypeScript Compiler |
| ESLint Issues | 0 | ESLint |
| Security Vulnerabilities | 0 critical | npm audit, Snyk |
| Accessibility Score | WCAG 2.1 AA | axe DevTools |
| SEO Score | >90 | Lighthouse |

### User Experience Metrics
| Metric | Target | Measurement Tool |
|--------|--------|------------------|
| Mobile Responsiveness | All breakpoints | BrowserStack |
| Error Rate | <1% | Sentry |
| Crash Rate | <0.1% | Sentry |
| User Satisfaction | >4.0/5.0 | User Feedback |
| Bounce Rate | <40% | Google Analytics |
| Session Duration | >2 minutes | Google Analytics |

---

## 📚 Technical Decisions Document

### Architecture Decisions

#### 1. Monorepo vs Separate Repos
**Decision**: Separate repositories  
**Rationale**: 
- Independent deployment cycles
- Clear separation of concerns
- Easier to manage permissions
- Simpler CI/CD pipelines

#### 2. REST API vs GraphQL
**Decision**: REST API  
**Rationale**:
- Simpler implementation for CRUD operations
- Better caching strategies
- Wider ecosystem support
- Lower learning curve

#### 3. SSR vs SSG vs CSR
**Decision**: Hybrid (SSR for dynamic, SSG for static)  
**Rationale**:
- SEO benefits for blog content
- Better performance for static pages
- Dynamic content where needed
- Optimal user experience

#### 4. State Management
**Decision**: Zustand + React Query  
**Rationale**:
- Lightweight and performant
- Excellent TypeScript support
- Built-in cache management
- Simple API and learning curve

#### 5. Database Choice
**Decision**: MongoDB  
**Rationale**:
- Flexible schema for blog content
- Built-in full-text search
- Excellent for document storage
- Easy horizontal scaling

### Trade-offs Considered

| Decision | Alternative | Trade-off |
|----------|------------|-----------|
| NestJS | Express.js | More boilerplate but better architecture |
| MongoDB | PostgreSQL | Less ACID but more flexible for content |
| Tiptap | Quill | Steeper learning curve but more extensible |
| Zustand | Redux Toolkit | Less ecosystem but simpler API |
| Railway | Heroku | Less mature but better pricing |

---

## 🎯 Conclusion

This implementation plan provides a comprehensive roadmap for building a production-ready blog platform. The architecture is designed for scalability, maintainability, and optimal user experience. Following this plan will result in a robust application that meets all technical requirements while demonstrating strong full-stack development skills.

### Key Success Factors
1. **Phased Approach**: Building features incrementally ensures steady progress
2. **Testing Focus**: Comprehensive testing ensures reliability
3. **Security First**: Security considerations from the start
4. **Performance Optimization**: Continuous performance monitoring
5. **Documentation**: Clear documentation for maintainability

### Next Steps
1. Set up development environment
2. Initialize repositories
3. Begin Phase 1 implementation
4. Daily progress tracking
5. Regular testing and validation

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: Technical Team  
**Status**: Ready for Implementation
