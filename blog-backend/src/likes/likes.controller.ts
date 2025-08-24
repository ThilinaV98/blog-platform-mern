import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Param, 
  Query,
  UseGuards, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LikesService } from './likes.service';
import { QueryLikesDto, LikeStatusDto, LikesListDto } from './dto/like.dto';
import { User } from '../users/schemas/user.schema';

@ApiTags('likes')
@Controller('api')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  // Post Like Endpoints
  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post liked successfully',
    type: LikeStatusDto
  })
  @ApiResponse({ status: 400, description: 'Post already liked' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async likePost(
    @Param('id') postId: string,
    @CurrentUser() user: any
  ): Promise<LikeStatusDto> {
    return this.likesService.likePost(postId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({ 
    status: 200, 
    description: 'Post unliked successfully',
    type: LikeStatusDto
  })
  @ApiResponse({ status: 400, description: 'Post not liked' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async unlikePost(
    @Param('id') postId: string,
    @CurrentUser() user: any
  ): Promise<LikeStatusDto> {
    return this.likesService.unlikePost(postId, user.userId);
  }

  @Get('posts/:id/likes')
  @ApiOperation({ summary: 'Get users who liked a post' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of users who liked the post',
    type: LikesListDto
  })
  async getPostLikes(
    @Param('id') postId: string,
    @Query() query: QueryLikesDto
  ): Promise<LikesListDto> {
    return this.likesService.getPostLikes(postId, query);
  }

  // Comment Like Endpoints
  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a comment' })
  @ApiResponse({ 
    status: 200, 
    description: 'Comment liked successfully',
    type: LikeStatusDto
  })
  @ApiResponse({ status: 400, description: 'Comment already liked' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async likeComment(
    @Param('id') commentId: string,
    @CurrentUser() user: any
  ): Promise<LikeStatusDto> {
    return this.likesService.likeComment(commentId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiResponse({ 
    status: 200, 
    description: 'Comment unliked successfully',
    type: LikeStatusDto
  })
  @ApiResponse({ status: 400, description: 'Comment not liked' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async unlikeComment(
    @Param('id') commentId: string,
    @CurrentUser() user: any
  ): Promise<LikeStatusDto> {
    return this.likesService.unlikeComment(commentId, user.userId);
  }

  @Get('comments/:id/likes')
  @ApiOperation({ summary: 'Get users who liked a comment' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of users who liked the comment',
    type: LikesListDto
  })
  async getCommentLikes(
    @Param('id') commentId: string,
    @Query() query: QueryLikesDto
  ): Promise<LikesListDto> {
    return this.likesService.getCommentLikes(commentId, query);
  }

  // User Likes Endpoint
  @UseGuards(JwtAuthGuard)
  @Get('user/likes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s likes' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of user\'s likes',
    type: LikesListDto
  })
  async getUserLikes(
    @CurrentUser() user: any,
    @Query() query: QueryLikesDto
  ): Promise<LikesListDto> {
    return this.likesService.getUserLikes(user.userId, query);
  }
}