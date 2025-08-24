'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Eye, 
  Heart, 
  MessageCircle, 
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Share2
} from 'lucide-react';
import { analyticsAPI, PostAnalytics, TimeRange } from '@/lib/api/analytics';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { StatsCard } from '@/components/analytics/StatsCard';
import { EngagementMetrics } from '@/components/analytics/EngagementMetrics';

export default function PostAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const [analytics, setAnalytics] = useState<PostAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange['range']>('month');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await analyticsAPI.getPostAnalytics(postId, { range: timeRange });
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch post analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [postId, timeRange]);

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
          <button
            onClick={() => router.back()}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const totalDevices = analytics.deviceStats.desktop + analytics.deviceStats.mobile + analytics.deviceStats.tablet;
  const devicePercentages = {
    desktop: totalDevices > 0 ? Math.round((analytics.deviceStats.desktop / totalDevices) * 100) : 0,
    mobile: totalDevices > 0 ? Math.round((analytics.deviceStats.mobile / totalDevices) * 100) : 0,
    tablet: totalDevices > 0 ? Math.round((analytics.deviceStats.tablet / totalDevices) * 100) : 0,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{analytics.title}</h1>
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
          <Link
            href={`/dashboard/posts/${postId}/edit`}
            className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Edit Post
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Views"
          value={analytics.totalViews}
          icon={<Eye className="w-5 h-5" />}
          color="blue"
          subtitle={`${analytics.uniqueViews} unique`}
        />
        <StatsCard
          title="Avg. Read Time"
          value={`${Math.floor(analytics.avgDuration / 60)}m ${analytics.avgDuration % 60}s`}
          icon={<Clock className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Engagement Rate"
          value={`${analytics.engagementRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Shares"
          value={analytics.sharesCount}
          icon={<Share2 className="w-5 h-5" />}
          color="pink"
        />
      </div>

      {/* Views Over Time Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Views Over Time</h2>
        <AnalyticsChart 
          data={analytics.viewsOverTime.map(item => ({
            date: item.date,
            views: item.views,
            posts: 0,
            engagement: 0
          }))} 
        />
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement</h2>
          <EngagementMetrics
            likes={analytics.likesCount}
            comments={analytics.commentsCount}
            shares={analytics.sharesCount}
            views={analytics.totalViews}
          />
        </div>

        {/* Device Stats */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Desktop</span>
                </div>
                <span className="text-sm font-medium">{devicePercentages.desktop}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${devicePercentages.desktop}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Mobile</span>
                </div>
                <span className="text-sm font-medium">{devicePercentages.mobile}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${devicePercentages.mobile}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Tablet className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Tablet</span>
                </div>
                <span className="text-sm font-medium">{devicePercentages.tablet}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${devicePercentages.tablet}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Referrers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Referrers</h2>
          <div className="space-y-3">
            {analytics.topReferrers.length > 0 ? (
              analytics.topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 truncate max-w-[150px]">
                      {referrer.referrer}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{referrer.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No referrer data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/blog/${postId}`}
            target="_blank"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            View Post
          </Link>
          <button
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            onClick={() => window.print()}
          >
            Export Report
          </button>
          <Link
            href="/dashboard/analytics"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            View All Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}