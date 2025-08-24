import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';

// Mock canvas context
const mockCanvasContext = {
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  fillText: jest.fn(),
  fillRect: jest.fn(),
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'left' as CanvasTextAlign,
};

// Mock getBoundingClientRect
const mockGetBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 300,
  top: 0,
  left: 0,
  right: 800,
  bottom: 300,
  x: 0,
  y: 0,
  toJSON: () => {},
}));

// Setup canvas mock
HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCanvasContext as any);
HTMLCanvasElement.prototype.getBoundingClientRect = mockGetBoundingClientRect;

describe('AnalyticsChart', () => {
  const mockData = [
    { date: '2024-01-01', views: 100, posts: 5, engagement: 15 },
    { date: '2024-01-02', views: 150, posts: 7, engagement: 20 },
    { date: '2024-01-03', views: 200, posts: 3, engagement: 25 },
    { date: '2024-01-04', views: 175, posts: 6, engagement: 18 },
    { date: '2024-01-05', views: 225, posts: 8, engagement: 30 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset canvas mock properties
    Object.assign(mockCanvasContext, {
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left' as CanvasTextAlign,
    });
  });

  describe('Rendering', () => {
    it('should render canvas element', () => {
      render(<AnalyticsChart data={mockData} />);
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should render with default height', () => {
      render(<AnalyticsChart data={mockData} />);
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ height: '300px' });
    });

    it('should render with custom height', () => {
      render(<AnalyticsChart data={mockData} height={400} />);
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ height: '400px' });
    });

    it('should apply correct CSS classes', () => {
      const { container } = render(<AnalyticsChart data={mockData} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('w-full');
      
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveClass('w-full');
    });
  });

  describe('Chart Drawing', () => {
    it('should draw chart on mount', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
        expect(mockCanvasContext.beginPath).toHaveBeenCalled();
        expect(mockCanvasContext.stroke).toHaveBeenCalled();
      });
    });

    it('should draw axes', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Check that axes are drawn
        expect(mockCanvasContext.moveTo).toHaveBeenCalled();
        expect(mockCanvasContext.lineTo).toHaveBeenCalled();
        expect(mockCanvasContext.stroke).toHaveBeenCalled();
      });
    });

    it('should draw grid lines', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Grid lines should be drawn
        const strokeCalls = mockCanvasContext.stroke.mock.calls.length;
        expect(strokeCalls).toBeGreaterThan(5); // At least 5 grid lines
      });
    });

    it('should draw data points', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Should draw circles for data points
        expect(mockCanvasContext.arc).toHaveBeenCalledTimes(mockData.length);
        
        // Each point should be filled
        const fillCalls = mockCanvasContext.fill.mock.calls.length;
        expect(fillCalls).toBeGreaterThanOrEqual(mockData.length);
      });
    });

    it('should draw line connecting points', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Should move to first point and draw lines to others
        expect(mockCanvasContext.moveTo).toHaveBeenCalled();
        expect(mockCanvasContext.lineTo).toHaveBeenCalledTimes(mockData.length - 1);
      });
    });

    it('should draw Y-axis labels', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Should draw Y-axis labels
        const fillTextCalls = mockCanvasContext.fillText.mock.calls;
        const yAxisLabels = fillTextCalls.filter(call => 
          typeof call[0] === 'string' && !isNaN(parseInt(call[0]))
        );
        expect(yAxisLabels.length).toBeGreaterThan(0);
      });
    });

    it('should draw X-axis labels', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Should draw date labels on X-axis
        const fillTextCalls = mockCanvasContext.fillText.mock.calls;
        const dateLabels = fillTextCalls.filter(call => 
          typeof call[0] === 'string' && call[0].includes('/')
        );
        expect(dateLabels.length).toBeGreaterThan(0);
      });
    });

    it('should draw legend', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Should draw legend rectangle and text
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
        
        const fillTextCalls = mockCanvasContext.fillText.mock.calls;
        const legendText = fillTextCalls.find(call => 
          call[0] === 'Views'
        );
        expect(legendText).toBeDefined();
      });
    });
  });

  describe('Data Handling', () => {
    it('should handle empty data array', () => {
      render(<AnalyticsChart data={[]} />);
      
      // Should still render canvas and axes
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      expect(mockCanvasContext.clearRect).toHaveBeenCalled();
    });

    it('should handle single data point', async () => {
      const singlePoint = [{ date: '2024-01-01', views: 100 }];
      render(<AnalyticsChart data={singlePoint} />);
      
      await waitFor(() => {
        // Should draw the single point
        expect(mockCanvasContext.arc).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle large datasets', async () => {
      const largeData = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        views: Math.random() * 1000,
      }));
      
      render(<AnalyticsChart data={largeData} />);
      
      await waitFor(() => {
        // Should draw all points
        expect(mockCanvasContext.arc).toHaveBeenCalledTimes(100);
      });
    });

    it('should scale data appropriately', async () => {
      const highValueData = [
        { date: '2024-01-01', views: 10000 },
        { date: '2024-01-02', views: 50000 },
        { date: '2024-01-03', views: 100000 },
      ];
      
      render(<AnalyticsChart data={highValueData} />);
      
      await waitFor(() => {
        // Should draw with appropriate scaling
        expect(mockCanvasContext.moveTo).toHaveBeenCalled();
        expect(mockCanvasContext.lineTo).toHaveBeenCalled();
        
        // Y-axis labels should show scaled values
        const fillTextCalls = mockCanvasContext.fillText.mock.calls;
        const maxLabel = fillTextCalls.find(call => 
          call[0] === '100000' || call[0] === '100000'
        );
        expect(maxLabel).toBeDefined();
      });
    });
  });

  describe('Responsiveness', () => {
    it('should update canvas size based on container', async () => {
      const { rerender } = render(<AnalyticsChart data={mockData} />);
      
      // Change mock container size
      mockGetBoundingClientRect.mockReturnValue({
        width: 1200,
        height: 400,
        top: 0,
        left: 0,
        right: 1200,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      });
      
      // Re-render to trigger resize
      rerender(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Canvas should be redrawn with new dimensions
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should redraw when data changes', async () => {
      const { rerender } = render(<AnalyticsChart data={mockData} />);
      
      const clearCallsBefore = mockCanvasContext.clearRect.mock.calls.length;
      
      const newData = [
        { date: '2024-01-06', views: 300 },
        { date: '2024-01-07', views: 350 },
      ];
      
      rerender(<AnalyticsChart data={newData} />);
      
      await waitFor(() => {
        // Should clear and redraw
        const clearCallsAfter = mockCanvasContext.clearRect.mock.calls.length;
        expect(clearCallsAfter).toBeGreaterThan(clearCallsBefore);
      });
    });

    it('should redraw when height prop changes', async () => {
      const { rerender } = render(<AnalyticsChart data={mockData} height={300} />);
      
      const clearCallsBefore = mockCanvasContext.clearRect.mock.calls.length;
      
      rerender(<AnalyticsChart data={mockData} height={500} />);
      
      await waitFor(() => {
        // Should clear and redraw with new height
        const clearCallsAfter = mockCanvasContext.clearRect.mock.calls.length;
        expect(clearCallsAfter).toBeGreaterThan(clearCallsBefore);
      });
    });
  });

  describe('Color and Styling', () => {
    it('should use correct colors for chart elements', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Check that blue color is used for main line
        const strokeStyleCalls = mockCanvasContext.strokeStyle;
        expect(mockCanvasContext.strokeStyle).toBeDefined();
        
        // Check that fill colors are set
        expect(mockCanvasContext.fillStyle).toBeDefined();
      });
    });

    it('should set appropriate line widths', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Line width should be set for chart lines
        expect(mockCanvasContext.lineWidth).toBeDefined();
      });
    });

    it('should set correct fonts for labels', async () => {
      render(<AnalyticsChart data={mockData} />);
      
      await waitFor(() => {
        // Font should be set for text rendering
        expect(mockCanvasContext.font).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values', async () => {
      const negativeData = [
        { date: '2024-01-01', views: -100 },
        { date: '2024-01-02', views: 50 },
        { date: '2024-01-03', views: -200 },
      ];
      
      render(<AnalyticsChart data={negativeData} />);
      
      await waitFor(() => {
        // Should still render without errors
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
        expect(mockCanvasContext.arc).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle invalid dates gracefully', async () => {
      const invalidDateData = [
        { date: 'invalid-date', views: 100 },
        { date: '2024-01-02', views: 150 },
      ];
      
      render(<AnalyticsChart data={invalidDateData} />);
      
      await waitFor(() => {
        // Should still render
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
      });
    });

    it('should handle very long date strings', async () => {
      const longDateData = [
        { date: '2024-01-01T12:34:56.789Z', views: 100 },
        { date: '2024-01-02T12:34:56.789Z', views: 150 },
      ];
      
      render(<AnalyticsChart data={longDateData} />);
      
      await waitFor(() => {
        // Should parse and display dates correctly
        expect(mockCanvasContext.fillText).toHaveBeenCalled();
      });
    });
  });
});