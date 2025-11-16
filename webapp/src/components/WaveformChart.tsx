import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WaveformDTO } from "@/types/api";

interface WaveformChartProps {
  waveforms: WaveformDTO;
  frequency: number;
}

export function WaveformChart({ waveforms, frequency }: WaveformChartProps) {
  // Transform backend data (voltage[], current[]) into Recharts format
  // Each point needs: { sample: number, voltage: number, current: number }
  const chartData = waveforms.voltage.map((v, index) => ({
    sample: index,
    time: (index / waveforms.voltage.length) * (1000 / frequency), // Convert to ms
    voltage: v,
    current: waveforms.current[index],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full" />
          Voltage & Current Waveforms
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time sinusoidal waveforms reconstructed from harmonics (
          {frequency.toFixed(1)} Hz)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              label={{
                value: "Time (ms)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#9ca3af" },
              }}
              tickFormatter={(value) => value.toFixed(1)}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis
              yAxisId="voltage"
              orientation="left"
              label={{
                value: "Voltage (V)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#9ca3af" },
              }}
              domain={["auto", "auto"]}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
            />
            <YAxis
              yAxisId="current"
              orientation="right"
              label={{
                value: "Current (A)",
                angle: 90,
                position: "insideRight",
                style: { fill: "#9ca3af" },
              }}
              domain={["auto", "auto"]}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color: "#e5e7eb" }}
              formatter={(value: number) => value.toFixed(2)}
            />
            <Legend wrapperStyle={{ color: "#9ca3af" }} />
            <Line
              yAxisId="voltage"
              type="monotone"
              dataKey="voltage"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Voltage (V)"
            />
            <Line
              yAxisId="current"
              type="monotone"
              dataKey="current"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="Current (A)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
