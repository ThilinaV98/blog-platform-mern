import { connect, Types } from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface PostDocument {
  _id: Types.ObjectId;
  category?: string;
}

/**
 * Normalize category name for consistency
 */
function normalizeCategory(category?: string): string | undefined {
  if (!category) {
    return undefined;
  }
  
  // Trim whitespace, replace multiple spaces with single space
  const normalized = category.trim().replace(/\s+/g, ' ');
  
  // Convert to Title Case (capitalize first letter of each word)
  return normalized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function normalizeExistingCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-platform';
    console.log('Connecting to MongoDB...');
    const connection = await connect(mongoUri);
    
    const db = connection.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }
    const postsCollection = db.collection('posts');
    
    // Find all posts with categories
    console.log('Fetching posts with categories...');
    const posts = await postsCollection.find(
      { category: { $exists: true, $ne: null } },
      { projection: { _id: 1, category: 1 } }
    ).toArray();
    
    const typedPosts = posts as unknown as PostDocument[];
    
    console.log(`Found ${typedPosts.length} posts with categories`);
    
    // Track changes
    const categoryMap = new Map<string, string>();
    let updatedCount = 0;
    
    // Process each post
    for (const post of typedPosts) {
      if (post.category) {
        const normalized = normalizeCategory(post.category);
        
        if (normalized && normalized !== post.category) {
          // Track the change
          if (!categoryMap.has(post.category)) {
            categoryMap.set(post.category, normalized);
            console.log(`  "${post.category}" → "${normalized}"`);
          }
          
          // Update the post
          await postsCollection.updateOne(
            { _id: post._id },
            { $set: { category: normalized } }
          );
          updatedCount++;
        }
      }
    }
    
    console.log(`\nNormalization complete!`);
    console.log(`Updated ${updatedCount} posts`);
    console.log(`Unique category mappings:`);
    categoryMap.forEach((normalized, original) => {
      console.log(`  "${original}" → "${normalized}"`);
    });
    
    // Show final category counts
    console.log('\nFinal category distribution:');
    const categoryCounts = await postsCollection.aggregate([
      { $match: { category: { $exists: true, $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();
    
    categoryCounts.forEach((cat: any) => {
      console.log(`  ${cat._id}: ${cat.count} posts`);
    });
    
    // Close connection
    await connection.disconnect();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error normalizing categories:', error);
    process.exit(1);
  }
}

// Run the script
normalizeExistingCategories();