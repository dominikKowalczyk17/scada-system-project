import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
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

export interface HarmonicsChartHandle {
  setView: (harmonic: "voltage" | "current", scale: "linear" | "log") => void;
}

export const HarmonicsChart = forwardRef<
  HarmonicsChartHandle,
  HarmonicsChartProps
>(function HarmonicsChart(
  { harmonicsVoltage, harmonicsCurrent, thdVoltage, thdCurrent },
  ref,
) {
  const [selectedHarmonic, setSelectedHarmonic] = useState<
    "voltage" | "current"
  >("voltage");
  const [scaleType, setScaleType] = useState<"linear" | "log">("linear");

  useImperativeHandle(ref, () => ({
    setView(harmonic, scale) {
      setSelectedHarmonic(harmonic);
      setScaleType(scale);
    },
  }));

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
      const scaledCurrent =
        currentValue !== undefined && useMilliamps
          ? currentValue * 1000
          : currentValue;

      return {
        harmonic: `H${index + 1}`,
        frequency: (index + 1) * 50,
        voltage: vHarmonic,
        current: scaledCurrent, // Convert to mA if needed and value exists
      };
    });
  }, [harmonicsVoltage, harmonicsCurrent, useMilliamps]);

  const isLog = scaleType === "log";

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
            <div className="w-px bg-border mx-1" />
            <button
              type="button"
              onClick={() => setScaleType("linear")}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                scaleType === "linear"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Lin
            </button>
            <button
              type="button"
              onClick={() => setScaleType("log")}
              className={`px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors ${
                scaleType === "log"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              Log
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
                tick={false}
                height={30}
              />
              <YAxis
                scale={isLog ? "log" : "auto"}
                domain={isLog ? [0.01, "auto"] : [0, "auto"]}
                allowDataOverflow={isLog}
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
});
