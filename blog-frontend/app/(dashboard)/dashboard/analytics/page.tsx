'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle, 
  Users,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { analyticsAPI, OverallAnalytics, TimeRange } from '@/lib/api/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { StatsCard } from '@/components/analytics/StatsCard';

export default function AnalyticsOverviewPage() {
  const [analytics, setAnalytics] = useState<OverallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange['range']>('month');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await analyticsAPI.getDashboardAnalytics({ range: timeRange });
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  const totalEngagement = analytics.totalLikes + analytics.totalComments;
  const avgViewsPerPost = analytics.totalPosts > 0 
    ? Math.round(analytics.totalViews / analytics.totalPosts) 
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Overview</h1>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange['range'])}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="day">Last 24 hours</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last year</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Posts"
          value={analytics.totalPosts}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Total Views"
          value={analytics.totalViews}
          icon={<Eye className="w-5 h-5" />}
          color="green"
          subtitle={`${avgViewsPerPost} avg per post`}
        />
        <StatsCard
          title="Total Engagement"
          value={totalEngagement}
          icon={<Heart className="w-5 h-5" />}
          color="pink"
          subtitle={`${analytics.avgEngagementRate}% rate`}
        />
        <StatsCard
          title="Comments"
          value={analytics.totalComments}
          icon={<MessageCircle className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Growth Trend Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Growth Trend</h2>
        <AnalyticsChart data={analytics.growthTrend} />
      </div>

      {/* Top Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Posts</h2>
          <div className="space-y-3">
            {analytics.topPosts.map((post, index) => (
              <Link
                key={post.postId}
                href={`/dashboard/analytics/${post.postId}`}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{post.title}</p>
                    <p className="text-sm text-gray-500">
                      {post.views} views • {post.engagement}% engagement
                    </p>
                  </div>
                </div>
                <ArrowUp className="w-4 h-4 text-green-500" />
              </Link>
            ))}
          </div>
        </div>

        {/* Audience Insights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audience Insights</h2>
          
          {/* Device Breakdown */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Device Breakdown</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Desktop</span>
                </div>
                <span className="text-sm font-medium">
                  {analytics.audienceInsights.deviceBreakdown.desktop}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Mobile</span>
                </div>
                <span className="text-sm font-medium">
                  {analytics.audienceInsights.deviceBreakdown.mobile}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Tablet</span>
                </div>
                <span className="text-sm font-medium">
                  {analytics.audienceInsights.deviceBreakdown.tablet}
                </span>
              </div>
            </div>
          </div>

          {/* Top Countries */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Top Countries</h3>
            <div className="space-y-2">
              {analytics.audienceInsights.topCountries.map((country) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{country.country}</span>
                  </div>
                  <span className="text-sm font-medium">{country.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/posts"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            View All Posts
          </Link>
          <Link
            href="/dashboard/posts/new"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Create New Post
          </Link>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            onClick={() => window.print()}
          >
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}