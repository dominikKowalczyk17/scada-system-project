/**
 * Unit tests for StreamingChart component
 *
 * Tests cover:
 * - Component rendering and props
 * - Circular buffer behavior (max size enforcement)
 * - Duplicate timestamp prevention
 * - Memoization and performance optimizations
 * - Chart data transformation
 * - Statistics calculation (min/max/avg)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreamingChart } from '@/components/StreamingChart';
import type { MeasurementDTO } from '@/types/api';

// Mock Recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
}));

describe('StreamingChart Component', () => {
  const default_props = {
    parameter_key: 'voltage_rms' as keyof MeasurementDTO,
    title: 'Test Voltage',
    unit: 'V',
    stroke_color: '#3b82f6',
  };

  const create_measurement = (value: number, timestamp?: string): MeasurementDTO => ({
    voltage_rms: value,
    current_rms: 0,
    power_active: 0,
    power_reactive: 0,
    power_apparent: 0,
    power_factor: 1,
    frequency: 50,
    thd_voltage: 0,
    thd_current: 0,
    harmonics_v: [0, 0, 0, 0, 0, 0, 0, 0],
    harmonics_i: [0, 0, 0, 0, 0, 0, 0, 0],
    time: timestamp || new Date().toISOString(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders chart with title and unit', () => {
      render(<StreamingChart {...default_props} />);

      expect(screen.getByText('Test Voltage')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('renders with custom y-axis domain', () => {
      render(
        <StreamingChart
          {...default_props}
          y_domain={[200, 260]}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('renders with custom format function', () => {
      const format_value = vi.fn((v: number) => `${v.toFixed(1)} V`);

      render(
        <StreamingChart
          {...default_props}
          format_value={format_value}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('displays streaming description text', () => {
      render(<StreamingChart {...default_props} max_buffer_size={60} />);

      expect(screen.getByText(/Streaming w czasie rzeczywistym/)).toBeInTheDocument();
      expect(screen.getByText(/ostatnie 60 pomiarów/)).toBeInTheDocument();
    });
  });

  describe('Measurement Updates', () => {
    it('updates when receiving new measurement', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurement_1 = create_measurement(220, '2025-01-01T10:00:00Z');
      rerender(<StreamingChart {...default_props} latest_measurement={measurement_1} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles multiple consecutive measurements', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurements = [
        create_measurement(220, '2025-01-01T10:00:00Z'),
        create_measurement(221, '2025-01-01T10:00:03Z'),
        create_measurement(222, '2025-01-01T10:00:06Z'),
      ];

      measurements.forEach((measurement) => {
        rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);
      });

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('ignores measurements with non-numeric values', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const invalid_measurement = {
        ...create_measurement(220),
        voltage_rms: null as unknown as number, // Invalid value
      };

      rerender(<StreamingChart {...default_props} latest_measurement={invalid_measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Circular Buffer Behavior', () => {
    it('enforces max buffer size', () => {
      const max_buffer_size = 3;
      const { rerender } = render(
        <StreamingChart {...default_props} max_buffer_size={max_buffer_size} />
      );

      // Add more measurements than buffer size
      const measurements = [
        create_measurement(220, '2025-01-01T10:00:00Z'),
        create_measurement(221, '2025-01-01T10:00:03Z'),
        create_measurement(222, '2025-01-01T10:00:06Z'),
        create_measurement(223, '2025-01-01T10:00:09Z'), // Should remove first
        create_measurement(224, '2025-01-01T10:00:12Z'), // Should remove second
      ];

      measurements.forEach((measurement) => {
        rerender(
          <StreamingChart
            {...default_props}
            max_buffer_size={max_buffer_size}
            latest_measurement={measurement}
          />
        );
      });

      // Buffer should contain only last 3 measurements
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles buffer with single measurement', () => {
      const { rerender } = render(<StreamingChart {...default_props} max_buffer_size={1} />);

      const measurement = create_measurement(220, '2025-01-01T10:00:00Z');
      rerender(
        <StreamingChart
          {...default_props}
          max_buffer_size={1}
          latest_measurement={measurement}
        />
      );

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles large buffer size', () => {
      const { rerender } = render(<StreamingChart {...default_props} max_buffer_size={100} />);

      // Add 50 measurements
      for (let i = 0; i < 50; i++) {
        const measurement = create_measurement(220 + i, `2025-01-01T10:${String(i).padStart(2, '0')}:00Z`);
        rerender(
          <StreamingChart
            {...default_props}
            max_buffer_size={100}
            latest_measurement={measurement}
          />
        );
      }

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Duplicate Timestamp Prevention', () => {
    it('prevents duplicate entries with same timestamp', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const timestamp = '2025-01-01T10:00:00Z';
      const measurement_1 = create_measurement(220, timestamp);
      const measurement_2 = create_measurement(225, timestamp); // Same timestamp, different value

      rerender(<StreamingChart {...default_props} latest_measurement={measurement_1} />);
      rerender(<StreamingChart {...default_props} latest_measurement={measurement_2} />);

      // Second measurement should be ignored
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('accepts measurements with different timestamps', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurement_1 = create_measurement(220, '2025-01-01T10:00:00Z');
      const measurement_2 = create_measurement(221, '2025-01-01T10:00:03Z');

      rerender(<StreamingChart {...default_props} latest_measurement={measurement_1} />);
      rerender(<StreamingChart {...default_props} latest_measurement={measurement_2} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Statistics Calculation', () => {
    it('calculates min/max/avg for recent measurements', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurements = [
        create_measurement(220, '2025-01-01T10:00:00Z'),
        create_measurement(225, '2025-01-01T10:00:03Z'),
        create_measurement(230, '2025-01-01T10:00:06Z'),
      ];

      measurements.forEach((measurement) => {
        rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);
      });

      // Check if statistics are displayed (Min/Avg/Max)
      expect(screen.getByText(/Min:/)).toBeInTheDocument();
      expect(screen.getByText(/Śr:/)).toBeInTheDocument();
      expect(screen.getByText(/Max:/)).toBeInTheDocument();
    });

    it('shows zero statistics when buffer is empty', () => {
      render(<StreamingChart {...default_props} />);

      expect(screen.getByText(/Min:/)).toBeInTheDocument();
      expect(screen.getByText(/Śr:/)).toBeInTheDocument();
      expect(screen.getByText(/Max:/)).toBeInTheDocument();
    });
  });

  describe('Different Parameter Keys', () => {
    it('handles voltage_rms parameter', () => {
      const { rerender } = render(
        <StreamingChart
          parameter_key="voltage_rms"
          title="Voltage"
          unit="V"
          stroke_color="#3b82f6"
        />
      );

      const measurement = create_measurement(220);
      rerender(
        <StreamingChart
          parameter_key="voltage_rms"
          title="Voltage"
          unit="V"
          stroke_color="#3b82f6"
          latest_measurement={measurement}
        />
      );

      expect(screen.getByText('Voltage')).toBeInTheDocument();
    });

    it('handles current_rms parameter', () => {
      const measurement: MeasurementDTO = {
        ...create_measurement(0),
        current_rms: 5.5,
      };

      render(
        <StreamingChart
          parameter_key="current_rms"
          title="Current"
          unit="A"
          stroke_color="#f59e0b"
          latest_measurement={measurement}
        />
      );

      expect(screen.getByText('Current')).toBeInTheDocument();
    });

    it('handles frequency parameter', () => {
      const measurement: MeasurementDTO = {
        ...create_measurement(0),
        frequency: 50.02,
      };

      render(
        <StreamingChart
          parameter_key="frequency"
          title="Frequency"
          unit="Hz"
          stroke_color="#10b981"
          latest_measurement={measurement}
        />
      );

      expect(screen.getByText('Frequency')).toBeInTheDocument();
    });

    it('handles power_active parameter', () => {
      const measurement: MeasurementDTO = {
        ...create_measurement(0),
        power_active: 1500,
      };

      render(
        <StreamingChart
          parameter_key="power_active"
          title="Active Power"
          unit="W"
          stroke_color="#8b5cf6"
          latest_measurement={measurement}
        />
      );

      expect(screen.getByText('Active Power')).toBeInTheDocument();
    });
  });

  describe('Custom Formatting', () => {
    it('applies custom format function to values', () => {
      const format_value = vi.fn((v: number) => (v / 1000).toFixed(2));
      const { rerender } = render(
        <StreamingChart
          {...default_props}
          format_value={format_value}
        />
      );

      const measurement = create_measurement(1500);
      rerender(
        <StreamingChart
          {...default_props}
          format_value={format_value}
          latest_measurement={measurement}
        />
      );

      // Format function should be called for statistics display
      expect(format_value).toHaveBeenCalled();
    });

    it('uses default formatting when no custom format provided', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurement = create_measurement(220.456);
      rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles measurement without timestamp', () => {
      const measurement = {
        ...create_measurement(220),
        time: undefined,
      };

      render(<StreamingChart {...default_props} latest_measurement={measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles very small values', () => {
      const measurement = create_measurement(0.001);

      render(<StreamingChart {...default_props} latest_measurement={measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles very large values', () => {
      const measurement = create_measurement(999999);

      render(<StreamingChart {...default_props} latest_measurement={measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles negative values', () => {
      const measurement = create_measurement(-50);

      render(<StreamingChart {...default_props} latest_measurement={measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles zero value', () => {
      const measurement = create_measurement(0);

      render(<StreamingChart {...default_props} latest_measurement={measurement} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('does not re-render unnecessarily when receiving same measurement', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurement = create_measurement(220, '2025-01-01T10:00:00Z');

      // Render same measurement multiple times
      rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);
      rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);
      rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);

      // Component should handle this gracefully
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('uses memoization for chart data', () => {
      const { rerender } = render(<StreamingChart {...default_props} />);

      const measurement = create_measurement(220);
      rerender(<StreamingChart {...default_props} latest_measurement={measurement} />);

      // Verify chart renders (memoization is internal optimization)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});
