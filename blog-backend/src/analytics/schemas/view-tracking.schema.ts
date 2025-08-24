import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ViewTrackingDocument = ViewTracking & Document;

@Schema({ 
  timestamps: true,
  collection: 'view_trackings'
})
export class ViewTracking {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, index: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId; // If user is logged in

  @Prop({ required: true })
  sessionId: string; // For tracking unique views

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  referrer?: string;

  @Prop()
  country?: string;

  @Prop()
  city?: string;

  @Prop({ default: 0 })
  duration: number; // Time spent on page in seconds

  @Prop({ type: Date, default: Date.now })
  viewedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ViewTrackingSchema = SchemaFactory.createForClass(ViewTracking);

// Indexes for analytics queries
ViewTrackingSchema.index({ postId: 1, viewedAt: -1 });
ViewTrackingSchema.index({ postId: 1, sessionId: 1 });
ViewTrackingSchema.index({ userId: 1, viewedAt: -1 });

// TTL index to auto-delete old tracking data after 90 days (viewedAt already has index: true in decorator)
ViewTrackingSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });