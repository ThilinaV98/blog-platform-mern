'use client';

import { useEffect, useRef } from 'react';

interface ChartData {
  date: string;
  views: number;
  posts?: number;
  engagement?: number;
}

interface AnalyticsChartProps {
  data: ChartData[];
  height?: number;
}

export function AnalyticsChart({ data, height = 300 }: AnalyticsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scales
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    const maxViews = Math.max(...data.map(d => d.views));
    const xStep = chartWidth / (data.length - 1 || 1);

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      const value = Math.round(maxViews - (maxViews / 5) * i);
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // Draw line chart
    if (data.length > 0) {
      // Views line
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((point, index) => {
        const x = padding + xStep * index;
        const y = padding + chartHeight - (point.views / maxViews) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw points
      ctx.fillStyle = '#3b82f6';
      data.forEach((point, index) => {
        const x = padding + xStep * index;
        const y = padding + chartHeight - (point.views / maxViews) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // X-axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      data.forEach((point, index) => {
        if (index % Math.ceil(data.length / 7) === 0 || index === data.length - 1) {
          const x = padding + xStep * index;
          const date = new Date(point.date);
          const label = `${date.getMonth() + 1}/${date.getDate()}`;
          ctx.fillText(label, x, canvas.height - padding + 20);
        }
      });
    }

    // Draw legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(canvas.width - 100, 10, 10, 10);
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Views', canvas.width - 85, 19);

  }, [data, height]);

  return (
    <div className="w-full">
      <canvas 
        ref={canvasRef} 
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}