import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  _id: Types.ObjectId;
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  username: string;

  @Prop({
    required: true,
  })
  password: string;

  @Prop({
    type: {
      displayName: String,
      bio: String,
      avatar: String,
      website: String,
      location: String,
      socialLinks: {
        twitter: String,
        github: String,
        linkedin: String,
      },
    },
    default: {},
  })
  profile: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    website?: string;
    location?: string;
    socialLinks?: {
      twitter?: string;
      github?: string;
      linkedin?: string;
    };
  };

  @Prop({
    type: String,
    enum: ['user', 'author', 'moderator', 'admin'],
    default: 'user',
  })
  role: string;

  @Prop({
    default: false,
  })
  emailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop({
    type: [String],
    default: [],
  })
  refreshTokens: string[];

  @Prop()
  lastLogin?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes (email and username already have unique indexes from @Prop decorator)
// Only add additional indexes not covered by unique constraints
UserSchema.index({ createdAt: -1 });