import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment, CommentSchema } from './schemas/comment.schema';
import { Like, LikeSchema } from '../likes/schemas/like.schema';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Like.name, schema: LikeSchema }
    ]),
    forwardRef(() => PostsModule), // Use forwardRef to handle circular dependency
  ],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}