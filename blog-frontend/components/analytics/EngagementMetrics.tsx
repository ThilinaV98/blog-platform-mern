import { Heart, MessageCircle, Share2, Eye } from 'lucide-react';

interface EngagementMetricsProps {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

export function EngagementMetrics({ likes, comments, shares, views }: EngagementMetricsProps) {
  const engagementRate = views > 0 ? ((likes + comments + shares) / views * 100).toFixed(1) : '0';
  const likeRate = views > 0 ? ((likes / views) * 100).toFixed(1) : '0';
  const commentRate = views > 0 ? ((comments / views) * 100).toFixed(1) : '0';
  const shareRate = views > 0 ? ((shares / views) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <div className="text-center pb-4 border-b">
        <p className="text-3xl font-bold text-gray-900">{engagementRate}%</p>
        <p className="text-sm text-gray-500">Overall Engagement Rate</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-gray-600">Likes</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-gray-900">{likes}</span>
            <span className="text-xs text-gray-500 ml-1">({likeRate}%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Comments</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-gray-900">{comments}</span>
            <span className="text-xs text-gray-500 ml-1">({commentRate}%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Shares</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-gray-900">{shares}</span>
            <span className="text-xs text-gray-500 ml-1">({shareRate}%)</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600">Total Views</span>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-gray-900">{views}</span>
          </div>
        </div>
      </div>
    </div>
  );
}