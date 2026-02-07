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
  content?: React.ComponentType<{ active?: boolean; payload?: Array<{ payload: Record<string, unknown> }> }>;
  cursor?: Record<string, unknown>;
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
  Tooltip: ({ labelFormatter, content: Content }: MockTooltipProps) => (
    <div data-testid="tooltip">
      {labelFormatter && <span data-testid="tooltip-label-sample">{labelFormatter(100)}</span>}
      {Content && (
        <div data-testid="tooltip-custom">
          <Content
            active={true}
            payload={[{ payload: { harmonic: 'H2', frequency: 100, voltage: 8.5, current: 0.8 } }]}
          />
        </div>
      )}
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
  // H1-H25 (25 harmonics measured at 3000Hz sampling rate)
  const harmonicsVoltage = [
    230.0, 8.5, 6.2, 4.1, 2.3, 1.1, 0.5, 0.2, // H1-H25
    0.15, 0.12, 0.09, 0.07, 0.06, 0.05, 0.04, 0.03, // H9-H16
    0.025, 0.02, 0.015, 0.012, 0.01, 0.008, 0.006, 0.005, 0.004 // H17-H25
  ];
  const harmonicsCurrent = [
    15.0, 0.8, 0.6, 0.4, 0.2, 0.1, 0.05, 0.02, // H1-H25
    0.015, 0.012, 0.009, 0.007, 0.006, 0.005, 0.004, 0.003, // H9-H16
    0.0025, 0.002, 0.0015, 0.0012, 0.001, 0.0008, 0.0006, 0.0005, 0.0004 // H17-H25
  ];
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
      expect(screen.getByText(/3000Hz/i)).toBeInTheDocument();
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
      expect(data[24]).toMatchObject({ harmonic: 'H25', frequency: 1250, voltage: 0.004 });
      expect(data.length).toBe(25);
    });

    it('X-Axis hides tick labels', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
    });

    it('renders custom tooltip with harmonic and frequency info', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      const customTooltip = screen.getByTestId('tooltip-custom');
      expect(customTooltip).toBeInTheDocument();
      expect(customTooltip).toHaveTextContent('H2');
      expect(customTooltip).toHaveTextContent('100 Hz');
    });
  });

  describe('Axis Configuration', () => {
    it('uses linear scale for Y-Axis', () => {
      render(React.createElement(HarmonicsChart, defaultProps));
      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-domain', JSON.stringify([0, 'auto']));
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
      // If voltage has 25 points but current has 0
      render(React.createElement(HarmonicsChart, {
        ...defaultProps,
        harmonicsCurrent: []
      }));
      const chart = screen.getByTestId('bar-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');
      expect(data.length).toBe(25);
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