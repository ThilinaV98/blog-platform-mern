import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Query,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a new comment on a post
   */
  @UseGuards(JwtAuthGuard)
  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    const comment = await this.commentsService.create(
      postId,
      user.userId,
      createCommentDto
    );
    
    return {
      success: true,
      data: comment,
    };
  }

  /**
   * Get all comments for a post
   */
  @Get('posts/:postId/comments')
  async findByPost(
    @Param('postId') postId: string,
    @Query() query: QueryCommentDto,
  ) {
    const result = await this.commentsService.findByPost(postId, query);
    
    return {
      success: true,
      data: result.comments,
      meta: result.meta,
    };
  }

  /**
   * Get a single comment with replies
   */
  @Get('comments/:id')
  async findOne(@Param('id') id: string) {
    const comment = await this.commentsService.findOne(id);
    
    return {
      success: true,
      data: comment,
    };
  }

  /**
   * Update a comment
   */
  @UseGuards(JwtAuthGuard)
  @Patch('comments/:id')
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: any,
  ) {
    const comment = await this.commentsService.update(
      id,
      user.userId,
      updateCommentDto
    );
    
    return {
      success: true,
      data: comment,
    };
  }

  /**
   * Delete a comment (soft delete)
   */
  @UseGuards(JwtAuthGuard)
  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.commentsService.remove(id, user.userId);
    
    return {
      success: true,
      ...result,
    };
  }


  /**
   * Report a comment
   */
  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/report')
  async report(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.commentsService.report(id, user.userId, reason);
    
    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get user's comments
   */
  @UseGuards(JwtAuthGuard)
  @Get('users/:userId/comments')
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    const result = await this.commentsService.findByUser(userId, page, limit);
    
    return {
      success: true,
      data: result.comments,
      meta: result.meta,
    };
  }

  /**
   * Get all reported comments (Admin only)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/reports')
  async getReports(@Query() query: any) {
    const { page = 1, limit = 20 } = query;
    const reports = await this.commentsService.getReportedComments(Number(page), Number(limit));
    
    return {
      success: true,
      data: reports.comments,
      meta: reports.meta,
    };
  }

  /**
   * Dismiss a comment report (Admin only)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('admin/reports/:reportId/dismiss')
  async dismissReport(@Param('reportId') reportId: string) {
    await this.commentsService.dismissReport(reportId);
    
    return {
      success: true,
      message: 'Report dismissed successfully',
    };
  }

  /**
   * Delete a comment as admin (Admin only)
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('admin/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async adminDeleteComment(@Param('commentId') commentId: string) {
    const result = await this.commentsService.removeAsAdmin(commentId);
    
    return {
      success: true,
      ...result,
    };
  }
}