import { useRef, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { MeasurementDTO } from "@/types/api";
import { Activity } from "lucide-react";

interface StreamingChartProps {
  /** Parameter key to display (e.g., 'voltage_rms', 'current_rms') */
  parameter_key: keyof MeasurementDTO;
  /** Chart title */
  title: string;
  /** Y-axis unit (e.g., 'V', 'A', 'Hz') */
  unit: string;
  /** Line color */
  stroke_color: string;
  /** Y-axis domain [min, max] or 'auto' */
  y_domain?: [number | string, number | string];
  /** Max buffer size (number of measurements to keep) */
  max_buffer_size?: number;
  /** Format value for display */
  format_value?: (value: number) => string;
  /** Latest measurement from WebSocket */
  latest_measurement?: MeasurementDTO;
}

interface ChartDataPoint {
  timestamp: number;  // Unix timestamp in milliseconds
  value: number;
  display_time: string;  // Formatted time for tooltip
}

/**
 * Real-time streaming chart component for SCADA dashboard.
 *
 * Implements oscilloscope-like behavior:
 * - New measurements slide in from the right
 * - Old measurements slide out to the left
 * - Circular buffer with configurable size (default: 60 measurements = 3 minutes at 3s interval)
 * - Optimized performance: no animations, memoized data, ref-based buffer
 * - Read-only (no zoom/pan - use aggregation view for historical analysis)
 *
 * Usage:
 * ```tsx
 * const { data } = useWebSocket({ ... });
 *
 * <StreamingChart
 *   parameter_key="voltage_rms"
 *   title="Napięcie"
 *   unit="V"
 *   stroke_color="#3b82f6"
 *   y_domain={[200, 260]}
 *   latest_measurement={data?.latest_measurement}
 * />
 * ```
 */
export function StreamingChart({
  parameter_key,
  title,
  unit,
  stroke_color,
  y_domain = ["auto", "auto"],
  max_buffer_size = 60,
  format_value = (v: number) => v.toFixed(2),
  latest_measurement,
}: StreamingChartProps) {
  // Use ref to store buffer - avoids re-renders on each measurement
  const buffer_ref = useRef<ChartDataPoint[]>([]);
  const last_timestamp_ref = useRef<number>(0);

  // Force re-render counter (only when we want to update the chart)
  const [render_count, set_render_count] = useState(0);

  // Add new measurement to buffer when latest_measurement prop changes
  const add_measurement = useCallback(
    (measurement: MeasurementDTO) => {
      const value = measurement[parameter_key];
      if (typeof value !== 'number') return;

      const timestamp = measurement.time
        ? new Date(measurement.time).getTime()
        : Date.now();

      // Prevent duplicate entries (same timestamp)
      if (timestamp === last_timestamp_ref.current) return;
      last_timestamp_ref.current = timestamp;

      const new_point: ChartDataPoint = {
        timestamp,
        value,
        display_time: new Date(timestamp).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };

      // Add new point and remove oldest if buffer is full (circular buffer)
      buffer_ref.current = [
        ...buffer_ref.current.slice(-(max_buffer_size - 1)),
        new_point,
      ];

      // Trigger re-render to update chart
      set_render_count((prev) => prev + 1);
    },
    [parameter_key, max_buffer_size]
  );

  // Process latest measurement when it changes (useEffect for side effects)
  const measurement_timestamp = latest_measurement?.time || '';
  const previous_measurement_timestamp_ref = useRef<string>('');

  if (latest_measurement && measurement_timestamp !== previous_measurement_timestamp_ref.current) {
    previous_measurement_timestamp_ref.current = measurement_timestamp;
    add_measurement(latest_measurement);
  }

  // Memoize chart data to prevent unnecessary Recharts re-renders
  // Only recalculate when buffer changes (render_count increments)
  const chart_data = useMemo(() => {
    return buffer_ref.current.map((point, index) => ({
      index,  // X-axis: sequential index (0, 1, 2, ...)
      value: point.value,
      timestamp: point.timestamp,
      display_time: point.display_time,
    }));
  }, [render_count]);

  // Calculate min/max for last 10 measurements (for status indication)
  const recent_stats = useMemo(() => {
    const recent = buffer_ref.current.slice(-10);
    if (recent.length === 0) return { min: 0, max: 0, avg: 0 };

    const values = recent.map(p => p.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [render_count]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="text-base sm:text-lg">{title}</span>
          </CardTitle>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Min: {format_value(recent_stats.min)} {unit}</span>
            <span>Śr: {format_value(recent_stats.avg)} {unit}</span>
            <span>Max: {format_value(recent_stats.max)} {unit}</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Streaming w czasie rzeczywistym (ostatnie {max_buffer_size} pomiarów)
        </p>
      </CardHeader>
      <CardContent className="pt-2 pb-2 px-2 sm:px-4">
        <div className="h-[250px] sm:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" debounce={100}>
            <LineChart data={chart_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="index"
                stroke="#6b7280"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                height={40}
                label={{
                  value: "Próbki (nowsze →)",
                  position: "insideBottom",
                  offset: -5,
                  style: { fill: "#e5e7eb", fontSize: 11 },
                }}
              />
              <YAxis
                stroke={stroke_color}
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={y_domain}
                width={60}
                label={{
                  value: `${unit}`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "#e5e7eb", fontSize: 12, textAnchor: "middle" },
                }}
                tickFormatter={(value) => format_value(value)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={stroke_color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}  // Disable animations for streaming
                name={title}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
