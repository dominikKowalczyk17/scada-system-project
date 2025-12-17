import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WaveformChart } from '@/components/WaveformChart';

interface MockResponsiveContainerProps {
  children: React.ReactNode;
}

interface MockLineChartProps {
  children: React.ReactNode;
  data?: Array<Record<string, unknown>>;
}

interface MockXAxisProps {
  tickFormatter?: (value: number) => string;
  label?: { value?: string };
}

interface MockYAxisProps {
  label?: { value?: string };
  domain?: [number | string, number | string];
  tickFormatter?: (value: number) => string;
}

interface MockTooltipProps {
  formatter?: (value: number) => string;
  labelFormatter?: (value: number) => string;
}

interface MockLineProps {
  dataKey: string;
  stroke?: string;
  name?: string;
  dot?: boolean;
}

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: MockResponsiveContainerProps) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: MockLineChartProps) => (
    <div data-testid="line-chart" data-points={data?.length} data-raw={JSON.stringify(data)}>
      {children}
    </div>
  ),
  XAxis: ({ tickFormatter, label }: MockXAxisProps) => (
    <div data-testid="x-axis" data-label={label?.value}>
      <span data-testid="x-tick-sample">{tickFormatter?.(20.0)}</span>
    </div>
  ),
  YAxis: ({ label, domain, tickFormatter }: MockYAxisProps) => (
    <div
      data-testid="y-axis"
      data-label={label?.value}
      data-domain={JSON.stringify(domain)}
    >
      <span data-testid="y-tick-sample">{tickFormatter?.(230.123)}</span>
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ formatter, labelFormatter }: MockTooltipProps) => (
    <div data-testid="tooltip">
      <span data-testid="tooltip-val">{JSON.stringify(formatter?.(230.123))}</span>
      <span data-testid="tooltip-label">{labelFormatter?.(10.5)}</span>
    </div>
  ),
  Line: ({ dataKey, stroke, name, dot }: MockLineProps) => (
    <div
      data-testid={`line-${dataKey}`}
      data-stroke={stroke}
      data-name={name}
      data-dot={String(dot)}
    />
  ),
}));

describe('WaveformChart - Comprehensive Suite', () => {
  const voltageSamples = Array.from({ length: 200 }, (_, i) => 230 * Math.sin((i / 200) * 2 * Math.PI));
  const currentSamples = Array.from({ length: 200 }, (_, i) => 15 * Math.sin((i / 200) * 2 * Math.PI));
  const waveforms = { voltage: voltageSamples, current: currentSamples };
  const defaultProps = { waveforms, frequency: 50 };

  describe('UI & Layout', () => {
    it('renders the Polish title and frequency description', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByText(/Przebieg czasowy/i)).toBeInTheDocument();
      expect(screen.getByText(/50.0 Hz/i)).toBeInTheDocument();
    });

    it('renders the toggle buttons with correct Polish labels', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByRole('button', { name: /Napięcie/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Prąd/i })).toBeInTheDocument();
    });
  });

  describe('Data Transformation & Noise Logic', () => {
    it('calculates time in milliseconds correctly based on frequency', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');
      
      const lastPoint = data[199];
      expect(lastPoint.time).toBeCloseTo(19.9, 1);
    });

    it('applies noise to values (output should not exactly equal input)', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      expect(data[0].voltage).not.toBe(0); 
    });
  });

  describe('Axis & Tooltip Configuration', () => {
    it('configures X-Axis with time labels and ms formatting', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-label', 'Czas (ms)');
      expect(screen.getByTestId('x-tick-sample')).toHaveTextContent('20.0');
    });

    it('formats tooltip values to 2 decimal places and labels to 1 decimal place', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('tooltip-val')).toHaveTextContent('230.12');
      expect(screen.getByTestId('tooltip-label')).toHaveTextContent('10.5 ms');
    });
  });

  describe('State Management', () => {
    it('switches Y-Axis scale and labels when changing waveform type', () => {
      const { rerender } = render(React.createElement(WaveformChart, defaultProps));
      
      let yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-label', 'Napięcie (V)');
      expect(yAxis).toHaveAttribute('data-domain', JSON.stringify([210, 250]));

      fireEvent.click(screen.getByRole('button', { name: /Prąd/i }));
      rerender(React.createElement(WaveformChart, defaultProps));
      
      yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toHaveAttribute('data-label', 'Prąd (A)');
      expect(yAxis).toHaveAttribute('data-domain', JSON.stringify([0, "auto"]));
    });

    it('renders only the active line (Voltage or Current)', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('line-voltage')).toBeInTheDocument();
      expect(screen.queryByTestId('line-current')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Prąd/i }));
      expect(screen.getByTestId('line-current')).toBeInTheDocument();
      expect(screen.queryByTestId('line-voltage')).not.toBeInTheDocument();
    });
  });

  describe('Styling & Performance', () => {
    it('disables dots on lines for cleaner visualization', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('line-voltage')).toHaveAttribute('data-dot', 'false');
    });

    it('applies the correct CSS classes for height responsiveness', () => {
      const { container } = render(React.createElement(WaveformChart, defaultProps));
      const chartContainer = container.querySelector('.h-\\[300px\\]');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});