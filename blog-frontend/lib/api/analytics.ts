import apiClient from './client';

export interface TimeRange {
  range?: 'day' | 'week' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface PostAnalytics {
  postId: string;
  title: string;
  totalViews: number;
  uniqueViews: number;
  avgDuration: number;
  engagementRate: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsOverTime: {
    date: string;
    views: number;
  }[];
  topReferrers: {
    referrer: string;
    count: number;
  }[];
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

export interface OverallAnalytics {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementRate: number;
  topPosts: {
    postId: string;
    title: string;
    views: number;
    engagement: number;
  }[];
  growthTrend: {
    date: string;
    posts: number;
    views: number;
    engagement: number;
  }[];
  audienceInsights: {
    topCountries: { country: string; count: number }[];
    topCities: { city: string; count: number }[];
    deviceBreakdown: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
  };
}

export const analyticsAPI = {
  /**
   * Track a post view
   */
  async trackView(postId: string, data?: {
    sessionId?: string;
    referrer?: string;
    duration?: number;
  }): Promise<void> {
    try {
      const sessionId = data?.sessionId || this.getOrCreateSessionId();
      await apiClient.post(`/analytics/posts/${postId}/track`, {
        sessionId,
        referrer: data?.referrer || document.referrer,
        duration: data?.duration
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  },

  /**
   * Get analytics for a specific post
   */
  async getPostAnalytics(postId: string, params?: TimeRange): Promise<PostAnalytics> {
    const response = await apiClient.get(`/analytics/posts/${postId}`, { params });
    return response.data;
  },

  /**
   * Get overall analytics for current user
   */
  async getDashboardAnalytics(params?: TimeRange): Promise<OverallAnalytics> {
    const response = await apiClient.get('/analytics/dashboard', { params });
    return response.data;
  },

  /**
   * Get analytics for a specific user
   */
  async getUserAnalytics(userId: string, params?: TimeRange): Promise<OverallAnalytics> {
    const response = await apiClient.get(`/analytics/user/${userId}`, { params });
    return response.data;
  },

  /**
   * Get or create session ID for tracking
   */
  getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  },

  /**
   * Track reading time
   */
  startReadingTimer(postId: string): () => void {
    const startTime = Date.now();
    const sessionId = this.getOrCreateSessionId();

    // Track initial view
    this.trackView(postId, { sessionId });

    // Return cleanup function to track duration when component unmounts
    return () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      if (duration > 5) { // Only track if user spent more than 5 seconds
        this.trackView(postId, { sessionId, duration });
      }
    };
  }
};