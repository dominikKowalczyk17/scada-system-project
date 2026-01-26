import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  yAxisId?: string;
  orientation?: string;
  domain?: [number | string, number | string];
  tickFormatter?: (value: number) => string;
}

interface MockTooltipProps {
  labelFormatter?: (value: number) => string;
}

interface MockLineProps {
  dataKey: string;
  yAxisId?: string;
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
  YAxis: ({ yAxisId, orientation, domain, tickFormatter }: MockYAxisProps) => (
    <div
      data-testid={`y-axis-${yAxisId}`}
      data-orientation={orientation}
      data-domain={JSON.stringify(domain)}
    >
      <span data-testid={`y-tick-${yAxisId}`}>{tickFormatter?.(230.123)}</span>
    </div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ labelFormatter }: MockTooltipProps) => (
    <div data-testid="tooltip">
      <span data-testid="tooltip-label">{labelFormatter?.(10.5)}</span>
    </div>
  ),
  Line: ({ dataKey, yAxisId, stroke, name, dot }: MockLineProps) => (
    <div
      data-testid={`line-${dataKey}`}
      data-y-axis={yAxisId}
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
    it('renders the Polish title', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByText(/Analiza Fazowa \(Oscyloskop\)/i)).toBeInTheDocument();
    });

    it('renders the frequency description with both voltage and current mentioned', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByText(/Napięcie.*Prąd.*50\.0 Hz/i)).toBeInTheDocument();
    });

    it('renders both voltage and current lines simultaneously (dual-axis)', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('line-voltage')).toBeInTheDocument();
      expect(screen.getByTestId('line-current')).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('calculates time in milliseconds correctly based on frequency', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      const lastPoint = data[199];
      const expectedTime = (199 / 200) * (1000 / 50); // ~19.9 ms
      expect(lastPoint.time).toBeCloseTo(expectedTime, 1);
    });

    it('transforms waveform data to chart format with sample, time, voltage, current', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      expect(data[0]).toHaveProperty('sample', 0);
      expect(data[0]).toHaveProperty('time');
      expect(data[0]).toHaveProperty('voltage');
      expect(data[0]).toHaveProperty('current');
      expect(data.length).toBe(200);
    });
  });

  describe('Axis Configuration - Dual Y-Axis', () => {
    it('configures X-Axis with time labels and ms formatting', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-label', 'Czas (ms)');
      expect(screen.getByTestId('x-tick-sample')).toHaveTextContent('20.0ms');
    });

    it('configures left Y-Axis for voltage with correct calculated domain', () => {
      render(React.createElement(WaveformChart, defaultProps));
      
      const voltageAxis = screen.getByTestId('y-axis-v-axis');
      
      const maxVal = Math.max(...defaultProps.waveforms.voltage.map(Math.abs));
      const expectedDomain = JSON.stringify([-maxVal * 1.1, maxVal * 1.1]);

      expect(voltageAxis).toHaveAttribute('data-orientation', 'left');
      expect(voltageAxis).toHaveAttribute('data-domain', expectedDomain);
    });

    it('configures right Y-Axis for current with auto-scaled domain', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const currentAxis = screen.getByTestId('y-axis-i-axis');
      expect(currentAxis).toHaveAttribute('data-orientation', 'right');

      // Auto-scaling: maxCurrent = 15A, margin = 20% (3A), domain = [-18, 18]
      const expectedDomain = JSON.stringify([-18, 18]);
      expect(currentAxis).toHaveAttribute('data-domain', expectedDomain);
    });
  });

  describe('Line Configuration', () => {
    it('renders voltage line with correct yAxisId and blue stroke', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const voltageLine = screen.getByTestId('line-voltage');
      expect(voltageLine).toHaveAttribute('data-y-axis', 'v-axis');
      expect(voltageLine).toHaveAttribute('data-stroke', '#3b82f6');
      expect(voltageLine).toHaveAttribute('data-name', 'Napięcie (V)');
    });

    it('renders current line with correct yAxisId and orange stroke', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const currentLine = screen.getByTestId('line-current');
      expect(currentLine).toHaveAttribute('data-y-axis', 'i-axis');
      expect(currentLine).toHaveAttribute('data-stroke', '#f59e0b');
      expect(currentLine).toHaveAttribute('data-name', 'Prąd (A)');
    });
  });

  describe('Tooltip & Styling', () => {
    it('formats tooltip time labels with ms unit', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('tooltip-label')).toHaveTextContent('10.5 ms');
    });

    it('disables dots on lines for cleaner visualization', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('line-voltage')).toHaveAttribute('data-dot', 'false');
      expect(screen.getByTestId('line-current')).toHaveAttribute('data-dot', 'false');
    });

    it('applies responsive height classes', () => {
      const { container } = render(React.createElement(WaveformChart, defaultProps));
      const chartContainer = container.querySelector('.h-\\[300px\\]');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});
