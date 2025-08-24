import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Post } from '../../posts/schemas/post.schema';
import { Comment } from '../../comments/schemas/comment.schema';

export type LikeDocument = Like & Document;

export enum LikeTargetType {
  POST = 'post',
  COMMENT = 'comment',
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
export class Like {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId | Post | Comment;

  @Prop({ 
    type: String, 
    enum: LikeTargetType, 
    required: true,
    index: true 
  })
  targetType: LikeTargetType;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Compound unique index to prevent duplicate likes
LikeSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });

// Index for finding likes by target (for listing who liked)
LikeSchema.index({ targetId: 1, targetType: 1, createdAt: -1 });

// Index for finding user's likes
LikeSchema.index({ userId: 1, createdAt: -1 });

// Index for counting likes by target type
LikeSchema.index({ targetType: 1, targetId: 1 });