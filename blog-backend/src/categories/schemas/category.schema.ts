import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret: any) {
      delete ret.__v;
      return ret;
    }
  }
})
export class Category {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true, maxlength: 50 })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ maxlength: 200 })
  description?: string;

  @Prop({ default: 0 })
  postCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  icon?: string; // Optional icon class or URL

  @Prop()
  color?: string; // Optional color for UI

  createdAt: Date;
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes (slug already has index: true in @Prop decorator)
CategorySchema.index({ name: 'text' });