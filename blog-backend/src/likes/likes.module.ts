import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { Like, LikeSchema } from './schemas/like.schema';
import { Post, PostSchema } from '../posts/schemas/post.schema';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Like.name, schema: LikeSchema },
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
    ]),
  ],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}