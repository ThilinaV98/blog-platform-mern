import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatsCard } from '@/components/analytics/StatsCard';
import { Eye, Heart, MessageCircle, TrendingUp, Users, FileText } from 'lucide-react';

describe('StatsCard', () => {
  const defaultProps = {
    title: 'Total Views',
    value: 1234,
    icon: <Eye className="w-5 h-5" />,
    color: 'blue' as const,
  };

  describe('Rendering', () => {
    it('should render with required props', () => {
      render(<StatsCard {...defaultProps} />);
      
      expect(screen.getByText('Total Views')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('should render string value', () => {
      render(<StatsCard {...defaultProps} value="1.2K" />);
      
      expect(screen.getByText('1.2K')).toBeInTheDocument();
    });

    it('should render numeric value with formatting', () => {
      render(<StatsCard {...defaultProps} value={1000000} />);
      
      expect(screen.getByText('1000000')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          subtitle="Last 30 days" 
        />
      );
      
      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('should render trend when provided', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          trend={{ value: 12.5, isPositive: true }} 
        />
      );
      
      expect(screen.getByText('↑ 12.5%')).toBeInTheDocument();
    });

    it('should render negative trend', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          trend={{ value: 8.3, isPositive: false }} 
        />
      );
      
      expect(screen.getByText('↓ 8.3%')).toBeInTheDocument();
    });
  });

  describe('Color Variants', () => {
    const colors = ['blue', 'green', 'pink', 'purple', 'yellow', 'red'] as const;

    colors.forEach(color => {
      it(`should apply ${color} color variant`, () => {
        const { container } = render(
          <StatsCard {...defaultProps} color={color} />
        );
        
        const card = container.firstChild;
        expect(card).toHaveClass('bg-gradient-to-r');
        
        // Check for color-specific classes
        const colorClass = `from-${color}-50`;
        expect(card?.className).toMatch(new RegExp(colorClass));
      });
    });

    it('should apply correct text color based on variant', () => {
      const { container } = render(
        <StatsCard {...defaultProps} color="green" />
      );
      
      const titleElement = screen.getByText('Total Views');
      expect(titleElement).toHaveClass('text-green-600');
    });
  });

  describe('Icons', () => {
    it('should render provided icon', () => {
      const { container } = render(
        <StatsCard 
          {...defaultProps} 
          icon={<Heart data-testid="heart-icon" />} 
        />
      );
      
      const icon = container.querySelector('[data-testid="heart-icon"]');
      expect(icon).toBeInTheDocument();
    });

    it('should apply color to icon', () => {
      const { container } = render(
        <StatsCard 
          {...defaultProps} 
          color="pink"
          icon={<Heart />} 
        />
      );
      
      const iconWrapper = container.querySelector('.text-pink-600');
      expect(iconWrapper).toBeInTheDocument();
    });

    it('should work with different icon components', () => {
      const icons = [
        <MessageCircle key="1" data-testid="message-icon" />,
        <TrendingUp key="2" data-testid="trending-icon" />,
        <Users key="3" data-testid="users-icon" />,
        <FileText key="4" data-testid="file-icon" />,
      ];

      icons.forEach((icon, index) => {
        const { container } = render(
          <StatsCard 
            {...defaultProps} 
            icon={icon}
            key={index}
          />
        );
        
        const renderedIcon = container.querySelector(`[data-testid]`);
        expect(renderedIcon).toBeInTheDocument();
      });
    });
  });

  describe('Trend Display', () => {
    it('should show positive trend with up arrow', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          trend={{ value: 25, isPositive: true }} 
        />
      );
      
      const trendElement = screen.getByText('↑ 25%');
      expect(trendElement).toHaveClass('text-green-600');
    });

    it('should show negative trend with down arrow', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          trend={{ value: 15, isPositive: false }} 
        />
      );
      
      const trendElement = screen.getByText('↓ 15%');
      expect(trendElement).toHaveClass('text-red-600');
    });

    it('should handle decimal trend values', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          trend={{ value: 12.345, isPositive: true }} 
        />
      );
      
      expect(screen.getByText('↑ 12.345%')).toBeInTheDocument();
    });

    it('should handle zero trend value', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          trend={{ value: 0, isPositive: true }} 
        />
      );
      
      expect(screen.getByText('↑ 0%')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should have gradient background', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const card = container.firstChild;
      expect(card).toHaveClass('bg-gradient-to-r');
    });

    it('should have rounded corners', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const card = container.firstChild;
      expect(card).toHaveClass('rounded-lg');
    });

    it('should have proper padding', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const card = container.firstChild;
      expect(card).toHaveClass('p-6');
    });

    it('should use flexbox layout', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const flexContainer = container.querySelector('.flex');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('items-center');
      expect(flexContainer).toHaveClass('justify-between');
    });

    it('should truncate long titles', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          title="This is a very long title that should be truncated" 
        />
      );
      
      const titleElement = screen.getByText('This is a very long title that should be truncated');
      expect(titleElement).toHaveClass('truncate');
    });
  });

  describe('Value Display', () => {
    it('should display large numbers', () => {
      render(<StatsCard {...defaultProps} value={999999999} />);
      
      expect(screen.getByText('999999999')).toBeInTheDocument();
    });

    it('should display zero', () => {
      render(<StatsCard {...defaultProps} value={0} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display negative numbers', () => {
      render(<StatsCard {...defaultProps} value={-100} />);
      
      expect(screen.getByText('-100')).toBeInTheDocument();
    });

    it('should display formatted string values', () => {
      render(<StatsCard {...defaultProps} value="$1,234.56" />);
      
      expect(screen.getByText('$1,234.56')).toBeInTheDocument();
    });

    it('should display percentage values', () => {
      render(<StatsCard {...defaultProps} value="85.5%" />);
      
      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });

    it('should apply correct font size to value', () => {
      render(<StatsCard {...defaultProps} />);
      
      const valueElement = screen.getByText('1234');
      expect(valueElement).toHaveClass('text-3xl');
      expect(valueElement).toHaveClass('font-semibold');
    });
  });

  describe('Subtitle', () => {
    it('should display subtitle with correct styling', () => {
      render(
        <StatsCard 
          {...defaultProps} 
          subtitle="Compared to last month" 
        />
      );
      
      const subtitleElement = screen.getByText('Compared to last month');
      expect(subtitleElement).toHaveClass('text-xs');
      expect(subtitleElement).toHaveClass('text-gray-600');
    });

    it('should handle long subtitles', () => {
      const longSubtitle = 'This is a very long subtitle that provides additional context about the metric';
      
      render(
        <StatsCard 
          {...defaultProps} 
          subtitle={longSubtitle} 
        />
      );
      
      expect(screen.getByText(longSubtitle)).toBeInTheDocument();
    });

    it('should render without subtitle', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const subtitleElement = container.querySelector('.text-xs.text-gray-600');
      expect(subtitleElement).not.toBeInTheDocument();
    });
  });

  describe('Combinations', () => {
    it('should render all optional props together', () => {
      render(
        <StatsCard 
          title="Page Views"
          value="45.2K"
          icon={<Eye />}
          color="purple"
          subtitle="Last 7 days"
          trend={{ value: 18.2, isPositive: true }}
        />
      );
      
      expect(screen.getByText('Page Views')).toBeInTheDocument();
      expect(screen.getByText('45.2K')).toBeInTheDocument();
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
      expect(screen.getByText('↑ 18.2%')).toBeInTheDocument();
    });

    it('should handle minimal props', () => {
      render(
        <StatsCard 
          title="Metric"
          value={42}
          icon={<div />}
          color="blue"
        />
      );
      
      expect(screen.getByText('Metric')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const dtElement = container.querySelector('dt');
      const ddElement = container.querySelector('dd');
      
      expect(dtElement).toBeInTheDocument();
      expect(ddElement).toBeInTheDocument();
    });

    it('should have appropriate text hierarchy', () => {
      render(<StatsCard {...defaultProps} />);
      
      const titleElement = screen.getByText('Total Views');
      const valueElement = screen.getByText('1234');
      
      expect(titleElement).toHaveClass('text-sm');
      expect(valueElement).toHaveClass('text-3xl');
    });
  });
});