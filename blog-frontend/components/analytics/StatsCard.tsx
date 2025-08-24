import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'pink' | 'purple' | 'yellow' | 'red';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses = {
  blue: 'from-blue-50 to-blue-100 text-blue-600',
  green: 'from-green-50 to-green-100 text-green-600',
  pink: 'from-pink-50 to-pink-100 text-pink-600',
  purple: 'from-purple-50 to-purple-100 text-purple-600',
  yellow: 'from-yellow-50 to-yellow-100 text-yellow-600',
  red: 'from-red-50 to-red-100 text-red-600',
};

export function StatsCard({ title, value, icon, color, subtitle, trend }: StatsCardProps) {
  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} p-6 rounded-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <dt className={`text-sm font-medium ${colorClasses[color].split(' ')[2]} truncate`}>
            {title}
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {value}
          </dd>
          {subtitle && (
            <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-xs mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`${colorClasses[color].split(' ')[2]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}