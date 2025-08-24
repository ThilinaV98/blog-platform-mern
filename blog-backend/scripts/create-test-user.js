const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs').promises;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/blog-platform', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  profile: {
    displayName: String,
    avatar: String,
    bio: String,
    location: String,
    website: String,
  },
  role: { type: String, default: 'user' },
  emailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  refreshTokens: [String],
  stats: {
    totalPosts: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
  },
});

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('Test user already exists. Updating...');
      // Update the avatar path and password
      existingUser.profile.avatar = '/uploads/avatars/68a7fe5862bfd0eaad163226/avatar-1755857179502-display.webp';
      existingUser.password = await bcrypt.hash('Test123456', 10);
      await existingUser.save();
      console.log('Test user updated with avatar and new password!');
    } else {
      // Create new test user
      const hashedPassword = await bcrypt.hash('Test123456', 10);
      
      const testUser = new User({
        email: 'test@example.com',
        username: 'testuser',
        password: hashedPassword,
        profile: {
          displayName: 'Test User',
          avatar: '/uploads/avatars/68a7fe5862bfd0eaad163226/avatar-1755857179502-display.webp',
          bio: 'This is a test user account',
          location: 'Test City',
          website: 'https://example.com',
        },
        role: 'user',
        emailVerified: true,
        isActive: true,
      });

      await testUser.save();
      console.log('Test user created successfully!');
    }

    console.log('\nTest User Credentials:');
    console.log('Username: testuser');
    console.log('Email: test@example.com');
    console.log('Password: Test123456');
    console.log('Avatar: /uploads/avatars/68a7fe5862bfd0eaad163226/avatar-1755857179502-display.webp');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

createTestUser();