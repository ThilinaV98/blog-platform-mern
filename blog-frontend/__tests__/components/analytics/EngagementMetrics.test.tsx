import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EngagementMetrics } from '@/components/analytics/EngagementMetrics';

describe('EngagementMetrics', () => {
  const defaultProps = {
    likes: 100,
    comments: 25,
    shares: 10,
    views: 1000,
  };

  describe('Rendering', () => {
    it('should render all metrics', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      expect(screen.getByText('100')).toBeInTheDocument(); // likes
      expect(screen.getByText('25')).toBeInTheDocument(); // comments
      expect(screen.getByText('10')).toBeInTheDocument(); // shares
      expect(screen.getByText('1000')).toBeInTheDocument(); // views
    });

    it('should display metric labels', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      expect(screen.getByText('Likes')).toBeInTheDocument();
      expect(screen.getByText('Comments')).toBeInTheDocument();
      expect(screen.getByText('Shares')).toBeInTheDocument();
      expect(screen.getByText('Total Views')).toBeInTheDocument();
    });

    it('should display overall engagement rate', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      expect(screen.getByText('Overall Engagement Rate')).toBeInTheDocument();
    });
  });

  describe('Engagement Rate Calculations', () => {
    it('should calculate overall engagement rate correctly', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      // (100 + 25 + 10) / 1000 * 100 = 13.5%
      expect(screen.getByText('13.5%')).toBeInTheDocument();
    });

    it('should calculate individual metric rates', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      // Like rate: 100/1000 * 100 = 10%
      expect(screen.getByText('(10.0%)')).toBeInTheDocument();
      
      // Comment rate: 25/1000 * 100 = 2.5%
      expect(screen.getByText('(2.5%)')).toBeInTheDocument();
      
      // Share rate: 10/1000 * 100 = 1%
      expect(screen.getByText('(1.0%)')).toBeInTheDocument();
    });

    it('should handle zero views gracefully', () => {
      render(
        <EngagementMetrics 
          likes={10}
          comments={5}
          shares={2}
          views={0}
        />
      );
      
      // Should show 0% for all rates when views is 0
      expect(screen.getByText('0%')).toBeInTheDocument(); // Overall rate
      expect(screen.getAllByText('(0%)')).toHaveLength(3); // Individual rates
    });

    it('should handle zero engagement', () => {
      render(
        <EngagementMetrics 
          likes={0}
          comments={0}
          shares={0}
          views={1000}
        />
      );
      
      expect(screen.getByText('0.0%')).toBeInTheDocument(); // Overall rate
      expect(screen.getAllByText('(0.0%)')).toHaveLength(3); // Individual rates
    });

    it('should round rates to one decimal place', () => {
      render(
        <EngagementMetrics 
          likes={333}
          comments={77}
          shares={23}
          views={1234}
        />
      );
      
      // (333 + 77 + 23) / 1234 * 100 = 35.09... ≈ 35.1%
      expect(screen.getByText('35.1%')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(
        <EngagementMetrics 
          likes={1000000}
          comments={500000}
          shares={250000}
          views={10000000}
        />
      );
      
      expect(screen.getByText('1000000')).toBeInTheDocument();
      expect(screen.getByText('500000')).toBeInTheDocument();
      expect(screen.getByText('250000')).toBeInTheDocument();
      expect(screen.getByText('10000000')).toBeInTheDocument();
      expect(screen.getByText('17.5%')).toBeInTheDocument(); // Overall rate
    });
  });

  describe('Icons', () => {
    it('should display appropriate icons for each metric', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      // Check for Lucide React icon classes
      expect(container.querySelector('.text-pink-500')).toBeInTheDocument(); // Heart/Likes
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument(); // MessageCircle/Comments
      expect(container.querySelector('.text-green-500')).toBeInTheDocument(); // Share2/Shares
      expect(container.querySelector('.text-purple-500')).toBeInTheDocument(); // Eye/Views
    });

    it('should size icons appropriately', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const icons = container.querySelectorAll('.w-4.h-4');
      expect(icons).toHaveLength(4); // All four metric icons
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper spacing between sections', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const spaceY4 = container.querySelector('.space-y-4');
      expect(spaceY4).toBeInTheDocument();
      
      const spaceY3 = container.querySelector('.space-y-3');
      expect(spaceY3).toBeInTheDocument();
    });

    it('should have a border between header and metrics', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const borderElement = container.querySelector('.border-b');
      expect(borderElement).toBeInTheDocument();
    });

    it('should have a border above total views', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const borderElement = container.querySelector('.border-t');
      expect(borderElement).toBeInTheDocument();
    });

    it('should center the overall engagement rate', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const centerElement = container.querySelector('.text-center');
      expect(centerElement).toBeInTheDocument();
    });

    it('should use flex layout for metric rows', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const flexElements = container.querySelectorAll('.flex.items-center.justify-between');
      expect(flexElements.length).toBeGreaterThan(0);
    });

    it('should style the overall rate prominently', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      const rateElement = screen.getByText('13.5%');
      expect(rateElement).toHaveClass('text-3xl');
      expect(rateElement).toHaveClass('font-bold');
      expect(rateElement).toHaveClass('text-gray-900');
    });

    it('should style individual metrics consistently', () => {
      render(<EngagementMetrics {...defaultProps} />);
      
      const likesValue = screen.getByText('100');
      expect(likesValue).toHaveClass('text-lg');
      expect(likesValue).toHaveClass('font-semibold');
      expect(likesValue).toHaveClass('text-gray-900');
    });

    it('should style percentage labels appropriately', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const percentageLabels = container.querySelectorAll('.text-xs.text-gray-500');
      expect(percentageLabels.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values', () => {
      render(
        <EngagementMetrics 
          likes={-10}
          comments={-5}
          shares={-2}
          views={100}
        />
      );
      
      expect(screen.getByText('-10')).toBeInTheDocument();
      expect(screen.getByText('-5')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('should handle decimal input values', () => {
      render(
        <EngagementMetrics 
          likes={10.5}
          comments={5.7}
          shares={2.3}
          views={100.9}
        />
      );
      
      // Values should be displayed as provided
      expect(screen.getByText('10.5')).toBeInTheDocument();
      expect(screen.getByText('5.7')).toBeInTheDocument();
      expect(screen.getByText('2.3')).toBeInTheDocument();
      expect(screen.getByText('100.9')).toBeInTheDocument();
    });

    it('should handle very small engagement rates', () => {
      render(
        <EngagementMetrics 
          likes={1}
          comments={0}
          shares={0}
          views={100000}
        />
      );
      
      // (1 + 0 + 0) / 100000 * 100 = 0.001%
      expect(screen.getByText('0.0%')).toBeInTheDocument(); // Rounded to 1 decimal
    });

    it('should handle maximum safe integer', () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER;
      render(
        <EngagementMetrics 
          likes={maxSafeInt}
          comments={0}
          shares={0}
          views={maxSafeInt}
        />
      );
      
      expect(screen.getByText(maxSafeInt.toString())).toBeInTheDocument();
    });
  });

  describe('Metric Display Order', () => {
    it('should display metrics in correct order', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      const metricLabels = Array.from(
        container.querySelectorAll('.text-sm.text-gray-600')
      ).map(el => el.textContent);
      
      expect(metricLabels).toEqual(['Likes', 'Comments', 'Shares', 'Total Views']);
    });

    it('should display total views separately at bottom', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />);
      
      // Total views should be in a section with border-top
      const totalViewsSection = container.querySelector('.border-t');
      expect(totalViewsSection?.textContent).toContain('Total Views');
      expect(totalViewsSection?.textContent).toContain('1000');
    });
  });

  describe('Responsiveness', () => {
    it('should maintain layout with long numbers', () => {
      render(
        <EngagementMetrics 
          likes={999999999}
          comments={888888888}
          shares={777777777}
          views={999999999999}
        />
      );
      
      // All values should be visible
      expect(screen.getByText('999999999')).toBeInTheDocument();
      expect(screen.getByText('888888888')).toBeInTheDocument();
      expect(screen.getByText('777777777')).toBeInTheDocument();
      expect(screen.getByText('999999999999')).toBeInTheDocument();
    });

    it('should handle zero values appropriately', () => {
      render(
        <EngagementMetrics 
          likes={0}
          comments={0}
          shares={0}
          views={0}
        />
      );
      
      // Should display all zeros without errors
      expect(screen.getAllByText('0')).toHaveLength(4);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Percentage Formatting', () => {
    it('should format percentages consistently', () => {
      render(
        <EngagementMetrics 
          likes={100}
          comments={50}
          shares={25}
          views={1000}
        />
      );
      
      // Check formatting with one decimal place
      expect(screen.getByText('(10.0%)')).toBeInTheDocument(); // Likes
      expect(screen.getByText('(5.0%)')).toBeInTheDocument(); // Comments
      expect(screen.getByText('(2.5%)')).toBeInTheDocument(); // Shares
    });

    it('should handle 100% engagement rate', () => {
      render(
        <EngagementMetrics 
          likes={500}
          comments={300}
          shares={200}
          views={1000}
        />
      );
      
      // (500 + 300 + 200) / 1000 * 100 = 100%
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });

    it('should handle engagement rate over 100%', () => {
      render(
        <EngagementMetrics 
          likes={1000}
          comments={500}
          shares={500}
          views={1000}
        />
      );
      
      // (1000 + 500 + 500) / 1000 * 100 = 200%
      expect(screen.getByText('200.0%')).toBeInTheDocument();
    });
  });
});