import { useState } from "react";
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
  const [selectedHarmonic, setSelectedHarmonic] = useState<'voltage' | 'current'>('voltage');

  // Transform harmonics arrays into Recharts format
  // harmonicsVoltage = [H1, H2, H3, ..., H8]
  // H1 = fundamental (50Hz), H2 = 2nd harmonic (100Hz), etc.
  // Limited to H1-H8 due to Nyquist constraint at 800Hz sampling rate
  const chartData = harmonicsVoltage.map((vHarmonic, index) => ({
    harmonic: `H${index + 1}`,
    frequency: (index + 1) * 50, // 50Hz, 100Hz, 150Hz, ..., 400Hz (Nyquist limit)
    voltage: vHarmonic,
    current: harmonicsCurrent[index],
  }));

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
              <strong>Ograniczenie Nyquista:</strong> System próbkuje przy 800Hz, co pozwala na pomiar tylko harmonicznych H1-H8 (50Hz-400Hz).
              THD jest obliczane tylko z H2-H8 zamiast pełnego zakresu H2-H40 wymaganego przez IEC 61000-4-7.
              Wyświetlana wartość reprezentuje <strong>dolne ograniczenie</strong> rzeczywistego THD.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 sm:pt-2 pb-2 px-2 sm:px-4">
        <div className="h-[250px] sm:h-[350px] lg:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={30} barCategoryGap="15%">
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
              tick={{ fill: "#e5e7eb", fontSize: 11 }}
              height={50}
              tickFormatter={(freq) => `${freq}Hz`}
            />
            <YAxis
              scale="log"
              domain={[0.01, 'auto']}
              label={{
                value:
                  selectedHarmonic === "voltage"
                    ? "Amplituda (V)"
                    : "Amplituda (A)",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fill: "#e5e7eb", fontSize: 12, textAnchor: "middle" },
              }}
              stroke={selectedHarmonic === "voltage" ? "#3b82f6" : "#f59e0b"}
              tick={{ fill: "#e5e7eb", fontSize: 11 }}
              tickFormatter={(value) => value >= 1 ? value.toFixed(0) : value.toFixed(2)}
              width={60}
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
              formatter={(value: number) => [
                value >= 1 ? value.toFixed(2) : value.toFixed(3),
                selectedHarmonic === "voltage" ? "Amplituda (V)" : "Amplituda (A)",
              ]}
              labelFormatter={(freq) => `${freq} Hz`}
            />
            {selectedHarmonic === "voltage" && (
              <Bar
                dataKey="voltage"
                fill="#3b82f6"
                name="Napięcie (V)"
                radius={[4, 4, 0, 0]}
              />
            )}
            {selectedHarmonic === "current" && (
              <Bar
                dataKey="current"
                fill="#f59e0b"
                name="Prąd (A)"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
