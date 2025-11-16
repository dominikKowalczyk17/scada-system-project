import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { WaveformDTO } from "@/types/api";
import { TrendingUp } from "lucide-react";

interface WaveformChartProps {
  waveforms: WaveformDTO;
  frequency: number;
}

export function WaveformChart({ waveforms, frequency }: WaveformChartProps) {
  const [selectedWaveform, setSelectedWaveform] = useState<
    "voltage" | "current"
  >("voltage");

  // Add realistic noise and distortion to waveform for oscilloscope-like appearance
  const addRealisticNoise = (
    value: number,
    index: number,
    isVoltage: boolean
  ) => {
    // High-frequency noise (measurement noise)
    const highFreqNoise = (Math.random() - 0.5) * (isVoltage ? 2 : 0.02);

    // Low-frequency drift (grid fluctuations)
    const drift = Math.sin(index * 0.05) * (isVoltage ? 1 : 0.01);

    // Occasional spikes (switching noise from power electronics)
    const spike =
      Math.random() > 0.95 ? (Math.random() - 0.5) * (isVoltage ? 5 : 0.05) : 0;

    return value + highFreqNoise + drift + spike;
  };

  // Transform backend data (voltage[], current[]) into Recharts format with realistic noise
  const chartData = waveforms.voltage.map((v, index) => ({
    sample: index,
    time: (index / waveforms.voltage.length) * (1000 / frequency), // Convert to ms
    voltage: addRealisticNoise(v, index, true),
    current: addRealisticNoise(waveforms.current[index], index, false),
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Real-time Waveform
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedWaveform("voltage")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedWaveform === "voltage"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Voltage
            </button>
            <button
              onClick={() => setSelectedWaveform("current")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedWaveform === "current"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Current
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time waveform showing harmonic distortion from non-linear loads (
          {frequency.toFixed(1)} Hz)
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={600}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              label={{
                value: "Time (ms)",
                position: "insideBottom",
                offset: -6,
                style: { fill: "#9ca3af" },
              }}
              tickFormatter={(value) => value.toFixed(1)}
              stroke="#6b7280"
              tick={{ fill: "#9ca3af" }}
              height={60}
            />
            {selectedWaveform === "voltage" && (
              <YAxis
                stroke="#3b82f6"
                tick={{ fill: "#9ca3af" }}
                domain={[220, 240]}
                label={{
                  value: "Voltage (V)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#9ca3af" },
                }}
                tickFormatter={(value) => value.toFixed(1)}
              />
            )}
            {selectedWaveform === "current" && (
              <YAxis
                stroke="#f59e0b"
                tick={{ fill: "#9ca3af" }}
                domain={[0, "auto"]}
                label={{
                  value: "Current (A)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#9ca3af" },
                }}
              />
            )}
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
            {selectedWaveform === "voltage" && (
              <Line
                type="monotone"
                dataKey="voltage"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Voltage (V)"
              />
            )}
            {selectedWaveform === "current" && (
              <Line
                type="monotone"
                dataKey="current"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Current (A)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
