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
  if (waveforms.voltage.length !== waveforms.current.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Błąd: Niezgodne dane falowe</CardTitle>
        </CardHeader>
        <CardContent>
          Długości tablic napięcia i prądu muszą być takie same.
        </CardContent>
      </Card>
    )
  }

  // Auto-scale voltage axis
  const maxVoltage = Math.max(...waveforms.voltage.map(Math.abs));
  const voltageDomain = [-maxVoltage * 1.1, maxVoltage * 1.1];

  // Auto-scale current axis based on actual data range
  const maxCurrent = Math.max(...waveforms.current.map(Math.abs));
  // Use at least 0.01A margin for very small currents (phone chargers ~0.02-0.05A)
  const currentMargin = Math.max(maxCurrent * 0.2, 0.01);
  const currentDomain = [
    -(maxCurrent + currentMargin),
    maxCurrent + currentMargin
  ];

  // Determine if current should be displayed in mA (for better readability at low currents)
  const useMilliamps = maxCurrent < 0.5; // Below 0.5A, show in mA
  const currentMultiplier = useMilliamps ? 1000 : 1;
  const currentUnit = useMilliamps ? "mA" : "A";

  // Transform current data for display
  const chartData = waveforms.voltage.map((v, index) => ({
    sample: index,
    time: (index / waveforms.voltage.length) * (1000 / frequency),
    voltage: v,
    current: waveforms.current[index] * currentMultiplier,
  }));

  // Adjust current domain for display units
  const displayCurrentDomain = [
    currentDomain[0] * currentMultiplier,
    currentDomain[1] * currentMultiplier
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg">Analiza Fazowa (Oscyloskop)</span>
          </CardTitle>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
          Napięcie (niebieski, V) i Prąd (pomarańczowy, {currentUnit}) na niezależnych osiach ({frequency.toFixed(1)} Hz)
        </p>
      </CardHeader>
      <CardContent className="pt-2 pb-2 px-2 sm:px-4">
        <div className="h-[300px] sm:h-[400px] lg:h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                tickFormatter={(v) => `${v.toFixed(1)}ms`}
                label={{
                  value: "Czas (ms)",
                  position: "insideBottom",
                  offset: -5,
                  style: { fill: "#e5e7eb", fontSize: 12 },
                }}
                height={50}
              />
              
              {/* LEWA OŚ DLA NAPIĘCIA */}
              <YAxis
                yAxisId="v-axis"
                orientation="left"
                stroke="#3b82f6"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={voltageDomain}
                {...{ "data-testid": "y-axis-v-axis", "data-domain": JSON.stringify(voltageDomain) }}
                width={60}
                tickFormatter={(value) => value.toFixed(0)}
                label={{
                  value: "Napięcie (V)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fill: "#3b82f6", fontSize: 12 },
                }}
              />
              
              {/* PRAWA OŚ DLA PRĄDU - AUTO-SCALED */}
              <YAxis
                yAxisId="i-axis"
                orientation="right"
                stroke="#f59e0b"
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                domain={displayCurrentDomain}
                width={60}
                tickFormatter={(value) =>
                  useMilliamps
                    ? value.toFixed(0) // mA - no decimals
                    : value.toFixed(2) // A - 2 decimals
                }
                label={{
                  value: `Prąd (${currentUnit})`,
                  angle: 90,
                  position: "insideRight",
                  offset: 10,
                  style: { fill: "#f59e0b", fontSize: 12 },
                }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "6px",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#e5e7eb", fontWeight: 600 }}
                itemStyle={{ color: "#e5e7eb" }}
                labelFormatter={(time) => `${time.toFixed(1)} ms`}
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value === undefined || name === undefined) {
                    return ["---", name ?? "Nieznany"];
                  }

                  if (name === "Prąd (A)" || name === `Prąd (${currentUnit})`) {
                    return [
                      useMilliamps ? `${value.toFixed(0)} mA` : `${value.toFixed(3)} A`,
                      `Prąd (${currentUnit})`
                    ];
                  }

                  return [`${value.toFixed(1)} V`, "Napięcie (V)"];
                }}
              />

              <Line
                yAxisId="v-axis"
                type="monotone"
                dataKey="voltage"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Napięcie (V)"
                isAnimationActive={false}
              />
              
              <Line
                yAxisId="i-axis"
                type="monotone"
                dataKey="current"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name={`Prąd (${currentUnit})`}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}