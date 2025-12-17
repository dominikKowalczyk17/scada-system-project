import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HarmonicsChart } from '@/components/HarmonicsChart';

interface MockResponsiveContainerProps {
  children: React.ReactNode;
}

interface MockBarChartProps {
  children: React.ReactNode;
  data?: Array<Record<string, unknown>>;
}

interface MockXAxisProps {
  tickFormatter?: (value: number) => string;
  label?: { value?: string };
}

interface MockYAxisProps {
  scale?: string;
  domain?: [number | string, number | string];
  label?: { value?: string };
}

interface MockTooltipProps {
  labelFormatter?: (value: number) => string;
}

interface MockBarProps {
  dataKey: string;
  fill?: string;
  name?: string;
  radius?: number[];
}

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: MockResponsiveContainerProps) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children, data }: MockBarChartProps) => (
    <div data-testid="bar-chart" data-bars={data?.length} data-raw={JSON.stringify(data)}>
      {children}
    </div>
  ),
  XAxis: ({ tickFormatter, label }: MockXAxisProps) => (
    <div data-testid="x-axis" data-label={label?.value}>
      <span data-testid="x-tick-sample">{tickFormatter?.(50)}</span>
    </div>
  ),
  YAxis: ({ scale, domain, label }: MockYAxisProps) => (
    <div data-testid="y-axis" data-scale={scale} data-domain={JSON.stringify(domain)} data-label={label?.value} />
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ labelFormatter }: MockTooltipProps) => (
    <div data-testid="tooltip">
       <span data-testid="tooltip-label-sample">{labelFormatter?.(100)}</span>
    </div>
  ),
  Bar: ({ dataKey, fill, name, radius }: MockBarProps) => (
    <div
      data-testid={`bar-${dataKey}`}
      data-fill={fill}
      data-name={name}
      data-radius={JSON.stringify(radius)}
    />
  ),
}));

describe('HarmonicsChart Component - Comprehensive Suite', () => {
  const harmonicsVoltage = [230.0, 8.5, 6.2, 4.1, 2.3, 1.1, 0.5, 0.2]; // H1-H8
  const harmonicsCurrent = [15.0, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05, 0.02];
  const defaultProps = {
    harmonicsVoltage,
    harmonicsCurrent,
    thdVoltage: 5.254,
    thdCurrent: 3.129,
  };

  describe('Structural Rendering', () => {
    it('renders the main Card and Title', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      expect(screen.getByText(/Analiza harmonicznych/i)).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('renders the technical Info box explaining Nyquist limit', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      expect(screen.getByText(/Ograniczenie Nyquista/i)).toBeInTheDocument();
      expect(screen.getByText(/800Hz/i)).toBeInTheDocument();
    });

    it('renders THD values with exactly 2 decimal places', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      // Checks for .toFixed(2) application
      expect(screen.getByText(/THD napięcia: 5.25%/i)).toBeInTheDocument();
      expect(screen.getByText(/THD prądu: 3.13%/i)).toBeInTheDocument();
    });
  });

  describe('Data Mapping & Logic', () => {
    it('correctly maps frequency values (50Hz steps) to chart data', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      const chart = screen.getByTestId('bar-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');
      
      expect(data[0]).toMatchObject({ harmonic: 'H1', frequency: 50, voltage: 230 });
      expect(data[2]).toMatchObject({ harmonic: 'H3', frequency: 150, voltage: 6.2 });
      expect(data.length).toBe(8);
    });

    it('X-Axis tick formatter adds "Hz" suffix', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      expect(screen.getByTestId('x-tick-sample')).toHaveTextContent('50Hz');
    });

    it('Tooltip label formatter adds "Hz" suffix', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      expect(screen.getByTestId('tooltip-label-sample')).toHaveTextContent('100 Hz');
    });
  });

  describe('Axis Configuration', () => {
    it('uses logarithmic scale for Y-Axis to visualize small harmonics', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-scale', 'log');
      expect(yAxis).toHaveAttribute('data-domain', JSON.stringify([0.01, 'auto']));
    });

    it('updates Y-Axis label based on selection', () => {
      const { rerender } = render(React.createElement(HarmonicsChart, defaultProps));
      expect(screen.getByTestId('y-axis')).toHaveAttribute('data-label', 'Amplituda (V)');

      fireEvent.click(screen.getByRole('button', { name: /Prąd/i }));
      rerender(React.createElement(HarmonicsChart, defaultProps));
      expect(screen.getByTestId('y-axis')).toHaveAttribute('data-label', 'Amplituda (A)');
    });
  });

  describe('State & Interaction', () => {
    it('toggles between voltage and current bars', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      
      // Default state: Voltage
      expect(screen.getByTestId('bar-voltage')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-current')).not.toBeInTheDocument();

      // Click Current
      fireEvent.click(screen.getByRole('button', { name: /Prąd/i }));
      expect(screen.getByTestId('bar-current')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-voltage')).not.toBeInTheDocument();
    });

    it('applies correct styling props to bars', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      const bar = screen.getByTestId('bar-voltage');
      expect(bar).toHaveAttribute('data-fill', '#3b82f6');
      expect(bar).toHaveAttribute('data-radius', JSON.stringify([4, 4, 0, 0]));
    });
  });

  describe('Edge Cases', () => {
    it('renders correctly with mismatched array lengths', () => {
      // If voltage has 8 points but current has 0
      render(React.createElement(HarmonicsChart, {
        ...defaultProps,
        harmonicsCurrent: []
      }));
      const chart = screen.getByTestId('bar-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');
      expect(data.length).toBe(8);
      expect(data[0].current).toBeUndefined();
    });

    it('handles zero or very small values in logarithmic scale', () => {
      render(React.createElement(HarmonicsChart, {
        ...defaultProps,
        harmonicsVoltage: [230, 0, 0.0001]
      }));
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-bars', '3');
    });
  });
});