# 📝 Modern Blog Platform

A full-stack blog platform built with Next.js 14, NestJS, MongoDB, and TypeScript. Features user authentication, rich text editing, real-time comments, and comprehensive content management.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![NestJS](https://img.shields.io/badge/NestJS-10.0-red)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)
![Node.js](https://img.shields.io/badge/Node.js-20.0-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

### Core Features
- **🔐 User Authentication**: Secure JWT-based authentication with refresh token rotation
- **📝 Rich Text Editor**: Full-featured editor with TipTap (tables, images, code blocks, formatting)
- **💬 Comment System**: Nested comments with real-time updates and moderation
- **❤️ Social Interactions**: Like posts and comments, track engagement metrics
- **🔍 Search & Filter**: Full-text search with category and tag filtering
- **👤 User Profiles**: Customizable profiles with bio, avatar, and social links
- **📊 Analytics Dashboard**: Track post performance, views, and engagement
- **📱 Responsive Design**: Mobile-first approach with optimized performance

### Advanced Features
- **🖼️ Image Management**: Upload, resize, and optimize images automatically
- **📧 Email Notifications**: Comment notifications and password reset emails
- **🎨 Dark Mode**: System-aware theme switching
- **🔒 Role-Based Access**: User, Author, Moderator, and Admin roles
- **📈 SEO Optimized**: Meta tags, sitemaps, and structured data
- **⚡ Performance**: Redis caching, lazy loading, and optimized bundles
- **🛡️ Security**: Rate limiting, CORS, CSP headers, input sanitization

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand + React Query
- **Rich Text Editor**: TipTap v2
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Testing**: Jest + React Testing Library + Playwright

### Backend
- **Framework**: NestJS 10
- **Language**: TypeScript 5.0
- **Database**: MongoDB 7.0 with Mongoose
- **Caching**: Redis
- **Authentication**: Passport.js + JWT
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **File Upload**: Multer + Sharp
- **Email**: Nodemailer
- **Testing**: Jest + Supertest

### DevOps & Tools
- **Version Control**: Git + GitHub
- **Package Manager**: npm
- **Linting**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **API Testing**: Postman
- **Monitoring**: Sentry (optional)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.0 or higher
- **npm** 10.0 or higher
- **MongoDB** 7.0 or higher (local or Atlas)
- **Redis** 7.0 or higher (optional, for caching)
- **Git** 2.0 or higher

### System Requirements
- **OS**: Windows 10+, macOS 10.15+, or Ubuntu 20.04+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 2GB free space
- **CPU**: 2+ cores recommended

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/blog-platform.git
cd blog-platform
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd blog-backend
```

#### Install Dependencies

```bash
npm install
```

#### Environment Configuration

Create a `.env` file in the `blog-backend` directory:

```env
# Server Configuration
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5001

# Database Configuration (Local MongoDB)
MONGODB_URI=mongodb://localhost:27017/blog-platform

# JWT Configuration
JWT_SECRET=your-local-dev-secret-key-change-in-production
JWT_REFRESH_SECRET=your-local-dev-refresh-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# File Upload Configuration (Local Storage)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Rate Limiting (Optional for development)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000  # Higher limit for development
```

#### Database Setup

**Local MongoDB Installation**:

```bash
# macOS:
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0

# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Windows:
# Download the installer from https://www.mongodb.com/download-center/community
# Run the MSI installer and follow the setup wizard
# MongoDB will be installed as a Windows service

# Verify MongoDB is running:
mongosh --eval "db.version()"
```

**Create Database** (optional, will be created automatically):
```bash
mongosh
use blog-platform
db.createCollection("users")
exit
```

**Redis Setup** (Optional, for caching):
```bash
# macOS:
brew install redis
brew services start redis

# Ubuntu/Debian:
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis

# Windows:
# Download from https://github.com/microsoftarchive/redis/releases
# Extract and run redis-server.exe

# Verify Redis is running:
redis-cli ping
# Should return: PONG
```

#### Run Backend Development Server

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The backend API will be available at `http://localhost:4000`

#### API Documentation

Once the backend is running, access the Swagger documentation at:
```
http://localhost:4000/api/docs
```

### 3. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd blog-frontend
```

#### Install Dependencies

```bash
npm install
```

#### Environment Configuration

Create a `.env.local` file in the `blog-frontend` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:5001

# Optional: For production only
# NEXT_PUBLIC_GA_ID=UA-XXXXXXXXX
# NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

#### Run Frontend Development Server

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build
npm run start
```

The frontend application will be available at `http://localhost:5001`

## 🏗️ Project Structure

```
blog-platform/
├── blog-frontend/          # Next.js frontend application
│   ├── app/               # App Router pages and layouts
│   ├── components/        # Reusable React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions and API clients
│   ├── store/            # Zustand state management
│   ├── styles/           # Global styles and Tailwind config
│   ├── public/           # Static assets
│   └── types/            # TypeScript type definitions
│
├── blog-backend/          # NestJS backend application
│   ├── src/
│   │   ├── auth/         # Authentication module
│   │   ├── users/        # User management module
│   │   ├── posts/        # Blog posts module
│   │   ├── comments/     # Comments module
│   │   ├── uploads/      # File upload module
│   │   ├── common/       # Shared utilities and guards
│   │   └── main.ts       # Application entry point
│   ├── uploads/          # Local file storage
│   └── test/             # Test files
│
└── docs/                  # Additional documentation
```

## 🧪 Testing

### Backend Testing

```bash
cd blog-backend

# Run unit tests
npm run test

# Run unit tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

### Frontend Testing

```bash
cd blog-frontend

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests with Playwright
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

## 📦 Building for Production

### Backend Build

```bash
cd blog-backend
npm run build
```

The production build will be in the `dist` directory.

### Frontend Build

```bash
cd blog-frontend
npm run build
```

The production build will be in the `.next` directory.

## 💻 Local Development

### Running the Application

To run the full application locally, you'll need three terminal windows:

#### Terminal 1: MongoDB (if not running as a service)
```bash
# macOS/Linux
mongod --dbpath ~/data/db

# Windows
mongod.exe --dbpath C:\data\db
```

#### Terminal 2: Backend Server
```bash
cd blog-backend
npm run start:dev
# Backend will run on http://localhost:4000
# Swagger docs available at http://localhost:4000/api/docs
```

#### Terminal 3: Frontend Server
```bash
cd blog-frontend
npm run dev
# Frontend will run on http://localhost:5001
```

### Development Commands

#### Backend Commands
```bash
# Development with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build locally
npm run start:prod

# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Format code
npm run format

# Lint code
npm run lint
```

#### Frontend Commands
```bash
# Development server
npm run dev

# Build production bundle
npm run build

# Run production build locally
npm start

# Run tests
npm test

# Type checking
npm run type-check

# Lint and format
npm run lint
npm run format
```

### Database Management

#### MongoDB Commands
```bash
# Connect to MongoDB shell
mongosh

# Select database
use blog-platform

# View collections
show collections

# Count documents
db.posts.countDocuments()
db.users.countDocuments()
db.comments.countDocuments()

# Clear specific collection (⚠️ Caution!)
db.posts.deleteMany({})

# Create indexes (run once)
db.posts.createIndex({ slug: 1 }, { unique: true })
db.posts.createIndex({ "title": "text", "content": "text" })
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
```

#### Redis Commands (if using)
```bash
# Connect to Redis CLI
redis-cli

# Check if Redis is running
ping

# List all keys
keys *

# Clear cache (⚠️ Caution!)
flushdb

# Monitor Redis commands in real-time
monitor
```

### Common Development Tasks

#### Creating a Test User
1. Start the backend server
2. Use the API endpoint or Swagger UI:
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123!@#",
    "displayName": "Test User"
  }'
```

#### Seeding Sample Data
```bash
cd blog-backend
# Create a seed script if needed
npm run seed # (if implemented)
```

#### Accessing the Application
- **Frontend**: http://localhost:5001
- **Backend API**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/api/docs

### Development Tips

1. **Environment Variables**: Always use `.env.local` for frontend and `.env` for backend
2. **Hot Reload**: Both frontend and backend support hot reload in development
3. **API Testing**: Use Swagger UI at `/api/docs` for testing API endpoints
4. **Database GUI**: Consider using MongoDB Compass for visual database management
5. **Git Workflow**: Create feature branches for new development

## 🚀 Deployment (Coming Soon)

The application is currently set up for local development only. Production deployment guides for Vercel (frontend), Railway/Render (backend), and MongoDB Atlas (database) will be added once the deployment configuration is complete.

### Planned Deployment Architecture:
- **Frontend**: Vercel with edge functions
- **Backend**: Railway or Render with auto-scaling
- **Database**: MongoDB Atlas with replica sets
- **File Storage**: AWS S3 or Cloudinary
- **Caching**: Redis Cloud
- **CDN**: CloudFlare or Vercel Edge Network

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### User Endpoints
- `GET /api/users/profile` - Get current user profile
- `PATCH /api/users/profile` - Update user profile
- `GET /api/users/:username` - Get user by username
- `POST /api/users/avatar` - Upload user avatar

### Post Endpoints
- `GET /api/posts` - Get all posts (paginated)
- `POST /api/posts` - Create new post
- `GET /api/posts/:slug` - Get post by slug
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like a post
- `DELETE /api/posts/:id/like` - Unlike a post

### Comment Endpoints
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Create comment
- `PATCH /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like a comment

Full API documentation with request/response examples is available at `/api/docs` when running the backend.

## 🔧 Configuration

### Frontend Configuration

Key configuration files:
- `next.config.js` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

### Backend Configuration

Key configuration files:
- `nest-cli.json` - NestJS CLI configuration
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network access for MongoDB Atlas

2. **Port Already in Use**
   - Change port in `.env` file
   - Kill the process using the port: `lsof -ti:PORT | xargs kill`

3. **Module Not Found Errors**
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

4. **CORS Issues**
   - Verify `FRONTEND_URL` in backend `.env`
   - Check CORS configuration in `main.ts`

5. **Image Upload Issues**
   - Check file permissions for `uploads` directory
   - Verify `MAX_FILE_SIZE` and `ALLOWED_FILE_TYPES` in `.env`


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - [GitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- NestJS team for the enterprise-grade backend framework
- Vercel for hosting and deployment platform
- MongoDB for the database solution
- All open-source contributors

## 📞 Support

For support, email support@blogplatform.com or open an issue on GitHub.

## 🗺️ Roadmap

- [ ] Real-time notifications with WebSockets
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] AI-powered content recommendations
- [ ] Mobile applications (React Native)
- [ ] GraphQL API support
- [ ] Content moderation with AI
- [ ] Advanced SEO features

---

Built with using modern web technologies