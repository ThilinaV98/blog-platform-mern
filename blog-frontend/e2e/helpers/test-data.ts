import { faker } from '@faker-js/faker';

export const testUsers = {
  admin: {
    email: 'admin@test.com',
    username: 'admin',
    password: 'Admin123!@#',
    displayName: 'Admin User',
  },
  author: {
    email: 'author@test.com',
    username: 'author',
    password: 'Author123!@#',
    displayName: 'Test Author',
  },
  reader: {
    email: 'reader@test.com',
    username: 'reader',
    password: 'Reader123!@#',
    displayName: 'Test Reader',
  },
};

export function generateUser() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  
  return {
    email: faker.internet.email({ firstName, lastName }),
    username: faker.internet.username({ firstName, lastName }),
    password: 'Test123!@#',
    displayName: `${firstName} ${lastName}`,
  };
}

export function generatePost() {
  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    excerpt: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['Technology', 'Design', 'Business', 'Lifestyle']),
    tags: faker.lorem.words(3).split(' '),
  };
}

export function generateProfile() {
  return {
    displayName: faker.person.fullName(),
    bio: faker.person.bio(),
    website: faker.internet.url(),
    location: `${faker.location.city()}, ${faker.location.country()}`,
    socialLinks: {
      twitter: faker.internet.username(),
      github: faker.internet.username(),
      linkedin: faker.internet.username(),
    },
  };
}

export const samplePosts = [
  {
    title: 'Getting Started with Next.js 14',
    content: `
      Next.js 14 introduces several exciting features that make building React applications even better.
      
      ## Key Features
      
      1. **App Router**: The new app directory provides a more intuitive routing system
      2. **Server Components**: React Server Components are now stable
      3. **Streaming**: Progressive rendering for better performance
      4. **Turbopack**: Faster bundling in development
      
      ## Getting Started
      
      To create a new Next.js 14 project, run:
      
      \`\`\`bash
      npx create-next-app@latest my-app
      \`\`\`
      
      This will set up a new project with all the latest features enabled by default.
    `,
    excerpt: 'Learn about the exciting new features in Next.js 14 and how to get started with them.',
    category: 'Technology',
    tags: ['nextjs', 'react', 'javascript'],
  },
  {
    title: 'Building a REST API with NestJS',
    content: `
      NestJS is a progressive Node.js framework for building efficient and scalable server-side applications.
      
      ## Why NestJS?
      
      - **TypeScript First**: Built with TypeScript from the ground up
      - **Modular Architecture**: Organize code into modules for better maintainability
      - **Dependency Injection**: Built-in IoC container for better testing
      - **Decorators**: Clean and expressive code using decorators
      
      ## Creating Your First Controller
      
      \`\`\`typescript
      @Controller('posts')
      export class PostsController {
        @Get()
        findAll() {
          return 'This returns all posts';
        }
      }
      \`\`\`
    `,
    excerpt: 'Discover how to build scalable REST APIs using NestJS and TypeScript.',
    category: 'Technology',
    tags: ['nestjs', 'nodejs', 'api'],
  },
];

export async function createTestUser(page: any, userData = generateUser()) {
  // Navigate to register page
  await page.goto('/register');
  
  // Fill registration form
  await page.getByLabel(/^email$/i).fill(userData.email);
  await page.getByLabel(/^username$/i).fill(userData.username);
  await page.getByLabel(/^password$/i).fill(userData.password);
  await page.getByLabel(/confirm password/i).fill(userData.password);
  
  if (userData.displayName) {
    await page.getByLabel(/display name/i).fill(userData.displayName);
  }
  
  // Submit form
  await page.getByRole('button', { name: /create account/i }).click();
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');
  
  return userData;
}

export async function loginUser(page: any, user = testUsers.author) {
  await page.goto('/login');
  await page.getByLabel(/email or username/i).fill(user.email);
  await page.getByLabel(/^password$/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/dashboard');
}