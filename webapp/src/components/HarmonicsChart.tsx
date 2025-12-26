import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Info } from "lucide-react";

interface HarmonicsChartProps {
  harmonicsVoltage: number[];
  harmonicsCurrent: number[];
  thdVoltage: number;
  thdCurrent: number;
}

export function HarmonicsChart({
  harmonicsVoltage,
  harmonicsCurrent,
  thdVoltage,
  thdCurrent,
}: HarmonicsChartProps) {
  const [selectedHarmonic, setSelectedHarmonic] = useState<
    "voltage" | "current"
  >("voltage");

  // Determine if current should be shown in mA (auto-scale based on max value)
  const maxCurrent = Math.max(...harmonicsCurrent);
  const useMilliamps = maxCurrent < 1.0; // If max < 1A, show in mA

  // Transform harmonics arrays into Recharts format with memoization
  // Memoized to prevent unnecessary recalculations on every render
  // harmonicsVoltage = [H1, H2, H3, ..., H25]
  // H1 = fundamental (50Hz), H2 = 2nd harmonic (100Hz), etc.
  // Limited to H1-H25 (50Hz-1250Hz) due to Nyquist constraint at 3000Hz sampling rate
  const chartData = useMemo(() => {
    return harmonicsVoltage.map((vHarmonic, index) => {
      const currentValue = harmonicsCurrent[index];
      let scaledCurrent =
        currentValue !== undefined && useMilliamps
          ? currentValue * 1000
          : currentValue;

      // CRITICAL FIX: Replace 0 with minimum displayable value for log scale
      // Recharts log scale cannot display 0 values - they become invisible
      // ESP32 sends 0 when harmonic < 0.0005A after rounding to 3 decimals
      if (scaledCurrent === 0) {
        scaledCurrent = useMilliamps ? 0.001 : 0.000001; // 0.001mA or 1µA
      }

      return {
        harmonic: `H${index + 1}`,
        frequency: (index + 1) * 50, // 50Hz, 100Hz, 150Hz, ..., 1250Hz (Nyquist limit ~1500Hz)
        voltage: vHarmonic,
        current: scaledCurrent, // Convert to mA if needed and value exists
      };
    });
  }, [harmonicsVoltage, harmonicsCurrent, useMilliamps]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg">Analiza harmonicznych</span>
          </CardTitle>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedHarmonic("voltage")}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                selectedHarmonic === "voltage"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Napięcie
            </button>
            <button
              type="button"
              onClick={() => setSelectedHarmonic("current")}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                selectedHarmonic === "current"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Prąd
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-2">
          <p className="text-xs sm:text-sm text-muted-foreground">
            THD napięcia: {thdVoltage.toFixed(2)}% | THD prądu:{" "}
            {thdCurrent.toFixed(2)}% (limit PN-EN 50160: 8%)
          </p>
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2">
            <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              <strong>Ograniczenie Nyquista:</strong> System próbkuje przy
              3000Hz (512 próbek), co pozwala na pomiar harmonicznych H1-H25
              (50Hz-1250Hz). THD jest obliczane z H2-H25 zamiast pełnego zakresu
              H2-H40 wymaganego przez IEC 61000-4-7. Wyświetlana wartość
              reprezentuje <strong>dolne ograniczenie</strong> rzeczywistego THD
              (brakuje H26-H40).
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 sm:pt-2 pb-2 px-2 sm:px-4">
        <div className="h-[250px] sm:h-[350px] lg:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barSize={30}
              barCategoryGap="15%"
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="frequency"
                label={{
                  value: "Częstotliwość (Hz)",
                  position: "insideBottom",
                  offset: -5,
                  style: { fill: "#e5e7eb", fontSize: 12 },
                }}
                stroke="#6b7280"
                tick={{ fill: "#e5e7eb", fontSize: 10 }}
                height={50}
                ticks={[
                  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
                  650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150,
                  1200, 1250,
                ]}
                tickFormatter={(freq) => `${freq}Hz`}
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                scale="log"
                domain={[
                  selectedHarmonic === "voltage"
                    ? 0.01
                    : useMilliamps
                    ? 0.001
                    : 0.001,
                  "auto",
                ]}
                label={{
                  value:
                    selectedHarmonic === "voltage"
                      ? "Amplituda (V)"
                      : useMilliamps
                      ? "Amplituda (mA)"
                      : "Amplituda (A)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: {
                    fill: "#e5e7eb",
                    fontSize: 12,
                    textAnchor: "middle",
                  },
                }}
                stroke={selectedHarmonic === "voltage" ? "#3b82f6" : "#f59e0b"}
                tick={{ fill: "#e5e7eb", fontSize: 11 }}
                tickFormatter={(value) =>
                  value >= 1 ? value.toFixed(0) : value.toFixed(2)
                }
                width={60}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const value =
                    selectedHarmonic === "voltage"
                      ? data.voltage
                      : data.current;
                  const unit =
                    selectedHarmonic === "voltage"
                      ? "V"
                      : useMilliamps
                      ? "mA"
                      : "A";

                  return (
                    <div className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 shadow-lg">
                      <p className="text-xs text-gray-400 font-mono">
                        {data.harmonic} ({data.frequency} Hz)
                      </p>
                      <p className="text-sm font-semibold text-white mt-1">
                        {value >= 1 ? value.toFixed(2) : value.toFixed(3)}{" "}
                        {unit}
                      </p>
                    </div>
                  );
                }}
              />
              {selectedHarmonic === "voltage" && (
                <Bar
                  dataKey="voltage"
                  fill="#3b82f6"
                  name="Napięcie (V)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                />
              )}
              {selectedHarmonic === "current" && (
                <Bar
                  dataKey="current"
                  fill="#f59e0b"
                  name={useMilliamps ? "Prąd (mA)" : "Prąd (A)"}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={true}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
