import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  Query, 
  Body,
  UseGuards,
  Req,
  Headers
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { 
  GetAnalyticsDto, 
  TrackViewDto,
  PostAnalyticsResponseDto,
  OverallAnalyticsResponseDto
} from './dto/analytics.dto';

@ApiTags('Analytics')
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('posts/:id/track')
  @ApiOperation({ summary: 'Track a post view' })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'View tracked successfully'
  })
  async trackView(
    @Param('id') postId: string,
    @Body() dto: TrackViewDto,
    @Req() req: Request,
    @Headers('user-agent') userAgent: string,
    @CurrentUser() user?: any
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    await this.analyticsService.trackView(
      postId,
      dto,
      user?.userId,
      ipAddress,
      userAgent
    );
    return { message: 'View tracked successfully' };
  }

  @Get('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for a specific post' })
  @ApiParam({ 
    name: 'id', 
    description: 'Post ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Post analytics retrieved successfully',
    type: PostAnalyticsResponseDto
  })
  async getPostAnalytics(
    @Param('id') postId: string,
    @Query() query: GetAnalyticsDto
  ): Promise<PostAnalyticsResponseDto> {
    return this.analyticsService.getPostAnalytics(postId, query);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall analytics for current user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Overall analytics retrieved successfully',
    type: OverallAnalyticsResponseDto
  })
  async getOverallAnalytics(
    @CurrentUser() user: any,
    @Query() query: GetAnalyticsDto
  ): Promise<OverallAnalyticsResponseDto> {
    return this.analyticsService.getOverallAnalytics(user.userId, query);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall analytics for a specific user' })
  @ApiParam({ 
    name: 'userId', 
    description: 'User ID',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User analytics retrieved successfully',
    type: OverallAnalyticsResponseDto
  })
  async getUserAnalytics(
    @Param('userId') userId: string,
    @Query() query: GetAnalyticsDto
  ): Promise<OverallAnalyticsResponseDto> {
    return this.analyticsService.getOverallAnalytics(userId, query);
  }
}