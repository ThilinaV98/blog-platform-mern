import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Post } from '../../posts/schemas/post.schema';

export type CommentDocument = Comment & Document;

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
export class Comment {
  _id: Types.ObjectId;
  
  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId | Post;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true, maxlength: 1000 })
  content: string;

  @Prop({ required: true, index: true })
  path: string; // Materialized path pattern: "parentId1/parentId2/commentId"

  @Prop({ required: true, default: 0, min: 0, max: 3 })
  depth: number; // Nesting level (max 3)

  @Prop({ type: Types.ObjectId, ref: 'Comment' })
  parentId?: Types.ObjectId;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop()
  editedAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean; // Soft delete

  @Prop()
  deletedAt?: Date;

  @Prop({ default: 0, min: 0 })
  likes: number; // Denormalized count

  @Prop({ default: 0, min: 0 })
  reports: number; // Flag count

  @Prop({ default: true })
  isVisible: boolean; // Can be hidden by moderators

  // Mongoose timestamps (added explicitly for TypeScript support)
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // Virtual for replies count
  repliesCount?: number;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes for performance
CommentSchema.index({ postId: 1, path: 1 }); // For fetching post comments in order
CommentSchema.index({ userId: 1, createdAt: -1 }); // For user's comments
CommentSchema.index({ postId: 1, createdAt: -1 }); // For chronological sorting
CommentSchema.index({ parentId: 1 }); // For finding direct replies

// Virtual for checking if comment has replies
CommentSchema.virtual('hasReplies').get(function() {
  return this.repliesCount && this.repliesCount > 0;
});

// Pre-save middleware to handle path generation
CommentSchema.pre('save', async function(this: CommentDocument, next) {
  if (this.isNew && (!this.path || this.path === '')) {
    // If it's a new comment and path isn't set, generate it
    const commentId = (this._id as Types.ObjectId).toString();
    if (this.parentId) {
      // Find parent comment to build path
      const ParentComment = this.model('Comment');
      const parent = await ParentComment.findById(this.parentId) as CommentDocument | null;
      if (parent) {
        this.path = `${parent.path}/${commentId}`;
        this.depth = parent.depth + 1;
      } else {
        this.path = commentId;
        this.depth = 0;
      }
    } else {
      // Root comment
      this.path = commentId;
      this.depth = 0;
    }
  }
  
  next();
});