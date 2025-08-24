import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post, PostSchema } from './schemas/post.schema';
import { Like, LikeSchema } from '../likes/schemas/like.schema';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';
import { UsersModule } from '../users/users.module';
import { CommentsModule } from '../comments/comments.module';
import { LikesModule } from '../likes/likes.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Comment.name, schema: CommentSchema }
    ]),
    forwardRef(() => UsersModule), // Use forwardRef for circular dependency with UsersModule
    forwardRef(() => CommentsModule), // Use forwardRef for circular dependency with CommentsModule
    forwardRef(() => LikesModule), // Use forwardRef for cascade delete
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}