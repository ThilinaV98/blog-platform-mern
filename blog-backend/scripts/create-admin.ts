import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

async function createAdmin() {
  console.log('🚀 Starting Admin User Creation Script...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    console.log('Please provide admin user details:\n');

    // Get admin details from user input
    const email = await question('Admin Email: ');
    const username = await question('Admin Username: ');
    const displayName = await question('Admin Display Name (optional): ');
    
    // Hide password input
    process.stdout.write('Admin Password: ');
    process.stdin.setRawMode(true);
    
    let password = '';
    process.stdin.on('data', function(char) {
      const charStr = char.toString();
      switch (charStr) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl-d
          process.stdin.setRawMode(false);
          process.stdin.pause();
          break;
        default:
          password += charStr;
          process.stdout.write('*');
          break;
      }
    });

    // Wait for password input to complete
    await new Promise<void>((resolve) => {
      process.stdin.on('pause', resolve);
    });

    console.log('\n');

    // Validate input
    if (!email || !username || !password) {
      console.error('❌ Email, username, and password are required!');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long!');
      process.exit(1);
    }

    // Check if user already exists
    const existingUserByEmail = await usersService.findByEmail(email).catch(() => null);
    const existingUserByUsername = await usersService.findByUsername(username).catch(() => null);

    if (existingUserByEmail) {
      console.log('📝 User with this email already exists. Updating role to admin...');
      
      // Update existing user to admin role directly in database
      const userModel = usersService['userModel']; // Access the model directly
      await userModel.findByIdAndUpdate(existingUserByEmail._id, { role: 'admin' });
      
      console.log('✅ Successfully updated existing user to admin role!');
      console.log(`📧 Email: ${existingUserByEmail.email}`);
      console.log(`👤 Username: ${existingUserByEmail.username}`);
      console.log(`🔑 Role: admin\n`);
      
    } else if (existingUserByUsername) {
      console.log('📝 User with this username already exists. Updating role to admin...');
      
      // Update existing user to admin role directly in database
      const userModel = usersService['userModel']; // Access the model directly
      await userModel.findByIdAndUpdate(existingUserByUsername._id, { role: 'admin' });
      
      console.log('✅ Successfully updated existing user to admin role!');
      console.log(`📧 Email: ${existingUserByUsername.email}`);
      console.log(`👤 Username: ${existingUserByUsername.username}`);
      console.log(`🔑 Role: admin\n`);
      
    } else {
      // Create new admin user
      console.log('🔄 Creating new admin user...');

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create the admin user directly using the database
      const userModel = usersService['userModel']; // Access the model directly
      
      const adminUser = new userModel({
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password: hashedPassword,
        role: 'admin',
        emailVerified: true, // Auto-verify admin users
        profile: {
          displayName: displayName.trim() || username.trim(),
        },
        refreshTokens: [],
      });

      await adminUser.save();

      console.log('✅ Successfully created admin user!');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Username: ${username}`);
      console.log(`🔑 Role: admin`);
      console.log(`✅ Email Verified: Yes\n`);
    }

    console.log('🎉 Admin user setup completed successfully!');
    console.log('💡 You can now login with these credentials to access admin features.');
    console.log('📊 Access the reports page at: /dashboard/admin/reports\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await app.close();
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  console.log('\n❌ Script interrupted by user');
  process.exit(1);
});

// Run the script
createAdmin().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});