import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WaveformDTO } from "@/types/api";
import { TrendingUp } from "lucide-react";

interface WaveformChartProps {
  waveforms: WaveformDTO;
  frequency: number;
}

/**
 * Generate symmetric tick values around zero.
 * Picks a "nice" step (1, 2, 2.5, 5 × 10^n) and returns ticks from -max to +max.
 */
function generateSymmetricTicks(maxAbsValue: number, desiredCount: number = 5): number[] {
  if (maxAbsValue === 0) return [0];
  const rawStep = maxAbsValue / Math.floor(desiredCount / 2);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  let niceStep: number;
  if (residual <= 1) niceStep = magnitude;
  else if (residual <= 2) niceStep = 2 * magnitude;
  else if (residual <= 2.5) niceStep = 2.5 * magnitude;
  else if (residual <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const ticks: number[] = [];
  const nHalf = Math.ceil(maxAbsValue / niceStep);
  for (let i = -nHalf; i <= nHalf; i++) {
    ticks.push(i * niceStep);
  }
  return ticks;
}

/**
 * Find indices where voltage crosses zero going positive (rising edge).
 * Returns sample indices where v[i-1] <= 0 and v[i] > 0.
 */
function findPositiveZeroCrossings(data: number[]): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1] <= 0 && data[i] > 0) {
      crossings.push(i);
    }
  }
  return crossings;
}

/**
 * Trim waveform data to exact periods starting from a voltage zero-crossing.
 * Returns { voltage, current, samplingRate } or null if insufficient data.
 */
function trimToExactPeriods(
  voltage: number[],
  current: number[],
  frequency: number,
  numPeriods: number
): { voltage: number[]; current: number[]; samplingRate: number } | null {
  const crossings = findPositiveZeroCrossings(voltage);
  if (crossings.length < 2) return null;

  const samplesPerPeriod = crossings[1] - crossings[0];
  if (samplesPerPeriod < 2) return null;

  const startIdx = crossings[0];
  const totalSamples = numPeriods * samplesPerPeriod + 1; // +1 to visually close the last period
  const endIdx = startIdx + totalSamples;

  if (endIdx > voltage.length) return null;

  const samplingRate = samplesPerPeriod * frequency;

  return {
    voltage: voltage.slice(startIdx, endIdx),
    current: current.slice(startIdx, endIdx),
    samplingRate,
  };
}

export function WaveformChart({ waveforms, frequency }: WaveformChartProps) {
  const [numPeriods, setNumPeriods] = useState<1 | 2>(1);

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
    );
  }

  // Try to trim to exact periods; fallback to 1 period, then raw data
  const trimmedRequested = trimToExactPeriods(
    waveforms.voltage,
    waveforms.current,
    frequency,
    numPeriods,
  );
  const trimmedFallback =
    trimmedRequested ??
    trimToExactPeriods(waveforms.voltage, waveforms.current, frequency, 1);
  const trimmed = trimmedFallback;

  const displayVoltage = trimmed ? trimmed.voltage : waveforms.voltage;
  const displayCurrent = trimmed ? trimmed.current : waveforms.current;
  const samplingRate = trimmed
    ? trimmed.samplingRate
    : (waveforms.voltage.length - 1) * frequency; // legacy fallback

  // Auto-scale voltage axis with symmetric ticks
  const maxVoltage = Math.max(...displayVoltage.map(Math.abs));
  const voltageTicks = generateSymmetricTicks(maxVoltage, 7);
  const voltageTickMax = voltageTicks[voltageTicks.length - 1];
  const voltageDomain = [-voltageTickMax, voltageTickMax];

  // Auto-scale current axis with symmetric ticks
  const maxCurrent = Math.max(...displayCurrent.map(Math.abs));
  // Use at least 0.01A margin for very small currents (phone chargers ~0.02-0.05A)
  const currentWithMargin = Math.max(maxCurrent * 1.2, 0.01);
  const currentTicks = generateSymmetricTicks(currentWithMargin, 7);
  const currentTickMax = currentTicks[currentTicks.length - 1];
  const currentDomain = [-currentTickMax, currentTickMax];

  // Determine if current should be displayed in mA (for better readability at low currents)
  const useMilliamps = maxCurrent < 0.5; // Below 0.5A, show in mA
  const currentMultiplier = useMilliamps ? 1000 : 1;
  const currentUnit = useMilliamps ? "mA" : "A";

  // Transform data for display
  const chartData = displayVoltage.map((v, index) => ({
    sample: index,
    time: (index / samplingRate) * 1000,
    voltage: v,
    current: displayCurrent[index] * currentMultiplier,
  }));

  // Adjust current domain and ticks for display units
  const displayCurrentDomain = [
    currentDomain[0] * currentMultiplier,
    currentDomain[1] * currentMultiplier,
  ];
  const displayCurrentTicks = currentTicks.map((t) => t * currentMultiplier);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg">
              Analiza Fazowa (Oscyloskop)
            </span>
          </CardTitle>
          <div className="flex gap-1" data-testid="period-toggle">
            <button
              onClick={() => setNumPeriods(1)}
              className={`px-2 py-0.5 text-xs rounded border ${
                numPeriods === 1
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "border-gray-600 text-gray-400 hover:text-gray-200"
              }`}
              data-testid="btn-1t"
            >
              1T
            </button>
            <button
              onClick={() => setNumPeriods(2)}
              className={`px-2 py-0.5 text-xs rounded border ${
                numPeriods === 2
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "border-gray-600 text-gray-400 hover:text-gray-200"
              }`}
              data-testid="btn-2t"
            >
              2T
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
          Napięcie (niebieski, V) i Prąd (pomarańczowy, {currentUnit}) na
          niezależnych osiach ({frequency.toFixed(1)} Hz)
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
                ticks={voltageTicks}
                {...{
                  "data-testid": "y-axis-v-axis",
                  "data-domain": JSON.stringify(voltageDomain),
                }}
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
                ticks={displayCurrentTicks}
                width={60}
                tickFormatter={
                  (value) =>
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

              {/* Zero reference lines */}
              <ReferenceLine
                yAxisId="v-axis"
                y={0}
                stroke="#4b5563"
                strokeDasharray="6 3"
                strokeWidth={1.5}
              />
              <ReferenceLine
                yAxisId="i-axis"
                y={0}
                stroke="#4b5563"
                strokeDasharray="6 3"
                strokeWidth={1.5}
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
                formatter={(value, name) => {
                  const v = Number(value);
                  if (isNaN(v) || name === undefined) {
                    return ["---", String(name ?? "Nieznany")];
                  }

                  if (name === "Prąd (A)" || name === `Prąd (${currentUnit})`) {
                    return [
                      useMilliamps ? `${v.toFixed(0)} mA` : `${v.toFixed(3)} A`,
                      `Prąd (${currentUnit})`,
                    ];
                  }

                  return [`${v.toFixed(1)} V`, "Napięcie (V)"];
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
