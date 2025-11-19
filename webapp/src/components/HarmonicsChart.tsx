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
import { TrendingUp } from "lucide-react";

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
  const chartData = harmonicsVoltage.map((vHarmonic, index) => ({
    harmonic: `H${index + 1}`,
    frequency: (index + 1) * 50, // 50Hz, 100Hz, 150Hz, ..., 400Hz
    voltage: vHarmonic,
    current: harmonicsCurrent[index],
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-base sm:text-lg">Harmonic Analysis</span>
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
              Voltage
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
              Current
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-0">
          THD Voltage: {thdVoltage.toFixed(2)}% | THD Current:{" "}
          {thdCurrent.toFixed(2)}% (IEC 61000 limit: 8%)
        </p>
      </CardHeader>
      <CardContent className="pt-2 sm:pt-2 pb-2 px-2 sm:px-4">
        <ResponsiveContainer width="100%" height={250} className="sm:!h-[350px] lg:!h-[400px]">
          <BarChart data={chartData} barSize={30} barCategoryGap="15%" className="sm:!bar-size-[40]">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="frequency"
              label={{
                value: "Frequency (Hz)",
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
                    ? "Amplitude (V)"
                    : "Amplitude (A)",
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
                selectedHarmonic === "voltage" ? "Amplitude (V)" : "Amplitude (A)",
              ]}
              labelFormatter={(freq) => `${freq} Hz`}
            />
            {selectedHarmonic === "voltage" && (
              <Bar
                dataKey="voltage"
                fill="#3b82f6"
                name="Voltage (V)"
                radius={[4, 4, 0, 0]}
              />
            )}
            {selectedHarmonic === "current" && (
              <Bar
                dataKey="current"
                fill="#f59e0b"
                name="Current (A)"
                radius={[4, 4, 0, 0]}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
