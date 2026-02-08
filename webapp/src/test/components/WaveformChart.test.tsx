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

interface MockReferenceLineProps {
  yAxisId?: string;
  y?: number;
  stroke?: string;
  strokeDasharray?: string;
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
  ReferenceLine: ({ yAxisId, y, stroke, strokeDasharray }: MockReferenceLineProps) => (
    <div
      data-testid={`reference-line-${yAxisId}`}
      data-y={y}
      data-stroke={stroke}
      data-stroke-dasharray={strokeDasharray}
    />
  ),
}));

// Helper: generate multi-period sine data starting at a random phase offset
// 3 periods × 60 samples/period = 180 samples (simulates ESP32 sending 3 cycles)
function generateMultiPeriodData(periods: number, samplesPerPeriod: number, phaseOffset = 0.3) {
  const totalSamples = periods * samplesPerPeriod + 10; // extra samples to simulate random start
  const offset = Math.round(phaseOffset * samplesPerPeriod); // start partway through a cycle
  const voltage = Array.from({ length: totalSamples }, (_, i) =>
    230 * Math.sin(((i + offset) / samplesPerPeriod) * 2 * Math.PI)
  );
  const current = Array.from({ length: totalSamples }, (_, i) =>
    15 * Math.sin(((i + offset) / samplesPerPeriod) * 2 * Math.PI - 0.5) // phase-shifted current
  );
  return { voltage, current };
}

describe('WaveformChart - Comprehensive Suite', () => {
  // Legacy data: 1 period, starts at zero → only 1 zero-crossing → fallback to raw
  const voltageSamples = Array.from({ length: 200 }, (_, i) => 230 * Math.sin((i / 200) * 2 * Math.PI));
  const currentSamples = Array.from({ length: 200 }, (_, i) => 15 * Math.sin((i / 200) * 2 * Math.PI));
  const waveforms = { voltage: voltageSamples, current: currentSamples };
  const defaultProps = { waveforms, frequency: 50 };

  // Multi-period data: 3 cycles at 60 samples/period with random phase offset
  const multiPeriodData = generateMultiPeriodData(3, 60);
  const multiPeriodProps = { waveforms: multiPeriodData, frequency: 50 };

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

    it('renders 1T and 2T toggle buttons', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('btn-1t')).toBeInTheDocument();
      expect(screen.getByTestId('btn-2t')).toBeInTheDocument();
    });
  });

  describe('Zero Reference Lines', () => {
    it('renders zero reference lines for both axes', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const vRefLine = screen.getByTestId('reference-line-v-axis');
      const iRefLine = screen.getByTestId('reference-line-i-axis');

      expect(vRefLine).toHaveAttribute('data-y', '0');
      expect(vRefLine).toHaveAttribute('data-stroke', '#4b5563');
      expect(vRefLine).toHaveAttribute('data-stroke-dasharray', '6 3');

      expect(iRefLine).toHaveAttribute('data-y', '0');
      expect(iRefLine).toHaveAttribute('data-stroke', '#4b5563');
    });
  });

  describe('Zero-Crossing Trimming', () => {
    it('trims multi-period data to exact periods starting at zero-crossing', () => {
      render(React.createElement(WaveformChart, multiPeriodProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      // Trimmed data should start near zero voltage (at a zero-crossing)
      expect(Math.abs(data[0].voltage)).toBeLessThan(50); // near zero, not at peak
      // First sample voltage should be positive or very close to zero (rising edge)
      expect(data[1].voltage).toBeGreaterThan(0);
    });

    it('falls back to raw data when < 2 zero-crossings available', () => {
      // Legacy 1-period data: only 1 zero-crossing
      render(React.createElement(WaveformChart, defaultProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      // Should use all 200 samples (fallback behavior)
      expect(data.length).toBe(200);
    });

    it('preserves phase shift between voltage and current after trimming', () => {
      render(React.createElement(WaveformChart, multiPeriodProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      // At the first sample (voltage zero-crossing going positive),
      // current should NOT be at zero if there's a phase shift
      // Current has -0.5 rad phase shift, so at voltage zero-crossing it should be negative
      if (data.length > 1) {
        // Current value at voltage zero-crossing should be non-zero (phase shifted)
        const firstCurrentAbs = Math.abs(data[0].current);
        // With a 0.5 rad phase difference, current ≈ 15 * sin(-0.5) ≈ -7.2A → in mA or A
        expect(firstCurrentAbs).toBeGreaterThan(0);
      }
    });
  });

  describe('Period Toggle (1T/2T)', () => {
    it('defaults to 2 periods (2T active)', () => {
      render(React.createElement(WaveformChart, multiPeriodProps));
      const btn2t = screen.getByTestId('btn-2t');
      expect(btn2t.className).toContain('bg-blue-600');
    });

    it('switches to 1 period when 1T is clicked', () => {
      render(React.createElement(WaveformChart, multiPeriodProps));

      const chartBefore = screen.getByTestId('line-chart');
      const dataBefore = JSON.parse(chartBefore.getAttribute('data-raw') || '[]');
      const pointsBefore = dataBefore.length;

      fireEvent.click(screen.getByTestId('btn-1t'));

      const chartAfter = screen.getByTestId('line-chart');
      const dataAfter = JSON.parse(chartAfter.getAttribute('data-raw') || '[]');
      const pointsAfter = dataAfter.length;

      // 1 period should have fewer points than 2 periods
      expect(pointsAfter).toBeLessThan(pointsBefore);
    });

    it('highlights the active period button', () => {
      render(React.createElement(WaveformChart, multiPeriodProps));

      // Default: 2T is active
      expect(screen.getByTestId('btn-2t').className).toContain('bg-blue-600');
      expect(screen.getByTestId('btn-1t').className).not.toContain('bg-blue-600');

      // Click 1T
      fireEvent.click(screen.getByTestId('btn-1t'));
      expect(screen.getByTestId('btn-1t').className).toContain('bg-blue-600');
      expect(screen.getByTestId('btn-2t').className).not.toContain('bg-blue-600');
    });
  });

  describe('Data Transformation', () => {
    it('calculates time in ms based on sampling rate (fallback for legacy data)', () => {
      render(React.createElement(WaveformChart, defaultProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      const lastPoint = data[199];
      // Legacy fallback: samplingRate = (200 - 1) * 50 = 9950
      // time = (199 / 9950) * 1000 = 20.0 ms
      const expectedTime = (199 / ((200 - 1) * 50)) * 1000;
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
    });

    it('time axis starts at 0 for trimmed data', () => {
      render(React.createElement(WaveformChart, multiPeriodProps));
      const chart = screen.getByTestId('line-chart');
      const data = JSON.parse(chart.getAttribute('data-raw') || '[]');

      expect(data[0].time).toBe(0);
    });
  });

  describe('Axis Configuration - Dual Y-Axis', () => {
    it('configures X-Axis with time labels and ms formatting', () => {
      render(React.createElement(WaveformChart, defaultProps));
      expect(screen.getByTestId('x-axis')).toHaveAttribute('data-label', 'Czas (ms)');
      expect(screen.getByTestId('x-tick-sample')).toHaveTextContent('20.0ms');
    });

    it('configures left Y-Axis for voltage with symmetric domain around zero', () => {
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
