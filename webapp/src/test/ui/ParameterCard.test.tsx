import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ParameterCard } from '@/components/ParameterCard';

describe('ParameterCard Component - Comprehensive Suite', () => {
  const defaultProps = {
    title: 'Voltage',
    value: '230.5',
    unit: 'V',
    status: 'normal' as const,
    min: '207',
    max: '253',
    trend: 'stable' as const,
  };

  describe('Core Rendering', () => {
    it('renders all primary labels and values', () => {
      render(React.createElement(ParameterCard, defaultProps));
      
      expect(screen.getByText('Voltage')).toBeInTheDocument();
      expect(screen.getByText('230.5')).toBeInTheDocument();
      expect(screen.getByText('V')).toBeInTheDocument();
      expect(screen.getByText('207')).toBeInTheDocument();
      expect(screen.getByText('253')).toBeInTheDocument();
    });

    it('displays Polish labels for range', () => {
      render(React.createElement(ParameterCard, defaultProps));
      expect(screen.getByText(/Min:/i)).toBeInTheDocument();
      expect(screen.getByText(/Maks:/i)).toBeInTheDocument();
    });
  });

  describe('Progress Bar Logic', () => {
    it('calculates width correctly (50% for middle value)', () => {
      // (230 - 200) / (260 - 200) = 30/60 = 50%
      const { container } = render(
        React.createElement(ParameterCard, { ...defaultProps, value: "230", min: "200", max: "260" })
      );
      const progressBar = container.querySelector('.h-full.transition-all');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('clamps width to 100% when value exceeds max', () => {
      const { container } = render(
        React.createElement(ParameterCard, { ...defaultProps, value: "300", min: "200", max: "250" })
      );
      const progressBar = container.querySelector('.h-full.transition-all');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('clamps width to 0% when value is below min', () => {
      const { container } = render(
        React.createElement(ParameterCard, { ...defaultProps, value: "100", min: "200", max: "250" })
      );
      const progressBar = container.querySelector('.h-full.transition-all');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Status & Trend Styling', () => {
    it('applies correct background color to progress bar based on status', () => {
      const { rerender, container } = render(React.createElement(ParameterCard, { ...defaultProps, status: 'normal' }));
      expect(container.querySelector('.bg-success')).toBeInTheDocument();

      rerender(React.createElement(ParameterCard, { ...defaultProps, status: 'warning' }));
      expect(container.querySelector('.bg-warning')).toBeInTheDocument();

      rerender(React.createElement(ParameterCard, { ...defaultProps, status: 'critical' }));
      expect(container.querySelector('.bg-destructive')).toBeInTheDocument();
    });

    it('applies correct text colors for trends', () => {
      const { rerender, container } = render(React.createElement(ParameterCard, { ...defaultProps, trend: 'rising' }));
      // TrendingUp icon wrapper
      expect(container.querySelector('.text-success')).toBeInTheDocument();

      rerender(React.createElement(ParameterCard, { ...defaultProps, trend: 'falling' }));
      expect(container.querySelector('.text-destructive')).toBeInTheDocument();

      rerender(React.createElement(ParameterCard, { ...defaultProps, trend: 'stable' }));
      expect(container.querySelector('.text-muted-foreground')).toBeInTheDocument();
    });
  });

  describe('Typography & Responsive Design', () => {
    it('uses monospace and tabular-nums for the main value', () => {
      render(React.createElement(ParameterCard, defaultProps));
      const value = screen.getByText('230.5');
      expect(value).toHaveClass('font-mono', 'tabular-nums');
    });

    it('applies uppercase and tracking-wide to the title', () => {
      render(React.createElement(ParameterCard, defaultProps));
      const title = screen.getByText('Voltage');
      expect(title).toHaveClass('uppercase', 'tracking-wide');
    });

    it('includes responsive padding and text classes', () => {
      const { container } = render(React.createElement(ParameterCard, defaultProps));
      const card = container.firstChild;
      
      // Card padding
      expect(card).toHaveClass('p-4', 'sm:p-6');
      
      // Title size
      expect(screen.getByText('Voltage')).toHaveClass('text-xs', 'sm:text-sm');
      
      // Value size
      expect(screen.getByText('230.5')).toHaveClass('text-2xl', 'sm:text-3xl', 'lg:text-4xl');
    });
  });

  describe('Hover Effects', () => {
    it('has transition and hover shadow classes', () => {
      const { container } = render(React.createElement(ParameterCard, defaultProps));
      const card = container.firstChild;
      expect(card).toHaveClass('hover:shadow-glow', 'transition-all', 'duration-300');
    });
  });
});