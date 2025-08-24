#!/usr/bin/env node

/**
 * MongoDB Atlas Setup Script
 * This script initializes MongoDB Atlas with required collections, indexes, and initial data
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.production') });

// Configuration
const MONGODB_URI = process.env.DATABASE_URL || process.env.DATABASE_URL_ATLAS;
const DB_NAME = 'blog-platform';

// Initial categories data
const initialCategories = [
  { name: 'Technology', slug: 'technology', description: 'Tech news, tutorials, and insights', color: '#3B82F6', icon: 'laptop', order: 1 },
  { name: 'Development', slug: 'development', description: 'Programming and software development', color: '#10B981', icon: 'code', order: 2 },
  { name: 'Design', slug: 'design', description: 'UI/UX design and creative content', color: '#F59E0B', icon: 'palette', order: 3 },
  { name: 'Business', slug: 'business', description: 'Business strategies and entrepreneurship', color: '#6366F1', icon: 'briefcase', order: 4 },
  { name: 'Lifestyle', slug: 'lifestyle', description: 'Life, health, and personal growth', color: '#EC4899', icon: 'heart', order: 5 },
  { name: 'Tutorial', slug: 'tutorial', description: 'How-to guides and learning resources', color: '#8B5CF6', icon: 'book', order: 6 },
];

// Index definitions
const indexDefinitions = {
  users: [
    { key: { email: 1 }, options: { unique: true, name: 'email_unique' } },
    { key: { username: 1 }, options: { unique: true, name: 'username_unique' } },
    { key: { createdAt: -1 }, options: { name: 'created_at_desc' } },
  ],
  posts: [
    { key: { slug: 1 }, options: { unique: true, name: 'slug_unique' } },
    { key: { author: 1, status: 1, publishedAt: -1 }, options: { name: 'author_status_published' } },
    { key: { tags: 1, status: 1 }, options: { name: 'tags_status' } },
    { key: { category: 1, status: 1 }, options: { name: 'category_status' } },
    { key: { status: 1, publishedAt: -1 }, options: { name: 'status_published' } },
    { key: { featured: 1, status: 1, publishedAt: -1 }, options: { name: 'featured_posts' } },
    { key: { createdAt: -1 }, options: { name: 'created_at_desc' } },
    // Text index for full-text search
    { key: { title: 'text', content: 'text', excerpt: 'text', tags: 'text' }, options: { name: 'text_search' } },
  ],
  comments: [
    { key: { postId: 1, path: 1 }, options: { name: 'post_path' } },
    { key: { userId: 1, createdAt: -1 }, options: { name: 'user_created' } },
    { key: { postId: 1, createdAt: -1 }, options: { name: 'post_created' } },
    { key: { parentId: 1 }, options: { name: 'parent_comment' } },
    { key: { isDeleted: 1, postId: 1 }, options: { name: 'deleted_status' } },
  ],
  likes: [
    { key: { userId: 1, targetId: 1, targetType: 1 }, options: { unique: true, name: 'user_target_unique' } },
    { key: { targetId: 1, targetType: 1 }, options: { name: 'target_lookup' } },
    { key: { userId: 1, createdAt: -1 }, options: { name: 'user_likes' } },
    { key: { createdAt: -1 }, options: { name: 'recent_likes' } },
  ],
  categories: [
    { key: { slug: 1 }, options: { unique: true, name: 'slug_unique' } },
    { key: { name: 1 }, options: { unique: true, name: 'name_unique' } },
    { key: { order: 1 }, options: { name: 'display_order' } },
    { key: { isActive: 1, order: 1 }, options: { name: 'active_ordered' } },
  ],
  analytics: [
    { key: { postId: 1, userId: 1, type: 1 }, options: { name: 'post_user_type' } },
    { key: { createdAt: -1 }, options: { name: 'created_at_desc' } },
    { key: { postId: 1, type: 1, createdAt: -1 }, options: { name: 'post_analytics' } },
    { key: { userId: 1, type: 1, createdAt: -1 }, options: { name: 'user_analytics' } },
  ],
  uploads: [
    { key: { userId: 1, createdAt: -1 }, options: { name: 'user_uploads' } },
    { key: { key: 1 }, options: { unique: true, name: 'file_key_unique' } },
    { key: { mimetype: 1 }, options: { name: 'file_type' } },
  ],
};

/**
 * Connect to MongoDB Atlas
 */
async function connectToMongoDB() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    
    if (!MONGODB_URI) {
      throw new Error('DATABASE_URL or DATABASE_URL_ATLAS not found in environment variables');
    }

    // Parse the connection string to get database name
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    console.log('✅ Connected to MongoDB Atlas successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Atlas:', error.message);
    throw error;
  }
}

/**
 * Create collections if they don't exist
 */
async function createCollections(db) {
  console.log('\n📦 Creating collections...');
  
  const collections = ['users', 'posts', 'comments', 'likes', 'categories', 'analytics', 'uploads'];
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map(col => col.name);
  
  for (const collection of collections) {
    if (!existingNames.includes(collection)) {
      await db.createCollection(collection);
      console.log(`  ✅ Created collection: ${collection}`);
    } else {
      console.log(`  ℹ️  Collection already exists: ${collection}`);
    }
  }
}

/**
 * Create indexes for a collection
 */
async function createIndexesForCollection(db, collectionName, indexes) {
  console.log(`\n🔍 Creating indexes for ${collectionName}...`);
  const collection = db.collection(collectionName);
  
  for (const index of indexes) {
    try {
      const indexName = await collection.createIndex(index.key, index.options);
      console.log(`  ✅ Created index: ${indexName}`);
    } catch (error) {
      if (error.code === 85) {
        // Index already exists with different options
        console.log(`  ⚠️  Index exists with different options: ${index.options.name}`);
      } else if (error.code === 86) {
        // Index already exists
        console.log(`  ℹ️  Index already exists: ${index.options.name}`);
      } else {
        console.error(`  ❌ Failed to create index ${index.options.name}:`, error.message);
      }
    }
  }
}

/**
 * Initialize categories
 */
async function initializeCategories(db) {
  console.log('\n🏷️  Initializing categories...');
  const collection = db.collection('categories');
  
  for (const category of initialCategories) {
    try {
      const existingCategory = await collection.findOne({ slug: category.slug });
      if (!existingCategory) {
        await collection.insertOne({
          ...category,
          postCount: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`  ✅ Created category: ${category.name}`);
      } else {
        console.log(`  ℹ️  Category already exists: ${category.name}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to create category ${category.name}:`, error.message);
    }
  }
}

/**
 * Verify database setup
 */
async function verifySetup(db) {
  console.log('\n🔍 Verifying database setup...');
  
  const collections = await db.listCollections().toArray();
  console.log(`  ✅ Collections created: ${collections.length}`);
  
  for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
    const collection = db.collection(collectionName);
    const existingIndexes = await collection.indexes();
    console.log(`  ✅ ${collectionName}: ${existingIndexes.length} indexes`);
  }
  
  const categoriesCount = await db.collection('categories').countDocuments();
  console.log(`  ✅ Categories initialized: ${categoriesCount}`);
}

/**
 * Main setup function
 */
async function setupMongoDBAtlas() {
  let client;
  
  try {
    console.log('🚀 MongoDB Atlas Setup Script');
    console.log('================================\n');
    
    // Connect to MongoDB
    client = await connectToMongoDB();
    const db = client.db(DB_NAME);
    
    // Create collections
    await createCollections(db);
    
    // Create indexes
    for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
      await createIndexesForCollection(db, collectionName, indexes);
    }
    
    // Initialize categories
    await initializeCategories(db);
    
    // Verify setup
    await verifySetup(db);
    
    console.log('\n✅ MongoDB Atlas setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update your .env file with the MongoDB Atlas connection string');
    console.log('  2. Test the connection from your application');
    console.log('  3. Configure MongoDB Atlas Search if needed');
    console.log('  4. Set up monitoring and alerts in Atlas dashboard');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n👋 Disconnected from MongoDB Atlas');
    }
  }
}

// Run setup if executed directly
if (require.main === module) {
  setupMongoDBAtlas();
}

module.exports = { setupMongoDBAtlas };