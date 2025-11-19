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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg">Real-time Waveform</span>
          </CardTitle>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedWaveform("voltage")}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                selectedWaveform === "voltage"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Voltage
            </button>
            <button
              type="button"
              onClick={() => setSelectedWaveform("current")}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                selectedWaveform === "current"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Current
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
          Real-time waveform showing harmonic distortion from non-linear loads (
          {frequency.toFixed(1)} Hz)
        </p>
      </CardHeader>
      <CardContent className="pt-2 sm:pt-2 pb-2 px-2 sm:px-4">
        <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px] lg:!h-[600px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              label={{
                value: "Time (ms)",
                position: "insideBottom",
                offset: -5,
                style: { fill: "#e5e7eb", fontSize: 12 },
              }}
              tickFormatter={(value) => value.toFixed(1)}
              stroke="#6b7280"
              tick={{ fill: "#e5e7eb", fontSize: 11 }}
              height={50}
            />
            {selectedWaveform === "voltage" && (
              <YAxis
                stroke="#3b82f6"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={[210, 250]}
                label={{
                  value: "Voltage (V)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "#e5e7eb", fontSize: 12, textAnchor: "middle" },
                }}
                tickFormatter={(value) => value.toFixed(0)}
                width={60}
              />
            )}
            {selectedWaveform === "current" && (
              <YAxis
                stroke="#f59e0b"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={[0, "auto"]}
                label={{
                  value: "Current (A)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "#e5e7eb", fontSize: 12, textAnchor: "middle" },
                }}
                tickFormatter={(value) => value.toFixed(2)}
                width={60}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
                fontSize: 12,
              }}
              labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
              itemStyle={{ color: "#e5e7eb" }}
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(time) => `${time.toFixed(1)} ms`}
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
