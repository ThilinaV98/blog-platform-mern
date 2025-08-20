import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.DATABASE_URL || 'mongodb://localhost:27017/blog-platform',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
}))