import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type PostDocument = Post & Document;

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Schema({ 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret: any) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
})
export class Post {
  _id: Types.ObjectId;
  
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  content: string; // Rich HTML content from Tiptap

  @Prop({ maxlength: 300 })
  excerpt: string; // Short description for SEO and previews

  @Prop()
  coverImage?: string; // URL to cover image

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  author: Types.ObjectId | User;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ index: true })
  category?: string;

  @Prop({ 
    type: String, 
    enum: PostStatus, 
    default: PostStatus.DRAFT,
    index: true 
  })
  status: PostStatus;

  @Prop({ index: true })
  publishedAt?: Date;

  @Prop()
  scheduledAt?: Date;

  @Prop({ default: false })
  featured: boolean;

  @Prop({ 
    type: Object,
    default: {
      readTime: 0,
      wordCount: 0,
      views: 0,
      uniqueViews: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    }
  })
  metadata: {
    readTime: number;      // Calculated in minutes
    wordCount: number;
    views: number;         // Total view count
    uniqueViews: number;   // Unique visitor count
    likes: number;         // Denormalized like count
    comments: number;      // Denormalized comment count
    shares: number;        // Social share count
  };

  @Prop({ 
    type: Object,
    default: {}
  })
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogImage?: string;
  };

  @Prop({ type: [Object] })
  versions?: {
    content: string;
    editedBy: Types.ObjectId;
    editedAt: Date;
    changeNote?: string;
  }[];

  // Virtual for URL
  url?: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Create compound text index for full-text search
PostSchema.index({
  title: 'text',
  content: 'text',
  excerpt: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    excerpt: 3,
    content: 1
  },
  name: 'post_text_search'
});

// Additional indexes for performance
PostSchema.index({ tags: 1, status: 1 });
PostSchema.index({ publishedAt: -1, status: 1 });
PostSchema.index({ status: 1, publishedAt: -1 }); // For listing published posts

// Virtual for post URL
PostSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Pre-save middleware to auto-generate excerpt if not provided
PostSchema.pre('save', function(next) {
  if (!this.excerpt && this.content) {
    // Strip HTML tags and truncate
    const plainText = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = plainText.substring(0, 160) + '...';
  }
  
  // Set publishedAt when status changes to published
  if (this.status === PostStatus.PUBLISHED && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});