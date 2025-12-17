import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@/components/StatusIndicator';

describe('StatusIndicator Component', () => {
  describe('Rendering', () => {
    it('renders with normal status', () => {
      render(<StatusIndicator status="normal" label="Connection" />);

      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    it('renders with warning status', () => {
      render(<StatusIndicator status="warning" label="Connection" />);

      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    it('renders with critical status', () => {
      render(<StatusIndicator status="critical" label="Alert" />);

      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('renders label text', () => {
      render(<StatusIndicator status="normal" label="Test Label" />);

      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" className="custom-class" />
      );

      const div = container.firstChild;
      expect(div).toHaveClass('custom-class');
    });
  });

  describe('Status Colors', () => {
    it('applies bg-success for normal status', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const indicator = container.querySelector('.bg-success');
      expect(indicator).toBeInTheDocument();
    });

    it('applies bg-warning for warning status', () => {
      const { container } = render(
        <StatusIndicator status="warning" label="Test" />
      );

      const indicator = container.querySelector('.bg-warning');
      expect(indicator).toBeInTheDocument();
    });

    it('applies bg-destructive for critical status', () => {
      const { container } = render(
        <StatusIndicator status="critical" label="Test" />
      );

      const indicator = container.querySelector('.bg-destructive');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('Visual Design', () => {
    it('renders as circular dot with animation', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('applies animate-ping for pulsing effect', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const pulse = container.querySelector('.animate-ping');
      expect(pulse).toBeInTheDocument();
    });

    it('renders flex container with proper spacing', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const flex = container.querySelector('.flex');
      expect(flex).toHaveClass('items-center', 'gap-2');
    });
  });

  describe('Styling Classes', () => {
    it('renders with relative positioning for dot container', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const relative = container.querySelector('.relative');
      expect(relative).toBeInTheDocument();
    });

    it('renders with absolute positioning for pulse overlay', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const absolute = container.querySelector('.absolute');
      expect(absolute).toBeInTheDocument();
    });

    it('applies correct text size to label', () => {
      const { container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      const label = container.querySelector('.text-sm');
      expect(label).toBeInTheDocument();
    });
  });

  describe('Dynamic Status Changes', () => {
    it('updates status color when prop changes', () => {
      const { rerender, container } = render(
        <StatusIndicator status="normal" label="Test" />
      );

      expect(container.querySelector('.bg-success')).toBeInTheDocument();

      rerender(<StatusIndicator status="critical" label="Test" />);

      expect(container.querySelector('.bg-destructive')).toBeInTheDocument();
    });

    it('updates label when prop changes', () => {
      const { rerender } = render(
        <StatusIndicator status="normal" label="Old Label" />
      );

      expect(screen.getByText('Old Label')).toBeInTheDocument();

      rerender(<StatusIndicator status="normal" label="New Label" />);

      expect(screen.getByText('New Label')).toBeInTheDocument();
      expect(screen.queryByText('Old Label')).not.toBeInTheDocument();
    });
  });

  describe('All Status Types', () => {
    const statuses = ['normal', 'warning', 'critical'] as const;

    it('renders all status types without errors', () => {
      statuses.forEach((status) => {
        const { unmount } = render(
          <StatusIndicator status={status} label={`Status: ${status}`} />
        );

        expect(screen.getByText(`Status: ${status}`)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
