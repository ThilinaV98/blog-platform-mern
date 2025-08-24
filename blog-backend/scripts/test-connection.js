#!/usr/bin/env node

/**
 * MongoDB Connection Test Script
 * Tests connection to MongoDB (local or Atlas) and performs basic operations
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Use Atlas URL if available, otherwise local
const MONGODB_URI = process.env.DATABASE_URL_ATLAS || process.env.DATABASE_URL || 'mongodb://localhost:27017/blog-platform';

async function testConnection() {
  console.log('🔌 MongoDB Connection Test');
  console.log('==========================\n');
  console.log(`📍 Testing connection to: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

  try {
    // Connect to MongoDB
    console.log('⏳ Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Successfully connected to MongoDB!\n');

    // Get database information
    const db = mongoose.connection.db;
    const admin = db.admin();
    
    // Get server status
    try {
      const serverStatus = await admin.serverStatus();
      console.log('📊 Server Information:');
      console.log(`  • Version: ${serverStatus.version}`);
      console.log(`  • Host: ${serverStatus.host || 'N/A'}`);
      console.log(`  • Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
    } catch (error) {
      console.log('ℹ️  Server status not available (might be Atlas free tier)');
    }

    // List collections
    console.log('\n📦 Collections:');
    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      console.log('  • No collections found (empty database)');
    } else {
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`  • ${collection.name}: ${count} documents`);
      }
    }

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const mainCollections = ['users', 'posts', 'comments', 'likes', 'categories'];
    for (const collName of mainCollections) {
      const coll = db.collection(collName);
      try {
        const indexes = await coll.indexes();
        if (indexes.length > 0) {
          console.log(`  • ${collName}: ${indexes.length} indexes`);
        }
      } catch (error) {
        // Collection might not exist
      }
    }

    // Test write operation
    console.log('\n✍️  Testing write operation...');
    const testCollection = db.collection('_test_connection');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Connection test document',
    };
    
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('  ✅ Write test successful');
    
    // Test read operation
    console.log('\n📖 Testing read operation...');
    const readResult = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('  ✅ Read test successful');
    
    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('  ✅ Cleanup successful');

    // Connection pool stats
    console.log('\n🔗 Connection Pool:');
    const poolStats = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    console.log(`  • State: ${states[poolStats]}`);
    console.log(`  • Database: ${db.databaseName}`);

    console.log('\n✅ All tests passed successfully!');
    console.log('\n📝 Summary:');
    console.log('  • Connection: OK');
    console.log('  • Read/Write: OK');
    console.log('  • Database is ready for use');

  } catch (error) {
    console.error('\n❌ Connection test failed!');
    console.error('Error:', error.message);
    
    if (error.name === 'MongoServerError') {
      console.error('\n🔧 Troubleshooting tips:');
      console.error('  • Check if MongoDB is running');
      console.error('  • Verify connection string in .env file');
      console.error('  • Check network/firewall settings');
      console.error('  • For Atlas: Check IP whitelist');
    }
    
    process.exit(1);
  } finally {
    // Disconnect
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run test if executed directly
if (require.main === module) {
  testConnection();
}

module.exports = { testConnection };