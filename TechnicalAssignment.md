# Technical Assignment – MERN Stack

**Position:** Software Engineer

## Assignment: Blog Platform with User Management

### Overview
Build a modern blog platform that demonstrates solid full-stack development skills with user authentication, content management, and interactive features. Focus on clean architecture, proper state management, and production-ready code practices.

---

## Requirements

### Core Features
- **User Authentication:** Registration, login, logout with protected routes
- **Blog Management:** Create, edit, delete, and publish blog posts
- **Content Features:** Rich text editor, image uploads, draft/published states
- **User Interactions:** Like/unlike posts, comment system with replies
- **User Profiles:** Author profiles with bio and post history
- **Search & Filter:** Search posts by title/content, filter by author or tags

### Frontend (Next.js + TypeScript)
- **Authentication Pages:** Login/register forms with validation
- **Blog Feed:** Paginated list of published posts with search functionality
- **Post Editor:** Rich text editor (React Quill or similar) with image upload
- **Post Details:** Full post view with comments and interaction features
- **User Dashboard:** Manage personal posts (drafts, published, analytics)
- **Responsive Design:** Mobile-first approach with modern UI components
- **State Management:** Context API or Zustand for auth and global state
- **Performance:** Image optimization, skeleton loading states

### Backend (NestJS + TypeScript)
- **Authentication Service:** JWT-based auth with password hashing
- **User Management:** User registration, profile management, password reset
- **Blog Post API:** CRUD operations with draft/publish workflow
- **Comment System:** Nested comments with moderation capabilities
- **File Upload:** Image upload with validation and storage management
- **Search Service:** Full-text search implementation
- **Database Relations:** Users, posts, comments, likes with proper associations
- **Input Validation:** Comprehensive validation using `class-validator`

### Technical Implementation
- **Database Design:** MongoDB with optimized schemas and indexing
- **File Storage:** Local file system or cloud storage integration
- **Pagination:** Efficient pagination for posts and comments
- **Caching:** Basic caching for frequently accessed data
- **Security:** Input sanitization, rate limiting, CORS configuration
- **Error Handling:** Consistent error responses and logging
- **API Documentation:** Swagger/OpenAPI with comprehensive endpoint docs

### Database Schema
- **Users:** Authentication data, profile information, preferences
- **Posts:** Content, metadata, author relations, publication status
- **Comments:** Threaded comment structure with user associations
- **Likes:** User–post relationship tracking
- **Categories/Tags:** Content organization and filtering

### Advanced Features (Optional – for extra credit)
- **Email Notifications:** Comment notifications using NodeMailer
- **Social Media Integration:** Share posts to social platforms
- **Analytics Dashboard:** Basic post performance metrics
- **Content Moderation:** Flag inappropriate content functionality
- **SEO Optimization:** Meta tags, sitemaps, and structured data

---

## Evaluation Criteria
- **Architecture:** Clean code organization and separation of concerns
- **Database Design:** Efficient schemas and proper relationships
- **Authentication Flow:** Secure and user-friendly auth implementation
- **API Design:** RESTful principles and consistent response patterns
- **Frontend Skills:** React best practices and responsive design
- **Error Handling:** Graceful error management and user feedback
- **Code Quality:** Readable, maintainable, and well-documented code
- **Testing:** Meaningful test coverage for critical functionality

---

## Deliverables
1. **GitHub Repository:** Well-organized codebase with clear commit history  
2. **Live Demo:** Deployed application (Vercel + Railway/Render)  
3. **README Documentation:** Setup instructions and feature overview  
4. **API Documentation:** Swagger/Postman collection  
5. **Technical Decisions:** Brief document explaining key architectural choices  
6. **Test Results:** Coverage report and test execution summary

/sc:analyze @TechnicalAssignment.md
/sc:design Blog Platform Implementation Plan
create the .md file document for Blog Platform Complete Implementation Plan
